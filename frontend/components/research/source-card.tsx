'use client'

import { motion } from 'framer-motion'
import { Check, AlertTriangle, Loader2 } from 'lucide-react'
import type { SourceStatus } from '@/lib/types'
import { ANIMATION } from '@/lib/constants'

const sourceLabels: Record<string, string> = {
  hacker_news: 'Hacker News',
  reddit: 'Reddit',
  tavily: 'Tavily',
  product_hunt: 'Product Hunt',
}

interface SourceCardProps {
  source: SourceStatus
}

export function SourceCard({ source }: SourceCardProps) {
  const label = sourceLabels[source.source] || source.source

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-zinc-900/30 px-3.5 py-3 transition-colors duration-300 hover:bg-zinc-900/50"
    >
      <div className="flex items-center gap-3">
        {source.status === 'pending' && (
          <div className="size-1.5 rounded-full bg-zinc-700" />
        )}
        {source.status === 'searching' && (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Loader2 className="size-3.5 text-zinc-500 animate-spin" />
          </motion.div>
        )}
        {source.status === 'done' && (
          <Check className="size-3.5 text-emerald-400/60" />
        )}
        {source.status === 'error' && (
          <AlertTriangle className="size-3.5 text-amber-500" />
        )}
        <span
          className={`text-xs tracking-wide ${
            source.status === 'pending'
              ? 'text-zinc-600'
              : source.status === 'error'
                ? 'text-amber-500/80'
                : 'text-zinc-400'
          }`}
        >
          {label}
        </span>
      </div>

      {source.status === 'done' && source.resultCount > 0 && (
        <span className="text-[11px] text-zinc-600">
          {source.resultCount} found
        </span>
      )}
    </motion.div>
  )
}
