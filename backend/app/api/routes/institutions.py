"""Public endpoint serving the accredited-institution registry. Drives the
registration dropdown so that the issuer claim ("I am University X") is bound
to a real, vetted entry rather than free-text.
"""
from typing import List, Optional

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from app.core.config import settings
from app.core.limiter import limiter
from app.models.models import Institution


router = APIRouter(prefix=f"{settings.API_V1_STR}/institutions", tags=["institutions"])


class InstitutionResponse(BaseModel):
    name: str
    accreditation_id: Optional[str] = None
    accreditation_body: Optional[str] = None
    country: str = "IN"


@router.get("", response_model=List[InstitutionResponse])
@limiter.limit("60/minute")
async def list_institutions(
    request: Request,
    q: Optional[str] = Query(None, description="Optional case-insensitive name substring filter"),
):
    query = {"is_active": True}
    if q:
        # Case-insensitive contains match. Anchored at start would be too strict
        # for things like "IIT Bombay" vs "Indian Institute of Technology Bombay".
        import re
        query["name"] = {"$regex": re.escape(q), "$options": "i"}
    docs = await Institution.find(query).sort("+name").limit(200).to_list()
    return [
        InstitutionResponse(
            name=d.name,
            accreditation_id=d.accreditation_id,
            accreditation_body=d.accreditation_body,
            country=d.country,
        )
        for d in docs
    ]
