from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from app.api.deps.auth import require_verified_admin
from app.core.config import settings
from app.core.limiter import limiter
from app.crud.crud import UserCRUD
from app.models.models import DegreeType, User
from app.schemas.schemas import (
    BulkCommitRequest,
    BulkCommitResponse,
    BulkMatchedRow,
    BulkMatchResponse,
    RequestedRowResponse,
)
from app.services.bulk_degree_service import BulkDegreeService

router = APIRouter(prefix=f"{settings.API_V1_STR}/degrees/bulk", tags=["degrees-bulk"])





@router.get("/requests", response_model=List[RequestedRowResponse])
@limiter.limit("60/minute")
async def list_requested(
    request: Request,
    degree_type: DegreeType,
    current_user: User = Depends(require_verified_admin),
):
    """Live list of REQUESTED credentials for the admin's college + degree type."""
    creds = await BulkDegreeService.list_requested(current_user, degree_type)
    rows: list[dict] = []
    for cred in creds:
        student = await UserCRUD.get_by_id(cred.issued_to_id)
        rows.append({
            "credential_id": cred.id,
            "prn_number": cred.prn_number,
            "student_name": student.full_name if student else None,
            "student_email": student.email if student else None,
            "description": cred.description,
            "metadata_json": cred.metadata_json,
            "created_at": cred.created_at,
        })
    return rows


@router.post("/match", response_model=BulkMatchResponse)
@limiter.limit("10/minute")
async def match_pdfs(
    request: Request,
    degree_type: DegreeType = Form(...),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(require_verified_admin),
):
    """Stage PDFs and match them by PRN to REQUESTED credentials. Returns a batch_id for review/commit."""
    batch = await BulkDegreeService.match_pdfs(current_user, degree_type, files)

    # Map unmatched IDs back to PRNs for a more useful response.
    from app.models.models import Credential
    unmatched_prns: list[str] = []
    if batch.unmatched_request_ids:
        creds = await Credential.find(
            {"_id": {"$in": batch.unmatched_request_ids}}
        ).to_list()
        unmatched_prns = [c.prn_number for c in creds if c.prn_number]

    return BulkMatchResponse(
        batch_id=batch.id,
        degree_type=batch.degree_type,
        matched_rows=[
            BulkMatchedRow(
                credential_id=r.credential_id,
                prn_number=r.prn_number,
                student_name=r.student_name,
                pdf_filename=r.pdf_filename,
                selected=r.selected,
            )
            for r in batch.matched_rows
        ],
        unmatched_request_prns=unmatched_prns,
        orphan_pdf_filenames=batch.orphan_pdf_filenames,
        created_at=batch.created_at,
    )


@router.get("/{batch_id}", response_model=BulkMatchResponse)
async def get_batch(
    batch_id: UUID,
    current_user: User = Depends(require_verified_admin),
):
    """Review state of a bulk batch (matched / orphan / unmatched)."""
    batch = await BulkDegreeService.get_batch(batch_id, current_user)

    from app.models.models import Credential
    unmatched_prns: list[str] = []
    if batch.unmatched_request_ids:
        creds = await Credential.find(
            {"_id": {"$in": batch.unmatched_request_ids}}
        ).to_list()
        unmatched_prns = [c.prn_number for c in creds if c.prn_number]

    return BulkMatchResponse(
        batch_id=batch.id,
        degree_type=batch.degree_type,
        matched_rows=[
            BulkMatchedRow(
                credential_id=r.credential_id,
                prn_number=r.prn_number,
                student_name=r.student_name,
                pdf_filename=r.pdf_filename,
                selected=r.selected,
            )
            for r in batch.matched_rows
        ],
        unmatched_request_prns=unmatched_prns,
        orphan_pdf_filenames=batch.orphan_pdf_filenames,
        created_at=batch.created_at,
    )


@router.post("/{batch_id}/commit", response_model=BulkCommitResponse)
@limiter.limit("10/minute")
async def commit_batch(
    request: Request,
    batch_id: UUID,
    payload: BulkCommitRequest,
    current_user: User = Depends(require_verified_admin),
):
    """Commit matched rows: transition REQUESTED → PENDING with PDF attached."""
    result = await BulkDegreeService.commit_batch(
        batch_id=batch_id,
        admin=current_user,
        deselected_credential_ids=payload.deselected_credential_ids,
    )
    return BulkCommitResponse(**result)
