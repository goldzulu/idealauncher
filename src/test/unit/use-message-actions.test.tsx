import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMessageActions } from '@/hooks/use-message-actions'
import { useToast } from '@/hooks/use-toast'

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
  share: vi.fn(() => Promise.resolve()),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useMessageActions', () => {
  const mockToast = vi.fn()
  const mockOnInsert = vi.fn()
  const mockOnShare = vi.fn()
  const mockOnBookmark = vi.fn()
  const mockOnFeedback = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useToast as any).mockReturnValue({ toast: mockToast })
    localStorageMock.getItem.mockReturnValue('[]')
  })

  it('returns custom actions based on enabled actions', () => {
    const { result } = renderHook(() =>
      useMessageActions({
        enabledActions: ['share', 'bookmark', 'thumbs-up'],
      })
    )

    expect(result.current.customActions).toHaveLength(3)
    expect(result.current.customActions.map(a => a.id)).toEqual([
      'share',
      'bookmark',
      'thumbs-up',
    ])
  })

  it('handles share action with native share API', async () => {
    const { result } = renderHook(() =>
      useMessageActions({
        onShare: mockOnShare,
        enabledActions: ['share'],
      })
    )

    await act(async () => {
      await result.current.handleShare('msg-1', 'Test content')
    })

    expect(navigator.share).toHaveBeenCalledWith({
      title: 'AI Generated Content',
      text: 'Test content',
    })
    expect(mockOnShare).toHaveBeenCalledWith('msg-1', 'Test content')
  })

  it('handles share action fallback to clipboard', async () => {
    // Mock navigator.share to be undefined
    const originalShare = navigator.share
    delete (navigator as any).share

    const { result } = renderHook(() =>
      useMessageActions({
        onShare: mockOnShare,
        enabledActions: ['share'],
      })
    )

    await act(async () => {
      await result.current.handleShare('msg-1', 'Test content')
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test content')
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
      description: 'Content copied for sharing',
    })

    // Restore navigator.share
    ;(navigator as any).share = originalShare
  })

  it('handles bookmark action - add bookmark', async () => {
    const { result } = renderHook(() =>
      useMessageActions({
        onBookmark: mockOnBookmark,
        enabledActions: ['bookmark'],
      })
    )

    await act(async () => {
      await result.current.handleBookmark('msg-1', 'Test content')
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'message-bookmarks',
      expect.stringContaining('msg-1')
    )
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Bookmarked',
      description: 'Message saved to bookmarks',
    })
    expect(mockOnBookmark).toHaveBeenCalledWith('msg-1', 'Test content')
  })

  it('handles bookmark action - remove existing bookmark', async () => {
    // Mock existing bookmark
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify([{ id: 'msg-1', content: 'Test content' }])
    )

    const { result } = renderHook(() =>
      useMessageActions({
        onBookmark: mockOnBookmark,
        enabledActions: ['bookmark'],
      })
    )

    await act(async () => {
      await result.current.handleBookmark('msg-1', 'Test content')
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Bookmark removed',
      description: 'Message removed from bookmarks',
    })
  })

  it('handles positive feedback', async () => {
    const { result } = renderHook(() =>
      useMessageActions({
        onFeedback: mockOnFeedback,
        enabledActions: ['thumbs-up'],
      })
    )

    await act(async () => {
      await result.current.handleFeedback('msg-1', 'Test content', 'positive')
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Feedback recorded',
      description: 'Thank you for your positive feedback',
    })
    expect(mockOnFeedback).toHaveBeenCalledWith('msg-1', 'positive')
  })

  it('handles negative feedback', async () => {
    const { result } = renderHook(() =>
      useMessageActions({
        onFeedback: mockOnFeedback,
        enabledActions: ['thumbs-down'],
      })
    )

    await act(async () => {
      await result.current.handleFeedback('msg-1', 'Test content', 'negative')
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Feedback recorded',
      description: 'Thank you for your negative feedback',
    })
    expect(mockOnFeedback).toHaveBeenCalledWith('msg-1', 'negative')
  })

  it('handles export action', () => {
    const { result } = renderHook(() =>
      useMessageActions({
        enabledActions: ['export'],
      })
    )

    // Just verify the export action is included
    expect(result.current.customActions).toHaveLength(1)
    expect(result.current.customActions[0].id).toBe('export')
    expect(result.current.customActions[0].label).toBe('Export')
  })
})