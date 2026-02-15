'use client'

import { motion } from 'framer-motion'
import { useSessionStore } from '@/stores/session-store'
import type { Phase } from '@/lib/types'
import { ANIMATION } from '@/lib/constants'

const phases: { key: Phase; label: string }[] = [
  { key: 'clarifying', label: 'Clarify' },
  { key: 'researching', label: 'Research' },
  { key: 'writing', label: 'Generate' },
  { key: 'reviewing', label: 'Review' },
  { key: 'done', label: 'Done' },
]

const phaseOrder: Phase[] = ['idle', 'clarifying', 'planning', 'researching', 'synthesizing', 'writing', 'reviewing', 'done']

function getPhaseIndex(phase: Phase) {
  return phaseOrder.indexOf(phase)
}

export function PhaseIndicator() {
  const phase = useSessionStore((s) => s.phase)

  if (phase === 'idle') return null

  const currentIndex = getPhaseIndex(phase)

  return (
    <div className="flex items-center gap-1.5">
      {phases.map((p) => {
        const pIndex = getPhaseIndex(p.key)
        const isActive = p.key === phase || (phase === 'planning' && p.key === 'clarifying') || (phase === 'synthesizing' && p.key === 'researching')
        const isPast = pIndex < currentIndex && !isActive

        return (
          <div key={p.key} className="flex items-center gap-1.5">
            <motion.div
              layout
              transition={{ duration: ANIMATION.duration.slow, ease: ANIMATION.ease }}
              className="relative flex items-center"
            >
              <span
                className={`text-xs tracking-wide transition-all duration-300 ${
                  isActive
                    ? 'text-zinc-50 font-medium'
                    : isPast
                      ? 'text-zinc-500'
                      : 'text-zinc-700'
                }`}
              >
                {isPast ? `\u2713 ${p.label}` : p.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="phase-active"
                  className="absolute -bottom-1.5 left-0 right-0 h-px bg-zinc-400 shadow-[0_1px_8px_-2px_rgba(161,161,170,0.3)]"
                  transition={{ duration: ANIMATION.duration.slow, ease: ANIMATION.ease }}
                />
              )}
            </motion.div>
            {p.key !== 'done' && (
              <span className="text-zinc-800 text-[10px] mx-0.5">{'\u00B7'}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
