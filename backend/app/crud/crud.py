from uuid import UUID, uuid4
from typing import List, Optional
from datetime import datetime
import secrets
from app.models.models import User, Credential, UserRole, CredentialStatus
from app.schemas.schemas import UserCreate, UserUpdate, CredentialCreate, CredentialUpdate
from app.core.security import hash_password, verify_password

# all methods are async now because beanie operations are async
class UserCRUD:
    @staticmethod
    def _norm_email(email: str) -> str:
        return (email or "").strip().lower()

    @staticmethod
    async def create(user_create: UserCreate) -> User:
        hashed_password = hash_password(user_create.password)
        # Dump the schema to a dict, remove the raw password, and add the hashed one
        user_data = user_create.model_dump(exclude={"password"})
        user_data["hashed_password"] = hashed_password
        user_data["email"] = UserCRUD._norm_email(user_create.email)
        
        # Unlink any existing accounts with the same telegram_id
        telegram_id = user_data.get("telegram_id")
        if telegram_id:
            await User.find(User.telegram_id == telegram_id).update({"$set": {"telegram_id": None}})
            
        # Generate a unique linking token for Telegram
        user_data["telegram_link_token"] = secrets.token_urlsafe(16)
            
        user = User(**user_data)
        await user.insert()
        return user

    @staticmethod
    async def get_by_email(email: str) -> Optional[User]:
        return await User.find_one(User.email == UserCRUD._norm_email(email))

    @staticmethod
    async def get_by_id(user_id: UUID) -> Optional[User]:
        return await User.get(user_id)

    @staticmethod
    async def get_all(skip: int = 0, limit: int = 100) -> List[User]:
        return await User.find_all().skip(skip).limit(limit).to_list()

    @staticmethod
    async def update(user_id: UUID, user_update: UserUpdate) -> Optional[User]:
        user = await UserCRUD.get_by_id(user_id)
        if not user:
            return None
        update_data = user_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        user.updated_at = datetime.utcnow()
        await user.save()
        return user

    @staticmethod
    async def authenticate(email: str, password: str) -> Optional[User]:
        user = await UserCRUD.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    async def delete(user_id: UUID) -> bool:
        user = await UserCRUD.get_by_id(user_id)
        if user:
            await user.delete()
            return True
        return False

class CredentialCRUD:
    @staticmethod
    async def create(
        credential_create: CredentialCreate,
        issued_to_id: UUID,
        issued_by_id: UUID,
        initial_status: Optional[CredentialStatus] = None,
    ) -> Credential:
        kwargs = dict(
            title=credential_create.title,
            description=credential_create.description,
            issued_to_id=issued_to_id,
            issued_by_id=issued_by_id,
            metadata_json=credential_create.metadata_json,
            token_id=credential_create.token_id,
            tx_hash=credential_create.tx_hash,
            prn_number=credential_create.prn_number,
            college_name=credential_create.college_name,
            degree_type=credential_create.degree_type,
            document_uid=f"DOC-{uuid4().hex[:12].upper()}",
        )
        if initial_status is not None:
            kwargs["status"] = initial_status
        credential = Credential(**kwargs)
        await credential.insert()
        return credential

    @staticmethod
    async def get_by_id(credential_id: UUID) -> Optional[Credential]:
        return await Credential.get(credential_id)

    @staticmethod
    async def get_all(skip: int = 0, limit: int = 100) -> List[Credential]:
        return await Credential.find_all().skip(skip).limit(limit).to_list()

    @staticmethod
    async def get_by_user(user_id: UUID) -> List[Credential]:
        return await Credential.find(Credential.issued_to_id == user_id).to_list()

    @staticmethod
    async def get_by_college(college_name: str, skip: int = 0, limit: int = 100) -> List[Credential]:
        return await Credential.find(Credential.college_name == college_name).skip(skip).limit(limit).to_list()

    @staticmethod
    async def update_status(credential_id: UUID, status: CredentialStatus) -> Optional[Credential]:
        credential = await CredentialCRUD.get_by_id(credential_id)
        if not credential:
            return None
        credential.status = status
        credential.updated_at = datetime.utcnow()
        await credential.save()
        return credential

    @staticmethod
    async def update(credential_id: UUID, credential_update: CredentialUpdate) -> Optional[Credential]:
        credential = await CredentialCRUD.get_by_id(credential_id)
        if not credential:
            return None

        update_data = credential_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(credential, field, value)

        credential.updated_at = datetime.utcnow()
        await credential.save()
        return credential

    @staticmethod
    async def get_approved_by_prn(prn_number: str) -> List[Credential]:
        return await Credential.find(
            Credential.prn_number == prn_number,
            Credential.status == CredentialStatus.APPROVED
        ).to_list()

    @staticmethod
    async def get_approved_by_user_id(user_id: UUID) -> List[Credential]:
        return await Credential.find(
            Credential.issued_to_id == user_id,
            Credential.status == CredentialStatus.APPROVED
        ).to_list()

    @staticmethod
    async def get_all_approved() -> List[Credential]:
        return await Credential.find(
            (Credential.status == CredentialStatus.APPROVED)
        ).to_list()

    @staticmethod
    async def delete(credential_id: UUID) -> bool:
        credential = await CredentialCRUD.get_by_id(credential_id)
        if credential:
            await credential.delete()
            return True
        return False
