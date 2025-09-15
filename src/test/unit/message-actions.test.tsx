import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageActions } from '@/components/chat/message-actions'
import { useToast } from '@/hooks/use-toast'

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

// Mock the document utils
vi.mock('@/lib/document-utils', () => ({
  DOCUMENT_SECTIONS: [
    { id: 'problem', title: 'Problem' },
    { id: 'solution', title: 'Solution' },
  ],
  insertIntoDocument: vi.fn(),
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
})

describe('MessageActions', () => {
  const mockOnInsert = vi.fn()
  const mockToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useToast as any).mockReturnValue({ toast: mockToast })
  })

  it('renders copy button for assistant messages', () => {
    render(
      <MessageActions
        messageId="test-message"
        content="Test content"
        role="assistant"
        showInline={true}
      />
    )

    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('renders insert to document button for assistant messages', () => {
    render(
      <MessageActions
        messageId="test-message"
        content="Test content"
        role="assistant"
        onInsert={mockOnInsert}
        showInline={true}
      />
    )

    expect(screen.getByText('Insert to Document')).toBeInTheDocument()
  })

  it('does not render insert button for user messages', () => {
    render(
      <MessageActions
        messageId="test-message"
        content="Test content"
        role="user"
        onInsert={mockOnInsert}
        showInline={true}
      />
    )

    expect(screen.queryByText('Insert to Document')).not.toBeInTheDocument()
  })

  it('copies content to clipboard when copy button is clicked', async () => {
    render(
      <MessageActions
        messageId="test-message"
        content="Test content"
        role="assistant"
        showInline={true}
      />
    )

    const copyButton = screen.getByText('Copy')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test content')
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Copied',
      description: 'Message content copied to clipboard',
    })
  })

  it('calls onInsert when document insertion is triggered', async () => {
    render(
      <MessageActions
        messageId="test-message"
        content="Test content"
        role="assistant"
        onInsert={mockOnInsert}
        showInline={true}
      />
    )

    // Click the insert to document button to open dropdown
    const insertButton = screen.getByText('Insert to Document')
    fireEvent.click(insertButton)

    // Wait for dropdown to appear and click on Problem section
    await waitFor(() => {
      const problemOption = screen.getByText('Problem')
      fireEvent.click(problemOption)
    })

    await waitFor(() => {
      expect(mockOnInsert).toHaveBeenCalledWith('test-message', 'problem', 'Test content')
    })
  })

  it('renders custom actions when provided', () => {
    const customActions = [
      {
        id: 'custom-action',
        label: 'Custom Action',
        icon: () => <span>Icon</span>,
        handler: vi.fn(),
      },
    ]

    render(
      <MessageActions
        messageId="test-message"
        content="Test content"
        role="assistant"
        customActions={customActions}
        showInline={true}
      />
    )

    expect(screen.getByText('Custom Action')).toBeInTheDocument()
  })

  it('shows visual feedback for successful insertion', async () => {
    render(
      <MessageActions
        messageId="test-message"
        content="Test content"
        role="assistant"
        onInsert={mockOnInsert}
        showInline={true}
      />
    )

    // Click the insert to document button
    const insertButton = screen.getByText('Insert to Document')
    fireEvent.click(insertButton)

    // Click on Problem section
    await waitFor(() => {
      const problemOption = screen.getByText('Problem')
      fireEvent.click(problemOption)
    })

    // Should show success feedback
    await waitFor(() => {
      expect(screen.getByText('Inserted!')).toBeInTheDocument()
    })
  })
})