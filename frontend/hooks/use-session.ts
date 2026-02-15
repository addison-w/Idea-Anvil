'use client'

import { useCallback, useRef } from 'react'
import { useSessionStore } from '@/stores/session-store'
import { API_URL, WS_URL } from '@/lib/constants'
import type { WSEvent, Phase } from '@/lib/types'

export function useSession() {
  const wsRef = useRef<WebSocket | null>(null)
  const store = useSessionStore()

  const handleWSEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'token': {
        if (event.content) {
          store.appendToLastMessage(event.content)
        }
        break
      }
      case 'node_update': {
        if (event.node) {
          const phaseMap: Record<string, Phase> = {
            clarify: 'clarifying',
            plan: 'planning',
            research: 'researching',
            synthesize: 'synthesizing',
            write: 'writing',
            review: 'reviewing',
          }
          const phase = phaseMap[event.node]
          if (phase) store.setPhase(phase)
        }
        break
      }
      case 'custom': {
        if (event.event === 'source_update' && event.data) {
          const { source, status, result_count, insights } = event.data as {
            source: string
            status: string
            result_count?: number
            insights?: string[]
          }
          store.updateSource(source, {
            status: status as 'pending' | 'searching' | 'done' | 'error',
            ...(result_count !== undefined && { resultCount: result_count }),
            ...(insights && { insights }),
          })
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
        if (event.prd) {
          store.setPrdDraft(event.prd)
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
        store.setStreaming(false)
        break
      }
    }
  }, [store])

  const connectWS = useCallback((threadId: string) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = new WebSocket(`${WS_URL}/ws/session/${threadId}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const event: WSEvent = JSON.parse(e.data)
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

  const startSession = useCallback(async (idea: string, depth: 'quick' | 'standard' | 'deep' = 'standard') => {
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
      connectWS(threadId)
    } catch (err) {
      console.error('Failed to start session:', err)
      store.setStreaming(false)
    }
  }, [store, connectWS])

  const sendResume = useCallback((value: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

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
