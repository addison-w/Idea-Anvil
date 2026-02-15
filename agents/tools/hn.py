"""Hacker News search via Algolia API."""

from __future__ import annotations
import httpx

HN_SEARCH_URL = "https://hn.algolia.com/api/v1/search"


def search_hacker_news(query: str, num_results: int = 10) -> list[dict]:
    """Search Hacker News via Algolia API (free, no auth required)."""
    response = httpx.get(
        HN_SEARCH_URL,
        params={"query": query, "tags": "story", "hitsPerPage": num_results},
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()
    return [
        {
            "title": hit.get("title", ""),
            "url": hit.get("url")
            or f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}",
            "snippet": hit.get("story_text", "") or "",
            "hn_id": hit.get("objectID", ""),
            "points": hit.get("points", 0),
            "num_comments": hit.get("num_comments", 0),
        }
        for hit in data.get("hits", [])
    ]
