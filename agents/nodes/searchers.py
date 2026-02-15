"""Searcher nodes — parallel search across data sources via Send()."""

from __future__ import annotations
from datetime import datetime
from agents.state import SourceResult, SearchItem
from agents.tools.hn import search_hacker_news
from agents.tools.reddit import search_reddit
from agents.tools.tavily_search import search_tavily
from agents.tools.producthunt import search_product_hunt


def searcher_node(state: dict) -> dict:
    """Search a single source. Called via Send() for parallel execution."""
    query = state["query"]
    source = query["source"] if isinstance(query, dict) else query.source
    query_text = query["query"] if isinstance(query, dict) else query.query

    raw_results = []
    if source == "hacker_news":
        raw_results = search_hacker_news(query_text)
    elif source == "reddit":
        raw_results = search_reddit(query_text)
    elif source == "tavily":
        raw_results = search_tavily(query_text)
    elif source == "product_hunt":
        raw_results = search_product_hunt(query_text)

    items = [
        SearchItem(
            title=r.get("title", ""),
            url=r.get("url", ""),
            snippet=r.get("snippet", "")[:500],
            relevance_score=min(
                1.0, r.get("score", 0.5) if isinstance(r.get("score"), float) else 0.5
            ),
            sentiment="neutral",
            key_takeaway="",
        )
        for r in raw_results
    ]

    result = SourceResult(
        source=source,
        query=query_text,
        items=items,
        searched_at=datetime.now(),
    )
    return {"research_results": [result]}
