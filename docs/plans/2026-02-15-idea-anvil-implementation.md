# Idea Anvil Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered idea-to-PRD webapp that validates rough ideas through multi-source research (HN, Reddit, Tavily) and produces implementation-ready Markdown PRDs.

**Architecture:** Supervisor + Parallel Send pattern in LangGraph. FastAPI backend with WebSocket streaming. Next.js + shadcn/ui frontend with Framer Motion animations. GLM-5 (ZhipuAI) as LLM.

**Tech Stack:** Python 3.12, LangGraph, FastAPI, GLM-5/ZhipuAI, Tavily, Next.js 15, shadcn/ui, Tailwind CSS, Framer Motion, Zustand

**Design doc:** `docs/plans/2026-02-15-idea-anvil-design.md`

---

## Phase 1: Agent Core

### Task 1: Project Scaffolding

**Files:**
- Create: `pyproject.toml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `agents/__init__.py`
- Create: `agents/config.py`
- Create: `tests/__init__.py`
- Create: `tests/unit/__init__.py`
- Create: `tests/integration/__init__.py`

**Step 1: Create pyproject.toml**

```toml
[project]
name = "idea-anvil"
version = "0.1.0"
description = "AI-powered idea-to-PRD platform"
requires-python = ">=3.12"
dependencies = [
    "langgraph>=0.4",
    "langchain>=0.3",
    "langchain-community>=0.3",
    "langchain-openai>=0.3",
    "zhipuai>=3.0",
    "tavily-python>=0.5",
    "praw>=7.8",
    "httpx>=0.28",
    "pydantic>=2.10",
    "python-dotenv>=1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "pytest-cov>=6.0",
    "ruff>=0.9",
]
backend = [
    "fastapi>=0.115",
    "uvicorn>=0.34",
    "websockets>=14.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.ruff]
line-length = 100
target-version = "py312"
```

**Step 2: Create .env.example**

```
ZHIPUAI_API_KEY=your_zhipuai_api_key
TAVILY_API_KEY=your_tavily_api_key
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=idea-anvil/0.1
```

**Step 3: Create .gitignore**

```
__pycache__/
*.pyc
.env
.venv/
*.egg-info/
dist/
.pytest_cache/
node_modules/
.next/
*.db
```

**Step 4: Create empty init files**

Create `agents/__init__.py`, `tests/__init__.py`, `tests/unit/__init__.py`, `tests/integration/__init__.py` as empty files.

**Step 5: Install dependencies**

Run: `uv sync`
Expected: All dependencies installed successfully.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding with pyproject.toml and dependencies"
```

---

### Task 2: State Schema & Pydantic Models

**Files:**
- Create: `agents/state.py`
- Create: `tests/unit/test_state.py`

**Step 1: Write the failing test**

```python
# tests/unit/test_state.py
from agents.state import (
    Idea AnvilState,
    RefinedIdea,
    SearchQuery,
    SourceResult,
    SearchItem,
    ResearchInsights,
    PRDConfig,
    PivotRecord,
)
from datetime import datetime


def test_refined_idea_creation():
    idea = RefinedIdea(
        title="AI Todo App",
        problem="Existing todo apps don't prioritize tasks intelligently",
        target_users=["developers", "productivity enthusiasts"],
        core_features=["AI prioritization", "natural language input"],
        business_model="freemium",
        constraints=["must work offline"],
    )
    assert idea.title == "AI Todo App"
    assert len(idea.target_users) == 2


def test_search_query_source_validation():
    query = SearchQuery(
        source="hacker_news",
        query="AI todo app",
        intent="Find existing discussions about AI-powered task management",
    )
    assert query.source == "hacker_news"


def test_search_item_with_scores():
    item = SearchItem(
        title="Show HN: AI Todo",
        url="https://news.ycombinator.com/item?id=123",
        snippet="Built an AI-powered todo app...",
        relevance_score=0.85,
        sentiment="positive",
        key_takeaway="Users want AI to auto-categorize tasks",
    )
    assert 0 <= item.relevance_score <= 1
    assert item.sentiment in ("positive", "negative", "neutral")


def test_source_result_accumulation():
    result = SourceResult(
        source="hacker_news",
        query="AI todo",
        items=[],
        searched_at=datetime.now(),
    )
    assert result.items == []


def test_research_insights():
    insights = ResearchInsights(
        market_signals=["Growing demand for AI productivity tools"],
        user_pain_points=["Todo apps are too manual"],
        existing_solutions=["Todoist AI", "Things 3"],
        opportunities=["No one does AI prioritization well"],
        risks=["Market is crowded"],
        recommendation="Build with focus on AI prioritization as differentiator",
    )
    assert len(insights.market_signals) == 1
    assert "crowded" in insights.risks[0]


def test_prd_config_light():
    config = PRDConfig(depth="light")
    assert "overview" in config.sections
    assert "user_stories" not in config.sections


def test_prd_config_detailed():
    config = PRDConfig(depth="detailed")
    assert "overview" in config.sections
    assert "user_stories" in config.sections


def test_pivot_record():
    record = PivotRecord(
        from_idea="B2C todo app",
        to_idea="B2B task management platform",
        reason="Enterprise market has higher willingness to pay",
        timestamp=datetime.now(),
    )
    assert record.from_idea != record.to_idea
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/test_state.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agents'`

**Step 3: Write implementation**

```python
# agents/state.py
"""Idea Anvil state schema and Pydantic models."""

from __future__ import annotations

import operator
from datetime import datetime
from typing import Annotated, Literal

from langgraph.graph import add_messages
from langchain_core.messages import AnyMessage
from pydantic import BaseModel, Field


# --- Pydantic Models ---


class RefinedIdea(BaseModel):
    """Structured representation of a refined product idea."""

    title: str
    problem: str
    target_users: list[str]
    core_features: list[str]
    business_model: str | None = None
    constraints: list[str] = Field(default_factory=list)


class SearchQuery(BaseModel):
    """A search query targeting a specific data source."""

    source: Literal["hacker_news", "reddit", "tavily"]
    query: str
    intent: str  # Why this search — used for citation


class SearchItem(BaseModel):
    """A single search result item."""

    title: str
    url: str
    snippet: str
    relevance_score: float = Field(ge=0, le=1)
    sentiment: Literal["positive", "negative", "neutral"]
    key_takeaway: str


class SourceResult(BaseModel):
    """Results from a single data source search."""

    source: str
    query: str
    items: list[SearchItem] = Field(default_factory=list)
    searched_at: datetime


class ResearchInsights(BaseModel):
    """Synthesized insights from all research sources."""

    market_signals: list[str]
    user_pain_points: list[str]
    existing_solutions: list[str]
    opportunities: list[str]
    risks: list[str]
    recommendation: str


LIGHT_SECTIONS = [
    "overview",
    "problem",
    "target_users",
    "core_features",
    "mvp_scope",
    "success_metrics",
]

DETAILED_SECTIONS = LIGHT_SECTIONS + [
    "user_stories",
    "data_model",
    "api_design",
    "tech_stack",
    "milestones",
    "edge_cases",
]


class PRDConfig(BaseModel):
    """Configuration for PRD generation depth."""

    depth: Literal["light", "detailed"] = "light"
    sections: list[str] = Field(default_factory=list)

    def model_post_init(self, __context: object) -> None:
        if not self.sections:
            self.sections = LIGHT_SECTIONS if self.depth == "light" else DETAILED_SECTIONS


class PivotRecord(BaseModel):
    """Record of an idea pivot during the session."""

    from_idea: str
    to_idea: str
    reason: str
    timestamp: datetime


# --- Graph State ---

from typing import TypedDict


class Idea AnvilState(TypedDict):
    """Top-level graph state for Idea Anvil."""

    # Core conversation
    messages: Annotated[list[AnyMessage], add_messages]

    # Idea refinement
    raw_idea: str
    refined_idea: RefinedIdea | None
    clarification_round: int

    # Research
    search_queries: list[SearchQuery]
    research_results: Annotated[list[SourceResult], operator.add]
    insights: ResearchInsights | None

    # PRD
    prd_config: PRDConfig
    prd_draft: str | None
    prd_version: int

    # Workflow control
    phase: Literal[
        "clarifying", "planning", "researching", "synthesizing", "writing", "reviewing", "done"
    ]
    pivot_history: Annotated[list[PivotRecord], operator.add]

    # HITL
    pending_interrupt: str | None
    user_feedback: str | None
```

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/test_state.py -v`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add agents/state.py tests/unit/test_state.py
git commit -m "feat: state schema and Pydantic models for Idea Anvil"
```

---

### Task 3: Config & LLM Setup

**Files:**
- Create: `agents/config.py`
- Create: `tests/unit/test_config.py`

**Step 1: Write the failing test**

```python
# tests/unit/test_config.py
from agents.config import get_model, Idea AnvilConfig


def test_config_defaults():
    config = Idea AnvilConfig()
    assert config.model_provider == "zhipuai"
    assert config.model_name == "glm-5"
    assert config.temperature == 0.7


def test_config_custom():
    config = Idea AnvilConfig(model_provider="openai", model_name="gpt-4o", temperature=0.3)
    assert config.model_provider == "openai"
    assert config.temperature == 0.3
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/test_config.py -v`
Expected: FAIL with import error

**Step 3: Write implementation**

```python
# agents/config.py
"""Idea Anvil configuration."""

from __future__ import annotations

import os

from pydantic import BaseModel
from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel


class Idea AnvilConfig(BaseModel):
    """Configuration for Idea Anvil."""

    model_provider: str = "zhipuai"
    model_name: str = "glm-5"
    temperature: float = 0.7
    max_clarification_rounds: int = 5
    max_pivot_count: int = 3


def get_model(config: Idea AnvilConfig | None = None) -> BaseChatModel:
    """Initialize chat model based on config."""
    config = config or Idea AnvilConfig()
    return init_chat_model(
        model=config.model_name,
        model_provider=config.model_provider,
        temperature=config.temperature,
    )
```

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/test_config.py -v`
Expected: All 2 tests PASS

**Step 5: Commit**

```bash
git add agents/config.py tests/unit/test_config.py
git commit -m "feat: config and LLM setup with GLM-5/ZhipuAI support"
```

---

### Task 4: Search Tools (HN, Reddit, Tavily)

**Files:**
- Create: `agents/tools/__init__.py`
- Create: `agents/tools/hn.py`
- Create: `agents/tools/reddit.py`
- Create: `agents/tools/tavily_search.py`
- Create: `tests/unit/test_tools.py`

**Step 1: Write the failing test**

```python
# tests/unit/test_tools.py
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
        mock_get.return_value = MagicMock(
            status_code=200, json=lambda: mock_response
        )
        results = search_hacker_news("AI todo app")
        assert len(results) == 1
        assert results[0]["title"] == "Show HN: AI Todo App"


def test_search_hacker_news_empty():
    with patch("agents.tools.hn.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200, json=lambda: {"hits": []}
        )
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
                    }
                }
            ]
        }
    }
    with patch("agents.tools.reddit.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200, json=lambda: mock_data
        )
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
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/test_tools.py -v`
Expected: FAIL with import error

**Step 3: Write implementations**

```python
# agents/tools/__init__.py
```

```python
# agents/tools/hn.py
"""Hacker News search via Algolia API."""

