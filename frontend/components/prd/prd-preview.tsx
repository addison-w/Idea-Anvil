'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Download, Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/40 shadow-surface backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-white/[0.04] bg-zinc-900/60 px-5 py-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          PRD
        </span>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCopy}
                    className="text-zinc-600 transition-colors duration-300 hover:text-zinc-300"
                  >
                    {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {copied ? 'Copied' : 'Copy'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleExport}
                    className="text-zinc-600 transition-colors duration-300 hover:text-zinc-300"
                  >
                    <Download className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Export
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setIsEditing(true)}
                    className="text-zinc-600 transition-colors duration-300 hover:text-zinc-300"
                  >
                    <Pencil className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Edit
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="p-6">
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
              className={`prose prose-sm prose-invert max-w-none prose-p:text-zinc-300 prose-p:leading-[1.75] prose-headings:text-zinc-200 prose-headings:font-normal prose-headings:tracking-tight prose-strong:text-zinc-200 prose-code:rounded-md prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-zinc-400 prose-code:text-[0.8125em] prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-white/[0.04] prose-pre:bg-zinc-900/80 prose-li:text-zinc-300 ${
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
