import { create } from 'zustand'
import type { Phase, Message, SourceStatus, InterruptType, ActivityEvent, SearchQueryInfo, RefinedIdea } from '@/lib/types'

interface SessionState {
  threadId: string | null
  phase: Phase
  messages: Message[]
  isStreaming: boolean
  sources: Record<string, SourceStatus>
  prdDraft: string | null
  prdVersion: number
  pendingInterrupt: InterruptType | null
  activityLog: ActivityEvent[]
  searchQueries: SearchQueryInfo[]
  refinedIdea: RefinedIdea | null

  setThreadId: (id: string | null) => void
  setPhase: (phase: Phase) => void
  addMessage: (message: Message) => void
  appendToLastMessage: (content: string) => void
  setStreaming: (streaming: boolean) => void
  updateSource: (source: string, update: Partial<SourceStatus>) => void
  setPrdDraft: (prd: string | null) => void
  setPendingInterrupt: (interrupt: InterruptType | null) => void
  addActivity: (event: ActivityEvent) => void
  completeActivity: (id: string) => void
  setSearchQueries: (queries: SearchQueryInfo[]) => void
  setRefinedIdea: (idea: RefinedIdea | null) => void
  reset: () => void
}

const initialSources: Record<string, SourceStatus> = {
  hacker_news: { source: 'hacker_news', status: 'pending', resultCount: 0, insights: [] },
  reddit: { source: 'reddit', status: 'pending', resultCount: 0, insights: [] },
  tavily: { source: 'tavily', status: 'pending', resultCount: 0, insights: [] },
  product_hunt: { source: 'product_hunt', status: 'pending', resultCount: 0, insights: [] },
}

const initialState = {
  threadId: null,
  phase: 'idle' as Phase,
  messages: [],
  isStreaming: false,
  sources: { ...initialSources },
  prdDraft: null,
  prdVersion: 0,
  pendingInterrupt: null,
  activityLog: [],
  searchQueries: [],
  refinedIdea: null,
}

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setThreadId: (id) => set({ threadId: id }),

  setPhase: (phase) => set({ phase }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  appendToLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages]
      const last = messages[messages.length - 1]
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = { ...last, content: last.content + content }
      }
      return { messages }
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  updateSource: (source, update) =>
    set((state) => ({
      sources: {
        ...state.sources,
        [source]: { ...state.sources[source], ...update },
      },
    })),

  setPrdDraft: (prd) =>
    set((state) => ({
      prdDraft: prd,
      prdVersion: prd ? state.prdVersion + 1 : state.prdVersion,
    })),

  setPendingInterrupt: (interrupt) => set({ pendingInterrupt: interrupt }),

  addActivity: (event) =>
    set((state) => {
      // Idempotent: skip if an activity with this ID already exists
      if (state.activityLog.some((e) => e.id === event.id)) return state
      return { activityLog: [...state.activityLog, event] }
    }),

  completeActivity: (id) =>
    set((state) => ({
      activityLog: state.activityLog.map((e) =>
        e.id === id ? { ...e, status: 'done' as const } : e
      ),
    })),

  setSearchQueries: (queries) => set({ searchQueries: queries }),

  setRefinedIdea: (idea) => set({ refinedIdea: idea }),

  reset: () => set({ ...initialState, sources: { ...initialSources }, activityLog: [], searchQueries: [], refinedIdea: null }),
}))
