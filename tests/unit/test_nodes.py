"""Unit tests for agent nodes."""

import pytest
from unittest.mock import patch, MagicMock
from langchain_core.messages import HumanMessage, AIMessage

from agents.nodes.clarifier import clarifier_node
from agents.nodes.planner import planner_node
from agents.nodes.searchers import searcher_node
from agents.nodes.synthesizer import synthesizer_node
from agents.nodes.writer import writer_node
from agents.nodes.reviewer import reviewer_node
from agents.state import (
    IdeaAnvilState,
    PRDConfig,
    RefinedIdea,
    SourceResult,
    SearchQuery,
    SearchItem,
    ResearchInsights,
)
from datetime import datetime


def _base_state(**overrides) -> dict:
    defaults = {
        "messages": [HumanMessage(content="I want to build an AI todo app")],
        "raw_idea": "AI todo app",
        "refined_idea": None,
        "clarification_round": 0,
        "search_queries": [],
        "research_results": [],
        "insights": None,
        "prd_config": PRDConfig(depth="light"),
        "prd_draft": None,
        "prd_version": 0,
        "phase": "clarifying",
        "pivot_history": [],
        "pending_interrupt": None,
        "user_feedback": None,
    }
    defaults.update(overrides)
    return defaults


def test_clarifier_node_callable():
    assert callable(clarifier_node)


def test_planner_node_callable():
    assert callable(planner_node)


def test_searcher_node_callable():
    assert callable(searcher_node)


def test_synthesizer_node_callable():
    assert callable(synthesizer_node)


def test_writer_node_callable():
    assert callable(writer_node)


def test_reviewer_node_callable():
    assert callable(reviewer_node)


def test_reviewer_approve():
    state = _base_state(user_feedback="approve", phase="reviewing")
    result = reviewer_node(state)
    assert result["phase"] == "done"


def test_reviewer_pivot():
    state = _base_state(
        user_feedback="pivot: focus on B2B instead",
        phase="reviewing",
        refined_idea=RefinedIdea(
            title="Test", problem="Test", target_users=["devs"], core_features=["feat1"]
        ),
    )
    result = reviewer_node(state)
    assert result["phase"] == "planning"
    assert len(result["pivot_history"]) == 1


def test_reviewer_edit():
    state = _base_state(user_feedback="add more detail to the features section", phase="reviewing")
    result = reviewer_node(state)
    assert result["phase"] == "writing"


def test_reviewer_no_feedback():
    state = _base_state(user_feedback=None, phase="reviewing")
    result = reviewer_node(state)
    assert result["pending_interrupt"] == "prd_review"


def test_searcher_node_with_hn_query():
    """Searcher node calls HN search and returns SourceResult."""
    with patch("agents.nodes.searchers.search_hacker_news") as mock_hn:
        mock_hn.return_value = [
            {
                "title": "Test",
                "url": "https://hn.com",
                "snippet": "test",
                "points": 10,
                "num_comments": 5,
                "hn_id": "1",
            }
        ]
        state = {
            "query": {"source": "hacker_news", "query": "AI todo", "intent": "test"},
            "research_results": [],
        }
        result = searcher_node(state)
        assert len(result["research_results"]) == 1
        assert result["research_results"][0].source == "hacker_news"
