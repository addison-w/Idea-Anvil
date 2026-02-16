# UX Refactor: Activity Feed & Rich Phase Progress

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the opaque "typing dots → suddenly done" UX with a rich, real-time activity feed that shows users exactly what's happening at every phase — especially during research where sources are fetched in parallel.

**Architecture:** Add granular backend events (search_started, queries_generated, synthesis_started) → new frontend ActivityLog component that renders an animated timeline inside the chat area → enhanced source cards with query text and individual result items. The activity log is inline (not a sidebar) so it works on all screen sizes.

**Tech Stack:** Python/FastAPI (backend events), React/TypeScript, Framer Motion, Zustand, Lucide icons

---

## Current Problems

1. **Research is a black box** — user sees typing dots, then suddenly source cards flip to "done". No indication of what's being searched or found.
2. **Planning/synthesizing are invisible** — user doesn't know the system is "generating search strategy" or "analyzing results".
3. **Research panel is desktop-only** — `hidden lg:block` means mobile users see nothing during research.
4. **No per-source search queries shown** — backend generates specific queries but never tells the frontend what they are.
5. **Source cards are minimal** — just a label + count, no query text, no individual results.

## Design: Inline Activity Log

Instead of relying solely on the sidebar (which is invisible on mobile), we add an **Activity Log** component directly in the chat area. It appears automatically during non-interactive phases (planning → researching → synthesizing → writing) and shows a vertical timeline of events:

```
┌─────────────────────────────────────────────┐
│  ● Planning research strategy...            │  ← appears during planning
│  ✓ Generated 4 search queries               │  ← when queries arrive
│                                             │
│  ● Searching Hacker News                    │  ← search_started event
│    "habit tracker app user experience"      │  ← query text shown
│  ✓ Hacker News — 15 results                 │  ← search_result event
│                                             │
│  ● Searching Reddit                         │
│    "daily habits tracking frustrated"       │
│  ✓ Reddit — 12 results                      │
│                                             │
│  ● Searching Tavily                         │
│    "habit tracking market analysis 2024"    │
│  ✓ Tavily — 18 results                      │
│                                             │
│  ● Searching Product Hunt                   │
│    "habit tracker productivity app"         │
│  ✓ Product Hunt — 8 results                 │
│                                             │
│  ● Analyzing 53 sources...                  │  ← synthesis_started event
│  ✓ Research complete                        │  ← synthesis done
│                                             │
│  ● Generating PRD...                        │  ← writing phase
└─────────────────────────────────────────────┘
```

Each line animates in with a stagger. Active items have a pulsing dot. Completed items show a green checkmark with a spring animation. The whole log is collapsible (auto-expanded during research, collapsed after).

---

## Task 1: Backend — Add Granular WebSocket Events

**Files:**
- Modify: `backend/ws/stream.py` — enhance `classify_stream_event()` to emit new event types
- Modify: `agents/nodes/planner.py` — emit `queries_generated` phase marker
- Modify: `agents/nodes/synthesizer.py` — emit `synthesis_started` phase marker

### Step 1: Add search_queries and search_started events to classify_stream_event

In `backend/ws/stream.py`, enhance `classify_stream_event()` to emit:
1. `queries_generated` event when planner output includes search_queries
2. `search_started` event with source name and query text when a searcher node starts (before results)

