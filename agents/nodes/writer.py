"""PRD Writer — generates the PRD document with citations."""

from __future__ import annotations
from langchain_core.messages import SystemMessage
from agents.config import get_model, strip_think
from agents.state import IdeaAnvilState

WRITER_SYSTEM = """You are a technical writer creating a Product Requirements Document (PRD).

Write in clean Markdown. Include citations to research findings where relevant.

The PRD should be practical and ready to hand to an AI coding assistant (Claude Code, OpenCode) for implementation.

For "light" depth: 1-2 pages total.
For "detailed" depth: 5-10 pages total.

Section templates:
- overview: Product name, one-liner, positioning
- problem: Problem statement with evidence from research
- target_users: User personas with pain points
- core_features: Feature list with priority (P0/P1/P2)
- mvp_scope: What's in/out for MVP
- success_metrics: KPIs and measurement approach
- user_stories: As a [user], I want [feature] so that [benefit]
- data_model: Key entities and relationships
- api_design: Core endpoints/interfaces
- tech_stack: Recommended technologies with rationale
- milestones: Implementation phases with timelines
- edge_cases: Known edge cases and how to handle them"""


def writer_node(state: IdeaAnvilState) -> dict:
    model = get_model()
    refined = state["refined_idea"]
    insights = state["insights"]
    config = state["prd_config"]

    prompt = f"""Write a PRD for:
- Title: {refined.title}
- Problem: {refined.problem}
- Target users: {", ".join(refined.target_users)}
- Core features: {", ".join(refined.core_features)}
- Business model: {refined.business_model or "TBD"}

Research insights:
- Market signals: {", ".join(insights.market_signals)}
- User pain points: {", ".join(insights.user_pain_points)}
- Existing solutions: {", ".join(insights.existing_solutions)}
- Opportunities: {", ".join(insights.opportunities)}
- Risks: {", ".join(insights.risks)}
- Recommendation: {insights.recommendation}

Sections to include: {", ".join(config.sections)}
Depth: {config.depth}

{f"User feedback from previous version: {state['user_feedback']}" if state.get("user_feedback") else ""}"""

    response = model.invoke(
        [
            SystemMessage(content=WRITER_SYSTEM),
            {"role": "user", "content": prompt},
        ]
    )

    return {
        "messages": [response],
        "prd_draft": strip_think(response.content),
        "prd_version": state.get("prd_version", 0) + 1,
        "phase": "reviewing",
    }
