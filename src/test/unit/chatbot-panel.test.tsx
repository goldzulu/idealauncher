import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ChatbotPanel } from '@/components/chat/chatbot-panel'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  ideaAPI: {
    getChatHistory: vi.fn().mockResolvedValue({ messages: [] })
  }
}))

// Mock the error handling
vi.mock('@/lib/error-handling', () => ({
  safeAsync: vi.fn().mockImplementation(async (fn) => {
    try {
      return await fn()
    } catch (error) {
      return null
    }
  })
}))

// Mock keyboard shortcuts
vi.mock('@/hooks/use-keyboard-shortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
  commonShortcuts: {
    focusChat: { key: 'c', ctrlKey: true }
  }
}))

describe('ChatbotPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the chatbot component with header', () => {
    render(<ChatbotPanel ideaId="test-idea" />)
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(screen.getByText('Brainstorm and develop your idea')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ChatbotPanel ideaId="test-idea" className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders input field with correct placeholder', async () => {
    render(<ChatbotPanel ideaId="test-idea" />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ask about your idea...')).toBeInTheDocument()
    })
  })
})