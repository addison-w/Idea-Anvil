# ⚒️ Idea Anvil

**Turn rough ideas into validated, implementation-ready PRDs**

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-latest-green)](https://github.com/langchain-ai/langgraph)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is this?

You have a product idea. It's rough. Maybe half-baked. You're not sure if it's worth building.

**Idea Anvil** is an AI-powered platform that takes your rough idea and turns it into a validated, implementation-ready Product Requirements Document (PRD). It doesn't just write a spec — it researches real-world data from Hacker News, Reddit, Product Hunt, and the web to validate your idea first.

Think of it as having a product manager who does market research before writing the PRD.

```
Input → Clarify → Research → Synthesize → Generate → Review → Export
  💡      ❓         🔍          🧠           📝         ✅       📄
```

**First tool to combine idea validation with PRD generation in a single flow.**

---

## ✨ Features

- 🔍 **Multi-source parallel research** — searches Hacker News, Reddit, Product Hunt, and Tavily simultaneously
- 🤝 **Human-in-the-loop** — AI asks clarifying questions before researching, lets you review before exporting
- 🔄 **Pivot mechanism** — change direction mid-flow without starting over
- 📊 **Configurable depth** — light (1-2 pages) or detailed (5-10 pages with user stories, data models, API design)
- ⚡ **Real-time streaming** — WebSocket updates as research happens
- 📝 **Export-ready** — Markdown PRDs optimized for Claude Code and AI coding assistants
- 🎨 **Modern UI** — Linear/Vercel/Raycast-inspired dark theme
- 💾 **Session history** — resume or review past projects

---

## 🚀 Quick Start

### Docker (recommended)

```bash
git clone https://github.com/addison-w/Idea-Anvil.git
cd Idea-Anvil
cp .env.example .env  # Add your API keys
docker compose up
```

Frontend: http://localhost:3000  
Backend: http://localhost:8000

### Manual Setup

**Backend:**
```bash
uv sync --extra backend
uv run uvicorn backend.server:app --reload
```

**Frontend:**
```bash
cd frontend
pnpm install
pnpm dev
```

**Environment variables** (`.env`):
```bash
OPENAI_API_KEY=your_key_here
OPENAI_API_BASE=https://api.openai.com/v1  # Optional, for OpenAI-compatible APIs
TAVILY_API_KEY=your_tavily_key
REDDIT_CLIENT_ID=your_reddit_id
REDDIT_CLIENT_SECRET=your_reddit_secret
REDDIT_USER_AGENT=IdeaAnvil/1.0
```

---

## 🏗️ How It Works

```
┌─────────────┐
│   You type  │  "I want to build a tool for developers to..."
│  rough idea │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Clarifier  │  AI asks 3-5 multiple-choice questions
│    Agent    │  (acts as product manager)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Research   │  Plans search queries for each data source
│   Planner   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Parallel Searchers (LangGraph Send())      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐   │
│  │  HN  │ │Reddit│ │Tavily│ │Product   │   │
│  │      │ │      │ │      │ │Hunt      │   │
│  └──────┘ └──────┘ └──────┘ └──────────┘   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
            ┌─────────────┐
            │ Synthesizer │  Extracts market signals, pain points, risks
            └──────┬──────┘
                   │
                   ▼
            ┌─────────────┐
            │ PRD Writer  │  Generates implementation-ready PRD
            └──────┬──────┘
                   │
                   ▼
            ┌─────────────┐
            │  Reviewer   │  You approve, edit, pivot, or export
            └─────────────┘
```

**Pivot mechanism**: Change your mind mid-flow? The reviewer lets you pivot to a new direction, triggering fresh research without losing context.

---

## 🛠️ Tech Stack

| Layer          | Technology                                      |
|----------------|-------------------------------------------------|
| **Backend**    | Python 3.12+, FastAPI, LangGraph, LangChain    |
| **Frontend**   | Next.js 15, React 19, Tailwind CSS 4, shadcn/ui|
| **LLM**        | Configurable (MiniMax-M2.5, OpenAI-compatible) |
| **Search**     | Hacker News, Reddit, Tavily, Product Hunt      |
| **Infra**      | Docker Compose, uv, pnpm                       |
| **State**      | SQLite (dev), PostgreSQL-ready (prod)          |
| **Streaming**  | WebSocket (real-time updates)                  |

---

## 📂 Project Structure

```
idea-anvil/
├── agents/          # LangGraph agent nodes + tools
│   ├── graph.py     # Main graph assembly (Supervisor + Parallel Send)
│   ├── state.py     # State schema + Pydantic models
│   ├── nodes/       # clarifier, planner, searchers, synthesizer, writer, reviewer
│   └── tools/       # hn, reddit, tavily, producthunt
├── backend/         # FastAPI server
│   ├── server.py    # App factory
│   ├── api/         # REST endpoints
│   └── ws/          # WebSocket streaming
├── frontend/        # Next.js 15 app
│   ├── app/         # Pages (App Router)
│   ├── components/  # Chat, research panel, PRD preview
│   ├── hooks/       # useSession
│   └── stores/      # Zustand session store
├── tests/
├── docker-compose.yml
└── pyproject.toml
```

---

## 🎯 Why Idea Anvil?

**Existing tools don't do both:**

- **ChatPRD / PRDKit**: Generate PRDs from prompts, but don't validate ideas with real-world data
- **ValidIQ**: Validates ideas with research, but doesn't produce PRDs
- **Idea Anvil**: Does both in a single flow

**Built for developers and indie hackers** who want to ship fast but validate first.

---

## 🤝 Contributing

Contributions welcome! This is an indie hacker project, so keep it scrappy.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/cool-thing`)
3. Commit your changes (`git commit -m 'Add cool thing'`)
4. Push to the branch (`git push origin feature/cool-thing`)
5. Open a Pull Request

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

---

## 🔮 Roadmap

- [ ] GitHub Issues integration (research existing issues for validation)
- [ ] Export to Notion, Linear, Jira
- [ ] Multi-language support
- [ ] Voice input for ideas
- [ ] Collaborative sessions (share PRD link with team)

---

**Built with ❤️ by indie hackers, for indie hackers.**

Got questions? Open an issue or start a discussion.
