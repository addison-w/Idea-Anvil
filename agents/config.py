"""Idea Anvil configuration."""

from __future__ import annotations

from pydantic import BaseModel
from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel


class IdeaAnvilConfig(BaseModel):
    model_provider: str = "zhipuai"
    model_name: str = "glm-5"
    temperature: float = 0.7
    max_clarification_rounds: int = 5
    max_pivot_count: int = 3


def get_model(config: IdeaAnvilConfig | None = None) -> BaseChatModel:
    config = config or IdeaAnvilConfig()
    return init_chat_model(
        model=config.model_name,
        model_provider=config.model_provider,
        temperature=config.temperature,
    )
