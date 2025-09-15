import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatbotPanel } from '@/components/chat/chatbot-panel'
import { ideaAPI } from '@/lib/api-client'
import { chatPerformanceMonitor } from '@/lib/chat-performance'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  ideaAPI: {
    getChatHistory: vi.fn(),
    chat: vi.fn(),
  }
}))

// Mock the performance monitor
vi.mock('@/lib/chat-performance', () => ({
  chatPerformanceMonitor: {
    startRenderMeasurement: vi.fn(),
    endRenderMeasurement: vi.fn(),
    getOptimalBatchSize: vi.fn(() => 25),
  },
  throttle: vi.fn((fn) => fn),
}))

describe('ChatbotPanel Advanced Features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    vi.mocked(ideaAPI.getChatHistory).mockResolvedValue({
      messages: []
    })
  })

  it('displays enhanced message metadata including timestamps and word count', async () => {
    const mockMessages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello world test message',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: '2', 
        role: 'assistant' as const,
        content: 'This is a test response from the AI assistant',
        createdAt: new Date('2024-01-01T10:01:00Z'),
      }
    ]

    vi.mocked(ideaAPI.getChatHistory).mockResolvedValue({
      messages: mockMessages
    })

    render(<ChatbotPanel ideaId="test-idea" />)

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello world test message')).toBeInTheDocument()
    })

    // Check that timestamps are displayed
    expect(screen.getByText('10:00 AM')).toBeInTheDocument()
    expect(screen.getByText('10:01 AM')).toBeInTheDocument()

    // Check that word counts are displayed for messages with metadata
    const wordCountElements = screen.getAllByText(/\d+ words/)
    expect(wordCountElements.length).toBeGreaterThan(0)
  })

  it('shows performance indicators for large message counts', async () => {
    const manyMessages = Array.from({ length: 75 }, (_, i) => ({
      id: `msg-${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as const,
      content: `Message ${i}`,
      createdAt: new Date(),
    }))

    vi.mocked(ideaAPI.getChatHistory).mockResolvedValue({
      messages: manyMessages
    })

    render(<ChatbotPanel ideaId="test-idea" />)

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('75 messages')).toBeInTheDocument()
    })

    // Should show "Showing X" indicator when messages are virtualized
    expect(screen.getByText('Showing 50')).toBeInTheDocument()
  })

  it('displays character count in input field', () => {
    render(<ChatbotPanel ideaId="test-idea" />)

    const input = screen.getByPlaceholderText('Ask about your idea...')
    
    // Type some text
    fireEvent.change(input, { target: { value: 'Hello world' } })

    // Should show character count
    expect(screen.getByText('11 chars')).toBeInTheDocument()
    expect(screen.getByText('Enter to send')).toBeInTheDocument()
  })

  it('calls performance monitoring functions', async () => {
    render(<ChatbotPanel ideaId="test-idea" />)

    // Wait for component to render
    await waitFor(() => {
      expect(chatPerformanceMonitor.startRenderMeasurement).toHaveBeenCalled()
    })

    // Performance monitoring should be called during render
    expect(chatPerformanceMonitor.endRenderMeasurement).toHaveBeenCalled()
  })

  it('shows load more button for paginated messages', async () => {
    const manyMessages = Array.from({ length: 100 }, (_, i) => ({
      id: `msg-${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as const,
      content: `Message ${i}`,
      createdAt: new Date(),
    }))

    vi.mocked(ideaAPI.getChatHistory).mockResolvedValue({
      messages: manyMessages
    })

    render(<ChatbotPanel ideaId="test-idea" />)

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('100 messages')).toBeInTheDocument()
    })

    // Should show load more button
    const loadMoreButton = screen.getByText(/Load \d+ more messages/)
    expect(loadMoreButton).toBeInTheDocument()

    // Click load more
    fireEvent.click(loadMoreButton)

    // Should call optimal batch size calculation
    expect(chatPerformanceMonitor.getOptimalBatchSize).toHaveBeenCalled()
  })

  it('shows enhanced typing indicators during message generation', () => {
    render(<ChatbotPanel ideaId="test-idea" />)

    const input = screen.getByPlaceholderText('Ask about your idea...')
    const submitButton = screen.getByRole('button', { name: /send/i })

    // Type a message
    fireEvent.change(input, { target: { value: 'Test message' } })
    
    // Mock the chat API to simulate streaming
    vi.mocked(ideaAPI.chat).mockImplementation(async (ideaId, messages, callbacks) => {
      // Simulate streaming chunks
      if (callbacks?.onChunk) {
        callbacks.onChunk('Hello')
        callbacks.onChunk(' world')
      }
      if (callbacks?.onComplete) {
        callbacks.onComplete('Hello world')
      }
      return Promise.resolve()
    })

    // Submit the form
    fireEvent.click(submitButton)

    // Should show typing indicator
    expect(screen.getByText('AI is typing...')).toBeInTheDocument()
  })
})