```python
def classify_stream_event(event: dict, namespace: tuple) -> list[dict]:
    if not event:
        return []

    results: list[dict] = []

    for node_name, node_data in event.items():
        if node_name == "__interrupt__":
            continue
        if not isinstance(node_data, dict):
            continue

        messages = node_data.get("messages", [])
        phase = node_data.get("phase")
        research_results = node_data.get("research_results", [])
        search_queries = node_data.get("search_queries", [])

        if phase:
            results.append({"type": "node_update", "node": node_name, "data": {"phase": phase}})

        # NEW: Emit search queries when planner generates them
        if search_queries:
            queries_data = []
            for q in search_queries:
                if hasattr(q, "model_dump"):
                    queries_data.append(q.model_dump())
                elif isinstance(q, dict):
                    queries_data.append(q)
            results.append({
                "type": "custom",
                "node": node_name,
                "event": "queries_generated",
                "data": {"queries": queries_data},
            })

        if messages and node_name in ("clarifier", "reviewer"):
            if not phase or phase == "clarifying":
                last_msg = messages[-1]
                if hasattr(last_msg, "content") and last_msg.content:
                    results.append({
                        "type": "token",
                        "node": node_name,
                        "content": strip_think(last_msg.content),
                    })

        if research_results:
            for r in research_results:
                source = r.source if hasattr(r, "source") else r.get("source", "")
                query = r.query if hasattr(r, "query") else r.get("query", "")
                items = r.items if hasattr(r, "items") else r.get("items", [])
                results.append({
                    "type": "custom",
                    "node": node_name,
                    "event": "search_result",
                    "data": {
                        "source": source,
                        "query": query,
                        "count": len(items),
                    },
                })

    return results
```

### Step 2: Verify backend changes

Run: `curl -s http://localhost:8000/docs | head -5` to confirm server still serves.

### Step 3: Commit

```bash
git add backend/ws/stream.py
git commit -m "feat(backend): emit granular search events (queries_generated, per-source search_result with query)"
```

---

## Task 2: Frontend Types & Store — Add Activity Log State

**Files:**
- Modify: `frontend/lib/types.ts` — add ActivityEvent type
- Modify: `frontend/stores/session-store.ts` — add activityLog state, addActivity action, and searchQueries state

### Step 1: Add types

In `frontend/lib/types.ts`, add:

```typescript
export interface ActivityEvent {
  id: string
  type: 'phase' | 'query' | 'search_start' | 'search_done' | 'synthesis' | 'writing' | 'info'
  label: string
  detail?: string        // e.g. query text, source count
  status: 'active' | 'done'
  timestamp: number
  source?: string        // e.g. "hacker_news"
}

export interface SearchQueryInfo {
  source: string
  query: string
  intent: string
}
```

### Step 2: Add store state

In `frontend/stores/session-store.ts`, add to the interface and state:

```typescript
// In SessionState interface, add:
activityLog: ActivityEvent[]
searchQueries: SearchQueryInfo[]
addActivity: (event: ActivityEvent) => void
completeActivity: (id: string) => void
setSearchQueries: (queries: SearchQueryInfo[]) => void

// In initialState, add:
activityLog: [],
searchQueries: [],

// In create(), add actions:
addActivity: (event) =>
  set((state) => ({ activityLog: [...state.activityLog, event] })),

completeActivity: (id) =>
  set((state) => ({
    activityLog: state.activityLog.map((e) =>
      e.id === id ? { ...e, status: 'done' as const } : e
    ),
  })),

setSearchQueries: (queries) => set({ searchQueries: queries }),

// In reset(), add:
activityLog: [],
searchQueries: [],
```

### Step 3: Commit

```bash
git add frontend/lib/types.ts frontend/stores/session-store.ts
git commit -m "feat(store): add activityLog and searchQueries state for rich phase progress"
```

---

## Task 3: Frontend Hook — Handle New Backend Events

**Files:**
- Modify: `frontend/hooks/use-session.ts` — handle queries_generated, search_started events, and auto-generate activity events on phase changes

### Step 1: Update handleWSEvent

Enhance the `custom` case and `node_update` case in `handleWSEvent`:

