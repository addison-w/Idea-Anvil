# IdeaForge — Design Document

AI-powered idea-to-PRD platform. Takes a rough product idea, validates it through multi-source research (Hacker News, Reddit, Tavily), and produces an implementation-ready PRD in Markdown.

## Positioning

**One-liner**: Turn rough ideas into validated, implementation-ready PRDs.

**Differentiation**: Existing PRD tools (ChatPRD, PRDKit) don't validate ideas against real-world data. Validation tools (ValidIQ) don't produce PRDs. IdeaForge is the first to combine both — research-backed PRD generation in a single flow.

**Target users**: Developers and indie hackers (MVP primary), product managers and non-technical founders (future).

## User Flow

```
1. INPUT          2. CLARIFY           3. RESEARCH
┌──────────┐     ┌──────────────┐     ┌───────────────────┐
│ User types│────▶│ AI asks 3-5  │────▶│ Parallel agents   │
│ rough idea│     │ questions to │     │ search HN/Reddit/ │
│           │     │ refine scope │     │ Tavily             │
└──────────┘     └──────────────┘     │ (real-time stream) │
                                      └────────┬──────────┘
                                               │
6. EXPORT        5. REVIEW            4. GENERATE
┌──────────┐     ┌──────────────┐     ┌───────────────────┐
│ Download  │◀───│ User reviews │◀───│ AI writes PRD     │
│ Markdown  │     │ edits inline │     │ with citations    │
│           │     │ or gives     │     │ from research     │
└──────────┘     │ feedback     │     └───────────────────┘
                 │              │
                 │  ┌─────────┐ │
                 │  │ PIVOT?  │ │  ← User can change direction
                 │  │ Go to 3 │ │    triggers new research
                 │  └─────────┘ │
                 └──────────────┘
```

### Interaction Details

1. **Input** — Natural language, no forms. One sentence or a paragraph.
2. **Clarify** — AI asks one question at a time (target users? problem? competitors? business model?). Multiple choice preferred.
3. **Research** — Parallel agents search in real-time. UI shows progress per source and key findings as they arrive.
4. **Generate** — PRD generated based on research data. Depth is configurable (light vs detailed).
5. **Review** — User reviews in chat. Can edit sections, request additions, **pivot** (change direction → re-research), or approve.
6. **Export** — Download as Markdown file, ready to paste into Claude Code / OpenCode.

## Architecture: Supervisor + Parallel Send

### Graph Topology

```
                         START
                           │
                    ┌──────▼──────┐
                    │  Clarifier  │ ◄── Chat-style questions, interrupt() for user input
                    │  Agent      │
                    └──────┬──────┘
                           │ (idea refined)
                    ┌──────▼──────┐
                    │  Research   │ ◄── Generates search queries per source
                    │  Planner    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Parallel   │ ◄── Send() fan-out
                    │  Research   │
                    │  ┌───┬───┐  │     3 searchers in parallel (MVP)
                    │  HN  RD  TV │     Real-time streaming results
                    │  └───┴───┘  │
                    └──────┬──────┘
                           │ (all results in)
                    ┌──────▼──────┐
                    │ Synthesizer │ ◄── Merge findings, extract key insights
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ PRD Writer  │ ◄── Generate PRD sections with citations
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Reviewer   │ ◄── interrupt() for user approval
                    │  (HITL)     │
                    └──────┬──────┘
                      ┌────┼────┐
                      ▼    ▼    ▼
                   PIVOT EDIT  APPROVE
                     │    │      │
                     │    │   ┌──▼──┐
                     │    │   │ END │ → Export Markdown
                     │    │   └─────┘
                     │    └──► PRD Writer (re-write section)
                     └──► Research Planner (new queries, re-search)
```

### Agent Responsibilities

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Clarifier** | Product manager | User's rough idea | Structured RefinedIdea |
| **Research Planner** | Research strategist | RefinedIdea | Search queries per source |
| **HN/Reddit/Tavily Searcher** | Data collector | Query + source | SearchResults + relevance scores |
| **Synthesizer** | Analyst | All search results | ResearchInsights (signals, pain points, risks, opportunities) |
| **PRD Writer** | Technical writer | Insights + RefinedIdea + depth config | PRD sections with citations |
| **Reviewer** | Approval controller | PRD + user feedback | Routing decision (pivot/edit/approve) |

### HITL Interrupt Points

