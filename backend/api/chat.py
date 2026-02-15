"""Session management endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from backend.models import CreateSessionRequest, CreateSessionResponse, SessionStatus

router = APIRouter()

# In-memory session store (replace with DB later)
_sessions: dict[str, dict] = {}


@router.post("/session", response_model=CreateSessionResponse)
def create_session(req: CreateSessionRequest):
    """Start a new Idea Anvil session."""
    thread_id = f"idea-anvil-{uuid.uuid4().hex[:12]}"
    _sessions[thread_id] = {
        "thread_id": thread_id,
        "idea": req.idea,
        "depth": req.depth,
        "phase": "clarifying",
        "prd_draft": None,
        "prd_version": 0,
    }
    return CreateSessionResponse(thread_id=thread_id)


@router.get("/session/{thread_id}", response_model=SessionStatus)
def get_session(thread_id: str):
    """Get session status."""
    session = _sessions.get(thread_id)
    if not session:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Session not found")
    return SessionStatus(**session)