```typescript
case 'node_update': {
  const phase = (event.data?.phase as Phase) ?? null
  if (phase) {
    store.setPhase(phase)

    // Auto-generate activity events for phase transitions
    if (phase === 'planning') {
      store.addActivity({
        id: crypto.randomUUID(),
        type: 'phase',
        label: 'Planning research strategy',
        status: 'active',
        timestamp: Date.now(),
      })
    } else if (phase === 'synthesizing') {
      // Complete all search activities
      const log = useSessionStore.getState().activityLog
      log.filter(e => e.type === 'search_start' && e.status === 'active')
        .forEach(e => store.completeActivity(e.id))

      store.addActivity({
        id: crypto.randomUUID(),
        type: 'synthesis',
        label: 'Analyzing research findings',
        status: 'active',
        timestamp: Date.now(),
      })
    } else if (phase === 'writing') {
      // Complete synthesis activity
      const log = useSessionStore.getState().activityLog
      log.filter(e => e.type === 'synthesis' && e.status === 'active')
        .forEach(e => store.completeActivity(e.id))

      store.addActivity({
        id: crypto.randomUUID(),
        type: 'writing',
        label: 'Generating PRD',
        status: 'active',
        timestamp: Date.now(),
      })
    } else if (phase === 'reviewing') {
      // Complete writing activity
      const log = useSessionStore.getState().activityLog
      log.filter(e => e.status === 'active')
        .forEach(e => store.completeActivity(e.id))
    }
  }
  // ... rest of existing fallback logic
  break
}

case 'custom': {
  // NEW: Handle queries_generated event
  if (event.event === 'queries_generated' && event.data) {
    const queries = (event.data.queries as SearchQueryInfo[]) || []
    store.setSearchQueries(queries)

    // Complete the "planning" activity
    const log = useSessionStore.getState().activityLog
    log.filter(e => e.type === 'phase' && e.status === 'active')
      .forEach(e => store.completeActivity(e.id))

    store.addActivity({
      id: crypto.randomUUID(),
      type: 'info',
      label: `Generated ${queries.length} search queries`,
      status: 'done',
      timestamp: Date.now(),
    })

    // Pre-generate search_start activities for each source
    for (const q of queries) {
      store.addActivity({
        id: `search-${q.source}`,
        type: 'search_start',
        label: `Searching ${sourceLabel(q.source)}`,
        detail: q.query,
        status: 'active',
        timestamp: Date.now(),
        source: q.source,
      })
      // Also set source status to "searching"
      store.updateSource(q.source, { status: 'searching' })
    }
  }

  // ENHANCED: Handle search_result event with query text
  if ((event.event === 'source_update' || event.event === 'search_result') && event.data) {
    const data = event.data as { source?: string; count?: number; query?: string }
    const source = data.source
    if (source) {
      store.updateSource(source, {
        status: 'done',
        ...(data.count !== undefined && { resultCount: data.count }),
      })

      // Complete the matching search_start activity
      store.completeActivity(`search-${source}`)

      // Add a "done" activity
      store.addActivity({
        id: crypto.randomUUID(),
        type: 'search_done',
        label: `${sourceLabel(source)} — ${data.count || 0} results`,
        status: 'done',
        timestamp: Date.now(),
        source: source,
      })
    }
  }

  // ... rest of existing prd_token, assistant_message handling
  break
}
```

Add a helper function at the top of the file:

```typescript
const sourceLabel = (source: string): string => {
  const labels: Record<string, string> = {
    hacker_news: 'Hacker News',
    reddit: 'Reddit',
    tavily: 'Tavily',
    product_hunt: 'Product Hunt',
  }
  return labels[source] || source
}
```

### Step 2: Commit

```bash
git add frontend/hooks/use-session.ts
git commit -m "feat(hook): handle granular backend events and auto-generate activity log entries"
```

---

## Task 4: Frontend — Build ActivityLog Component

**Files:**
- Create: `frontend/components/chat/activity-log.tsx`

### Step 1: Build the component

This is the core UX improvement. A collapsible vertical timeline that renders inside the chat area. It shows animated entries for each phase event.

```tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Brain, FileText, ChevronDown, ChevronUp, Sparkles, Check } from 'lucide-react'
import { useSessionStore } from '@/stores/session-store'
import { ANIMATION } from '@/lib/constants'
import type { ActivityEvent } from '@/lib/types'

const typeIcons: Record<string, typeof Search> = {
  phase: Sparkles,
  query: Search,
  search_start: Search,
  search_done: Check,
  synthesis: Brain,
  writing: FileText,
  info: Sparkles,
}

function ActivityItem({ event, isLast }: { event: ActivityEvent; isLast: boolean }) {
  const Icon = typeIcons[event.type] || Sparkles
  const isActive = event.status === 'active'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{
        opacity: { duration: 0.2, delay: 0.05 },
        height: { duration: 0.2, ease: 'easeOut' },
      }}
      className="flex gap-3"
    >
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className="relative flex size-5 shrink-0 items-center justify-center">
          {isActive ? (
            <motion.div
              className="size-2 rounded-full bg-zinc-400"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check className="size-3 text-emerald-400/70" />
            </motion.div>
          )}
        </div>
        {!isLast && (
          <motion.div
            className="w-px flex-1 bg-white/[0.06]"
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          <Icon className={`size-3 ${isActive ? 'text-zinc-400' : 'text-zinc-600'}`} />
          <span className={`text-xs ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
            {event.label}
          </span>
        </div>
        {event.detail && (
          <p className="mt-1 ml-5 text-[11px] text-zinc-600 italic truncate max-w-xs">
            "{event.detail}"
          </p>
        )}
      </div>
    </motion.div>
  )
}

