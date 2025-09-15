import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/toaster'

// Mock session data
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: '2024-12-31',
}

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider session={mockSession}>
      {children}
      <Toaster />
    </SessionProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockIdea = (overrides = {}) => ({
  id: 'test-idea-id',
  title: 'Test Idea',
  oneLiner: 'A test idea for testing',
  documentMd: '# Test Document\n\nThis is a test document.',
  iceScore: 7.5,
  riceScore: null,
  phase: 'ideation',
  isArchived: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ownerId: 'test-user-id',
  ...overrides,
})

export const createMockChatMessage = (overrides = {}) => ({
  id: 'test-message-id',
  content: 'Test message content',
  role: 'user' as const,
  metadata: null,
  createdAt: new Date('2024-01-01'),
  ideaId: 'test-idea-id',
  ...overrides,
})

export const createMockScore = (overrides = {}) => ({
  id: 'test-score-id',
  framework: 'ICE',
  impact: 8,
  confidence: 7,
  ease: 6,
  reach: null,
  effort: null,
  total: 7.0,
  notes: 'Test scoring notes',
  createdAt: new Date('2024-01-01'),
  ideaId: 'test-idea-id',
  ...overrides,
})

export const createMockFeature = (overrides = {}) => ({
  id: 'test-feature-id',
  title: 'Test Feature',
  description: 'A test feature for testing',
  priority: 'MUST' as const,
  estimate: 'M' as const,
  dependencies: [],
  createdAt: new Date('2024-01-01'),
  ideaId: 'test-idea-id',
  ...overrides,
})