from agents.state import (
    IdeaAnvilState,
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


def test_search_query_product_hunt():
    query = SearchQuery(
        source="product_hunt",
        query="AI todo",
        intent="Find competing products on Product Hunt",
    )
    assert query.source == "product_hunt"