export function ActivityLog() {
  const activityLog = useSessionStore((s) => s.activityLog)
  const phase = useSessionStore((s) => s.phase)
  const [isExpanded, setIsExpanded] = useState(true)

  // Auto-expand when new activities arrive during research
  useEffect(() => {
    if (['planning', 'researching', 'synthesizing'].includes(phase)) {
      setIsExpanded(true)
    }
  }, [phase, activityLog.length])

  // Auto-collapse after research completes
  useEffect(() => {
    if (phase === 'writing' || phase === 'reviewing' || phase === 'done') {
      const timer = setTimeout(() => setIsExpanded(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [phase])

  if (activityLog.length === 0) return null

  const hasActive = activityLog.some((e) => e.status === 'active')
  const doneCount = activityLog.filter((e) => e.status === 'done').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/40 backdrop-blur-sm"
    >
      {/* Header — always visible, clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-900/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {hasActive ? (
            <motion.div
              className="size-1.5 rounded-full bg-zinc-400"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          ) : (
            <div className="size-1.5 rounded-full bg-emerald-400/60" />
          )}
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            {hasActive ? 'Working' : 'Complete'}
          </span>
          <span className="text-[10px] text-zinc-700">
            {doneCount}/{activityLog.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="size-3 text-zinc-600" />
        ) : (
          <ChevronDown className="size-3 text-zinc-600" />
        )}
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04] px-4 pt-3 pb-1">
              {activityLog.map((event, i) => (
                <ActivityItem
                  key={event.id}
                  event={event}
                  isLast={i === activityLog.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

### Step 2: Commit

```bash
git add frontend/components/chat/activity-log.tsx
git commit -m "feat(ui): add ActivityLog component with animated timeline for phase progress"
```

---

## Task 5: Frontend — Integrate ActivityLog into ChatArea

**Files:**
- Modify: `frontend/components/chat/chat-area.tsx` — insert ActivityLog between messages and PRD preview

### Step 1: Add ActivityLog to ChatArea

Import and render `ActivityLog` after messages but before PrdPreview. It should appear when the phase is non-interactive (planning, researching, synthesizing, writing):

```tsx
import { ActivityLog } from './activity-log'

// Inside the chat area scroll content, after messages + typing indicator, before PrdPreview:
{/* Activity log — shows during non-interactive phases */}
{(['planning', 'researching', 'synthesizing', 'writing', 'reviewing', 'done'].includes(phase)) && (
  <ActivityLog />
)}

{prdDraft && (
  <PrdPreview ... />
)}
```

### Step 2: Commit

```bash
git add frontend/components/chat/chat-area.tsx
git commit -m "feat(ui): integrate ActivityLog into chat area for inline phase progress"
```

---

## Task 6: Frontend — Enhance Source Cards with Query Text

**Files:**
- Modify: `frontend/lib/types.ts` — add `query` field to SourceStatus
- Modify: `frontend/stores/session-store.ts` — pass query text to source updates
- Modify: `frontend/components/research/source-card.tsx` — display query text under source name

### Step 1: Add query field to SourceStatus

In types.ts:
```typescript
export interface SourceStatus {
  source: string
  status: 'pending' | 'searching' | 'done' | 'error'
  resultCount: number
  insights: string[]
  query?: string  // NEW: the actual search query used
}
```

### Step 2: Update hook to pass query text

In `use-session.ts`, when handling `queries_generated`, update the source with query text:
```typescript
store.updateSource(q.source, { status: 'searching', query: q.query })
```

### Step 3: Update SourceCard to show query

In `source-card.tsx`, add a line below the source label:
```tsx
{source.query && (
  <p className="text-[10px] text-zinc-700 truncate max-w-[180px] mt-0.5 italic">
    {source.query}
  </p>
)}
```

### Step 4: Commit

```bash
git add frontend/lib/types.ts frontend/stores/session-store.ts frontend/components/research/source-card.tsx
git commit -m "feat(ui): show search query text in source cards"
```

---

## Task 7: Frontend — Add Phase Status Text to Header

**Files:**
- Modify: `frontend/components/layout/phase-indicator.tsx` — add animated status text below progress bar showing what's happening now

### Step 1: Add status text

Below the progress bar in PhaseIndicator, add a small animated text that describes the current sub-phase:

```tsx
const phaseStatusText: Partial<Record<Phase, string>> = {
  clarifying: 'Refining your idea...',
  planning: 'Generating search strategy...',
  researching: 'Searching across sources...',
  synthesizing: 'Analyzing findings...',
  writing: 'Composing your PRD...',
  reviewing: 'Ready for your review',
  done: 'Complete',
}

// After the progress bar div:
<AnimatePresence mode="wait">
  {phaseStatusText[phase] && (
    <motion.p
      key={phase}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="text-[10px] text-zinc-600 text-center"
    >
      {phaseStatusText[phase]}
    </motion.p>
  )}
</AnimatePresence>
```

### Step 2: Commit

```bash
git add frontend/components/layout/phase-indicator.tsx
git commit -m "feat(ui): add animated phase status text below progress bar"
```

---

## Task 8: E2E Verification

### Step 1: Restart backend to pick up changes

```bash
# Kill and restart backend
pkill -f "uvicorn backend.server" && sleep 1
nohup uvicorn backend.server:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
```

### Step 2: Run a full E2E flow

1. Navigate to http://localhost:3000
2. Enter an idea
3. Complete clarification (5 rounds)
4. **Verify during planning phase:** Activity log appears with "Planning research strategy..."
5. **Verify queries_generated:** Activity log shows "Generated N search queries" and individual search entries
6. **Verify during research:** Each source shows "Searching [Source]" with query text, then flips to "[Source] — N results"
7. **Verify synthesis:** "Analyzing research findings..." appears
8. **Verify writing:** "Generating PRD..." appears, then auto-collapses
9. **Verify source cards:** Query text shown under source name
10. **Verify phase indicator:** Status text updates at each phase
11. **Verify mobile:** Resize to <1024px and confirm activity log is visible inline

### Step 3: Check for console errors

No errors, no warnings, no TypeScript build errors.

### Step 4: Final commit

```bash
git add -A
git commit -m "feat: rich activity feed with real-time phase progress during research"
```

---

## Summary of Changes

| Layer | File | Change |
|-------|------|--------|
| Backend | `stream.py` | Emit `queries_generated` with query data, per-source `search_result` with query text |
| Types | `types.ts` | Add `ActivityEvent`, `SearchQueryInfo`, `query` to `SourceStatus` |
| Store | `session-store.ts` | Add `activityLog`, `searchQueries`, `addActivity`, `completeActivity` |
| Hook | `use-session.ts` | Handle new events, auto-generate activity entries on phase transitions |
| UI | `activity-log.tsx` | NEW: Animated collapsible timeline component |
| UI | `chat-area.tsx` | Integrate ActivityLog inline |
| UI | `source-card.tsx` | Show query text under source name |
| UI | `phase-indicator.tsx` | Add animated status text |

**Total new files:** 1  
**Total modified files:** 7  
**Estimated implementation time:** 45-60 minutes
