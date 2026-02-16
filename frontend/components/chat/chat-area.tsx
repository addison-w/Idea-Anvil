'use client'

import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSessionStore } from '@/stores/session-store'
import { ANIMATION } from '@/lib/constants'
import { MessageBubble } from './message-bubble'
import { ChoiceCard } from './choice-card'
import { ActivityLog } from './activity-log'
import { InputBar } from './input-bar'
import { PrdPreview } from '@/components/prd/prd-preview'

interface ChatAreaProps {
  onSend: (message: string) => void
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className="flex justify-start"
    >
      <div className="flex items-center gap-1 rounded-2xl px-3 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block size-1.5 rounded-full bg-zinc-600"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

export function ChatArea({ onSend }: ChatAreaProps) {
  const messages = useSessionStore((s) => s.messages)
  const isStreaming = useSessionStore((s) => s.isStreaming)
  const prdDraft = useSessionStore((s) => s.prdDraft)
  const phase = useSessionStore((s) => s.phase)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, prdDraft, isStreaming])

  const lastMessage = messages[messages.length - 1]
  const lastMessageIndex = messages.length - 1
  const showChoices = lastMessage?.role === 'assistant' && lastMessage.choices && lastMessage.choices.length > 0 && !isStreaming

  const showTyping = isStreaming && (
    messages.length === 0 || lastMessage?.role === 'user'
  )

  const userMessageCount = useMemo(
    () => messages.filter((m) => m.role === 'user').length,
    [messages],
  )
  const clarifyStep = Math.min(userMessageCount + 1, 5)

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-3 px-3 py-4 sm:space-y-4 sm:px-4 sm:py-6">
          {phase === 'clarifying' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: ANIMATION.duration.slow, ease: ANIMATION.ease }}
              className="flex justify-center pb-2"
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Step {clarifyStep} of ~5
              </span>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg, index) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreamingMessage={isStreaming && index === lastMessageIndex && msg.role === 'assistant'}
                onOptionSelect={
                  msg.role === 'assistant' && index === lastMessageIndex && !isStreaming
                    ? onSend
                    : undefined
                }
              />
            ))}
          </AnimatePresence>

          {showChoices && lastMessage.choices && (
            <ChoiceCard choices={lastMessage.choices} onSelect={onSend} />
          )}

          <AnimatePresence>
            {showTyping && <TypingIndicator />}
          </AnimatePresence>

          <ActivityLog />

          {prdDraft && (
            <PrdPreview
              content={prdDraft}
              isGenerating={phase === 'writing' || phase === 'synthesizing'}
            />
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="mx-auto w-full max-w-2xl px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
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
