'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useSessionStore } from '@/stores/session-store'
import { SourceCard } from './source-card'
import { InsightChip } from './insight-chip'
import { ANIMATION } from '@/lib/constants'
import type { Phase } from '@/lib/types'

const showPanelPhases: Phase[] = ['researching', 'synthesizing', 'writing', 'reviewing', 'done']

function SourceList({ sources, allInsights }: {
  sources: Record<string, import('@/lib/types').SourceStatus>
  allInsights: string[]
}) {
  return (
    <>
      <div className="space-y-2">
        {Object.values(sources).map((source, i) => (
          <SourceCard key={source.source} source={source} index={i} />
        ))}
      </div>

      {allInsights.length > 0 && (
        <>
          <div className="my-6 h-px bg-white/[0.04]" />
          <h3 className="mb-4 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            Key Insights
          </h3>
          <div className="flex flex-wrap gap-2">
            {allInsights.map((insight, i) => (
              <InsightChip key={`${insight}-${i}`} insight={insight} index={i} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

export function ResearchPanel() {
  const phase = useSessionStore((s) => s.phase)
  const sources = useSessionStore((s) => s.sources)
  const [mobileExpanded, setMobileExpanded] = useState(false)

  const isVisible = showPanelPhases.includes(phase)
  const allInsights = Object.values(sources).flatMap((s) => s.insights)
  const doneCount = Object.values(sources).filter((s) => s.status === 'done').length
  const totalCount = Object.values(sources).length

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Desktop sidebar */}
          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.4, ease: ANIMATION.ease }}
            className="hidden w-72 shrink-0 border-l border-white/[0.04] bg-zinc-950/80 backdrop-blur-lg lg:block"
          >
            <div className="flex h-full flex-col overflow-y-auto p-6">
              <h2 className="mb-6 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                Research
              </h2>
              <SourceList sources={sources} allInsights={allInsights} />
            </div>
          </motion.aside>

          {/* Mobile collapsible bar */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: ANIMATION.ease }}
            className="border-t border-white/[0.04] bg-zinc-950/80 backdrop-blur-lg lg:hidden"
          >
            <button
              onClick={() => setMobileExpanded((prev) => !prev)}
              className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5"
            >
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                Research
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-zinc-600">
                  {doneCount}/{totalCount} sources
                </span>
                <motion.div
                  animate={{ rotate: mobileExpanded ? 180 : 0 }}
                  transition={{ duration: ANIMATION.duration.fast, ease: ANIMATION.ease }}
                >
                  <ChevronDown className="size-3.5 text-zinc-600" />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {mobileExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: ANIMATION.duration.normal, ease: ANIMATION.ease },
                    opacity: { duration: ANIMATION.duration.fast, ease: ANIMATION.ease },
                  }}
                  className="overflow-hidden"
                >
                  <div className="max-h-64 overflow-y-auto px-4 pb-3">
                    <SourceList sources={sources} allInsights={allInsights} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
