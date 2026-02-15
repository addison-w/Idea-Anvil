'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '@/stores/session-store'
import { Separator } from '@/components/ui/separator'
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
          className="hidden w-72 shrink-0 border-l border-zinc-800/50 lg:block"
        >
          <div className="flex h-full flex-col p-4">
            <h2 className="mb-4 text-xs font-light uppercase tracking-[0.15em] text-zinc-500">
              Research
            </h2>

            <div className="space-y-2">
              {Object.values(sources).map((source) => (
                <SourceCard key={source.source} source={source} />
              ))}
            </div>

            {allInsights.length > 0 && (
              <>
                <Separator className="my-4 bg-zinc-800/50" />
                <h3 className="mb-3 text-xs font-light uppercase tracking-[0.15em] text-zinc-500">
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
