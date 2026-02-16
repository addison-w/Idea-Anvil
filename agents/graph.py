"""Idea Anvil main graph — Supervisor + Parallel Send architecture."""

from __future__ import annotations

from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from agents.state import IdeaAnvilState
from agents.memory.checkpointer import get_checkpointer
from agents.nodes.clarifier import clarifier_node
from agents.nodes.planner import planner_node
from agents.nodes.searchers import searcher_node
from agents.nodes.synthesizer import synthesizer_node
from agents.nodes.writer import writer_node
from agents.nodes.reviewer import reviewer_node


def route_after_clarifier(state: IdeaAnvilState) -> str:
    """Route based on whether idea is refined."""
    if state.get("refined_idea") is not None:
        return "planner"
    # Loop back to clarifier for more questions (interrupt_before handles pause)
    return "clarifier"


def fan_out_searches(state: IdeaAnvilState) -> list[Send]:
    """Fan out to parallel searcher nodes via Send()."""
    return [
        Send("searcher", {"query": q.model_dump(), "research_results": []})
        for q in state["search_queries"]
    ]


def route_after_reviewer(state: IdeaAnvilState) -> str:
    """Route based on user feedback."""
    phase = state.get("phase", "reviewing")
    if phase == "done":
        return END
    elif phase == "planning":
        return "planner"
    elif phase == "writing":
        return "writer"
    return END


def build_graph():
    """Build and compile the Idea Anvil graph."""
    graph = StateGraph(IdeaAnvilState)

    # Add nodes
    graph.add_node("clarifier", clarifier_node)
    graph.add_node("planner", planner_node)
    graph.add_node("searcher", searcher_node)
    graph.add_node("synthesizer", synthesizer_node)
    graph.add_node("writer", writer_node)
    graph.add_node("reviewer", reviewer_node)

    # Edges
    graph.add_edge(START, "clarifier")
    graph.add_conditional_edges("clarifier", route_after_clarifier, ["planner", "clarifier"])
    graph.add_conditional_edges("planner", fan_out_searches)
    graph.add_edge("searcher", "synthesizer")
    graph.add_edge("synthesizer", "writer")
    graph.add_edge("writer", "reviewer")
    graph.add_conditional_edges("reviewer", route_after_reviewer, ["planner", "writer", END])

    # Compile with checkpointer and HITL interrupts
    checkpointer = get_checkpointer()
    compiled = graph.compile(
        checkpointer=checkpointer,
        interrupt_after=["clarifier"],
        interrupt_before=["reviewer"],
    )

    return compiled
