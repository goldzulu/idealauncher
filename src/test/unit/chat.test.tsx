import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../utils'
import { ChatPanel } from '@/components/chat/chat-panel'
import { MessageActions } from '@/components/chat/message-actions'
import { createMockChatMessage } from '../utils'

// Mock useChat hook
const mockUseChat = vi.fn()
vi.mock('@ai-sdk/react', () => ({
  useChat: () => mockUseChat(),
}))

describe('Chat Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChat.mockReturnValue({
      messages: [],
      input: '',
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      isLoading: false,
      error: null,
    })
  })

  describe('ChatPanel', () => {
    it('renders chat interface', () => {
      render(<ChatPanel ideaId="test-idea-id" />)
      
      expect(screen.getByPlaceholderText(/ask about your idea/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    it('displays chat messages', () => {
      const messages = [
        createMockChatMessage({ role: 'user', content: 'Hello' }),
        createMockChatMessage({ role: 'assistant', content: 'Hi there!' }),
      ]
      
      mockUseChat.mockReturnValue({
        messages,
        input: '',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: false,
        error: null,
      })

      render(<ChatPanel ideaId="test-idea-id" />)
      
      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('Hi there!')).toBeInTheDocument()
    })

    it('handles message submission', () => {
      const handleSubmit = vi.fn()
      const handleInputChange = vi.fn()
      
      mockUseChat.mockReturnValue({
        messages: [],
        input: 'Test message',
        handleInputChange,
        handleSubmit,
        isLoading: false,
        error: null,
      })

      render(<ChatPanel ideaId="test-idea-id" />)
      
      const form = screen.getByRole('form')
      fireEvent.submit(form)
      
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('shows loading state', () => {
      mockUseChat.mockReturnValue({
        messages: [],
        input: '',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: true,
        error: null,
      })

      render(<ChatPanel ideaId="test-idea-id" />)
      
      expect(screen.getByText(/thinking/i)).toBeInTheDocument()
    })
  })

  describe('MessageActions', () => {
    const mockMessage = createMockChatMessage({
      role: 'assistant',
      content: 'This is AI generated content that can be inserted.'
    })

    it('renders insert button for assistant messages', () => {
      render(
        <MessageActions 
          message={mockMessage} 
          onInsert={() => {}} 
        />
      )
      
      expect(screen.getByRole('button', { name: /insert to document/i })).toBeInTheDocument()
    })

    it('handles content insertion', () => {
      const onInsert = vi.fn()
      render(
        <MessageActions 
          message={mockMessage} 
          onInsert={onInsert} 
        />
      )
      
      const insertButton = screen.getByRole('button', { name: /insert to document/i })
      fireEvent.click(insertButton)
      
      expect(onInsert).toHaveBeenCalledWith(mockMessage.content)
    })

    it('does not show insert button for user messages', () => {
      const userMessage = createMockChatMessage({ role: 'user' })
      render(
        <MessageActions 
          message={userMessage} 
          onInsert={() => {}} 
        />
      )
      
      expect(screen.queryByRole('button', { name: /insert to document/i })).not.toBeInTheDocument()
    })
  })
})