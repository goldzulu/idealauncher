import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InsertionFeedbackItem, useInsertionFeedback } from '@/components/chat/insertion-feedback'
import { renderHook, act } from '@testing-library/react'

describe('InsertionFeedback', () => {
  const mockOnDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('InsertionFeedbackItem', () => {
    it('renders success feedback correctly', () => {
      const feedback = {
        id: 'test-1',
        messageId: 'msg-1',
        sectionId: 'problem',
        sectionTitle: 'Problem',
        status: 'success' as const,
        timestamp: new Date(),
        content: 'Test content',
      }

      render(
        <InsertionFeedbackItem
          feedback={feedback}
          onDismiss={mockOnDismiss}
          autoHide={false}
        />
      )

      expect(screen.getByText('Content inserted')).toBeInTheDocument()
      expect(screen.getByText('Added to Problem section')).toBeInTheDocument()
    })

    it('renders error feedback correctly', () => {
      const feedback = {
        id: 'test-1',
        messageId: 'msg-1',
        sectionId: 'problem',
        sectionTitle: 'Problem',
        status: 'error' as const,
        timestamp: new Date(),
        error: 'Network error',
      }

      render(
        <InsertionFeedbackItem
          feedback={feedback}
          onDismiss={mockOnDismiss}
          autoHide={false}
        />
      )

      expect(screen.getByText('Insertion failed')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    it('renders pending feedback correctly', () => {
      const feedback = {
        id: 'test-1',
        messageId: 'msg-1',
        sectionId: 'problem',
        sectionTitle: 'Problem',
        status: 'pending' as const,
        timestamp: new Date(),
      }

      render(
        <InsertionFeedbackItem
          feedback={feedback}
          onDismiss={mockOnDismiss}
          autoHide={false}
        />
      )

      expect(screen.getByText('Inserting content')).toBeInTheDocument()
      expect(screen.getByText('Adding to Problem...')).toBeInTheDocument()
    })

    it('calls onDismiss when dismiss button is clicked', () => {
      const feedback = {
        id: 'test-1',
        messageId: 'msg-1',
        sectionId: 'problem',
        sectionTitle: 'Problem',
        status: 'success' as const,
        timestamp: new Date(),
      }

      render(
        <InsertionFeedbackItem
          feedback={feedback}
          onDismiss={mockOnDismiss}
          autoHide={false}
        />
      )

      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      fireEvent.click(dismissButton)

      expect(mockOnDismiss).toHaveBeenCalledWith('test-1')
    })
  })

  describe('useInsertionFeedback', () => {
    it('adds feedback correctly', () => {
      const { result } = renderHook(() => useInsertionFeedback())

      act(() => {
        const id = result.current.addFeedback({
          messageId: 'msg-1',
          sectionId: 'problem',
          sectionTitle: 'Problem',
          status: 'pending',
        })
        expect(id).toBeDefined()
      })

      expect(result.current.feedbacks).toHaveLength(1)
      expect(result.current.feedbacks[0].messageId).toBe('msg-1')
      expect(result.current.feedbacks[0].status).toBe('pending')
    })

    it('updates feedback correctly', () => {
      const { result } = renderHook(() => useInsertionFeedback())

      let feedbackId: string

      act(() => {
        feedbackId = result.current.addFeedback({
          messageId: 'msg-1',
          sectionId: 'problem',
          sectionTitle: 'Problem',
          status: 'pending',
        })
      })

      act(() => {
        result.current.updateFeedback(feedbackId, { status: 'success' })
      })

      expect(result.current.feedbacks[0].status).toBe('success')
    })

    it('removes feedback correctly', () => {
      const { result } = renderHook(() => useInsertionFeedback())

      let feedbackId: string

      act(() => {
        feedbackId = result.current.addFeedback({
          messageId: 'msg-1',
          sectionId: 'problem',
          sectionTitle: 'Problem',
          status: 'pending',
        })
      })

      expect(result.current.feedbacks).toHaveLength(1)

      act(() => {
        result.current.removeFeedback(feedbackId)
      })

      expect(result.current.feedbacks).toHaveLength(0)
    })

    it('clears all feedback correctly', () => {
      const { result } = renderHook(() => useInsertionFeedback())

      act(() => {
        result.current.addFeedback({
          messageId: 'msg-1',
          sectionId: 'problem',
          sectionTitle: 'Problem',
          status: 'pending',
        })
        result.current.addFeedback({
          messageId: 'msg-2',
          sectionId: 'solution',
          sectionTitle: 'Solution',
          status: 'success',
        })
      })

      expect(result.current.feedbacks).toHaveLength(2)

      act(() => {
        result.current.clearAll()
      })

      expect(result.current.feedbacks).toHaveLength(0)
    })
  })
})