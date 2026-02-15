"""Reviewer — HITL node for user approval, edit, or pivot."""

from __future__ import annotations
from agents.state import IdeaAnvilState


def reviewer_node(state: IdeaAnvilState) -> dict:
    feedback = state.get("user_feedback", "")
    if not feedback:
        return {"pending_interrupt": "prd_review"}
    feedback_lower = feedback.strip().lower()
    if feedback_lower == "approve":
        return {"phase": "done", "pending_interrupt": None, "user_feedback": None}
    if feedback_lower.startswith("pivot:"):
        from agents.state import PivotRecord
        from datetime import datetime

        pivot_reason = feedback[6:].strip()
        record = PivotRecord(
            from_idea=state["refined_idea"].title if state["refined_idea"] else "",
            to_idea=pivot_reason,
            reason=pivot_reason,
            timestamp=datetime.now(),
        )
        return {"phase": "planning", "pending_interrupt": None, "pivot_history": [record]}
    return {"phase": "writing", "pending_interrupt": None}
