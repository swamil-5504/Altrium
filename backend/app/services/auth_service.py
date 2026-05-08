from typing import Optional

from fastapi import HTTPException, status

from app.core.config import settings
from datetime import datetime
import asyncio

from app.core.security import (
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.crud.crud import UserCRUD
from app.crud.crud import UserCRUD
from app.models.models import BlacklistedToken, Institution, User, UserRole
from app.crud.crud import UserCRUD
from app.schemas.schemas import LoginRequest, RegisterRequest
from app.services.telegram_bot import service as tg_service


class AuthService:
    @staticmethod
    async def register(request: RegisterRequest):
        existing_user = await UserCRUD.get_by_email(request.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Issuer-trust gate: only ADMIN role is enforced because admins are
        # the parties that mint credentials. Students are recipients and not
        # gated. Existing admins predating this gate are grandfathered (they
        # don't go through register() again).
        institution_doc: Optional[Institution] = None
        if request.role == UserRole.ADMIN:
            if not request.college_name or not request.college_name.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="College name is required for admin registration",
                )
            # Case-insensitive exact match against the accreditation registry.
            import re
            pattern = f"^{re.escape(request.college_name.strip())}$"
            institution_doc = await Institution.find_one(
                {"name": {"$regex": pattern, "$options": "i"}, "is_active": True}
            )
            if institution_doc is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Institution not found in the accreditation registry. "
                        "Please select an accredited institution from the list, "
                        "or contact the platform admin to add yours."
                    ),
                )

        user = await UserCRUD.create(request)
        # Bind the verified institution to the new admin so the public verify
        # response can show the accreditation badge without re-resolving.
        if institution_doc is not None:
            user.institution_id = institution_doc.id
            # Snap the stored college_name to the canonical registry casing so
            # downstream hash/match logic stays deterministic.
            user.college_name = institution_doc.name
            await user.save()
        # Fire-and-forget registration notification (Students only)
        if user.role == "STUDENT":
            asyncio.create_task(
                tg_service.notify_registration(
                    user.full_name or user.email, 
                    user.telegram_id
                )
            )

        return user

    @staticmethod
    async def login(request: LoginRequest) -> dict:
        user = await UserCRUD.authenticate(request.email, request.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
            
        # Verification check removed to allow unverified admins to get a token and poll status.
        # Guardrails should be implemented on specific sensitive endpoints instead.

        return AuthService.issue_token_pair(str(user.id))

    @staticmethod
    def issue_token_pair(user_id: str) -> dict:
        access_token = create_access_token(data={"sub": user_id})
        refresh_token = create_refresh_token(data={"sub": user_id})
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "refresh_expires_in": settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        }

    @staticmethod
    async def refresh(refresh_token: str) -> dict:
        payload = decode_token(refresh_token, expected_type=REFRESH_TOKEN_TYPE)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        if await BlacklistedToken.find_one({"token": refresh_token}):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked",
            )

        return AuthService.issue_token_pair(str(user_id))

    @staticmethod
    async def reset_password_direct(email: str, new_password: str) -> bool:
        """Dev-only self-serve reset. Overwrites the stored hash.

        Returns True if a user was found and updated, False otherwise. Callers
        in dev mode should surface this to the admin so they aren't left
        guessing. In production this flow is disabled entirely (config guard).
        """
        user = await UserCRUD.get_by_email(email)
        if user is None:
            return False
        user.hashed_password = hash_password(new_password)
        user.updated_at = datetime.utcnow()
        await user.save()
        return True

    @staticmethod
    async def change_password(
        user: User, old_password: str, new_password: str
    ) -> None:
        if not verify_password(old_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )
        if verify_password(new_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must differ from the current one",
            )
        user.hashed_password = hash_password(new_password)
        user.updated_at = datetime.utcnow()
        await user.save()
