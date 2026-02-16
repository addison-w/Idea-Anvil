'use client'

import { useState, useCallback, type ComponentPropsWithoutRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown, { type Components } from 'react-markdown'
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

let h2Count = 0

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-medium text-zinc-100 tracking-tight pb-4 mb-6 border-b border-white/[0.06]">
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    h2Count++
    const isFirst = h2Count === 1
    return (
      <h2
        className={`border-l-2 border-zinc-600 pl-4 text-base font-medium text-zinc-200 tracking-tight mb-4 ${
          isFirst ? 'mt-6' : 'mt-10 pt-6 border-t border-white/[0.04]'
        }`}
      >
        {children}
      </h2>
    )
  },
  h3: ({ children }) => (
    <h3 className="text-sm font-medium text-zinc-300 mt-6 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-zinc-300 leading-relaxed my-2">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-medium text-zinc-200">{children}</strong>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-zinc-400 underline underline-offset-2 decoration-zinc-700 hover:text-zinc-200 hover:decoration-zinc-500 transition-colors"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-zinc-600 bg-zinc-900/40 rounded-r-lg px-4 py-3 my-4 text-sm text-zinc-400 italic [&>p]:my-0">
      {children}
    </blockquote>
  ),
  ul: ({ children, ...props }) => {
    const className = (props as ComponentPropsWithoutRef<'ul'>).className
    if (className?.includes('contains-task-list')) {
      return <ul className="space-y-1.5 my-3 list-none pl-0">{children}</ul>
    }
    return <ul className="space-y-1.5 my-3 pl-4 list-disc marker:text-zinc-600">{children}</ul>
  },
  ol: ({ children }) => (
    <ol className="space-y-1.5 my-3 pl-4 list-decimal marker:text-zinc-500">{children}</ol>
  ),
  li: ({ children, ...props }) => {
    const className = (props as ComponentPropsWithoutRef<'li'>).className
    if (className?.includes('task-list-item')) {
      const checked = Array.isArray(children)
        && children.some(
          (child) =>
            typeof child === 'object' &&
            child !== null &&
            'props' in child &&
            (child as { props: { type?: string; checked?: boolean } }).props?.type === 'checkbox' &&
            (child as { props: { checked?: boolean } }).props?.checked
        )
      const filteredChildren = Array.isArray(children)
        ? children.filter(
            (child) =>
              !(
                typeof child === 'object' &&
                child !== null &&
                'props' in child &&
                (child as { props: { type?: string } }).props?.type === 'checkbox'
              )
          )
        : children
      return (
        <li className={`flex items-start gap-2.5 text-sm leading-relaxed ${checked ? 'text-zinc-300' : 'text-zinc-500'}`}>
          <span className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded border ${
            checked
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-zinc-600 bg-zinc-800/60 text-transparent'
          }`}>
            {checked && (
              <svg className="size-2.5" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span>{filteredChildren}</span>
        </li>
      )
    }
    return <li className="text-sm text-zinc-300 leading-relaxed">{children}</li>
  },
  input: () => null,
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-white/[0.06]">
      <table className="prd-table w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-800/60">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400 border-b border-white/[0.06]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-zinc-300 border-b border-white/[0.03]">{children}</td>
  ),
  code: ({ children, className }) => {
    if (className?.includes('language-')) {
      return (
        <code className={`block text-xs font-mono text-zinc-300 ${className}`}>{children}</code>
      )
    }
    return (
      <code className="bg-zinc-800/80 text-zinc-400 rounded px-1.5 py-0.5 text-[0.8em] font-mono">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="bg-zinc-900/80 border border-white/[0.04] rounded-xl p-4 overflow-x-auto text-xs font-mono text-zinc-300 my-4">
      {children}
    </pre>
  ),
  hr: () => <hr className="border-white/[0.04] my-6" />,
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
      const res = await fetch(`${API_URL}/api/export/${threadId}`)
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

  h2Count = 0

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
                    aria-label="Copy PRD"
                    className="text-zinc-600 transition-colors duration-300 hover:text-zinc-300"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {copied ? (
                        <motion.span
                          key="check"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <Check className="size-3 text-emerald-400" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Copy className="size-3" />
                        </motion.span>
                      )}
                    </AnimatePresence>
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
                    aria-label="Export PRD"
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
                    aria-label="Edit PRD"
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

      <div className="p-6 sm:p-8">
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
              className={isGenerating ? 'font-mono' : 'font-sans'}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {content}
              </ReactMarkdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
