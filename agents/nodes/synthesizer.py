"""Synthesizer — merges research results into actionable insights."""

from __future__ import annotations
import json
from langchain_core.messages import SystemMessage
from agents.config import get_model
from agents.state import IdeaAnvilState, ResearchInsights

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


def synthesizer_node(state: IdeaAnvilState) -> dict:
    model = get_model()
    results_text = ""
    for result in state["research_results"]:
        results_text += f"\n=== {result.source} (query: {result.query}) ===\n"
        for item in result.items[:5]:
            results_text += f"- [{item.title}]({item.url}): {item.snippet[:200]}\n"

    refined = state["refined_idea"]
    prompt = f"""Product idea: {refined.title} — {refined.problem}
Target users: {", ".join(refined.target_users)}

Research results:
{results_text}

Analyze these results and extract insights."""

    response = model.invoke(
        [
            SystemMessage(content=SYNTHESIZER_SYSTEM),
            {"role": "user", "content": prompt},
        ]
    )

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

    return {"messages": [response], "insights": insights, "phase": "writing"}