from __future__ import annotations

import httpx

HN_SEARCH_URL = "https://hn.algolia.com/api/v1/search"


def search_hacker_news(query: str, num_results: int = 10) -> list[dict]:
    """Search Hacker News via Algolia API (free, no auth required)."""
    response = httpx.get(
        HN_SEARCH_URL,
        params={
            "query": query,
            "tags": "story",
            "hitsPerPage": num_results,
        },
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()

    return [
        {
            "title": hit.get("title", ""),
            "url": hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}",
            "snippet": hit.get("story_text", "") or "",
            "hn_id": hit.get("objectID", ""),
            "points": hit.get("points", 0),
            "num_comments": hit.get("num_comments", 0),
        }
        for hit in data.get("hits", [])
    ]
```

```python
# agents/tools/reddit.py
"""Reddit search via public JSON API."""

from __future__ import annotations

import httpx

REDDIT_SEARCH_URL = "https://www.reddit.com/search.json"


def search_reddit(query: str, num_results: int = 10) -> list[dict]:
    """Search Reddit via public JSON API (no auth for read-only)."""
    response = httpx.get(
        REDDIT_SEARCH_URL,
        params={
            "q": query,
            "sort": "relevance",
            "limit": num_results,
            "type": "link",
        },
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
```

```python
# agents/tools/tavily_search.py
"""Tavily AI search."""

from __future__ import annotations

import os

from tavily import TavilyClient


def search_tavily(query: str, num_results: int = 5) -> list[dict]:
    """Search via Tavily API (free tier: 1000 credits/month)."""
    client = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY", ""))
    response = client.search(
        query=query,
        max_results=num_results,
        search_depth="basic",
    )

    return [
        {
            "title": result.get("title", ""),
            "url": result.get("url", ""),
            "snippet": result.get("content", "")[:500],
            "score": result.get("score", 0),
        }
        for result in response.get("results", [])
    ]
```

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/test_tools.py -v`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add agents/tools/ tests/unit/test_tools.py
git commit -m "feat: search tools for HN (Algolia), Reddit, and Tavily"
```

---

### Task 5: Agent Nodes (Clarifier, Planner, Searchers, Synthesizer, Writer, Reviewer)

**Files:**
- Create: `agents/nodes/__init__.py`
- Create: `agents/nodes/clarifier.py`
- Create: `agents/nodes/planner.py`
- Create: `agents/nodes/searchers.py`
- Create: `agents/nodes/synthesizer.py`
- Create: `agents/nodes/writer.py`
- Create: `agents/nodes/reviewer.py`
- Create: `tests/unit/test_nodes.py`

**Step 1: Write the failing test**

```python
# tests/unit/test_nodes.py
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from langchain_core.messages import HumanMessage, AIMessage

from agents.nodes.clarifier import clarifier_node
from agents.nodes.planner import planner_node
from agents.nodes.searchers import searcher_node
from agents.nodes.synthesizer import synthesizer_node
from agents.nodes.writer import writer_node
from agents.nodes.reviewer import reviewer_node
from agents.state import Idea AnvilState, PRDConfig, SourceResult, SearchQuery
from datetime import datetime


def _base_state(**overrides) -> dict:
    """Create a minimal valid state for testing."""
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


def test_clarifier_node_exists():
    """Clarifier node is callable."""
    assert callable(clarifier_node)


def test_planner_node_exists():
    """Planner node is callable."""
    assert callable(planner_node)


def test_searcher_node_exists():
    """Searcher node is callable."""
    assert callable(searcher_node)


def test_synthesizer_node_exists():
    """Synthesizer node is callable."""
    assert callable(synthesizer_node)


def test_writer_node_exists():
    """Writer node is callable."""
    assert callable(writer_node)


def test_reviewer_node_exists():
    """Reviewer node is callable."""
    assert callable(reviewer_node)
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/test_nodes.py -v`
Expected: FAIL with import error

**Step 3: Write implementations**

Each node follows the pattern: takes `state: Idea AnvilState` → returns partial state update dict. Nodes that need LLM call `get_model()` from config. Full prompt engineering and implementation details for each node below.

```python
# agents/nodes/__init__.py
```

```python
# agents/nodes/clarifier.py
"""Clarifier agent — asks questions to refine the user's rough idea."""

from __future__ import annotations

from langchain_core.messages import AIMessage, SystemMessage
from langgraph.types import interrupt

from agents.config import get_model
from agents.state import Idea AnvilState, RefinedIdea

CLARIFIER_SYSTEM = """You are a sharp product manager helping refine a rough product idea.

Your job: Ask ONE question at a time to understand the idea better. Prefer multiple-choice questions.

Questions to cover (in order, skip if already answered):
1. Who are the target users?
2. What specific problem does this solve?
3. What are the 2-3 core features for an MVP?
4. Any constraints (budget, timeline, technical)?
5. Business model (if relevant)?

Rules:
- Ask ONE question per turn
- Offer 3-4 choices when possible, with an "Other" option
- Be concise — no long preambles
- When you have enough info (3-5 questions answered), output a JSON block with the refined idea

When ready, output EXACTLY this format:
```json
{"title": "...", "problem": "...", "target_users": [...], "core_features": [...], "business_model": "...", "constraints": [...]}
```
"""


def clarifier_node(state: Idea AnvilState) -> dict:
    """Ask one clarifying question or produce refined idea."""
    model = get_model()
    messages = [SystemMessage(content=CLARIFIER_SYSTEM)] + state["messages"]

    response = model.invoke(messages)

    # Check if response contains a JSON block (refined idea ready)
    content = response.content
    if "```json" in content and '"title"' in content:
        import json
        json_str = content.split("```json")[1].split("```")[0].strip()
        try:
            data = json.loads(json_str)
            refined = RefinedIdea(**data)
            return {
                "messages": [response],
                "refined_idea": refined,
                "phase": "planning",
                "clarification_round": state["clarification_round"] + 1,
            }
        except (json.JSONDecodeError, ValueError):
            pass

    # Otherwise, it's a question — interrupt for user answer
    return {
        "messages": [response],
        "clarification_round": state["clarification_round"] + 1,
        "pending_interrupt": "clarification",
    }
```

```python
# agents/nodes/planner.py
"""Research Planner — generates search queries for each data source."""

from __future__ import annotations

import json

from langchain_core.messages import AIMessage, SystemMessage
from agents.config import get_model
from agents.state import Idea AnvilState, SearchQuery

PLANNER_SYSTEM = """You are a research strategist. Given a refined product idea, generate search queries for market research.

Generate 2-3 queries PER source. Available sources: hacker_news, reddit, tavily

Output EXACTLY this JSON format:
```json
[
  {"source": "hacker_news", "query": "...", "intent": "..."},
  {"source": "reddit", "query": "...", "intent": "..."},
  {"source": "tavily", "query": "...", "intent": "..."}
]
```

Guidelines:
- HN queries: focus on technical trends, Show HN posts, developer opinions
- Reddit queries: focus on user pain points, feature requests, community needs
- Tavily queries: focus on market analysis, competitor landscape, industry trends
- Each query should search for different aspects (don't repeat)
"""


def planner_node(state: Idea AnvilState) -> dict:
    """Generate search queries based on refined idea."""
    model = get_model()
    refined = state["refined_idea"]
    prompt = f"""Refined idea:
- Title: {refined.title}
- Problem: {refined.problem}
- Target users: {', '.join(refined.target_users)}
- Core features: {', '.join(refined.core_features)}
- Constraints: {', '.join(refined.constraints)}

Generate search queries to validate this idea."""

    response = model.invoke([
        SystemMessage(content=PLANNER_SYSTEM),
        *state["messages"][-3:],  # Recent context
        {"role": "user", "content": prompt},
    ])

    # Parse queries from response
    content = response.content
    queries = []
    if "```json" in content:
        json_str = content.split("```json")[1].split("```")[0].strip()
        try:
            raw = json.loads(json_str)
            queries = [SearchQuery(**q) for q in raw]
        except (json.JSONDecodeError, ValueError):
            pass

    if not queries:
        # Fallback: generate basic queries
        title = refined.title
        queries = [
            SearchQuery(source="hacker_news", query=title, intent="Find HN discussions"),
            SearchQuery(source="reddit", query=f"{title} {refined.problem}", intent="Find user pain points"),
            SearchQuery(source="tavily", query=f"{title} market analysis competitors", intent="Find market landscape"),
        ]

    return {
        "messages": [response],
        "search_queries": queries,
        "phase": "researching",
    }
```

```python
# agents/nodes/searchers.py
"""Searcher nodes — parallel search across data sources via Send()."""

from __future__ import annotations

from datetime import datetime

from agents.state import SourceResult, SearchItem
from agents.tools.hn import search_hacker_news
from agents.tools.reddit import search_reddit
from agents.tools.tavily_search import search_tavily


def searcher_node(state: dict) -> dict:
    """Search a single source. Called via Send() for parallel execution.

    Expects state to contain a 'query' key with a SearchQuery-like dict.
    """
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

    items = [
        SearchItem(
            title=r.get("title", ""),
            url=r.get("url", ""),
            snippet=r.get("snippet", "")[:500],
            relevance_score=min(1.0, r.get("score", 0.5) if isinstance(r.get("score"), float) else 0.5),
            sentiment="neutral",  # Will be enriched by synthesizer
            key_takeaway="",  # Will be enriched by synthesizer
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
```

```python
# agents/nodes/synthesizer.py
"""Synthesizer — merges research results into actionable insights."""

from __future__ import annotations

import json

from langchain_core.messages import SystemMessage
from agents.config import get_model
from agents.state import Idea AnvilState, ResearchInsights

SYNTHESIZER_SYSTEM = """You are a market research analyst. Analyze search results from multiple sources and extract insights.

Output EXACTLY this JSON format:
```json
{
  "market_signals": ["signal 1", "signal 2"],
  "user_pain_points": ["pain 1", "pain 2"],
  "existing_solutions": ["solution 1", "solution 2"],
  "opportunities": ["opportunity 1"],
  "risks": ["risk 1"],
  "recommendation": "One paragraph summary and recommendation"
}
```

Be specific. Cite sources when possible. Focus on actionable insights."""


def synthesizer_node(state: Idea AnvilState) -> dict:
    """Synthesize all research results into insights."""
    model = get_model()

    # Format research results for the LLM
    results_text = ""
    for result in state["research_results"]:
        results_text += f"\n=== {result.source} (query: {result.query}) ===\n"
        for item in result.items[:5]:  # Top 5 per source
            results_text += f"- [{item.title}]({item.url}): {item.snippet[:200]}\n"

    refined = state["refined_idea"]
    prompt = f"""Product idea: {refined.title} — {refined.problem}
Target users: {', '.join(refined.target_users)}

Research results:
{results_text}

Analyze these results and extract insights."""

    response = model.invoke([
        SystemMessage(content=SYNTHESIZER_SYSTEM),
        {"role": "user", "content": prompt},
    ])

    # Parse insights
    content = response.content
    insights = None
    if "```json" in content:
        json_str = content.split("```json")[1].split("```")[0].strip()
        try:
            data = json.loads(json_str)
            insights = ResearchInsights(**data)
        except (json.JSONDecodeError, ValueError):
            pass

    if not insights:
        insights = ResearchInsights(
            market_signals=["Unable to parse — see raw research results"],
            user_pain_points=[],
            existing_solutions=[],
            opportunities=[],
            risks=[],
            recommendation="Review raw research results manually.",
        )

    return {
        "messages": [response],
        "insights": insights,
        "phase": "writing",
    }
```

```python
# agents/nodes/writer.py
"""PRD Writer — generates the PRD document with citations."""

from __future__ import annotations

from langchain_core.messages import SystemMessage
from agents.config import get_model
from agents.state import Idea AnvilState

WRITER_SYSTEM = """You are a technical writer creating a Product Requirements Document (PRD).

Write in clean Markdown. Include citations to research findings where relevant (e.g., "[Source: HN discussion]").

The PRD should be practical and ready to hand to an AI coding assistant (Claude Code, OpenCode) for implementation.

Structure based on the sections requested. Keep each section focused and concise.

For "light" depth: 1-2 pages total.
For "detailed" depth: 5-10 pages total.

Section templates:
- overview: Product name, one-liner, positioning
- problem: Problem statement with evidence from research
- target_users: User personas with pain points
- core_features: Feature list with priority (P0/P1/P2)
- mvp_scope: What's in/out for MVP
- success_metrics: KPIs and measurement approach
- user_stories: "As a [user], I want [feature] so that [benefit]"
- data_model: Key entities and relationships
- api_design: Core endpoints/interfaces
- tech_stack: Recommended technologies with rationale
- milestones: Implementation phases with timelines
- edge_cases: Known edge cases and how to handle them
"""


def writer_node(state: Idea AnvilState) -> dict:
    """Generate PRD based on research insights and refined idea."""
    model = get_model()
    refined = state["refined_idea"]
    insights = state["insights"]
    config = state["prd_config"]

    prompt = f"""Write a PRD for:
- Title: {refined.title}
- Problem: {refined.problem}
- Target users: {', '.join(refined.target_users)}
- Core features: {', '.join(refined.core_features)}
- Business model: {refined.business_model or 'TBD'}

Research insights:
- Market signals: {', '.join(insights.market_signals)}
- User pain points: {', '.join(insights.user_pain_points)}
- Existing solutions: {', '.join(insights.existing_solutions)}
- Opportunities: {', '.join(insights.opportunities)}
- Risks: {', '.join(insights.risks)}
- Recommendation: {insights.recommendation}

Sections to include: {', '.join(config.sections)}
Depth: {config.depth}

{f'User feedback from previous version: {state["user_feedback"]}' if state.get("user_feedback") else ''}
"""

    response = model.invoke([
        SystemMessage(content=WRITER_SYSTEM),
        {"role": "user", "content": prompt},
    ])

    return {
        "messages": [response],
        "prd_draft": response.content,
        "prd_version": state.get("prd_version", 0) + 1,
        "phase": "reviewing",
    }
```

```python
# agents/nodes/reviewer.py
"""Reviewer — HITL node for user approval, edit, or pivot."""

from __future__ import annotations

from agents.state import Idea AnvilState


def reviewer_node(state: Idea AnvilState) -> dict:
    """Present PRD for review. This node is interrupted for user input.

    After resume, user_feedback determines routing:
    - "approve" → phase="done"
    - "pivot: ..." → phase="planning" (re-research)
    - anything else → phase="writing" (edit/revise)
    """
    feedback = state.get("user_feedback", "")

    if not feedback:
        # Will be interrupted here — waiting for user input
        return {"pending_interrupt": "prd_review"}

    feedback_lower = feedback.strip().lower()

    if feedback_lower == "approve":
        return {"phase": "done", "pending_interrupt": None, "user_feedback": None}

    if feedback_lower.startswith("pivot:"):
        from agents.state import PivotRecord
        from datetime import datetime

        pivot_reason = feedback[6:].strip()
        record = PivotRecord(
            from_idea=state["refined_idea"].title if state["refined_idea"] else "",
            to_idea=pivot_reason,
            reason=pivot_reason,
            timestamp=datetime.now(),
        )
        return {
            "phase": "planning",
            "pending_interrupt": None,
            "pivot_history": [record],
        }

    # Default: treat as edit feedback, re-write PRD
    return {
        "phase": "writing",
        "pending_interrupt": None,
    }
```

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/test_nodes.py -v`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add agents/nodes/ tests/unit/test_nodes.py
git commit -m "feat: all agent nodes — clarifier, planner, searchers, synthesizer, writer, reviewer"
```

---

### Task 6: Main Graph Assembly

**Files:**
- Create: `agents/graph.py`
- Create: `agents/memory/__init__.py`
- Create: `agents/memory/checkpointer.py`
- Create: `tests/unit/test_graph.py`

**Step 1: Write the failing test**

```python
# tests/unit/test_graph.py
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
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/test_graph.py -v`
Expected: FAIL with import error

**Step 3: Write implementation**

```python
# agents/memory/__init__.py
```

```python
# agents/memory/checkpointer.py
"""Checkpointer configuration."""

from __future__ import annotations

from langgraph.checkpoint.memory import MemorySaver


def get_checkpointer():
    """Get checkpointer for graph. MemorySaver for dev, PostgresSaver for prod."""
    return MemorySaver()
```

```python
# agents/graph.py
"""Idea Anvil main graph — Supervisor + Parallel Send architecture."""

from __future__ import annotations

from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from agents.state import Idea AnvilState, PRDConfig
from agents.memory.checkpointer import get_checkpointer
from agents.nodes.clarifier import clarifier_node
from agents.nodes.planner import planner_node
from agents.nodes.searchers import searcher_node
from agents.nodes.synthesizer import synthesizer_node
from agents.nodes.writer import writer_node
from agents.nodes.reviewer import reviewer_node


def route_after_clarifier(state: Idea AnvilState) -> str:
    """Route based on whether idea is refined."""
    if state.get("refined_idea") is not None:
        return "planner"
    return "__interrupt__"  # Wait for user answer, then re-enter clarifier


def fan_out_searches(state: Idea AnvilState) -> list[Send]:
    """Fan out to parallel searcher nodes via Send()."""
    return [
        Send("searcher", {"query": q.model_dump(), "research_results": []})
        for q in state["search_queries"]
    ]


def route_after_reviewer(state: Idea AnvilState) -> str:
    """Route based on user feedback."""
    phase = state.get("phase", "reviewing")
    if phase == "done":
        return END
    elif phase == "planning":
        return "planner"  # Pivot → re-research
    elif phase == "writing":
        return "writer"  # Edit → re-write
    return END


def build_graph():
    """Build and compile the Idea Anvil graph."""
    graph = StateGraph(Idea AnvilState)

    # Add nodes
    graph.add_node("clarifier", clarifier_node)
    graph.add_node("planner", planner_node)
    graph.add_node("searcher", searcher_node)
    graph.add_node("synthesizer", synthesizer_node)
    graph.add_node("writer", writer_node)
    graph.add_node("reviewer", reviewer_node)

    # Edges
    graph.add_edge(START, "clarifier")
    graph.add_conditional_edges("clarifier", route_after_clarifier, ["planner", "__interrupt__"])
    graph.add_conditional_edges("planner", fan_out_searches, ["searcher"])
    graph.add_edge("searcher", "synthesizer")
    graph.add_edge("synthesizer", "writer")
    graph.add_edge("writer", "reviewer")
    graph.add_conditional_edges("reviewer", route_after_reviewer, ["planner", "writer", END])

    # Compile with checkpointer and HITL interrupts
    checkpointer = get_checkpointer()
    compiled = graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["clarifier", "reviewer"],  # Pause for user input
    )

    return compiled
```

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/test_graph.py -v`
Expected: All 2 tests PASS

**Step 5: Commit**

```bash
git add agents/graph.py agents/memory/ tests/unit/test_graph.py
git commit -m "feat: main graph assembly with Supervisor + Parallel Send + HITL"
```

---

## Phase 2: Backend API

### Task 7: FastAPI Server + REST Endpoints

**Files:**
- Create: `backend/__init__.py`
- Create: `backend/server.py`
- Create: `backend/models.py`
- Create: `backend/api/__init__.py`
- Create: `backend/api/chat.py`
- Create: `backend/api/history.py`
- Create: `backend/api/export.py`
- Create: `tests/unit/test_api.py`

**Step 1: Write the failing test**

```python
# tests/unit/test_api.py
import pytest
from fastapi.testclient import TestClient
from backend.server import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_create_session(client):
    response = client.post("/api/session", json={"idea": "AI todo app"})
    assert response.status_code == 200
    data = response.json()
    assert "thread_id" in data


def test_get_history(client):
    response = client.get("/api/history")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/test_api.py -v`
Expected: FAIL with import error

**Step 3: Write implementations**

```python
# backend/__init__.py
```

```python
# backend/models.py
"""Request/response models for the API."""

from pydantic import BaseModel


class CreateSessionRequest(BaseModel):
    idea: str
    depth: str = "light"  # "light" or "detailed"


class CreateSessionResponse(BaseModel):
    thread_id: str


class SessionStatus(BaseModel):
    thread_id: str
    phase: str
    prd_draft: str | None = None
    prd_version: int = 0
```

```python
# backend/api/__init__.py
```

```python
# backend/api/chat.py
"""Session management endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from backend.models import CreateSessionRequest, CreateSessionResponse, SessionStatus

router = APIRouter()

# In-memory session store (replace with DB later)
_sessions: dict[str, dict] = {}


@router.post("/session", response_model=CreateSessionResponse)
def create_session(req: CreateSessionRequest):
    """Start a new Idea Anvil session."""
    thread_id = f"idea-anvil-{uuid.uuid4().hex[:12]}"
    _sessions[thread_id] = {
        "thread_id": thread_id,
        "idea": req.idea,
        "depth": req.depth,
        "phase": "clarifying",
        "prd_draft": None,
        "prd_version": 0,
    }
    return CreateSessionResponse(thread_id=thread_id)


@router.get("/session/{thread_id}", response_model=SessionStatus)
def get_session(thread_id: str):
    """Get session status."""
    session = _sessions.get(thread_id)
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionStatus(**session)
```

```python
# backend/api/history.py
"""History endpoints."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/history")
def list_history():
    """List past sessions."""
    from backend.api.chat import _sessions
    return [
        {"thread_id": s["thread_id"], "idea": s["idea"], "phase": s["phase"]}
        for s in _sessions.values()
    ]
```

```python
# backend/api/export.py
"""Export endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

router = APIRouter()


@router.get("/export/{thread_id}")
def export_prd(thread_id: str):
    """Export PRD as Markdown."""
    from backend.api.chat import _sessions
    session = _sessions.get(thread_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.get("prd_draft"):
        raise HTTPException(status_code=400, detail="No PRD generated yet")
    return PlainTextResponse(
        content=session["prd_draft"],
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=prd-{thread_id}.md"},
    )
```

```python
# backend/server.py
"""FastAPI application factory."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import chat, history, export


def create_app() -> FastAPI:
    app = FastAPI(title="Idea Anvil API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(chat.router, prefix="/api")
    app.include_router(history.router, prefix="/api")
    app.include_router(export.router, prefix="/api")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
```

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/test_api.py -v`
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add backend/ tests/unit/test_api.py
git commit -m "feat: FastAPI server with REST endpoints for session, history, export"
```

---

### Task 8: WebSocket Streaming

**Files:**
- Create: `backend/ws/__init__.py`
- Create: `backend/ws/stream.py`
- Create: `tests/unit/test_ws.py`

**Step 1: Write the failing test**

```python
# tests/unit/test_ws.py
import pytest
from fastapi.testclient import TestClient
from backend.server import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_websocket_connects(client):
    """WebSocket endpoint accepts connection."""
    # First create a session
    response = client.post("/api/session", json={"idea": "test idea"})
    thread_id = response.json()["thread_id"]

    with client.websocket_connect(f"/ws/session/{thread_id}") as ws:
        # Should connect without error
        ws.send_json({"type": "ping"})
        # The WS handler should respond or at least not crash
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/test_ws.py -v`
Expected: FAIL with 404 (WebSocket route not registered)

**Step 3: Write implementation**

```python
# backend/ws/__init__.py
```

```python
# backend/ws/stream.py
"""WebSocket streaming for real-time agent communication."""

from __future__ import annotations

import json
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage

from agents.graph import build_graph
from agents.state import PRDConfig

router = APIRouter()


def classify_stream_event(event: dict, namespace: tuple) -> dict | None:
    """Classify a LangGraph stream event into a typed WS message."""
    if not event:
        return None

    for node_name, node_data in event.items():
        if node_name == "__interrupt__":
            return None

        messages = node_data.get("messages", [])
        phase = node_data.get("phase")
        research_results = node_data.get("research_results", [])

        result = {"node": node_name}

        if messages:
            last_msg = messages[-1]
            if hasattr(last_msg, "content") and last_msg.content:
                result["type"] = "token"
                result["content"] = last_msg.content

        if phase:
            result["type"] = "node_update"
            result["data"] = {"phase": phase}

        if research_results:
            result["type"] = "custom"
            result["event"] = "search_result"
            result["data"] = {
                "source": research_results[0].source if research_results else "",
                "count": sum(len(r.items) for r in research_results),
            }

        if "type" in result:
            return result

    return None


@router.websocket("/session/{thread_id}")
async def websocket_stream(websocket: WebSocket, thread_id: str):
    """WebSocket endpoint for streaming agent events."""
    await websocket.accept()

    try:
        # Wait for initial message or use existing session
        data = await websocket.receive_json()

        idea = data.get("idea", "")
        depth = data.get("depth", "light")

        graph = build_graph()
        config = {"configurable": {"thread_id": thread_id}}

        # Initial invocation
        input_state = {
            "messages": [HumanMessage(content=idea)],
            "raw_idea": idea,
            "refined_idea": None,
            "clarification_round": 0,
            "search_queries": [],
            "research_results": [],
            "insights": None,
            "prd_config": PRDConfig(depth=depth),
            "prd_draft": None,
            "prd_version": 0,
            "phase": "clarifying",
            "pivot_history": [],
            "pending_interrupt": None,
            "user_feedback": None,
        }

        # Stream events
        async for event in graph.astream(input_state, config, stream_mode="updates"):
            ws_event = classify_stream_event(event, ())
            if ws_event:
                await websocket.send_json(ws_event)

            # Check for interrupts
            state = graph.get_state(config)
            if state.next:
                # Interrupted — send interrupt event
                current_values = state.values
                interrupt_type = current_values.get("pending_interrupt", "unknown")
                await websocket.send_json({
                    "type": "interrupt",
                    "interrupt_type": interrupt_type,
                    "data": {
                        "phase": current_values.get("phase"),
                        "prd_draft": current_values.get("prd_draft"),
                        "prd_version": current_values.get("prd_version", 0),
                    },
                })

                # Wait for user resume
                resume_data = await websocket.receive_json()
                resume_value = resume_data.get("value", "")

                # Update state with user input
                if interrupt_type == "clarification":
                    graph.update_state(config, {
                        "messages": [HumanMessage(content=resume_value)],
                    })
                elif interrupt_type == "prd_review":
                    graph.update_state(config, {
                        "user_feedback": resume_value,
                    })

                # Resume streaming
                async for event in graph.astream(None, config, stream_mode="updates"):
                    ws_event = classify_stream_event(event, ())
                    if ws_event:
                        await websocket.send_json(ws_event)

        # Send completion
        final_state = graph.get_state(config)
        await websocket.send_json({
            "type": "complete",
            "prd": final_state.values.get("prd_draft", ""),
        })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
        await websocket.close()
```

Then register the WS router in `backend/server.py`:

Modify `backend/server.py` — add after the export router import:

```python
from backend.ws import stream as ws_stream
```

And add after the export router inclusion:

```python
app.include_router(ws_stream.router, prefix="/ws")
```

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/test_ws.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/ws/ tests/unit/test_ws.py backend/server.py
git commit -m "feat: WebSocket streaming for real-time agent events"
```

---

## Phase 3: Chat UI

### Task 9: Next.js Project Setup

**Step 1: Create Next.js app**

Run (from project root):
```bash
cd /home/addison-w/projects/idea-anvil
pnpm create next-app frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm
```

**Step 2: Install dependencies**

Run:
```bash
cd frontend
pnpm add framer-motion zustand react-markdown remark-gfm
pnpm add -D @types/node
```

**Step 3: Install shadcn/ui**

Run:
```bash
pnpm dlx shadcn@latest init
```
Choose: New York style, Zinc color, CSS variables.

Then add needed components:
```bash
pnpm dlx shadcn@latest add button input card dialog scroll-area separator badge tooltip
```

**Step 4: Update Tailwind config for Zinc monochrome palette**

Update `tailwind.config.ts` to ensure dark mode is `class` based. The shadcn init should handle this, but verify.

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: Next.js 15 project setup with shadcn/ui and Framer Motion"
```

---

### Task 10: Zustand Store & WebSocket Hook

**Files:**
- Create: `frontend/stores/session-store.ts`
- Create: `frontend/hooks/use-session.ts`
- Create: `frontend/lib/types.ts`
- Create: `frontend/lib/constants.ts`

**Step 1: Create types**

```typescript
// frontend/lib/types.ts
export type Phase = 'idle' | 'clarifying' | 'planning' | 'researching' | 'synthesizing' | 'writing' | 'reviewing' | 'done'

export type InterruptType = 'clarification' | 'prd_review'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  choices?: string[] // For multiple choice questions
}

export interface SourceStatus {
  source: string
  status: 'pending' | 'searching' | 'done' | 'error'
  resultCount: number
  insights: string[]
}

export interface WSEvent {
  type: 'token' | 'node_update' | 'custom' | 'interrupt' | 'complete' | 'error'
  node?: string
  content?: string
  event?: string
  data?: Record<string, unknown>
  interrupt_type?: InterruptType
  prd?: string
  message?: string
}
```

**Step 2: Create constants**

```typescript
// frontend/lib/constants.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

export const ANIMATION = {
  duration: { fast: 0.2, normal: 0.3, slow: 0.5 },
  ease: [0.16, 1, 0.3, 1] as const, // Custom cubic-bezier
  stagger: 0.08,
  spring: { stiffness: 400, damping: 30 },
} as const
```

**Step 3: Create Zustand store**

```typescript
// frontend/stores/session-store.ts
import { create } from 'zustand'
import type { Message, Phase, SourceStatus, InterruptType } from '@/lib/types'

interface SessionState {
  // Session
  threadId: string | null
  phase: Phase
  
  // Chat
  messages: Message[]
  isStreaming: boolean
  
  // Research
  sources: SourceStatus[]
  
  // PRD
  prdDraft: string | null
  prdVersion: number
  
  // HITL
  pendingInterrupt: InterruptType | null
  
  // Actions
  setThreadId: (id: string) => void
  setPhase: (phase: Phase) => void
  addMessage: (msg: Message) => void
  appendToLastMessage: (content: string) => void
  setStreaming: (v: boolean) => void
  updateSource: (source: string, update: Partial<SourceStatus>) => void
  setPrdDraft: (prd: string) => void
  setPendingInterrupt: (type: InterruptType | null) => void
  reset: () => void
}

const initialSources: SourceStatus[] = [
  { source: 'hacker_news', status: 'pending', resultCount: 0, insights: [] },
  { source: 'reddit', status: 'pending', resultCount: 0, insights: [] },
  { source: 'tavily', status: 'pending', resultCount: 0, insights: [] },
]

export const useSessionStore = create<SessionState>((set) => ({
  threadId: null,
  phase: 'idle',
  messages: [],
  isStreaming: false,
  sources: initialSources,
  prdDraft: null,
  prdVersion: 0,
  pendingInterrupt: null,

  setThreadId: (id) => set({ threadId: id }),
  setPhase: (phase) => set({ phase }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  appendToLastMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages]
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + content }
      }
      return { messages: msgs }
    }),
  setStreaming: (v) => set({ isStreaming: v }),
  updateSource: (source, update) =>
    set((s) => ({
      sources: s.sources.map((src) =>
        src.source === source ? { ...src, ...update } : src
      ),
    })),
  setPrdDraft: (prd) => set((s) => ({ prdDraft: prd, prdVersion: s.prdVersion + 1 })),
  setPendingInterrupt: (type) => set({ pendingInterrupt: type }),
  reset: () =>
    set({
      threadId: null,
      phase: 'idle',
      messages: [],
      isStreaming: false,
      sources: initialSources,
      prdDraft: null,
      prdVersion: 0,
      pendingInterrupt: null,
    }),
}))
```

**Step 4: Create WebSocket hook**

```typescript
// frontend/hooks/use-session.ts
'use client'

import { useRef, useCallback } from 'react'
import { useSessionStore } from '@/stores/session-store'
import { API_URL, WS_URL } from '@/lib/constants'
import type { WSEvent, Message } from '@/lib/types'

let messageId = 0
const nextId = () => `msg-${++messageId}`

export function useSession() {
  const wsRef = useRef<WebSocket | null>(null)
  const store = useSessionStore()

  const startSession = useCallback(async (idea: string, depth = 'light') => {
    // Create session via REST
    const res = await fetch(`${API_URL}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, depth }),
    })
    const { thread_id } = await res.json()
    store.setThreadId(thread_id)

    // Add user message
    store.addMessage({
      id: nextId(),
      role: 'user',
      content: idea,
      timestamp: Date.now(),
    })

    // Connect WebSocket
    const ws = new WebSocket(`${WS_URL}/ws/session/${thread_id}`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ idea, depth }))
      store.setPhase('clarifying')
      store.setStreaming(true)
    }

    ws.onmessage = (event) => {
      const data: WSEvent = JSON.parse(event.data)
      handleWSEvent(data)
    }

    ws.onclose = () => {
      store.setStreaming(false)
    }

    ws.onerror = () => {
      store.setStreaming(false)
    }
  }, [store])

  const handleWSEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'token':
        // Append to current assistant message or create new one
        const lastMsg = store.messages[store.messages.length - 1]
        if (lastMsg?.role === 'assistant') {
          store.appendToLastMessage(event.content || '')
        } else {
          store.addMessage({
            id: nextId(),
            role: 'assistant',
            content: event.content || '',
            timestamp: Date.now(),
          })
        }
        break

      case 'node_update':
        if (event.data?.phase) {
          store.setPhase(event.data.phase as any)
        }
        break

      case 'custom':
        if (event.event === 'search_result' && event.data) {
          store.updateSource(event.data.source as string, {
            status: 'done',
            resultCount: event.data.count as number,
          })
        }
        break

      case 'interrupt':
        store.setPendingInterrupt(event.interrupt_type || null)
        store.setStreaming(false)
        if (event.data?.prd_draft) {
          store.setPrdDraft(event.data.prd_draft as string)
        }
        break

      case 'complete':
        store.setPhase('done')
        store.setStreaming(false)
        if (event.prd) {
          store.setPrdDraft(event.prd)
        }
        break

      case 'error':
        store.setStreaming(false)
        store.addMessage({
          id: nextId(),
          role: 'assistant',
          content: `Error: ${event.message}`,
          timestamp: Date.now(),
        })
        break
    }
  }, [store])

  const sendResume = useCallback((value: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Add user message
      store.addMessage({
        id: nextId(),
        role: 'user',
        content: value,
        timestamp: Date.now(),
      })
      store.setPendingInterrupt(null)
      store.setStreaming(true)

      wsRef.current.send(JSON.stringify({ type: 'resume', value }))
    }
  }, [store])

  return { startSession, sendResume, ...store }
}
```

**Step 5: Commit**

```bash
git add frontend/stores/ frontend/hooks/ frontend/lib/
git commit -m "feat: Zustand store, WebSocket hook, types and constants"
```

---

### Task 11: Chat UI Components

**Files:**
- Create: `frontend/components/chat/chat-area.tsx`
- Create: `frontend/components/chat/message-bubble.tsx`
- Create: `frontend/components/chat/choice-card.tsx`
- Create: `frontend/components/chat/input-bar.tsx`
- Create: `frontend/components/layout/header.tsx`
- Create: `frontend/components/layout/phase-indicator.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/layout.tsx`

These are pure UI components. Build each with Framer Motion animations following the minimalist aesthetic defined in the design doc:
- Message bubbles: `fade-in + slide-up (8px)`, 300ms, custom easing
- Choice cards: `scale + fade`, spring physics
- Input bar: subtle focus glow animation
- Phase indicator: smooth width transition, 500ms
- All text: Inter/Geist fonts, light weight headings

Reference the design doc Section 4 (Frontend Architecture) for exact animation parameters, color tokens, and layout structure.

**Step 1: Build all components listed above**

Follow the layout from the design doc. The main page should render:
- Header with "Idea Anvil" title and phase indicator
- Chat area (main content) with message list and input bar
- Research panel (right side, slides in when phase === 'researching')

**Step 2: Verify the frontend builds**

Run: `cd frontend && pnpm build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat: chat UI components with Framer Motion animations"
```

---

## Phase 4: Research Panel

### Task 12: Research Panel Components

**Files:**
- Create: `frontend/components/research/research-panel.tsx`
- Create: `frontend/components/research/source-card.tsx`
- Create: `frontend/components/research/insight-chip.tsx`

Build per design doc:
- Research panel slides in from right (400ms) when `phase === 'researching'`
- Source cards: skeleton → slow opacity pulse (2s) → crossfade to results with ✓
- Insight chips: stagger fade-in + scale, 200ms each, 80ms stagger
- All monochrome — no color except amber for warnings

**Step 1: Build components, wire to Zustand store**

**Step 2: Verify build**

Run: `cd frontend && pnpm build`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/components/research/
git commit -m "feat: research panel with source cards and insight chips"
```

