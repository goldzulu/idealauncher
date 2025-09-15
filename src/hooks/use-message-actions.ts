'use client'

import { useCallback, useMemo } from 'react'
import { MessageAction } from '@/components/chat/message-actions'
import { 
  Copy, 
  FileText, 
  Share2, 
  Bookmark, 
  ThumbsUp, 
  ThumbsDown,
  RefreshCw,
  Download
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface UseMessageActionsOptions {
  onInsert?: (messageId: string, sectionId: string, content: string) => void
  onShare?: (messageId: string, content: string) => void
  onBookmark?: (messageId: string, content: string) => void
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void
  onRegenerate?: (messageId: string) => void
  onExport?: (messageId: string, content: string) => void
  enabledActions?: string[]
}

export function useMessageActions(options: UseMessageActionsOptions = {}) {
  const { toast } = useToast()
  const {
    onInsert,
    onShare,
    onBookmark,
    onFeedback,
    onRegenerate,
    onExport,
    enabledActions = ['copy', 'insert', 'share', 'bookmark']
  } = options

  const handleShare = useCallback(async (messageId: string, content: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'AI Generated Content',
          text: content,
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(content)
        toast({
          title: 'Copied to clipboard',
          description: 'Content copied for sharing',
        })
      }
      onShare?.(messageId, content)
    } catch (error) {
      toast({
        title: 'Share failed',
        description: 'Failed to share content',
        variant: 'destructive',
      })
    }
  }, [onShare, toast])

  const handleBookmark = useCallback(async (messageId: string, content: string) => {
    try {
      // Store in localStorage for now - could be enhanced to use a proper backend
      const bookmarks = JSON.parse(localStorage.getItem('message-bookmarks') || '[]')
      const bookmark = {
        id: messageId,
        content,
        timestamp: new Date().toISOString(),
      }
      
      const existingIndex = bookmarks.findIndex((b: any) => b.id === messageId)
      if (existingIndex >= 0) {
        bookmarks.splice(existingIndex, 1)
        toast({
          title: 'Bookmark removed',
          description: 'Message removed from bookmarks',
        })
      } else {
        bookmarks.push(bookmark)
        toast({
          title: 'Bookmarked',
          description: 'Message saved to bookmarks',
        })
      }
      
      localStorage.setItem('message-bookmarks', JSON.stringify(bookmarks))
      onBookmark?.(messageId, content)
    } catch (error) {
      toast({
        title: 'Bookmark failed',
        description: 'Failed to bookmark message',
        variant: 'destructive',
      })
    }
  }, [onBookmark, toast])

  const handleFeedback = useCallback(async (messageId: string, content: string, feedback: 'positive' | 'negative') => {
    try {
      // Store feedback - could be enhanced to send to analytics
      const feedbackData = {
        messageId,
        feedback,
        timestamp: new Date().toISOString(),
      }
      
      console.log('Message feedback:', feedbackData)
      
      toast({
        title: 'Feedback recorded',
        description: `Thank you for your ${feedback} feedback`,
      })
      
      onFeedback?.(messageId, feedback)
    } catch (error) {
      toast({
        title: 'Feedback failed',
        description: 'Failed to record feedback',
        variant: 'destructive',
      })
    }
  }, [onFeedback, toast])

  const handleRegenerate = useCallback(async (messageId: string, content: string) => {
    try {
      onRegenerate?.(messageId)
      toast({
        title: 'Regenerating',
        description: 'Generating a new response...',
      })
    } catch (error) {
      toast({
        title: 'Regenerate failed',
        description: 'Failed to regenerate response',
        variant: 'destructive',
      })
    }
  }, [onRegenerate, toast])

  const handleExport = useCallback(async (messageId: string, content: string) => {
    try {
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `message-${messageId}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      onExport?.(messageId, content)
      toast({
        title: 'Exported',
        description: 'Message exported as text file',
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export message',
        variant: 'destructive',
      })
    }
  }, [onExport, toast])

  const customActions = useMemo((): MessageAction[] => {
    const actions: MessageAction[] = []

    if (enabledActions.includes('share')) {
      actions.push({
        id: 'share',
        label: 'Share',
        icon: Share2,
        handler: handleShare,
      })
    }

    if (enabledActions.includes('bookmark')) {
      actions.push({
        id: 'bookmark',
        label: 'Bookmark',
        icon: Bookmark,
        handler: handleBookmark,
      })
    }

    if (enabledActions.includes('thumbs-up')) {
      actions.push({
        id: 'thumbs-up',
        label: 'Good response',
        icon: ThumbsUp,
        handler: (messageId, content) => handleFeedback(messageId, content, 'positive'),
        variant: 'success',
      })
    }

    if (enabledActions.includes('thumbs-down')) {
      actions.push({
        id: 'thumbs-down',
        label: 'Poor response',
        icon: ThumbsDown,
        handler: (messageId, content) => handleFeedback(messageId, content, 'negative'),
        variant: 'destructive',
      })
    }

    if (enabledActions.includes('regenerate')) {
      actions.push({
        id: 'regenerate',
        label: 'Regenerate',
        icon: RefreshCw,
        handler: handleRegenerate,
      })
    }

    if (enabledActions.includes('export')) {
      actions.push({
        id: 'export',
        label: 'Export',
        icon: Download,
        handler: handleExport,
      })
    }

    return actions
  }, [
    enabledActions,
    handleShare,
    handleBookmark,
    handleFeedback,
    handleRegenerate,
    handleExport,
  ])

  return {
    customActions,
    handleShare,
    handleBookmark,
    handleFeedback,
    handleRegenerate,
    handleExport,
  }
}