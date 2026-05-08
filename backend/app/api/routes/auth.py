from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from app.schemas.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.core.security import ACCESS_TOKEN_TYPE, decode_token, get_token_exp
from app.crud.crud import UserCRUD
from uuid import UUID
from app.core.config import settings
from app.services.auth_service import AuthService
from app.core.limiter import limiter
from app.api.deps.auth import get_current_user
from app.models.models import User, UserRole

router = APIRouter(prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
@limiter.limit("10/minute")
async def register(request: Request, reg_request: RegisterRequest):
    return await AuthService.register(reg_request)

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, login_request: LoginRequest):
    return await AuthService.login(login_request)

@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
async def refresh(request: Request, refresh_request: RefreshTokenRequest):
    return await AuthService.refresh(refresh_request.refresh_token)


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def forgot_password(request: Request, body: ForgotPasswordRequest):
    """
    Self-serve password reset — **dev/testing only**.

    Disabled in production (prod-config guard in main.py refuses to boot with
    ALLOW_SELF_SERVE_PASSWORD_RESET=true). When enabled, any caller who knows
    an email address can set that account's password. This endpoint is a
    temporary bridge so legacy accounts without valid test-email addresses
    can be migrated before the proper email-token flow ships.

    Always returns 204 regardless of whether the email exists, so the caller
    cannot use it to enumerate accounts.
    """
    if not settings.ALLOW_SELF_SERVE_PASSWORD_RESET:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )
    ok = await AuthService.reset_password_direct(body.email, body.new_password)
    if not ok:
        # Dev/testing mode: be explicit so the admin doesn't chase ghosts.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with that email",
        )
    return None


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
):
    """Authenticated password rotation. Requires the caller's current password."""
    await AuthService.change_password(current_user, body.old_password, body.new_password)
    return None


from fastapi import UploadFile, File, Form, HTTPException, status
import os
from uuid import UUID
from app.models.models import User
from app.services.pdf_validation import validate_pdf_upload

@router.post("/{user_id}/verification-document")
@limiter.limit("20/minute")
async def upload_verification_document(
    request: Request,
    user_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Only the user themselves or a superadmin can upload the verification document
    if current_user.role != UserRole.SUPERADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to upload documentation for this user")

    user = await User.get(user_id)

    if not user:
         raise HTTPException(status_code=404, detail="User not found")

    pdf_bytes = await validate_pdf_upload(file)

    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/verification_{user_id}.pdf"
    with open(file_path, "wb") as buffer:
        buffer.write(pdf_bytes)

    user.verification_document_path = file_path
    await user.save()
    return {"detail": "Document uploaded successfully"}


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


async def _blacklist(token: str) -> None:
    exp = get_token_exp(token)
    if not exp or exp <= datetime.utcnow():
        # Already expired; TTL index would drop it immediately.
        return
    try:
        from app.models.models import BlacklistedToken
        await BlacklistedToken(token=token, expires_at=exp).insert()
    except Exception:
        # Duplicate insert (already blacklisted) is a no-op; other errors are
        # non-fatal because logout is best-effort.
        pass


@router.post("/logout")
async def logout(request: Request, body: LogoutRequest | None = None):
    """
    Blacklist the caller's access token (from the Authorization header) and
    their refresh token (from the request body) until each one's real `exp`.
    """
    access_token: Optional[str] = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        access_token = auth_header.split(" ", 1)[1]
        await _blacklist(access_token)

    if body and body.refresh_token:
        await _blacklist(body.refresh_token)

    # End the user's Telegram session: clear telegram_id so the bot stops
    # treating this chat as the now-logged-out user, and rotate the link
    # token so any cached deep link is invalidated.
    if access_token:
        try:
            payload = decode_token(access_token, expected_type=ACCESS_TOKEN_TYPE)
            user_id = payload.get("sub") if payload else None
            if user_id:
                user = await UserCRUD.get_by_id(UUID(user_id))
                if user is not None:
                    import secrets as _secrets
                    user.telegram_id = None
                    user.telegram_link_token = _secrets.token_urlsafe(16)
                    user.updated_at = datetime.utcnow()
                    await user.save()
        except Exception:
            # Best-effort cleanup — never block logout on this.
            pass

    return {"detail": "Logged out and tokens revoked"}

