"""Export endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

router = APIRouter()


@router.get("/export/{thread_id}")
def export_prd(thread_id: str):
    """Export PRD as Markdown."""
    from backend.api.chat import _sessions

    session = _sessions.get(thread_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.get("prd_draft"):
        raise HTTPException(status_code=400, detail="No PRD generated yet")
    return PlainTextResponse(
        content=session["prd_draft"],
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=prd-{thread_id}.md"},
    )
