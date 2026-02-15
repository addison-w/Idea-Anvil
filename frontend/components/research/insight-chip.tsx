'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { ANIMATION } from '@/lib/constants'

interface InsightChipProps {
  insight: string
  index: number
}

export function InsightChip({ insight, index }: InsightChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * ANIMATION.stagger,
        duration: ANIMATION.duration.fast,
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
    >
      <Badge
        variant="outline"
        className="border-zinc-700/50 bg-zinc-900/50 text-zinc-400 text-xs font-normal px-2.5 py-1"
      >
        {insight}
      </Badge>
    </motion.div>
  )
}
