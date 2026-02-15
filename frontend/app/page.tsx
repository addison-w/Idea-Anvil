'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { useSessionStore } from '@/stores/session-store'
import { useSession } from '@/hooks/use-session'
import { Header } from '@/components/layout/header'
import { ChatArea } from '@/components/chat/chat-area'
import { ResearchPanel } from '@/components/research/research-panel'
import { HistoryDrawer } from '@/components/layout/history-drawer'
import { Button } from '@/components/ui/button'
import { ANIMATION } from '@/lib/constants'

function IdleScreen({ onStart }: { onStart: (idea: string) => void }) {
  const [value, setValue] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return
    onStart(trimmed)
  }, [value, onStart])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: ANIMATION.ease }}
        className="w-full max-w-lg space-y-8 text-center"
      >
        <div className="space-y-3">
          <h1 className="font-sans text-2xl font-light tracking-[0.08em] text-zinc-200">
            Idea Anvil
          </h1>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Turn rough ideas into validated, implementation-ready PRDs
          </p>
        </div>

        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Describe your idea..."
            rows={3}
            className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 pr-12 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none transition-colors duration-200 focus:border-zinc-700"
          />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="absolute bottom-3 right-3 text-zinc-600 hover:text-zinc-200 disabled:opacity-30"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Home() {
  const phase = useSessionStore((s) => s.phase)
  const { startSession, sendResume } = useSession()
  const [historyOpen, setHistoryOpen] = useState(false)

  const handleStart = useCallback((idea: string) => {
    startSession(idea)
  }, [startSession])

  const handleSend = useCallback((message: string) => {
    sendResume(message)
  }, [sendResume])

  return (
    <div className="flex h-screen flex-col bg-[#09090b]">
      <AnimatePresence mode="wait">
        {phase === 'idle' ? (
          <motion.div
            key="idle"
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
            className="flex-1"
          >
            <IdleScreen onStart={handleStart} />
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <Header onHistoryOpen={() => setHistoryOpen(true)} />
            <div className="flex flex-1 overflow-hidden">
              <main className="flex-1 overflow-hidden">
                <ChatArea onSend={handleSend} />
              </main>
              <ResearchPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  )
}
