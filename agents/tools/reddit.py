"""Reddit search via public JSON API."""

from __future__ import annotations
import httpx

REDDIT_SEARCH_URL = "https://www.reddit.com/search.json"


def search_reddit(query: str, num_results: int = 10) -> list[dict]:
    """Search Reddit via public JSON API (no auth for read-only)."""
    response = httpx.get(
        REDDIT_SEARCH_URL,
        params={"q": query, "sort": "relevance", "limit": num_results, "type": "link"},
        headers={"User-Agent": "idea-anvil/0.1"},
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()
    return [
        {
            "title": post["data"].get("title", ""),
            "url": f"https://reddit.com{post['data'].get('permalink', '')}",
            "snippet": post["data"].get("selftext", "")[:500],
            "score": post["data"].get("score", 0),
            "num_comments": post["data"].get("num_comments", 0),
            "subreddit": post["data"].get("subreddit", ""),
        }
        for post in data.get("data", {}).get("children", [])
    ]
