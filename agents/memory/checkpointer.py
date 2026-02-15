"""Checkpointer configuration."""

from __future__ import annotations

from langgraph.checkpoint.memory import MemorySaver


def get_checkpointer():
    """Get checkpointer for graph. MemorySaver for dev, PostgresSaver for prod."""
    return MemorySaver()
