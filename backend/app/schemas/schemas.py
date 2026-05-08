import re
from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"
    SUPERADMIN = "SUPERADMIN"
    EMPLOYER = "EMPLOYER"

class CredentialStatus(str, Enum):
    REQUESTED = "REQUESTED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class DegreeType(str, Enum):
    BTECH = "BTECH"
    BSC = "BSC"
    MTECH = "MTECH"
    MBA = "MBA"

class BulkBatchStatus(str, Enum):
    READY = "READY"
    COMMITTED = "COMMITTED"

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------
# Ethereum address: 0x + 40 hex chars (20 bytes).
WALLET_ADDRESS_PATTERN = r"^0x[a-fA-F0-9]{40}$"
# Ethereum transaction hash: 0x + 64 hex chars (32 bytes).
TX_HASH_PATTERN = r"^0x[a-fA-F0-9]{64}$"

# Human names / college names: printable unicode, no control chars.
# Length-capped at 100 / 150 to avoid denial-of-service via huge strings
# and to keep PDF rendering bounded.
_CTRL_CHARS_RE = re.compile(r"[\x00-\x1f\x7f]")

def _strip_control(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = _CTRL_CHARS_RE.sub("", value).strip()
    return cleaned or None

# ---------------------------------------------------------------------------
# User schemas
# ---------------------------------------------------------------------------
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = Field(None, max_length=100)
    role: UserRole = UserRole.STUDENT
    college_name: Optional[str] = Field(None, max_length=150)
    wallet_address: Optional[str] = Field(None, pattern=WALLET_ADDRESS_PATTERN)
    prn_number: Optional[str] = None
    telegram_id: Optional[str] = None
    college_logo: Optional[str] = None

    @field_validator("full_name", "college_name", mode="before")
    @classmethod
    def _scrub_text(cls, v):
        return _strip_control(v) if isinstance(v, str) else v

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None
    college_name: Optional[str] = Field(None, max_length=150)
    college_logo: Optional[str] = None

    @field_validator("full_name", mode="before")
    @classmethod
    def _scrub_text(cls, v):
        return _strip_control(v) if isinstance(v, str) else v

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.STUDENT
    college_name: Optional[str] = None
    college_logo: Optional[str] = None
    wallet_address: Optional[str] = None
    telegram_id: Optional[str] = None
    telegram_link_token: Optional[str] = None
    prn_number: Optional[str] = None
    college_logo: Optional[str] = None
    is_active: bool
    is_legal_admin_verified: bool = False
    created_at: datetime

    @property
    def telegram_bot_link(self) -> Optional[str]:
        if not self.telegram_link_token:
            return None
        import os
        bot_name = os.getenv("TELEGRAM_BOT_USERNAME", "Altrium_Notification_Bot")
        return f"tg://resolve?domain={bot_name}&start={self.telegram_link_token}"

    class Config:
        from_attributes = True
        # Allow the property to be serialized in the response
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }
        
    # For Pydantic v2 compatibility if needed
    def model_dump(self, *args, **kwargs):
        data = super().model_dump(*args, **kwargs)
        data["telegram_bot_link"] = self.telegram_bot_link
        return data

class WalletPatchRequest(BaseModel):
    wallet_address: str = Field(..., pattern=WALLET_ADDRESS_PATTERN)

# ---------------------------------------------------------------------------
# Credential schemas
# ---------------------------------------------------------------------------
class CredentialBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    metadata_json: Optional[dict] = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def _scrub_text(cls, v):
        return _strip_control(v) if isinstance(v, str) else v

class CredentialCreate(CredentialBase):
    issued_to_id: Optional[UUID] = None
    token_id: Optional[int] = Field(None, ge=0)
    tx_hash: Optional[str] = Field(None, pattern=TX_HASH_PATTERN)
    prn_number: Optional[str] = None
    college_name: Optional[str] = Field(None, max_length=150)
    degree_type: Optional[DegreeType] = None

    @field_validator("college_name", mode="before")
    @classmethod
    def _scrub_college(cls, v):
        return _strip_control(v) if isinstance(v, str) else v

class CredentialUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[CredentialStatus] = None
    metadata_json: Optional[dict] = None
    token_id: Optional[int] = Field(None, ge=0)
    tx_hash: Optional[str] = Field(None, pattern=TX_HASH_PATTERN)
    revoked: Optional[bool] = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def _scrub_text(cls, v):
        return _strip_control(v) if isinstance(v, str) else v

class CredentialResponse(CredentialBase):
    id: UUID
    issued_to_id: UUID
    issued_by_id: UUID
    status: CredentialStatus
    token_id: Optional[int] = None
    tx_hash: Optional[str] = Field(None, pattern=TX_HASH_PATTERN)
    prn_number: Optional[str] = None
    college_name: Optional[str] = None
    college_logo: Optional[str] = None
    degree_type: Optional[DegreeType] = None
    document_uid: Optional[str] = None
    has_document: bool = False
    revoked: bool = False
    revoked_at: Optional[datetime] = None
    server_verified: bool = False
    on_chain_hash: Optional[str] = None
    hash_match: bool = False
    institution_accredited: bool = False
    institution_accreditation_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int

class LoginRequest(BaseModel):
    email: str
    password: str
    ignore_verification: bool = False

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RegisterRequest(UserCreate):
    pass

class _PasswordPayload(BaseModel):

    new_password: str = Field(...)

class ForgotPasswordRequest(_PasswordPayload):
    email: str

class ChangePasswordRequest(_PasswordPayload):
    old_password: str

# ---------------------------------------------------------------------------
# Bulk upload schemas
# ---------------------------------------------------------------------------
class RequestedRowResponse(BaseModel):
    credential_id: UUID
    prn_number: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    description: Optional[str] = None
    metadata_json: Optional[dict] = None
    created_at: datetime

class BulkMatchedRow(BaseModel):
    credential_id: UUID
    prn_number: str
    student_name: Optional[str] = None
    pdf_filename: str
    selected: bool = True

class BulkMatchResponse(BaseModel):
    batch_id: UUID
    degree_type: DegreeType
    matched_rows: List[BulkMatchedRow]
    unmatched_request_prns: List[str]
    orphan_pdf_filenames: List[str]
    created_at: datetime

class BulkCommitRequest(BaseModel):
    deselected_credential_ids: List[UUID] = Field(default_factory=list)

class BulkCommitResultRow(BaseModel):
    credential_id: UUID
    prn_number: str
    status: str
    error: Optional[str] = None

class BulkCommitResponse(BaseModel):
    batch_id: UUID
    committed_count: int
    skipped_count: int
    failed_count: int
    rows: List[BulkCommitResultRow]
