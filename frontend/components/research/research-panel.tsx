'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '@/stores/session-store'
import { SourceCard } from './source-card'
import { InsightChip } from './insight-chip'
import { ANIMATION } from '@/lib/constants'
import type { Phase } from '@/lib/types'

const showPanelPhases: Phase[] = ['researching', 'synthesizing', 'writing', 'reviewing', 'done']

export function ResearchPanel() {
  const phase = useSessionStore((s) => s.phase)
  const sources = useSessionStore((s) => s.sources)

  const isVisible = showPanelPhases.includes(phase)
  const allInsights = Object.values(sources).flatMap((s) => s.insights)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: 0.4, ease: ANIMATION.ease }}
          className="hidden w-72 shrink-0 border-l border-white/[0.04] bg-zinc-950/80 backdrop-blur-lg lg:block"
        >
          <div className="flex h-full flex-col p-6">
            <h2 className="mb-6 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Research
            </h2>

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
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
