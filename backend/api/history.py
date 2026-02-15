"""History endpoints."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/history")
def list_history():
    """List past sessions."""
    from backend.api.chat import _sessions

    return [
        {"thread_id": s["thread_id"], "idea": s["idea"], "phase": s["phase"]}
        for s in _sessions.values()
    ]
