'use client'

import { useCallback, useRef } from 'react'
import { useSessionStore } from '@/stores/session-store'
import { API_URL, WS_URL } from '@/lib/constants'
import type { WSEvent, Phase, SearchQueryInfo } from '@/lib/types'

const sourceLabels: Record<string, string> = {
  hacker_news: 'Hacker News',
  reddit: 'Reddit',
  tavily: 'Tavily',
  product_hunt: 'Product Hunt',
}
const sourceLabel = (s: string) => sourceLabels[s] || s

export function useSession() {
  const wsRef = useRef<WebSocket | null>(null)
  const store = useSessionStore()

  const handleWSEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'token': {
        if (event.content) {
          const msgs = useSessionStore.getState().messages
          const last = msgs[msgs.length - 1]
          if (!last || last.role !== 'assistant') {
            store.addMessage({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
            })
          }
          store.appendToLastMessage(event.content)
        }
        break
      }
      case 'node_update': {
        const phase = (event.data?.phase as Phase) ?? null
        if (phase) {
          store.setPhase(phase)

          if (phase === 'planning') {
            store.addActivity({
              id: 'phase-planning',
              type: 'phase',
              label: 'Planning research strategy',
              status: 'active',
              timestamp: Date.now(),
            })
          } else if (phase === 'synthesizing') {
            const log = useSessionStore.getState().activityLog
            log.filter(e => e.type === 'search_start' && e.status === 'active')
              .forEach(e => store.completeActivity(e.id))
            store.addActivity({
              id: 'phase-synthesizing',
              type: 'synthesis',
              label: 'Analyzing research findings',
              status: 'active',
              timestamp: Date.now(),
            })
          } else if (phase === 'writing') {
            const log = useSessionStore.getState().activityLog
            log.filter(e => e.type === 'synthesis' && e.status === 'active')
              .forEach(e => store.completeActivity(e.id))
            store.addActivity({
              id: 'phase-writing',
              type: 'writing',
              label: 'Generating PRD',
              status: 'active',
              timestamp: Date.now(),
            })
          } else if (phase === 'reviewing') {
            const log = useSessionStore.getState().activityLog
            log.filter(e => e.status === 'active')
              .forEach(e => store.completeActivity(e.id))
          }
        } else if (event.node) {
          // Fallback: map node name to phase
          const phaseMap: Record<string, Phase> = {
            clarifier: 'clarifying',
            planner: 'planning',
            searcher: 'researching',
            synthesizer: 'synthesizing',
            writer: 'writing',
            reviewer: 'reviewing',
          }
          const mapped = phaseMap[event.node]
          if (mapped) store.setPhase(mapped)
        }
        break
      }
      case 'custom': {
        if (event.event === 'queries_generated' && event.data) {
          const queries = (event.data.queries as SearchQueryInfo[]) || []
          store.setSearchQueries(queries)

          store.completeActivity('phase-planning')

          store.addActivity({
            id: 'queries-generated',
            type: 'info',
            label: `Generated ${queries.length} search queries`,
            status: 'done',
            timestamp: Date.now(),
          })

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
            store.updateSource(q.source, { status: 'searching', query: q.query })
          }
        }
        if ((event.event === 'source_update' || event.event === 'search_result') && event.data) {
          const data = event.data as {
            source?: string
            status?: string
            result_count?: number
            count?: number
            insights?: string[]
          }
          const source = data.source
          if (source) {
            store.updateSource(source, {
              status: (data.status as 'pending' | 'searching' | 'done' | 'error') ?? 'done',
              ...(data.result_count !== undefined && { resultCount: data.result_count }),
              ...(data.count !== undefined && { resultCount: data.count }),
              ...(data.insights && { insights: data.insights }),
            })

            store.completeActivity(`search-${source}`)

            store.addActivity({
              id: `search-done-${source}`,
              type: 'search_done',
              label: `${sourceLabel(source)} — ${data.count || 0} results`,
              status: 'done',
              timestamp: Date.now(),
              source: source,
            })
          }
        }
        if (event.event === 'prd_token' && event.content) {
          store.setPrdDraft((store.prdDraft || '') + event.content)
        }
        if (event.event === 'assistant_message' && event.data) {
          const data = event.data as { content: string; choices?: string[] }
          store.addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.content,
            timestamp: Date.now(),
            choices: data.choices,
          })
        }
        break
      }
      case 'interrupt': {
        store.setPendingInterrupt(event.interrupt_type || null)
        const prdDraft = (event.data?.prd_draft as string) || event.prd
        if (prdDraft) {
          store.setPrdDraft(prdDraft)
        }
        store.setStreaming(false)
        break
      }
      case 'complete': {
        store.setPhase('done')
        store.setStreaming(false)
        if (event.prd) {
          store.setPrdDraft(event.prd)
        }
        break
      }
      case 'error': {
        console.error('WS error:', event.message)
        store.addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Error: ${event.message || 'Something went wrong. Please check your API keys and try again.'}`,
          timestamp: Date.now(),
        })
        store.setStreaming(false)
        break
      }
    }
  }, [store])

  const connectWS = useCallback((threadId: string, initPayload?: { idea: string; depth: string }) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = new WebSocket(`${WS_URL}/ws/session/${threadId}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (initPayload) {
        ws.send(JSON.stringify(initPayload))
      }
    }

    ws.onmessage = (e) => {
      try {
        const event: WSEvent = JSON.parse(e.data)
        if ((event as unknown as Record<string, unknown>).type === 'ping') return
        handleWSEvent(event)
      } catch {
        console.error('Failed to parse WS message')
      }
    }

    ws.onclose = () => {
      store.setStreaming(false)
    }

    ws.onerror = () => {
      console.error('WebSocket error')
      store.setStreaming(false)
    }
  }, [handleWSEvent, store])

  const startSession = useCallback(async (idea: string, depth: 'light' | 'detailed' = 'light') => {
    store.reset()
    store.setStreaming(true)

    store.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: idea,
      timestamp: Date.now(),
    })

    try {
      const res = await fetch(`${API_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, depth }),
      })

      if (!res.ok) throw new Error('Failed to create session')

      const data = await res.json()
      const threadId = data.thread_id as string
      store.setThreadId(threadId)
      store.setPhase('clarifying')
      connectWS(threadId, { idea, depth })
    } catch (err) {
      console.error('Failed to start session:', err)
      store.setStreaming(false)
    }
  }, [store, connectWS])

  const sendResume = useCallback((value: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      store.addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Connection lost. Please refresh and try again.',
        timestamp: Date.now(),
      })
      return
    }

    store.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: value,
      timestamp: Date.now(),
    })

    store.setPendingInterrupt(null)
    store.setStreaming(true)

    ws.send(JSON.stringify({ type: 'resume', value }))
  }, [store])

  return { startSession, sendResume }
}
