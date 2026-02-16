"""Clarifier agent — asks questions to refine the user's rough idea."""

from __future__ import annotations
import json
from langchain_core.messages import HumanMessage, SystemMessage
from agents.config import get_model, strip_think
from agents.state import IdeaAnvilState, RefinedIdea

CLARIFIER_SYSTEM = """You are a sharp product manager helping refine a rough product idea.

Your job: Ask ONE question at a time to understand the idea better.

Topics to cover (in order, skip if already answered):
1. Who are the target users?
2. What specific problem does this solve?
3. What are the 2-3 core features for an MVP?
4. Any constraints (budget, timeline, technical)?
5. Business model (if relevant)?

Rules:
- Ask ONE question per turn
- Be concise — no long preambles
- ALWAYS format your question with multiple-choice options using this EXACT format:

Your question here?

A) First option
B) Second option
C) Third option
D) Other (please describe)

- Use A), B), C), D) letter prefixes — this is mandatory, do not use numbered lists or bullet points
- When you have enough info (3-5 questions answered), output a JSON block with the refined idea

When ready, output EXACTLY this format:
```json
{"title": "...", "problem": "...", "target_users": [...], "core_features": [...], "business_model": "...", "constraints": [...]}
```"""


MAX_CLARIFICATION_ROUNDS = 5


def _force_summarize(state: IdeaAnvilState) -> dict:
    model = get_model()
    force_prompt = (
        "You have gathered enough context. NOW output the refined idea as a JSON block. "
        "Use your best judgment for any missing fields.\n\n"
        "```json\n"
        '{"title": "...", "problem": "...", "target_users": [...], '
        '"core_features": [...], "business_model": "...", "constraints": [...]}\n'
        "```"
    )
    messages = [SystemMessage(content=CLARIFIER_SYSTEM)] + state["messages"]
    messages.append(HumanMessage(content=force_prompt))
    response = model.invoke(messages)
    content = strip_think(response.content)
    if "```json" in content and '"title"' in content:
        json_str = content.split("```json")[1].split("```")[0].strip()
        try:
            data = json.loads(json_str)
            return RefinedIdea(**data), response
        except (json.JSONDecodeError, ValueError):
            pass
    raw = state.get("raw_idea", "Untitled idea")
    fallback = RefinedIdea(
        title=raw[:80],
        problem=raw,
        target_users=["General users"],
        core_features=["Core MVP feature"],
    )
    return fallback, response


def clarifier_node(state: IdeaAnvilState) -> dict:
    model = get_model()
    round_num = state.get("clarification_round", 0)

    if round_num >= MAX_CLARIFICATION_ROUNDS:
        refined, response = _force_summarize(state)
        return {
            "messages": [response],
            "refined_idea": refined,
            "clarification_round": round_num + 1,
            "pending_interrupt": "clarification_complete",
        }

    messages = [SystemMessage(content=CLARIFIER_SYSTEM)] + state["messages"]
    response = model.invoke(messages)
    content = strip_think(response.content)

    if "```json" in content and '"title"' in content:
        json_str = content.split("```json")[1].split("```")[0].strip()
        try:
            data = json.loads(json_str)
            refined = RefinedIdea(**data)
            return {
                "messages": [response],
                "refined_idea": refined,
                "clarification_round": round_num + 1,
                "pending_interrupt": "clarification_complete",
            }
        except (json.JSONDecodeError, ValueError):
            pass

    return {
        "messages": [response],
        "clarification_round": round_num + 1,
        "pending_interrupt": "clarification",
    }
