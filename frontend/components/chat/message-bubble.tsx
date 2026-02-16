'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ANIMATION } from '@/lib/constants'
import type { Message } from '@/lib/types'

interface MessageBubbleProps {
  message: Message
  isStreamingMessage?: boolean
  onOptionSelect?: (option: string) => void
}

interface ParsedContent {
  question: string
  options: string[]
}

const LIST_ITEM = /^(?:[-*]|\d+[.)]) +/
const LETTER_OPTION = /^\*{0,2}([A-E])\)\*{0,2}\s+(.+)$/
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function cleanItemText(raw: string): string {
  return raw
    .replace(LIST_ITEM, '')
    .replace(LETTER_OPTION, '$2')
    .replace(/^\*{1,2}(.+?)\*{1,2}/, '$1')
    .trim()
}

function parseAssistantContent(text: string): ParsedContent {
  if (text.length > 800) return { question: text, options: [] }

  const lines = text.split('\n')
  const items: string[] = []
  let blockStart = -1

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      if (items.length >= 2) break
      items.length = 0
      blockStart = -1
      continue
    }
    if (LIST_ITEM.test(trimmed) || LETTER_OPTION.test(trimmed)) {
      if (blockStart === -1) blockStart = i
      items.push(trimmed)
    } else if (items.length > 0) {
      break
    }
  }

  if (items.length < 2 || blockStart <= 0) {
    return { question: text, options: [] }
  }

  const question = lines.slice(0, blockStart).join('\n').trim()
  return { question, options: items }
}

function formatOptionLabel(raw: string, index: number): { letter: string; text: string } {
  const letterMatch = raw.replace(LIST_ITEM, '').match(LETTER_OPTION)
  if (letterMatch) return { letter: letterMatch[1], text: letterMatch[2] }
  return { letter: LETTERS[index] ?? '', text: cleanItemText(raw) }
}

export function MessageBubble({ message, isStreamingMessage, onOptionSelect }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const parsed = useMemo(() => {
    if (isUser) return { question: message.content, options: [] }
    return parseAssistantContent(message.content)
  }, [isUser, message.content])

  const hasOptions = parsed.options.length > 0
  const isInteractive = !!onOptionSelect && !selectedOption

  const handleSelect = (option: string, index: number) => {
    if (!onOptionSelect || selectedOption) return
    const { text } = formatOptionLabel(option, index)
    setSelectedOption(option)
    onOptionSelect(text)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] transition-colors duration-300 ${
          isUser
            ? 'rounded-2xl rounded-br-md border border-white/[0.06] bg-zinc-900/60 px-4 py-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]'
            : 'rounded-2xl px-1 py-2 group-hover:bg-zinc-900/20'
        }`}
      >
        {isUser ? (
          <p className="text-sm text-zinc-200 leading-relaxed">{message.content}</p>
        ) : hasOptions ? (
          <div className="space-y-4">
            {/* Question text */}
            <div className="prose prose-sm prose-invert max-w-none prose-p:text-zinc-200 prose-p:leading-[1.75] prose-p:font-medium prose-headings:text-zinc-200 prose-headings:font-normal prose-headings:tracking-tight prose-strong:text-zinc-100 prose-code:rounded-md prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-zinc-400 prose-code:text-[0.8125em] prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {parsed.question}
              </ReactMarkdown>
            </div>

            {/* Option pills */}
            <div className="flex flex-wrap gap-2">
              {parsed.options.map((option, i) => {
                const { letter, text } = formatOptionLabel(option, i)
                const isSelected = selectedOption === option
                const isDimmed = selectedOption !== null && !isSelected

                const pillAnimate = isSelected
                  ? { opacity: 1, y: 0, scale: [1, 1.06, 1] as number[], filter: 'blur(0px)' }
                  : { opacity: isDimmed ? 0.35 : 1, y: 0, scale: isDimmed ? 0.97 : 1, filter: isDimmed ? 'blur(1px)' : 'blur(0px)' }

                const pillTransition = isSelected
                  ? { scale: { duration: 0.3, times: [0, 0.4, 1] }, type: 'spring' as const, stiffness: ANIMATION.spring.stiffness, damping: ANIMATION.spring.damping }
                  : { delay: isDimmed ? 0 : i * ANIMATION.stagger, type: 'spring' as const, stiffness: ANIMATION.spring.stiffness, damping: ANIMATION.spring.damping }

                return (
                  <motion.button
                    key={option}
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={pillAnimate}
                    transition={pillTransition}
                    whileHover={isInteractive ? { scale: 1.03, y: -1 } : undefined}
                    whileTap={isInteractive ? { scale: 0.97 } : undefined}
                    onClick={() => handleSelect(option, i)}
                    disabled={!isInteractive}
                    className={`
                      inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm
                      transition-all duration-300
                      ${
                        isSelected
                          ? 'border-zinc-500/50 bg-zinc-800/60 text-zinc-100 shadow-[0_0_20px_-5px_rgba(161,161,170,0.15)]'
                          : isDimmed
                            ? 'border-white/[0.04] bg-zinc-900/20 text-zinc-600 cursor-default'
                            : isInteractive
                              ? 'border-white/[0.06] bg-zinc-900/40 text-zinc-400 hover:border-zinc-600/50 hover:bg-zinc-800/40 hover:text-zinc-200 hover:shadow-[0_0_20px_-5px_rgba(161,161,170,0.1)] cursor-pointer'
                              : 'border-white/[0.06] bg-zinc-900/40 text-zinc-500 cursor-default'
                      }
                    `}
                  >
                    <span
                      className={`
                        flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-medium
                        ${
                          isSelected
                            ? 'bg-zinc-600/40 text-zinc-200'
                            : 'bg-zinc-800/60 text-zinc-500'
                        }
                      `}
                    >
                      {letter}
                    </span>
                    <span>{text}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className={`prose prose-sm prose-invert max-w-none prose-p:text-zinc-300 prose-p:leading-[1.75] prose-headings:text-zinc-200 prose-headings:font-normal prose-headings:tracking-tight prose-strong:text-zinc-200 prose-code:rounded-md prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-zinc-400 prose-code:text-[0.8125em] prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-white/[0.04] prose-pre:bg-zinc-900/80 prose-a:text-zinc-400 prose-a:no-underline hover:prose-a:text-zinc-200 prose-li:text-zinc-300 ${isStreamingMessage ? 'streaming-cursor' : ''}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  )
}
