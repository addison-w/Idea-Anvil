'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ANIMATION } from '@/lib/constants'

interface PrdEditorProps {
  content: string
  onSave: (content: string) => void
  onCancel: () => void
}

export function PrdEditor({ content, onSave, onCancel }: PrdEditorProps) {
  const [value, setValue] = useState(content)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className="space-y-3"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-[300px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-700"
      />
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSave(value)}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Save
        </Button>
      </div>
    </motion.div>
  )
}
