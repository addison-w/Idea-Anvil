'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Sparkles, FileText, Search } from 'lucide-react'
import { useSessionStore } from '@/stores/session-store'
import { useSession } from '@/hooks/use-session'
import { Header } from '@/components/layout/header'
import { ChatArea } from '@/components/chat/chat-area'
import { ResearchPanel } from '@/components/research/research-panel'
import { HistoryDrawer } from '@/components/layout/history-drawer'
import { Button } from '@/components/ui/button'
import { ANIMATION } from '@/lib/constants'

const featurePills = [
  { icon: Search, label: 'Multi-source research' },
  { icon: FileText, label: 'Implementation-ready PRDs' },
  { icon: Sparkles, label: 'AI-powered validation' },
]

function IdleScreen({ onStart }: { onStart: (idea: string) => void }) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return
    onStart(trimmed)
  }, [value, onStart])

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-glow" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: ANIMATION.ease }}
        className="relative z-10 w-full max-w-xl space-y-12 text-center"
      >
        <div className="space-y-4">
          <h1 className="text-shimmer font-sans text-3xl font-extralight tracking-[0.12em] uppercase sm:text-4xl">
            Idea Anvil
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-zinc-500">
            Turn rough ideas into validated, implementation-ready product requirement documents
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: ANIMATION.ease }}
          className="relative"
        >
          <div
            className={`rounded-2xl border bg-zinc-900/60 backdrop-blur-sm px-5 py-4 pr-14 transition-glow ${
              isFocused
                ? 'border-zinc-600/50 ring-glow'
                : 'border-white/[0.06]'
            }`}
          >
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Describe your idea..."
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 placeholder:transition-opacity placeholder:duration-300 focus:placeholder:opacity-50 outline-none leading-relaxed"
            />
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!value.trim()}
            aria-label="Submit idea"
            className="absolute bottom-4 right-4 rounded-xl text-zinc-500 transition-all duration-300 hover:bg-zinc-800 hover:text-zinc-200 hover:scale-105 disabled:opacity-20 disabled:hover:scale-100"
          >
            <ArrowUp className="size-4" />
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: ANIMATION.ease }}
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        >
          {featurePills.map((pill, i) => (
            <motion.div
              key={pill.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1, ease: ANIMATION.ease }}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.04] bg-zinc-900/40 px-3 py-1.5"
            >
              <pill.icon className="size-3 text-zinc-600" />
              <span className="text-xs text-zinc-500">{pill.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function Home() {
  const phase = useSessionStore((s) => s.phase)
  const { startSession, sendResume } = useSession()
  const [historyOpen, setHistoryOpen] = useState(false)

  const handleNewSession = useCallback(() => {
    useSessionStore.getState().reset()
  }, [])

  const handleStart = useCallback((idea: string) => {
    startSession(idea)
  }, [startSession])

  const handleSend = useCallback((message: string) => {
    sendResume(message)
  }, [sendResume])

  return (
    <div className="flex h-dvh flex-col bg-[#09090b]">
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
            <Header onHistoryOpen={() => setHistoryOpen(true)} onNewSession={handleNewSession} />
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
              <main className="min-h-0 flex-1 overflow-hidden">
                <ChatArea onSend={handleSend} />
              </main>
              <ResearchPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} onNewSession={handleNewSession} />
    </div>
  )
}
