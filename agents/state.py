"""Idea Anvil state schema and Pydantic models."""

from __future__ import annotations

import operator
from datetime import datetime
from typing import Annotated, Literal, TypedDict

from langgraph.graph import add_messages
from langchain_core.messages import AnyMessage
from pydantic import BaseModel, Field


class RefinedIdea(BaseModel):
    title: str
    problem: str
    target_users: list[str]
    core_features: list[str]
    business_model: str | None = None
    constraints: list[str] = Field(default_factory=list)


class SearchQuery(BaseModel):
    source: Literal["hacker_news", "reddit", "tavily", "product_hunt"]
    query: str
    intent: str


class SearchItem(BaseModel):
    title: str
    url: str
    snippet: str
    relevance_score: float = Field(ge=0, le=1)
    sentiment: Literal["positive", "negative", "neutral"]
    key_takeaway: str


class SourceResult(BaseModel):
    source: str
    query: str
    items: list[SearchItem] = Field(default_factory=list)
    searched_at: datetime


class ResearchInsights(BaseModel):
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
    depth: Literal["light", "detailed"] = "light"
    sections: list[str] = Field(default_factory=list)

    def model_post_init(self, __context: object) -> None:
        if not self.sections:
            self.sections = LIGHT_SECTIONS if self.depth == "light" else DETAILED_SECTIONS


class PivotRecord(BaseModel):
    from_idea: str
    to_idea: str
    reason: str
    timestamp: datetime


class IdeaAnvilState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    raw_idea: str
    refined_idea: RefinedIdea | None
    clarification_round: int
    search_queries: list[SearchQuery]
    research_results: Annotated[list[SourceResult], operator.add]
    insights: ResearchInsights | None
    prd_config: PRDConfig
    prd_draft: str | None
    prd_version: int
    phase: Literal[
        "clarifying", "planning", "researching", "synthesizing", "writing", "reviewing", "done"
    ]
    pivot_history: Annotated[list[PivotRecord], operator.add]
    pending_interrupt: str | None
    user_feedback: str | None
