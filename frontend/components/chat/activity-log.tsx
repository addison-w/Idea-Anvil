'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Brain, FileText, ChevronDown, Sparkles, Check } from 'lucide-react'
import { useSessionStore } from '@/stores/session-store'
import { ANIMATION } from '@/lib/constants'
import type { ActivityEvent } from '@/lib/types'

const ICON_MAP: Record<ActivityEvent['type'], React.ElementType> = {
  phase: Sparkles,
  query: Search,
  search_start: Search,
  search_done: Search,
  synthesis: Brain,
  writing: FileText,
  info: Sparkles,
}

const AUTO_EXPAND_PHASES = new Set(['planning', 'researching', 'synthesizing'])
const AUTO_COLLAPSE_PHASES = new Set(['writing', 'reviewing', 'done'])
const COLLAPSE_DELAY = 1500

function ActivityItem({ event, index }: { event: ActivityEvent; index: number }) {
  const Icon = ICON_MAP[event.type] ?? Sparkles
  const isActive = event.status === 'active'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{
        opacity: { duration: ANIMATION.duration.normal, ease: ANIMATION.ease },
        height: { duration: ANIMATION.duration.normal, ease: ANIMATION.ease },
        delay: index * ANIMATION.stagger,
      }}
      className="relative flex gap-3 overflow-hidden pl-3"
    >
      {/* Timeline: dot + connecting line */}
      <div className="relative flex flex-col items-center">
        {/* Connecting line above */}
        {index > 0 && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: ANIMATION.duration.fast, ease: ANIMATION.ease }}
            className="absolute -top-1 h-1 w-px origin-top bg-white/[0.08]"
          />
        )}

        {/* Dot */}
        {isActive ? (
          <motion.div
            className="relative z-10 mt-1.5 size-2 rounded-full bg-zinc-400"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.15, 0.85] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: ANIMATION.spring.stiffness,
              damping: ANIMATION.spring.damping,
            }}
            className="relative z-10 mt-1.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-500/20"
          >
            <Check className="size-2.5 text-emerald-400" strokeWidth={3} />
          </motion.div>
        )}

        {/* Connecting line below */}
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease, delay: 0.1 }}
          className="w-px flex-1 origin-top bg-white/[0.06]"
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 items-start gap-2 pb-3 pt-0.5">
        <Icon
          className={`mt-0.5 size-3 shrink-0 ${
            isActive ? 'text-zinc-400' : 'text-zinc-600'
          }`}
        />
        <div className="min-w-0 flex-1">
          <span
            className={`text-xs leading-relaxed ${
              isActive ? 'text-zinc-300' : 'text-zinc-500'
            }`}
          >
            {event.label}
          </span>
          {event.detail && (
            <p className="truncate text-[11px] italic leading-snug text-zinc-600">
              {event.detail}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function ActivityLog() {
  const activityLog = useSessionStore((s) => s.activityLog)
  const phase = useSessionStore((s) => s.phase)
  const [isExpanded, setIsExpanded] = useState(false)
  const [userToggled, setUserToggled] = useState(false)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doneCount = activityLog.filter((e) => e.status === 'done').length
  const totalCount = activityLog.length
  const allDone = totalCount > 0 && doneCount === totalCount

  useEffect(() => {
    if (userToggled) return

    if (AUTO_EXPAND_PHASES.has(phase)) {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
        collapseTimerRef.current = null
      }
      setIsExpanded(true)
    } else if (AUTO_COLLAPSE_PHASES.has(phase)) {
      collapseTimerRef.current = setTimeout(() => {
        setIsExpanded(false)
        collapseTimerRef.current = null
      }, COLLAPSE_DELAY)
    }

    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
      }
    }
  }, [phase, userToggled])

  useEffect(() => {
    setUserToggled(false)
  }, [phase])

  if (activityLog.length === 0) return null

  const handleToggle = () => {
    setUserToggled(true)
    setIsExpanded((prev) => !prev)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className="rounded-xl border border-white/[0.06] bg-zinc-900/40 shadow-surface"
    >
      {/* Header — always visible */}
      <button
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls="activity-log-content"
        className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-200 hover:bg-white/[0.02]"
      >
        {/* Status dot */}
        {allDone ? (
          <div className="size-1.5 rounded-full bg-emerald-500" />
        ) : (
          <motion.div
            className="size-1.5 rounded-full bg-zinc-400"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <span className="flex-1 text-xs font-medium text-zinc-400">
          {allDone ? 'Complete' : 'Working'}
        </span>

        <span className="text-[11px] tabular-nums text-zinc-600">
          {doneCount}/{totalCount}
        </span>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: ANIMATION.duration.fast, ease: ANIMATION.ease }}
        >
          <ChevronDown className="size-3.5 text-zinc-600" />
        </motion.div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id="activity-log-content"
            role="region"
            aria-label="Activity log"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: ANIMATION.duration.normal, ease: ANIMATION.ease },
              opacity: { duration: ANIMATION.duration.fast, ease: ANIMATION.ease },
            }}
            className="overflow-hidden border-t border-white/[0.04]"
          >
            <div className="px-1 py-2">
              <AnimatePresence initial={false}>
                {activityLog.map((event, index) => (
                  <ActivityItem key={event.id} event={event} index={index} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
