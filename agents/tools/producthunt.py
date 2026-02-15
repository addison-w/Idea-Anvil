"""Product Hunt search via public API."""

from __future__ import annotations
import httpx

PH_SEARCH_URL = "https://www.producthunt.com/frontend/graphql"


def search_product_hunt(query: str, num_results: int = 10) -> list[dict]:
    """Search Product Hunt for products matching the query.

    Uses the public frontend GraphQL endpoint (no auth required for basic search).
    """
    graphql_query = {
        "query": """
            query SearchProducts($query: String!) {
                search(query: $query, type: POSTS, first: 10) {
                    edges {
                        node {
                            ... on Post {
                                id
                                name
                                tagline
                                url
                                votesCount
                                commentsCount
                            }
                        }
                    }
                }
            }
        """,
        "variables": {"query": query},
    }

    try:
        response = httpx.post(
            PH_SEARCH_URL,
            json=graphql_query,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "idea-anvil/0.1",
            },
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()

        edges = data.get("data", {}).get("search", {}).get("edges", [])
        return [
            {
                "title": edge["node"].get("name", ""),
                "url": edge["node"].get("url", ""),
                "snippet": edge["node"].get("tagline", ""),
                "votes": edge["node"].get("votesCount", 0),
                "comments": edge["node"].get("commentsCount", 0),
            }
            for edge in edges[:num_results]
            if "node" in edge
        ]
    except Exception:
        # Fallback: return empty results if PH API is unavailable
        return []
