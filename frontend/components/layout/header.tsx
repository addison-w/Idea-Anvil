'use client'

import { Clock, Hexagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhaseIndicator } from './phase-indicator'

interface HeaderProps {
  onHistoryOpen: () => void
}

export function Header({ onHistoryOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.04] bg-zinc-950/70 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <Hexagon className="size-4 text-zinc-600" strokeWidth={1.5} />
        <h1 className="font-sans text-[13px] font-light tracking-[0.2em] uppercase text-zinc-400">
          Idea Anvil
        </h1>
      </div>

      <PhaseIndicator />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onHistoryOpen}
          className="text-zinc-600 transition-colors duration-300 hover:text-zinc-300"
        >
          <Clock className="size-4" />
        </Button>
      </div>
    </header>
  )
}
