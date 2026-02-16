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
  const [isFocused, setIsFocused] = useState(false)
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

  const hasValue = value.trim().length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className="relative"
    >
      <div
        className={`flex items-end gap-2 rounded-2xl border bg-zinc-900/60 backdrop-blur-sm px-3 py-3 transition-glow sm:px-5 sm:py-3.5 ${
          isFocused
            ? 'border-zinc-600/50 ring-glow'
            : 'border-white/[0.06]'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 placeholder:transition-opacity placeholder:duration-300 focus:placeholder:opacity-40 outline-none disabled:opacity-40 leading-relaxed"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleSend}
          disabled={disabled || !hasValue}
          className={`shrink-0 rounded-xl transition-all duration-300 ${
            hasValue && !disabled
              ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:scale-105'
              : 'text-zinc-600 disabled:opacity-20'
          }`}
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
    </motion.div>
  )
}
