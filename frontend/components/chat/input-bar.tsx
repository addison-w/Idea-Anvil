'use client'

import { useState, useCallback, useRef, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ANIMATION } from '@/lib/constants'

interface InputBarProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function InputBar({ onSend, disabled = false, placeholder = 'Type your response\u2026' }: InputBarProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInput = useCallback(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className="relative"
    >
      <div className="flex items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition-colors duration-200 focus-within:border-zinc-700">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none disabled:opacity-40"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="shrink-0 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
    </motion.div>
  )
}
