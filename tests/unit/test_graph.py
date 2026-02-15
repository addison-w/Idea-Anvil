"""Test main graph assembly."""

from agents.graph import build_graph


def test_graph_builds():
    """Graph compiles without error."""
    graph = build_graph()
    assert graph is not None


def test_graph_has_expected_nodes():
    """Graph contains all expected nodes."""
    graph = build_graph()
    node_names = set(graph.get_graph().nodes.keys())
    expected = {"clarifier", "planner", "searcher", "synthesizer", "writer", "reviewer"}
    # __start__ and __end__ are added by LangGraph
    assert expected.issubset(node_names), f"Missing nodes: {expected - node_names}"