| Interrupt | Trigger | User Action | Resume Target |
|-----------|---------|-------------|---------------|
| **Clarification** | Each question from Clarifier | Answer question | Clarifier continues or → Research |
| **Research Review** | All searches complete (optional) | Review findings, decide to continue | Re-research or → Writer |
| **PRD Review** | PRD generation complete | Approve / Edit / Pivot | Export / Re-write / Re-research |

### Pivot Mechanism

When user says "actually, B2B is better than B2C" during review:

1. Reviewer detects pivot intent
2. `Command(goto="research_planner")` with updated idea
3. Research Planner generates new queries (preserves useful prior findings)
4. Re-run parallel search → Synthesize → New PRD
5. Checkpoint preserves full history — user can time-travel back to previous versions

## State Schema

```python
class IdeaForgeState(TypedDict):
    # Core conversation
    messages: Annotated[list[AnyMessage], add_messages]

    # Idea refinement
    raw_idea: str
    refined_idea: RefinedIdea | None
    clarification_round: int

    # Research
    search_queries: list[SearchQuery]
    research_results: Annotated[list[SourceResult], operator.add]
    insights: ResearchInsights | None

    # PRD
    prd_config: PRDConfig
    prd_draft: str | None
    prd_version: int

    # Workflow control
    phase: Literal["clarifying", "planning", "researching",
                   "synthesizing", "writing", "reviewing", "done"]
    pivot_history: Annotated[list[PivotRecord], operator.add]

    # HITL
    pending_interrupt: InterruptType | None
    user_feedback: str | None
```

### Pydantic Models

```python
class RefinedIdea(BaseModel):
    title: str
    problem: str
    target_users: list[str]
    core_features: list[str]
    business_model: str | None
    constraints: list[str]

class SearchQuery(BaseModel):
    source: Literal["hacker_news", "reddit", "tavily"]
    query: str
    intent: str  # Why this search — used for citation

class SourceResult(BaseModel):
    source: str
    query: str
    items: list[SearchItem]
    searched_at: datetime

class SearchItem(BaseModel):
    title: str
    url: str
    snippet: str
    relevance_score: float        # 0-1
    sentiment: Literal["positive", "negative", "neutral"]
    key_takeaway: str             # AI-extracted insight

class ResearchInsights(BaseModel):
    market_signals: list[str]
    user_pain_points: list[str]
    existing_solutions: list[str]
    opportunities: list[str]
    risks: list[str]
    recommendation: str

class PRDConfig(BaseModel):
    depth: Literal["light", "detailed"]
    sections: list[str]
    # light: overview, problem, target_users, core_features, mvp_scope, success_metrics
    # detailed: above + user_stories, data_model, api_design, tech_stack, milestones, edge_cases

class PivotRecord(BaseModel):
    from_idea: str
    to_idea: str
    reason: str
    timestamp: datetime
```

## Data Sources (MVP — All Free)

| Source | API | Cost | Purpose |
|--------|-----|------|---------|
| **Hacker News** | Algolia HN Search API | Free | Tech trends, developer feedback |
| **Reddit** | Official Reddit API | Free (non-commercial, 100 QPM) | User pain points, community discussions |
| **Web Search** | Tavily | Free (1K credits/month) | General search, supplementary info |

### Future Sources (Post-MVP)

| Source | API | Cost |
|--------|-----|------|
| Twitter/X | TwitterAPI.io | $0.15/1K tweets |
| Product Hunt | GraphQL API v2 | Free |

## Frontend Architecture

### UI Aesthetic: Minimalist / Restrained

**Style**: Monochrome-dominant, generous whitespace, subtle motion, typographic hierarchy. Premium feel with restraint — no unnecessary color.

### Color System

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Background | `#09090b` (Zinc 950) | `#fafafa` (Zinc 50) |
| Surface | `#18181b` (Zinc 900) | `#f4f4f5` (Zinc 100) |
| Border | `#27272a` (Zinc 800) | `#e4e4e7` (Zinc 200) |
| Text Primary | `#fafafa` | `#09090b` |
| Text Secondary | `#a1a1aa` (Zinc 400) | `#71717a` (Zinc 500) |
| Accent | `#e4e4e7` (Zinc 200) | `#27272a` (Zinc 800) |
| Interactive Hover | `#f4f4f5` | `#e4e4e7` |
| Status: Active | `#d4d4d8` + subtle glow | — |
| Status: Done | `#a1a1aa` + ✓ | — |

Only color exception: Amber (`#f59e0b`) for pivot/warning semantic signals. Everything else is monochrome.

### Typography

