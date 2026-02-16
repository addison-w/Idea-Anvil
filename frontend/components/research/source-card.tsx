'use client'

import { useEffect, useState, useRef } from 'react'
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

function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const prevValue = useRef(0)

  useEffect(() => {
    if (value === prevValue.current) return
    const start = prevValue.current
    const end = value
    prevValue.current = value
    const duration = 400
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [value])

  return <>{display}</>
}

interface SourceCardProps {
  source: SourceStatus
  index?: number
}

export function SourceCard({ source, index = 0 }: SourceCardProps) {
  const label = sourceLabels[source.source] || source.source
  const [wasSearching, setWasSearching] = useState(false)
  const showFlash = source.status === 'done' && wasSearching

  useEffect(() => {
    if (source.status === 'searching') setWasSearching(true)
    if (source.status === 'done') {
      const timer = setTimeout(() => setWasSearching(false), 600)
      return () => clearTimeout(timer)
    }
  }, [source.status])

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: ANIMATION.duration.normal,
        ease: ANIMATION.ease,
        delay: index * 0.1,
      }}
      className={`rounded-xl border border-white/[0.04] bg-zinc-900/30 px-3.5 py-3 transition-colors duration-300 hover:bg-zinc-900/50 ${showFlash ? 'animate-success-flash' : ''}`}
    >
      <div className="flex items-center justify-between">
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
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check className="size-3.5 text-emerald-400/60" />
            </motion.div>
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
            <AnimatedCount value={source.resultCount} /> found
          </span>
        )}
      </div>

      {source.query && (
        <p className="mt-1.5 ml-6 text-[10px] text-zinc-700 truncate italic">
          {source.query}
        </p>
      )}
    </motion.div>
  )
}
