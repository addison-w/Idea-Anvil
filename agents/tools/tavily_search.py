"""Tavily AI search."""

from __future__ import annotations
import os
from tavily import TavilyClient


def search_tavily(query: str, num_results: int = 5) -> list[dict]:
    """Search via Tavily API (free tier: 1000 credits/month)."""
    client = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY", ""))
    response = client.search(query=query, max_results=num_results, search_depth="basic")
    return [
        {
            "title": result.get("title", ""),
            "url": result.get("url", ""),
            "snippet": result.get("content", "")[:500],
            "score": result.get("score", 0),
        }
        for result in response.get("results", [])
    ]
