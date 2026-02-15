"""Research Planner — generates search queries for each data source."""

from __future__ import annotations
import json
from langchain_core.messages import SystemMessage
from agents.config import get_model
from agents.state import IdeaAnvilState, SearchQuery

PLANNER_SYSTEM = """You are a research strategist. Given a refined product idea, generate search queries for market research.

Generate 2-3 queries PER source. Available sources: hacker_news, reddit, tavily, product_hunt

Output EXACTLY this JSON format:
```json
[
  {"source": "hacker_news", "query": "...", "intent": "..."},
  {"source": "reddit", "query": "...", "intent": "..."},
  {"source": "tavily", "query": "...", "intent": "..."},
  {"source": "product_hunt", "query": "...", "intent": "..."}
]
```

Guidelines:
- HN queries: technical trends, Show HN posts, developer opinions
- Reddit queries: user pain points, feature requests, community needs
- Tavily queries: market analysis, competitor landscape, industry trends
- Product Hunt queries: competing products, product launches, market validation
- Each query should search different aspects"""


def planner_node(state: IdeaAnvilState) -> dict:
    model = get_model()
    refined = state["refined_idea"]
    prompt = f"""Refined idea:
- Title: {refined.title}
- Problem: {refined.problem}
- Target users: {", ".join(refined.target_users)}
- Core features: {", ".join(refined.core_features)}
- Constraints: {", ".join(refined.constraints)}

Generate search queries to validate this idea."""

    response = model.invoke(
        [
            SystemMessage(content=PLANNER_SYSTEM),
            *state["messages"][-3:],
            {"role": "user", "content": prompt},
        ]
    )

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
        title = refined.title
        queries = [
            SearchQuery(source="hacker_news", query=title, intent="Find HN discussions"),
            SearchQuery(
                source="reddit", query=f"{title} {refined.problem}", intent="Find user pain points"
            ),
            SearchQuery(
                source="tavily",
                query=f"{title} market analysis competitors",
                intent="Find market landscape",
            ),
            SearchQuery(source="product_hunt", query=title, intent="Find competing products"),
        ]

    return {
        "messages": [response],
        "search_queries": queries,
        "phase": "researching",
    }
