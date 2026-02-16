'use client'

import { Clock, Hexagon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhaseIndicator } from './phase-indicator'

interface HeaderProps {
  onHistoryOpen: () => void
  onNewSession: () => void
}

export function Header({ onHistoryOpen, onNewSession }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-white/[0.04] bg-zinc-950/70 px-3 backdrop-blur-xl sm:h-14 sm:px-6">
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <button
          onClick={onNewSession}
          className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 transition-colors duration-300 hover:opacity-80 sm:gap-2"
        >
          <Hexagon className="size-4 text-zinc-600" strokeWidth={1.5} />
          <span className="hidden font-sans text-[13px] font-light tracking-[0.2em] uppercase text-zinc-400 transition-colors duration-300 hover:text-zinc-200 sm:inline">
            Idea Anvil
          </span>
        </button>
        <Button
          variant="ghost"
          size="xs"
          onClick={onNewSession}
          className="cursor-pointer text-zinc-600 transition-colors duration-300 hover:text-zinc-200"
        >
          <Plus className="size-3" />
          <span className="hidden text-xs sm:inline">New</span>
        </Button>
      </div>

      <div className="min-w-0 flex-1 px-2 sm:px-4">
        <PhaseIndicator />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onHistoryOpen}
          aria-label="Session history"
          className="text-zinc-600 transition-colors duration-300 hover:text-zinc-300"
        >
          <Clock className="size-4" />
        </Button>
      </div>
    </header>
  )
}
