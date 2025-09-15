// Core type definitions for IdeaLauncher MVP

export interface User {
  id: string
  email: string
  name?: string
  image?: string
  createdAt: Date
  updatedAt: Date
}

export interface Idea {
  id: string
  title: string
  oneLiner?: string
  documentMd: string
  iceScore?: number
  riceScore?: number
  phase: 'ideation' | 'validation' | 'scoring' | 'mvp' | 'export'
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
  ownerId: string
}

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  metadata?: Record<string, any>
  createdAt: Date
  ideaId: string
}

export interface ResearchFinding {
  id: string
  type: 'competitor' | 'monetization' | 'naming' | 'tech_stack'
  title: string
  content: string
  url?: string
  metadata?: Record<string, any>
  isInserted: boolean
  createdAt: Date
  ideaId: string
}

export interface Feature {
  id: string
  title: string
  description?: string
  priority: 'MUST' | 'SHOULD' | 'COULD'
  estimate?: 'S' | 'M' | 'L'
  dependencies: string[]
  createdAt: Date
  ideaId: string
}

export interface Score {
  id: string
  framework: 'ICE' | 'RICE'
  impact: number
  confidence: number
  ease?: number
  reach?: number
  effort?: number
  total: number
  notes?: string
  createdAt: Date
  ideaId: string
}

export interface SpecExport {
  id: string
  format: string
  content: string
  metadata?: Record<string, any>
  createdAt: Date
  ideaId: string
}