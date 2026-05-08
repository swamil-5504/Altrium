from typing import List
from uuid import UUID
import asyncio

import io

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from app.api.deps.auth import (
    get_current_user,
    require_admin_with_wallet,
    require_role,
)
from app.core.config import settings
from app.core.limiter import limiter
from app.models.models import User, UserRole
from app.schemas.schemas import CredentialCreate, CredentialResponse, CredentialStatus, CredentialUpdate
from app.services.degree_service import DegreeService
# Telegram notification service used below via local import

router = APIRouter(prefix=f"{settings.API_V1_STR}/degrees", tags=["degrees"])


def _to_response(cred) -> dict:
    data = cred.model_dump()
    data["has_document"] = bool(cred.document_path)
    return data


async def _enrich_creds_with_logos(creds: List[Credential]) -> List[dict]:
    """Helper to fetch current college logos for a list of credentials."""
    unique_colleges = list(set(c.college_name for c in creds if c.college_name))
    logo_map = {}
    if unique_colleges:
        admins = await User.find(
            User.role == UserRole.ADMIN,
            {"college_name": {"$in": unique_colleges}}
        ).to_list()
        for admin in admins:
            if admin.college_name and admin.college_logo:
                logo_map[admin.college_name] = admin.college_logo

    results = []
    for c in creds:
        data = _to_response(c)
        if c.college_name in logo_map:
            data["college_logo"] = logo_map[c.college_name]
        results.append(data)
    return results


@router.post("/", response_model=CredentialResponse)
async def create_degree(
    credential_create: CredentialCreate,
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    cred = await DegreeService.create_submission(credential_create, current_user)
    enriched = await _enrich_creds_with_logos([cred])
    return enriched[0]


@router.get("/", response_model=List[CredentialResponse])
async def get_degrees(current_user: User = Depends(get_current_user)):
    creds = await DegreeService.list_for_user(current_user)
    return await _enrich_creds_with_logos(creds)


@router.get("/public", response_model=List[CredentialResponse])
@limiter.limit("30/minute")
async def get_public_degrees(request: Request, prn_number: str = None, email: str = None):
    if prn_number:
        creds = await DegreeService.get_public_by_prn(prn_number)
    elif email:
        creds = await DegreeService.get_public_by_email(email)
    else:
        creds = await DegreeService.get_all_public()
    return await _enrich_creds_with_logos(creds)


@router.get("/{credential_id}", response_model=CredentialResponse)
async def get_degree(
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
):
    cred = await DegreeService.get_by_id_for_user(credential_id, current_user)
    enriched = await _enrich_creds_with_logos([cred])
    return enriched[0]


async def _notify_degree_rejected(cred) -> None:
    """Helper to fetch student and send rejection notice."""
    from app.crud.crud import UserCRUD
    from app.services.telegram_bot import service as tg_service
    
    student = await UserCRUD.get_by_id(cred.issued_to_id)
    if student:
        await tg_service.notify_degree_rejection(
            student.full_name or student.email,
            cred.title,
            None, # Reason not currently stored in DB, using generic dashboard link
            student.telegram_id
        )

async def _notify_degree_approved(cred) -> None:
    """Send degree-approved email to the student (fire-and-forget helper)."""
    if cred.status != CredentialStatus.APPROVED:
        return
    try:
        student = await User.get(cred.issued_to_id)
        if student:
            from app.services.telegram_bot import service as tg_service
            
            # Attempt to fetch document bytes if available
            document_bytes = None
            if cred.document_path:
                try:
                    document_bytes = await DegreeService.get_document_with_footer(cred.id, student)
                except Exception as doc_exc:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to attach degree document to telegram notification: {doc_exc}")

            await tg_service.notify_degree_approval(
                student_name=student.full_name or student.email,
                degree_title=cred.title,
                tx_hash=cred.tx_hash,
                chat_id=student.telegram_id,
                document_bytes=document_bytes
            )
    except Exception:
        pass  # Non-critical — logged inside notification service


@router.patch("/{credential_id}/status", response_model=CredentialResponse)
async def update_degree_status(
    credential_id: UUID,
    status: CredentialStatus,
    current_user: User = Depends(require_admin_with_wallet),
):
    cred = await DegreeService.update_status(credential_id, status, current_user.id)

    # Notify student if degree was just approved
    if status == CredentialStatus.APPROVED:
        asyncio.create_task(_notify_degree_approved(cred))

    return _to_response(cred)


@router.patch("/{credential_id}", response_model=CredentialResponse)
async def update_degree(
    credential_id: UUID,
    credential_update: CredentialUpdate,
    current_user: User = Depends(require_admin_with_wallet),
):
    cred = await DegreeService.update(credential_id, credential_update, current_user.id)

    # Notify student if degree was just approved or rejected
    if credential_update.status == CredentialStatus.APPROVED:
        asyncio.create_task(_notify_degree_approved(cred))
    elif credential_update.status == CredentialStatus.REJECTED:
        asyncio.create_task(_notify_degree_rejected(cred))

    return _to_response(cred)


@router.delete("/{credential_id}")
async def delete_degree(
    credential_id: UUID,
    current_user: User = Depends(require_admin_with_wallet),
):
    await DegreeService.delete(credential_id)
    return {"detail": "Degree deleted"}


@router.patch("/{credential_id}/revoke", response_model=CredentialResponse)
async def revoke_degree(
    credential_id: UUID,
    current_user: User = Depends(require_admin_with_wallet),
):
    """Revoke a previously minted SBT credential."""
    from datetime import datetime
    from app.crud.crud import CredentialCRUD
    cred = await CredentialCRUD.get_by_id(credential_id)
    if not cred:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Credential not found")
    cred.revoked = True
    cred.revoked_at = datetime.utcnow()
    cred.updated_at = datetime.utcnow()
    await cred.save()
    return _to_response(cred)


@router.post("/{credential_id}/reset", response_model=CredentialResponse)
async def reset_degree(
    credential_id: UUID,
    current_user: User = Depends(require_admin_with_wallet),
):
    """Reset a degree submission after on-chain burn (test phase toggle)."""
    cred = await DegreeService.reset_submission(credential_id)
    return _to_response(cred)


# ---- Document upload & download ----

@router.post("/{credential_id}/document", response_model=CredentialResponse)
@limiter.limit("20/minute")
async def upload_document(
    request: Request,
    credential_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a PDF document for a degree submission."""
    cred = await DegreeService.upload_document(credential_id, file, current_user)
    return _to_response(cred)


@router.get("/{credential_id}/document")
async def download_document(
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Download / view the PDF document for a degree submission."""
    try:
        pdf_bytes = await DegreeService.get_document_with_footer(credential_id, current_user)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=degree_{credential_id}.pdf"},
        )
    except HTTPException as exc:
        if exc.status_code == 403:
            file_path = await DegreeService.get_document_path(credential_id, current_user)
            return FileResponse(
                path=file_path,
                media_type="application/pdf",
                filename=f"degree_{credential_id}.pdf",
            )
        raise
