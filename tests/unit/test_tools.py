import pytest
from unittest.mock import patch, MagicMock
from agents.tools.hn import search_hacker_news
from agents.tools.reddit import search_reddit
from agents.tools.tavily_search import search_tavily


def test_search_hacker_news_returns_results():
    mock_response = {
        "hits": [
            {
                "title": "Show HN: AI Todo App",
                "url": "https://example.com",
                "story_text": "Built an AI todo app...",
                "objectID": "123",
                "points": 100,
                "num_comments": 50,
            }
        ]
    }
    with patch("agents.tools.hn.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200, json=lambda: mock_response)
        results = search_hacker_news("AI todo app")
        assert len(results) == 1
        assert results[0]["title"] == "Show HN: AI Todo App"


def test_search_hacker_news_empty():
    with patch("agents.tools.hn.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"hits": []})
        results = search_hacker_news("nonexistent query xyz")
        assert results == []


def test_search_reddit_returns_results():
    mock_data = {
        "data": {
            "children": [
                {
                    "data": {
                        "title": "Best AI todo apps?",
                        "selftext": "Looking for recommendations...",
                        "url": "https://reddit.com/r/productivity/123",
                        "score": 42,
                        "num_comments": 15,
                        "subreddit": "productivity",
                        "permalink": "/r/productivity/comments/abc/best_ai_todo_apps",
                    }
                }
            ]
        }
    }
    with patch("agents.tools.reddit.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200, json=lambda: mock_data)
        results = search_reddit("AI todo app")
        assert len(results) == 1
        assert results[0]["title"] == "Best AI todo apps?"


def test_search_tavily_returns_results():
    mock_results = [
        {
            "title": "AI Todo Apps Review",
            "url": "https://example.com/review",
            "content": "A comprehensive review...",
            "score": 0.95,
        }
    ]
    with patch("agents.tools.tavily_search.TavilyClient") as MockClient:
        mock_client = MagicMock()
        mock_client.search.return_value = {"results": mock_results}
        MockClient.return_value = mock_client
        results = search_tavily("AI todo app review")
        assert len(results) == 1
        assert results[0]["title"] == "AI Todo Apps Review"
