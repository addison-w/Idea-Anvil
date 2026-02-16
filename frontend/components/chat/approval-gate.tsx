'use client'

import { useState, useCallback, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, RotateCcw, Users, Lightbulb, Target, Layers } from 'lucide-react'
import { ANIMATION } from '@/lib/constants'
import type { RefinedIdea } from '@/lib/types'

interface ApprovalGateProps {
  refinedIdea: RefinedIdea
  onApprove: () => void
  onContinue: (message: string) => void
}

export function ApprovalGate({ refinedIdea, onApprove, onContinue }: ApprovalGateProps) {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleContinue = useCallback(() => {
    const trimmed = input.trim()
    if (trimmed) {
      onContinue(trimmed)
      setInput('')
    } else {
      onContinue('Please ask more clarifying questions to refine this idea further.')
    }
  }, [input, onContinue])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const trimmed = input.trim()
        if (trimmed) {
          onContinue(trimmed)
          setInput('')
        }
      }
    },
    [input, onContinue]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.slow, ease: ANIMATION.ease }}
      className="max-w-xl mx-auto"
    >
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 shadow-surface overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
          className="px-5 pt-5 pb-1"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="size-3.5 text-zinc-500" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium">
              Idea Summary
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-medium text-zinc-100 leading-snug mb-2">
            {refinedIdea.title}
          </h3>

          {/* Problem */}
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            {refinedIdea.problem}
          </p>
        </motion.div>

        {/* Target Users */}
        {refinedIdea.target_users.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
            className="px-5 pb-4"
          >
            <div className="flex items-center gap-1.5 mb-2.5">
              <Users className="size-3 text-zinc-600" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Target Users
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {refinedIdea.target_users.map((user, i) => (
                <motion.span
                  key={user}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.2 + i * ANIMATION.stagger,
                    type: 'spring',
                    stiffness: ANIMATION.spring.stiffness,
                    damping: ANIMATION.spring.damping,
                  }}
                  className="rounded-full border border-white/[0.06] bg-zinc-800/60 px-3 py-1 text-xs text-zinc-400"
                >
                  {user}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Core Features */}
        {refinedIdea.core_features.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
            className="px-5 pb-4"
          >
            <div className="flex items-center gap-1.5 mb-2.5">
              <Layers className="size-3 text-zinc-600" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Core Features
              </span>
            </div>
            <ul className="space-y-1.5">
              {refinedIdea.core_features.map((feature, i) => (
                <motion.li
                  key={feature}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.25 + i * ANIMATION.stagger,
                    duration: ANIMATION.duration.normal,
                    ease: ANIMATION.ease,
                  }}
                  className="flex items-start gap-2.5 text-sm text-zinc-400 leading-relaxed"
                >
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-zinc-600" />
                  {feature}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Business Model + Constraints */}
        {(refinedIdea.business_model || (refinedIdea.constraints && refinedIdea.constraints.length > 0)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
            className="px-5 pb-4 space-y-2"
          >
            {refinedIdea.business_model && (
              <div className="flex items-start gap-1.5">
                <Target className="mt-0.5 size-3 shrink-0 text-zinc-600" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  <span className="text-zinc-600">Model:</span>{' '}
                  {refinedIdea.business_model}
                </p>
              </div>
            )}
            {refinedIdea.constraints && refinedIdea.constraints.length > 0 && (
              <div className="flex items-start gap-1.5">
                <Target className="mt-0.5 size-3 shrink-0 text-zinc-600" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  <span className="text-zinc-600">Constraints:</span>{' '}
                  {refinedIdea.constraints.join(' · ')}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Divider */}
        <div className="border-t border-white/[0.04]" />

        {/* Input + Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
          className="px-5 py-4 space-y-3"
        >
          {/* Textarea */}
          <div
            className={`rounded-2xl border bg-zinc-950/60 px-3.5 py-3 transition-all duration-200 ${
              isFocused
                ? 'border-zinc-600/50 ring-1 ring-zinc-700/30'
                : 'border-white/[0.06]'
            }`}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Adjust your idea or pivot direction..."
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none leading-relaxed"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinue}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[0.04] bg-transparent px-4 py-2.5 text-sm text-zinc-500 transition-colors duration-200 hover:border-zinc-700/50 hover:text-zinc-300"
            >
              <RotateCcw className="size-3.5" />
              Continue Refining
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onApprove}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors duration-200 hover:bg-zinc-700"
            >
              Start Research
              <ArrowRight className="size-3.5" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