---

## Phase 5: PRD Preview

### Task 13: PRD Preview & Export

**Files:**
- Create: `frontend/components/prd/prd-preview.tsx`
- Create: `frontend/components/prd/prd-editor.tsx`

Build per design doc:
- PRD renders as Markdown (react-markdown + remark-gfm)
- Token-by-token fade-in during generation (Geist Mono font)
- Transitions to Inter font when complete
- Edit button toggles inline textarea editing
- Copy button copies Markdown to clipboard
- Export button downloads .md file via `/api/export/{threadId}`

**Step 1: Build components**

**Step 2: Verify build**

Run: `cd frontend && pnpm build`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/components/prd/
git commit -m "feat: PRD preview with Markdown rendering, inline edit, and export"
```

---

## Phase 6: Polish

### Task 14: History Drawer

**Files:**
- Create: `frontend/components/layout/history-drawer.tsx`

Slide-in from left (300ms). Lists past sessions from `/api/history`. Minimalist list with idea title and phase badge.

**Step 1: Build, wire to API**

**Step 2: Commit**

```bash
git add frontend/components/layout/history-drawer.tsx
git commit -m "feat: history drawer for past sessions"
```

---

### Task 15: Dark/Light Theme & Final Polish

**Files:**
- Modify: `frontend/app/layout.tsx` — add theme provider
- Modify: `frontend/lib/constants.ts` — verify all color tokens
- Modify: all components — verify dark mode classes

Apply the Zinc monochrome palette from the design doc. Default dark. Theme toggle in header.

**Step 1: Add theme provider (next-themes)**

Run: `cd frontend && pnpm add next-themes`

**Step 2: Wire theme toggle, verify all components render correctly in both themes**

**Step 3: Verify full build**

Run: `cd frontend && pnpm build`
Expected: PASS

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: dark/light theme with Zinc monochrome palette"
```

