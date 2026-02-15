'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSessionStore } from '@/stores/session-store'
import { MessageBubble } from './message-bubble'
import { ChoiceCard } from './choice-card'
import { InputBar } from './input-bar'
import { PrdPreview } from '@/components/prd/prd-preview'

interface ChatAreaProps {
  onSend: (message: string) => void
}

export function ChatArea({ onSend }: ChatAreaProps) {
  const messages = useSessionStore((s) => s.messages)
  const isStreaming = useSessionStore((s) => s.isStreaming)
  const prdDraft = useSessionStore((s) => s.prdDraft)
  const phase = useSessionStore((s) => s.phase)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, prdDraft])

  const lastMessage = messages[messages.length - 1]
  const showChoices = lastMessage?.role === 'assistant' && lastMessage.choices && lastMessage.choices.length > 0 && !isStreaming

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {showChoices && lastMessage.choices && (
            <ChoiceCard choices={lastMessage.choices} onSelect={onSend} />
          )}

          {prdDraft && (
            <PrdPreview
              content={prdDraft}
              isGenerating={phase === 'writing' || phase === 'synthesizing'}
            />
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-2">
        <InputBar
          onSend={onSend}
          disabled={isStreaming}
          placeholder={
            phase === 'reviewing'
              ? 'Type feedback or "approve"'
              : phase === 'idle'
                ? 'Describe your idea\u2026'
                : 'Type your response\u2026'
          }
        />
      </div>
    </div>
  )
}
