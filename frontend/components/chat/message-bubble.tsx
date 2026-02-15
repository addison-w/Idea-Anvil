'use client'

import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ANIMATION } from '@/lib/constants'
import type { Message } from '@/lib/types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

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
        ) : (
          <div className="prose prose-sm prose-invert max-w-none prose-p:text-zinc-300 prose-p:leading-[1.75] prose-headings:text-zinc-200 prose-headings:font-normal prose-headings:tracking-tight prose-strong:text-zinc-200 prose-code:rounded-md prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-zinc-400 prose-code:text-[0.8125em] prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-white/[0.04] prose-pre:bg-zinc-900/80 prose-a:text-zinc-400 prose-a:no-underline hover:prose-a:text-zinc-200 prose-li:text-zinc-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  )
}
