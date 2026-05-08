from enum import Enum as PyEnum
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from pymongo import IndexModel, ASCENDING

# we keep the same enums so they can be reused in schemas
class UserRole(str, PyEnum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"
    SUPERADMIN = "SUPERADMIN"
    EMPLOYER = "EMPLOYER"

class CredentialStatus(str, PyEnum):
    REQUESTED = "REQUESTED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class DegreeType(str, PyEnum):
    BTECH = "BTECH"
    BSC = "BSC"
    MTECH = "MTECH"
    MBA = "MBA"


class BulkBatchStatus(str, PyEnum):
    READY = "READY"
    COMMITTED = "COMMITTED"

class User(Document):
    id: UUID = Field(default_factory=uuid4)
    email: str = Indexed(unique=True)
    full_name: Optional[str] = None
    hashed_password: str
    role: UserRole = UserRole.STUDENT
    prn_number: Optional[str] = None
    is_active: bool = True
    # Demo/demo-scope: only admins that are "legally verified" are allowed
    # to approve + mint credentials.
    is_legal_admin_verified: bool = False
    college_name: Optional[str] = None
    institution_id: Optional[UUID] = None
    college_logo: Optional[str] = None
    wallet_address: Optional[str] = None
    verification_document_path: Optional[str] = None
    telegram_id: Optional[str] = None
    telegram_link_token: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"

class Credential(Document):
    id: UUID = Field(default_factory=uuid4)
    title: str
    description: Optional[str] = None
    issued_to_id: UUID
    issued_by_id: UUID
    status: CredentialStatus = CredentialStatus.PENDING
    metadata_json: Optional[dict] = None
    document_path: Optional[str] = None
    document_uid: Optional[str] = None
    token_id: Optional[int] = None
    tx_hash: Optional[str] = None
    prn_number: Optional[str] = None
    college_name: Optional[str] = None
    college_logo: Optional[str] = None
    degree_type: Optional[DegreeType] = None
    revoked: bool = False
    revoked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "credentials"


class BulkBatchRow(BaseModel):
    credential_id: UUID
    prn_number: str
    student_name: Optional[str] = None
    pdf_filename: str
    pdf_temp_path: str
    selected: bool = True


class BulkBatch(Document):
    id: UUID = Field(default_factory=uuid4)
    admin_id: UUID
    college_name: str
    degree_type: DegreeType
    status: BulkBatchStatus = BulkBatchStatus.READY
    matched_rows: List[BulkBatchRow] = Field(default_factory=list)
    unmatched_request_ids: List[UUID] = Field(default_factory=list)
    orphan_pdf_filenames: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "bulk_batches"
        indexes = [
            IndexModel([("created_at", ASCENDING)], expireAfterSeconds=86400),
        ]


class Institution(Document):
    """Accredited issuer registry. Admins must register against an entry here
    so we can prove the issuer claim (e.g. "Harvard University") corresponds to
    a real, accredited institution rather than free-text. Existing admins
    pre-dating this registry are grandfathered (institution_id stays None)."""
    id: UUID = Field(default_factory=uuid4)
    name: str = Indexed(unique=True)
    accreditation_id: Optional[str] = None
    accreditation_body: Optional[str] = None
    country: str = "IN"
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "institutions"


class BlacklistedToken(Document):
    token: str
    expires_at: datetime

    class Settings:
        name = "blacklisted_tokens"
        indexes = [
            IndexModel([("token", ASCENDING)], unique=True),
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),
        ]
