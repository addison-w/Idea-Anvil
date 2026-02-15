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
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] ${
          isUser
            ? 'rounded-2xl rounded-br-sm border border-zinc-700/50 bg-zinc-900 px-4 py-2.5'
            : 'px-1 py-2'
        }`}
      >
        {isUser ? (
          <p className="text-sm text-zinc-200 leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none prose-p:text-zinc-300 prose-p:leading-relaxed prose-headings:text-zinc-200 prose-headings:font-light prose-strong:text-zinc-200 prose-code:text-zinc-400 prose-a:text-zinc-400 prose-a:no-underline hover:prose-a:text-zinc-200">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  )
}
