'use client'

import { motion, AnimatePresence } from 'framer-motion'
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

const phaseStatusText: Partial<Record<Phase, string>> = {
  clarifying: 'Refining your idea...',
  planning: 'Generating search strategy...',
  researching: 'Searching across sources...',
  synthesizing: 'Analyzing findings...',
  writing: 'Composing your PRD...',
  reviewing: 'Ready for your review',
  done: 'Complete',
}

function getPhaseIndex(phase: Phase) {
  return phaseOrder.indexOf(phase)
}

function getProgressPercent(phase: Phase): number {
  const displayPhases: Phase[] = ['clarifying', 'researching', 'writing', 'reviewing', 'done']
  const mappedPhase = phase === 'planning' ? 'clarifying' : phase === 'synthesizing' ? 'researching' : phase
  const idx = displayPhases.indexOf(mappedPhase)
  if (idx < 0) return 0
  return ((idx + 0.5) / displayPhases.length) * 100
}

export function PhaseIndicator() {
  const phase = useSessionStore((s) => s.phase)

  if (phase === 'idle') return null

  const currentIndex = getPhaseIndex(phase)
  const progress = getProgressPercent(phase)

  const activeLabel = phases.find(
    (p) => p.key === phase || (phase === 'planning' && p.key === 'clarifying') || (phase === 'synthesizing' && p.key === 'researching'),
  )?.label

  return (
    <div className="flex flex-col gap-1 sm:gap-2">
      {/* Mobile: show only active phase label */}
      <div className="flex items-center justify-center gap-1.5 sm:hidden">
        <motion.span
          className="block size-1.5 rounded-full bg-zinc-400 animate-dot-pulse"
          key={`mobile-dot-${phase}`}
        />
        <AnimatePresence mode="wait">
          <motion.span
            key={`mobile-label-${phase}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-medium tracking-wide text-zinc-50"
          >
            {activeLabel || 'Working'}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Desktop: full phase labels */}
      <div className="hidden items-center gap-1.5 sm:flex">
        {phases.map((p) => {
          const pIndex = getPhaseIndex(p.key)
          const isActive = p.key === phase || (phase === 'planning' && p.key === 'clarifying') || (phase === 'synthesizing' && p.key === 'researching')
          const isPast = pIndex < currentIndex && !isActive

          return (
            <div key={p.key} className="flex items-center gap-1.5">
              <motion.div
                layout
                transition={{ duration: ANIMATION.duration.slow, ease: ANIMATION.ease }}
                className="relative flex items-center gap-1.5"
              >
                {isActive && (
                  <motion.span
                    className="block size-1.5 rounded-full bg-zinc-400 animate-dot-pulse"
                    layoutId="phase-dot"
                    transition={{ duration: ANIMATION.duration.slow, ease: ANIMATION.ease }}
                  />
                )}
                <AnimatePresence mode="wait">
                  {isPast ? (
                    <motion.span
                      key={`${p.key}-done`}
                      initial={{ scale: 1.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="text-xs tracking-wide text-zinc-500"
                    >
                      {'\u2713'} {p.label}
                    </motion.span>
                  ) : (
                    <span
                      key={`${p.key}-label`}
                      className={`text-xs tracking-wide transition-all duration-300 ${
                        isActive
                          ? 'text-zinc-50 font-medium'
                          : 'text-zinc-700'
                      }`}
                    >
                      {p.label}
                    </span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="phase-active"
                    className="absolute -bottom-1.5 left-0 right-0 h-px bg-zinc-400 animate-pulse-glow"
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

      <div className="h-px w-full overflow-hidden rounded-full bg-zinc-800/50">
        <motion.div
          className="h-full bg-gradient-to-r from-zinc-600 to-zinc-400"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: ANIMATION.duration.slow * 2, ease: ANIMATION.ease }}
        />
      </div>
      <AnimatePresence mode="wait">
        {phaseStatusText[phase] && (
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-center text-[10px] text-zinc-600"
          >
            {phaseStatusText[phase]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
