export type Phase = 'idle' | 'clarifying' | 'planning' | 'researching' | 'synthesizing' | 'writing' | 'reviewing' | 'done'

export type InterruptType = 'clarification' | 'clarification_complete' | 'prd_review'

export interface RefinedIdea {
  title: string
  problem: string
  target_users: string[]
  core_features: string[]
  business_model?: string | null
  constraints?: string[]
}

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
  query?: string
}

export interface ActivityEvent {
  id: string
  type: 'phase' | 'query' | 'search_start' | 'search_done' | 'synthesis' | 'writing' | 'info'
  label: string
  detail?: string
  status: 'active' | 'done'
  timestamp: number
  source?: string
}

export interface SearchQueryInfo {
  source: string
  query: string
  intent: string
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
