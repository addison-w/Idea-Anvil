"""History endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/history")
def list_history():
    """List past sessions."""
    from backend.api.chat import _sessions

    return [
        {
            "thread_id": s["thread_id"],
            "idea": s["idea"],
            "phase": s["phase"],
            "created_at": s.get("created_at", ""),
        }
        for s in _sessions.values()
    ]


@router.delete("/history/{thread_id}")
def delete_session(thread_id: str):
    """Delete a session from history."""
    from backend.api.chat import _sessions

    if thread_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    del _sessions[thread_id]
    return {"ok": True}
