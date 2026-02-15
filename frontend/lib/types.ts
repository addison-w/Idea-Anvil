export type Phase = 'idle' | 'clarifying' | 'planning' | 'researching' | 'synthesizing' | 'writing' | 'reviewing' | 'done'

export type InterruptType = 'clarification' | 'prd_review'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  choices?: string[]
}

export interface SourceStatus {
  source: string
  status: 'pending' | 'searching' | 'done' | 'error'
  resultCount: number
  insights: string[]
}

export interface WSEvent {
  type: 'token' | 'node_update' | 'custom' | 'interrupt' | 'complete' | 'error'
  node?: string
  content?: string
  event?: string
  data?: Record<string, unknown>
  interrupt_type?: InterruptType
  prd?: string
  message?: string
}
