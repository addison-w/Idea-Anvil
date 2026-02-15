'use client'

import { motion } from 'framer-motion'
import { ANIMATION } from '@/lib/constants'

interface ChoiceCardProps {
  choices: string[]
  onSelect: (choice: string) => void
}

export function ChoiceCard({ choices, onSelect }: ChoiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className="flex flex-wrap gap-2.5 px-1 py-2"
    >
      {choices.map((choice, i) => (
        <motion.button
          key={choice}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: i * ANIMATION.stagger,
            type: 'spring',
            stiffness: ANIMATION.spring.stiffness,
            damping: ANIMATION.spring.damping,
          }}
          onClick={() => onSelect(choice)}
          className="rounded-xl border border-white/[0.06] bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400 transition-all duration-300 hover:border-zinc-600/50 hover:bg-zinc-800/40 hover:text-zinc-200 hover:shadow-[0_0_20px_-5px_rgba(161,161,170,0.1)] active:scale-[0.98]"
        >
          {choice}
        </motion.button>
      ))}
    </motion.div>
  )
}
