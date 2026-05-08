import os
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Sequence
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status

from app.crud.crud import CredentialCRUD
from app.models.models import (
    BulkBatch,
    BulkBatchRow,
    BulkBatchStatus,
    Credential,
    CredentialStatus,
    DegreeType,
    User,
)
from app.services.pdf_validation import validate_pdf_upload
import asyncio

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
BULK_STAGING_DIR = UPLOAD_DIR / "bulk"

# PDF filename convention: <PRN>.pdf — case-insensitive on extension only.
_PRN_FILENAME_RE = re.compile(r"^(?P<prn>[A-Za-z0-9_\-]+)\.pdf$", re.IGNORECASE)


def _ensure_dirs(batch_id: UUID) -> Path:
    staging = BULK_STAGING_DIR / str(batch_id)
    staging.mkdir(parents=True, exist_ok=True)
    return staging


def _parse_prn_from_filename(filename: str) -> Optional[str]:
    if not filename:
        return None
    base = os.path.basename(filename)
    match = _PRN_FILENAME_RE.match(base)
    return match.group("prn") if match else None


class BulkDegreeService:
    @staticmethod
    async def list_requested(admin: User, degree_type: DegreeType) -> List[Credential]:
        if not admin.college_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin has no college_name on profile.",
            )
        return await Credential.find(
            Credential.college_name == admin.college_name,
            Credential.status == CredentialStatus.REQUESTED,
            Credential.degree_type == degree_type,
        ).to_list()

    @staticmethod
    async def match_pdfs(
        admin: User,
        degree_type: DegreeType,
        files: Sequence[UploadFile],
    ) -> BulkBatch:
        if not admin.college_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin has no college_name on profile.",
            )
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No PDF files provided.",
            )

        batch_id = uuid4()
        staging_dir = _ensure_dirs(batch_id)

        # Stage and validate each PDF; collect by parsed PRN.
        pdf_by_prn: dict[str, dict] = {}
        orphan_filenames: list[str] = []
        for f in files:
            original_name = f.filename or ""
            prn = _parse_prn_from_filename(original_name)
            if not prn:
                orphan_filenames.append(original_name or "(unnamed)")
                continue
            try:
                pdf_bytes = await validate_pdf_upload(f)
            except HTTPException as exc:
                # Bad PDF — surface as orphan w/ reason in filename label
                orphan_filenames.append(f"{original_name} (invalid PDF: {exc.detail})")
                continue
            staged_path = staging_dir / f"{prn}.pdf"
            with open(staged_path, "wb") as buf:
                buf.write(pdf_bytes)
            # Last write wins on duplicate PRNs in the upload batch.
            pdf_by_prn[prn] = {
                "filename": original_name,
                "staged_path": str(staged_path),
            }

        # Pull all REQUESTED credentials for this admin's college + degree type.
        requested = await Credential.find(
            Credential.college_name == admin.college_name,
            Credential.status == CredentialStatus.REQUESTED,
            Credential.degree_type == degree_type,
        ).to_list()

        matched_rows: list[BulkBatchRow] = []
        unmatched_request_ids: list[UUID] = []
        matched_prns: set[str] = set()

        from app.crud.crud import UserCRUD  # local import to avoid cycle
        for cred in requested:
            cred_prn = cred.prn_number
            if cred_prn and cred_prn in pdf_by_prn:
                pdf = pdf_by_prn[cred_prn]
                student = await UserCRUD.get_by_id(cred.issued_to_id)
                matched_rows.append(
                    BulkBatchRow(
                        credential_id=cred.id,
                        prn_number=cred_prn,
                        student_name=(student.full_name if student else None),
                        pdf_filename=pdf["filename"],
                        pdf_temp_path=pdf["staged_path"],
                        selected=True,
                    )
                )
                matched_prns.add(cred_prn)
            else:
                unmatched_request_ids.append(cred.id)

        # PDFs that didn't match any REQUESTED row become orphans.
        for prn, pdf in pdf_by_prn.items():
            if prn not in matched_prns:
                orphan_filenames.append(pdf["filename"])

        batch = BulkBatch(
            id=batch_id,
            admin_id=admin.id,
            college_name=admin.college_name,
            degree_type=degree_type,
            status=BulkBatchStatus.READY,
            matched_rows=matched_rows,
            unmatched_request_ids=unmatched_request_ids,
            orphan_pdf_filenames=orphan_filenames,
        )
        await batch.insert()
        return batch

    @staticmethod
    async def get_batch(batch_id: UUID, admin: User) -> BulkBatch:
        batch = await BulkBatch.get(batch_id)
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bulk batch not found or expired.",
            )
        if batch.admin_id != admin.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized for this bulk batch.",
            )
        return batch

    @staticmethod
    async def commit_batch(
        batch_id: UUID,
        admin: User,
        deselected_credential_ids: Sequence[UUID],
    ) -> dict:
        batch = await BulkDegreeService.get_batch(batch_id, admin)
        if batch.status == BulkBatchStatus.COMMITTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bulk batch already committed.",
            )

        deselected = set(deselected_credential_ids or [])
        results: list[dict] = []
        committed = 0
        skipped = 0
        failed = 0

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        for row in batch.matched_rows:
            if row.credential_id in deselected:
                skipped += 1
                results.append({
                    "credential_id": row.credential_id,
                    "prn_number": row.prn_number,
                    "status": "SKIPPED",
                    "error": None,
                })
                continue

            cred = await CredentialCRUD.get_by_id(row.credential_id)
            if not cred:
                failed += 1
                results.append({
                    "credential_id": row.credential_id,
                    "prn_number": row.prn_number,
                    "status": "FAILED",
                    "error": "Credential not found.",
                })
                continue

            # Idempotency: if already advanced past REQUESTED, skip silently.
            if cred.status != CredentialStatus.REQUESTED:
                skipped += 1
                results.append({
                    "credential_id": row.credential_id,
                    "prn_number": row.prn_number,
                    "status": "ALREADY_ADVANCED",
                    "error": None,
                })
                continue

            # Move staged PDF into canonical credential location.
            try:
                src = Path(row.pdf_temp_path)
                if not src.is_file():
                    raise FileNotFoundError(f"Staged PDF missing: {src}")
                dest = UPLOAD_DIR / f"{cred.id}.pdf"
                # Copy then unlink to avoid cross-fs rename issues.
                with open(src, "rb") as fsrc, open(dest, "wb") as fdst:
                    fdst.write(fsrc.read())
                src.unlink(missing_ok=True)

                cred.document_path = str(dest)
                cred.status = CredentialStatus.PENDING
                cred.issued_by_id = admin.id
                cred.updated_at = datetime.utcnow()
                await cred.save()

                committed += 1
                
                # Notify student via Telegram (fire-and-forget)
                try:
                    from app.services.telegram_bot import service as tg_service
                    from app.crud.crud import UserCRUD
                    student = await UserCRUD.get_by_id(cred.issued_to_id)
                    if student and student.telegram_id:
                        asyncio.create_task(
                            tg_service.notify_degree_acknowledgement(
                                student.full_name or student.email,
                                cred.title,
                                student.telegram_id
                            )
                        )
                except Exception:
                    pass

                results.append({
                    "credential_id": row.credential_id,
                    "prn_number": row.prn_number,
                    "status": "COMMITTED",
                    "error": None,
                })
            except Exception as exc:
                failed += 1
                results.append({
                    "credential_id": row.credential_id,
                    "prn_number": row.prn_number,
                    "status": "FAILED",
                    "error": str(exc),
                })

        batch.status = BulkBatchStatus.COMMITTED
        batch.updated_at = datetime.utcnow()
        await batch.save()

        return {
            "batch_id": batch.id,
            "committed_count": committed,
            "skipped_count": skipped,
            "failed_count": failed,
            "rows": results,
        }
