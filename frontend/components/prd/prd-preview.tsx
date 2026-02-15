'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Download, Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSessionStore } from '@/stores/session-store'
import { API_URL, ANIMATION } from '@/lib/constants'
import { PrdEditor } from './prd-editor'

interface PrdPreviewProps {
  content: string
  isGenerating: boolean
}

export function PrdPreview({ content, isGenerating }: PrdPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const setPrdDraft = useSessionStore((s) => s.setPrdDraft)
  const threadId = useSessionStore((s) => s.threadId)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  const handleExport = useCallback(async () => {
    if (!threadId) return
    try {
      const res = await fetch(`${API_URL}/api/session/${threadId}/export`)
      if (!res.ok) {
        // Fallback: download from client-side content
        const blob = new Blob([content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'prd.md'
        a.click()
        URL.revokeObjectURL(url)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'prd.md'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Fallback to client-side
      const blob = new Blob([content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'prd.md'
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [threadId, content])

  const handleSave = useCallback((newContent: string) => {
    setPrdDraft(newContent)
    setIsEditing(false)
  }, [setPrdDraft])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-2.5">
        <span className="text-xs font-light uppercase tracking-[0.15em] text-zinc-500">
          PRD
        </span>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCopy}
                className="text-zinc-600 hover:text-zinc-300"
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleExport}
                className="text-zinc-600 hover:text-zinc-300"
              >
                <Download className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsEditing(true)}
                className="text-zinc-600 hover:text-zinc-300"
              >
                <Pencil className="size-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <PrdEditor
              key="editor"
              content={content}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ANIMATION.duration.fast }}
              className={`prose prose-sm prose-invert max-w-none prose-p:text-zinc-300 prose-p:leading-relaxed prose-headings:text-zinc-200 prose-headings:font-light prose-strong:text-zinc-200 prose-code:text-zinc-400 prose-li:text-zinc-300 ${
                isGenerating ? 'font-mono' : 'font-sans'
              }`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
