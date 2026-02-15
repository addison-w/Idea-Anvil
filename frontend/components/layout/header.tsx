'use client'

import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhaseIndicator } from './phase-indicator'

interface HeaderProps {
  onHistoryOpen: () => void
}

export function Header({ onHistoryOpen }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800/50 px-6">
      <h1 className="font-sans text-sm font-light tracking-[0.2em] uppercase text-zinc-300">
        Idea Anvil
      </h1>

      <div className="flex items-center gap-4">
        <PhaseIndicator />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onHistoryOpen}
          className="text-zinc-500 hover:text-zinc-300"
        >
          <Clock className="size-4" />
        </Button>
      </div>
    </header>
  )
}
