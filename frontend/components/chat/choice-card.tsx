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
      className="flex flex-wrap gap-2 px-1 py-1"
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
          className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-300 transition-colors duration-200 hover:border-zinc-600 hover:bg-zinc-800/80 hover:text-zinc-100"
        >
          {choice}
        </motion.button>
      ))}
    </motion.div>
  )
}