- Headings: Inter/Geist, light weight (300), generous letter-spacing
- Body: Inter, regular (400)
- PRD content: Geist Mono (generating) → Inter (final), signaling transition from "in-progress" to "complete"

### Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  IdeaForge                                         [History] [⚙]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Chat Area (main) ──────────────────┐  ┌─ Research Panel ────┐  │
│  │                                      │  │ (slides in during   │  │
│  │  AI: What's your idea?              │  │  research phase)    │  │
│  │                                      │  │                     │  │
│  │  User: I want to build...           │  │  ▶ HN ✓  3 found   │  │
│  │                                      │  │  ▶ Reddit ⟳ ...    │  │
│  │  AI: Who are your target users?     │  │  ▶ Tavily ⟳ ...    │  │
│  │   ○ Developers                      │  │                     │  │
│  │   ○ Product Managers                │  │  ── Key Insights ── │  │
│  │   ○ Non-technical founders          │  │  • pain point A     │  │
│  │                                      │  │  • market signal B  │  │
│  │  ┌─ PRD Preview ──────────────────┐ │  │  • risk C           │  │
│  │  │ # Product Requirements Doc     │ │  │                     │  │
│  │  │ ## Problem Statement           │ │  └─────────────────────┘  │
│  │  │ ...               [Edit] [Copy]│ │                           │
│  │  └────────────────────────────────┘ │                           │
│  │                                      │                           │
│  │  ┌────────────────────────────────┐ │                           │
│  │  │ Type feedback or "approve"     │ │                           │
│  │  └────────────────────────────────┘ │                           │
│  └──────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

- **Desktop** (≥1024px): Chat + Research Panel side by side
- **Tablet** (768-1024px): Research Panel becomes bottom sheet
- **Mobile** (<768px): Research Panel becomes swipe-up modal

### Animation Design

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Message bubble | fade-in + slide-up (8px) | 300ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Research Panel | slide-in from right | 400ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Source Card completion | skeleton → crossfade to content | 300ms | ease-out |
| Search active state | slow opacity pulse | 2s cycle | sine |
| Insight chips | stagger fade-in + scale | 200ms each, 80ms stagger | spring(0.5, 0.8) |
| PRD sections | token-by-token fade-in | per-token | linear |
| Phase indicator | smooth width transition | 500ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Pivot toast | brief overlay flash + dissolve | 600ms | ease-in-out |
| History drawer | slide-in from left | 300ms | cubic-bezier(0.16, 1, 0.3, 1) |

**Principles**: Purposeful motion only. No bounce, no overshoot. Slow, smooth, breathing. Every animation conveys information.

### Core Components

| Component | Function |
|-----------|----------|
| `chat-area` | Main interaction zone — messages, choices, PRD preview |
| `message-bubble` | Individual message with role-based styling and fade-in |
| `choice-card` | Multiple choice options for clarification questions |
| `input-bar` | Text input with subtle focus animation |
| `research-panel` | Right panel showing search progress and findings |
| `source-card` | Per-source status (skeleton → loading → done) |
| `insight-chip` | Key finding tag with hover expand |
| `prd-preview` | Markdown-rendered PRD with inline edit and copy |
| `phase-indicator` | Top progress: Clarify → Research → Generate → Review |
| `history-drawer` | Left drawer for past sessions |

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 15 (App Router) | Familiar, good code organization |
| UI Components | shadcn/ui | Headless + Tailwind, full aesthetic control |
| Styling | Tailwind CSS | Atomic, precise control for minimalist design |
| Animation | Framer Motion | Spring physics, layout animation, AnimatePresence |
| State | Zustand | Lightweight, familiar |
| Markdown | react-markdown + remark-gfm | PRD rendering |
| Backend | FastAPI | WebSocket + REST, native async |
| Agent Framework | LangGraph | Supervisor + Send + HITL interrupt |
| LLM | GLM-5 (ZhipuAI) | User's existing API key, via init_chat_model |
| Checkpointer | SQLite (dev) → PostgreSQL (prod) | Consistent with existing project |
| Search Tools | Algolia HN API, Reddit API, Tavily | All free |
| Python Package Manager | uv | Fast |
| JS Package Manager | pnpm | Fast |

### GLM-5 Integration

```python
from langchain.chat_models import init_chat_model

model = init_chat_model(
    model="glm-5",
    model_provider="zhipuai",
    api_key=os.environ["ZHIPUAI_API_KEY"],
    temperature=0.7,
)
```

## Project Structure

```
ideaforge/
├── pyproject.toml
├── .env.example
├── docker-compose.yml
│
├── backend/
│   ├── server.py                   # FastAPI app factory
│   ├── api/
│   │   ├── chat.py                 # POST /api/session, GET /api/session/:id
│   │   ├── history.py              # GET /api/history
│   │   └── export.py               # GET /api/export/:id
│   ├── ws/
│   │   └── stream.py               # WebSocket /ws/session/{thread_id}
│   └── models.py                   # Request/Response schemas
│
├── agents/
│   ├── graph.py                    # Top-level PRD Director graph
│   ├── state.py                    # IdeaForgeState + Pydantic models
│   ├── config.py                   # PRDConfig, model config
│   ├── nodes/
│   │   ├── clarifier.py            # Clarifier agent
│   │   ├── planner.py              # Research Planner
│   │   ├── searchers.py            # HN/Reddit/Tavily searcher nodes
│   │   ├── synthesizer.py          # Research synthesizer
│   │   ├── writer.py               # PRD Writer
│   │   └── reviewer.py             # HITL Review router
│   ├── tools/
│   │   ├── hn.py                   # Algolia HN Search
│   │   ├── reddit.py               # Reddit API
│   │   └── tavily.py               # Tavily Search
│   └── memory/
│       ├── checkpointer.py         # SQLite/Postgres checkpointer
│       └── store.py                # Session history store
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── chat/
│   │   │   ├── chat-area.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   ├── choice-card.tsx
│   │   │   └── input-bar.tsx
│   │   ├── research/
│   │   │   ├── research-panel.tsx
│   │   │   ├── source-card.tsx
│   │   │   └── insight-chip.tsx
│   │   ├── prd/
│   │   │   ├── prd-preview.tsx
│   │   │   └── prd-editor.tsx
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── phase-indicator.tsx
│   │   │   └── history-drawer.tsx
│   │   └── ui/                     # shadcn/ui primitives
│   ├── hooks/
│   │   ├── use-session.ts
│   │   └── use-animation.ts
│   ├── stores/
│   │   └── session-store.ts
│   └── lib/
│       ├── types.ts
│       └── constants.ts
│
└── tests/
    ├── unit/
    └── integration/
```

## Communication Protocol

### WebSocket `/ws/session/{thread_id}`

Server wraps `graph.stream(stream_mode=["messages","updates","custom"], subgraphs=True)` and pushes classified events.

**Server → Client:**

```json
{"type": "token",       "node": "writer",          "content": "The product..."}
{"type": "node_update", "node": "clarifier",        "data": {"phase": "clarifying"}}
{"type": "custom",      "event": "search_started",  "data": {"source": "hacker_news"}}
{"type": "custom",      "event": "search_result",   "data": {"source": "reddit", "item": {...}}}
{"type": "custom",      "event": "insight",          "data": {"type": "pain_point", "text": "..."}}
{"type": "interrupt",   "interrupt_type": "clarification", "data": {"question": "...", "choices": [...]}}
{"type": "interrupt",   "interrupt_type": "prd_review",    "data": {"prd": "...", "version": 1}}
{"type": "complete",    "prd": "..."}
{"type": "error",       "message": "..."}
```

**Client → Server:**

```json
{"type": "resume", "value": "approve"}
{"type": "resume", "value": {"choice": "Developers"}}
{"type": "resume", "value": "pivot: focus on B2B instead"}
{"type": "resume", "value": "edit: add competitor analysis section"}
```

### REST Endpoints

| Endpoint | Method | Function |
|----------|--------|----------|
| `/api/session` | POST | Start new session. Body: `{idea, config?}`. Returns `{thread_id}`. |
| `/api/session/{id}` | GET | Get session status/state. |
| `/api/history` | GET | List past sessions. |
| `/api/export/{id}` | GET | Download PRD as Markdown file. |

## Implementation Phases

| Phase | Goal | Deliverables |
|-------|------|-------------|
| **P1: Agent Core** | LangGraph graph working end-to-end | CLI usable: idea → clarify → search → PRD |
| **P2: Backend API** | FastAPI + WebSocket bridge | REST + WS, frontend can communicate |
| **P3: Chat UI** | Basic chat interface | Conversation, agent replies, multiple choice |
| **P4: Research Panel** | Search visualization | Real-time progress, findings display |
| **P5: PRD Preview** | PRD rendering + editing | Markdown render, inline edit, export |
| **P6: Polish** | Animations, theme, responsive | Minimalist aesthetic, Framer Motion, dark/light |

P1-P3 is the critical path. After P3, the product is end-to-end usable.
