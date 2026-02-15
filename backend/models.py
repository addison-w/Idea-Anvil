"""Request/response models for the API."""

from pydantic import BaseModel


class CreateSessionRequest(BaseModel):
    idea: str
    depth: str = "light"  # "light" or "detailed"


class CreateSessionResponse(BaseModel):
    thread_id: str


class SessionStatus(BaseModel):
    thread_id: str
    phase: str
    prd_draft: str | None = None
    prd_version: int = 0