---

### Task 16: Docker Compose

**Files:**
- Create: `docker-compose.yml`

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    env_file: .env
    volumes:
      - ./agents:/app/agents
      - ./backend:/app/backend

  frontend:
    build:
      context: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - NEXT_PUBLIC_WS_URL=ws://localhost:8000
    depends_on:
      - backend
```

**Step 1: Create docker-compose.yml and Dockerfiles**

**Step 2: Verify `docker compose up` starts both services**

**Step 3: Commit**

```bash
git add docker-compose.yml Dockerfile.*
git commit -m "feat: Docker Compose for one-command startup"
```

---

### Task 17: End-to-End Smoke Test

**Step 1: Start backend**

Run: `cd /home/addison-w/projects/idea-anvil && uv run uvicorn backend.server:app --reload --port 8000`

**Step 2: Start frontend**

Run: `cd /home/addison-w/projects/idea-anvil/frontend && pnpm dev`

**Step 3: Manual test**

1. Open `http://localhost:3000`
2. Type an idea: "I want to build an AI-powered recipe generator"
3. Verify: AI asks clarifying questions with multiple choice
4. Answer 3-5 questions
5. Verify: Research panel slides in, shows search progress
6. Verify: PRD generates with Markdown rendering
7. Type "approve" → verify export works
8. Try pivot: type "pivot: focus on meal planning instead" → verify re-research

**Step 4: Fix any issues found**

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Idea Anvil v0.1 — end-to-end idea-to-PRD pipeline"
```
