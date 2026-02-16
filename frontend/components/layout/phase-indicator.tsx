'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { useSessionStore } from '@/stores/session-store'
import type { Phase } from '@/lib/types'
import { ANIMATION } from '@/lib/constants'

const steps: { key: Phase; label: string }[] = [
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

function getStepState(stepKey: Phase, currentPhase: Phase): 'completed' | 'active' | 'upcoming' {
  const currentIdx = getPhaseIndex(currentPhase)
  const stepIdx = getPhaseIndex(stepKey)

  const isActive =
    stepKey === currentPhase ||
    (currentPhase === 'planning' && stepKey === 'clarifying') ||
    (currentPhase === 'synthesizing' && stepKey === 'researching')

  if (isActive) return 'active'
  if (stepIdx < currentIdx) return 'completed'
  return 'upcoming'
}

function StepNode({ state, index }: { state: 'completed' | 'active' | 'upcoming'; index: number }) {
  return (
    <div className="relative flex size-5 items-center justify-center sm:size-6">
      <AnimatePresence mode="wait">
        {state === 'completed' ? (
          <motion.div
            key="completed"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="flex size-5 items-center justify-center rounded-full bg-zinc-600 sm:size-6"
          >
            <Check className="size-2.5 text-zinc-200 sm:size-3" strokeWidth={2.5} />
          </motion.div>
        ) : state === 'active' ? (
          <motion.div
            key="active"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="relative flex size-5 items-center justify-center sm:size-6"
          >
            <motion.div
              className="absolute inset-[-2px] rounded-full border border-zinc-500/40"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="flex size-5 items-center justify-center rounded-full border border-zinc-400 bg-zinc-900 sm:size-6">
              <span className="text-[9px] font-medium tabular-nums text-zinc-200 sm:text-[10px]">
                {index + 1}
              </span>
            </div>
          </motion.div>
        ) : (
          <div className="flex size-5 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 sm:size-6">
            <span className="text-[9px] font-medium tabular-nums text-zinc-700 sm:text-[10px]">
              {index + 1}
            </span>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Connector({ filled }: { filled: boolean }) {
  return (
    <div className="relative h-px w-5 overflow-hidden bg-zinc-800/60 sm:w-8">
      <motion.div
        className="absolute inset-y-0 left-0 bg-zinc-500"
        initial={{ width: '0%' }}
        animate={{ width: filled ? '100%' : '0%' }}
        transition={{ duration: ANIMATION.duration.slow, ease: ANIMATION.ease }}
      />
    </div>
  )
}

export function PhaseIndicator() {
  const phase = useSessionStore((s) => s.phase)

  if (phase === 'idle') return null

  const activeLabel = steps.find(
    (s) =>
      s.key === phase ||
      (phase === 'planning' && s.key === 'clarifying') ||
      (phase === 'synthesizing' && s.key === 'researching'),
  )?.label

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-0">
        {steps.map((step, i) => {
          const state = getStepState(step.key, phase)
          const prevState = i > 0 ? getStepState(steps[i - 1].key, phase) : null
          const connectorFilled = prevState === 'completed' || prevState === 'active'

          return (
            <div key={step.key} className="flex items-center">
              {i > 0 && <Connector filled={connectorFilled} />}
              <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                <StepNode state={state} index={i} />
                <span
                  className={`hidden text-[10px] tracking-wide transition-colors duration-300 sm:block ${
                    state === 'active'
                      ? 'font-medium text-zinc-200'
                      : state === 'completed'
                        ? 'text-zinc-500'
                        : 'text-zinc-700'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.span
          key={`label-${phase}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-0.5 text-[10px] tracking-wide text-zinc-200 sm:hidden"
        >
          {activeLabel || 'Working'}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
