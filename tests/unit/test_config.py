from agents.config import IdeaAnvilConfig


def test_config_defaults():
    config = IdeaAnvilConfig()
    assert config.model_provider == "openai"
    assert config.model_name == "glm-5"
    assert config.temperature == 0.7


def test_config_custom():
    config = IdeaAnvilConfig(model_provider="openai", model_name="gpt-4o", temperature=0.3)
    assert config.model_provider == "openai"
    assert config.temperature == 0.3
