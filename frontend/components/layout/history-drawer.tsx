'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { API_URL, ANIMATION } from '@/lib/constants'

interface HistorySession {
  thread_id: string
  idea: string
  phase: string
  created_at: string
}

interface HistoryDrawerProps {
  open: boolean
  onClose: () => void
}

export function HistoryDrawer({ open, onClose }: HistoryDrawerProps) {
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/history`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchHistory()
  }, [open, fetchHistory])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION.duration.fast }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
            className="fixed inset-y-0 left-0 z-50 w-80 border-r border-white/[0.04] bg-zinc-950/95 backdrop-blur-xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-5 py-5">
                <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                  History
                </h2>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={onClose}
                  className="text-zinc-600 transition-colors duration-300 hover:text-zinc-300"
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              <div className="mx-5 h-px bg-white/[0.04]" />

              <ScrollArea className="flex-1">
                <div className="space-y-2 p-5">
                  {loading && (
                    <div className="flex items-center justify-center py-16">
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-xs text-zinc-600"
                      >
                        Loading...
                      </motion.div>
                    </div>
                  )}

                  {!loading && sessions.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                      <Inbox className="size-8 text-zinc-800" strokeWidth={1} />
                      <p className="text-xs text-zinc-600">
                        No sessions yet
                      </p>
                    </div>
                  )}

                  {sessions.map((session) => (
                    <motion.button
                      key={session.thread_id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full rounded-xl border border-white/[0.04] bg-zinc-900/30 p-3.5 text-left transition-all duration-300 hover:border-zinc-700/50 hover:bg-zinc-900/60 hover:shadow-[0_0_15px_-5px_rgba(161,161,170,0.08)]"
                    >
                      <p className="mb-2 text-sm leading-relaxed text-zinc-300 line-clamp-2">
                        {session.idea}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-white/[0.06] text-zinc-500 text-[10px] font-normal"
                        >
                          {session.phase}
                        </Badge>
                        <span className="text-[10px] text-zinc-700">
                          {new Date(session.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
