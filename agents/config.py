"""Idea Anvil configuration."""

from __future__ import annotations

import os
import re

from pydantic import BaseModel
from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel

_THINK_RE = re.compile(r"<think>.*?</think>\s*", re.DOTALL)


def strip_think(text: str) -> str:
    return _THINK_RE.sub("", text).strip()


class IdeaAnvilConfig(BaseModel):
    model_provider: str = "openai"
    model_name: str = "MiniMax-M2.5"
    temperature: float = 0.7
    max_clarification_rounds: int = 5
    max_pivot_count: int = 3


def get_model(config: IdeaAnvilConfig | None = None) -> BaseChatModel:
    config = config or IdeaAnvilConfig()
    base_url = os.environ.get("OPENAI_API_BASE")
    kwargs: dict = {}
    if base_url:
        kwargs["base_url"] = base_url
    return init_chat_model(
        model=config.model_name,
        model_provider=config.model_provider,
        temperature=config.temperature,
        **kwargs,
    )
