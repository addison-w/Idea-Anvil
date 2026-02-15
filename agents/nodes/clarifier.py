"""Clarifier agent — asks questions to refine the user's rough idea."""

from __future__ import annotations
import json
from langchain_core.messages import SystemMessage
from agents.config import get_model
from agents.state import IdeaAnvilState, RefinedIdea

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
```"""


def clarifier_node(state: IdeaAnvilState) -> dict:
    model = get_model()
    messages = [SystemMessage(content=CLARIFIER_SYSTEM)] + state["messages"]
    response = model.invoke(messages)
    content = response.content
    if "```json" in content and '"title"' in content:
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
    return {
        "messages": [response],
        "clarification_round": state["clarification_round"] + 1,
        "pending_interrupt": "clarification",
    }
