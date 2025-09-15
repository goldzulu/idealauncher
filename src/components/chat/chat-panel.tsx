'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorBoundary, MinimalErrorFallback } from '@/components/error-boundary'
import { useChat } from '@ai-sdk/react'
import { ideaAPI } from '@/lib/api-client'
import { safeAsync } from '@/lib/error-handling'
import { useKeyboardShortcuts, commonShortcuts } from '@/hooks/use-keyboard-shortcuts'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}

interface ChatPanelProps {
  ideaId: string
  className?: string
  onMessageInsert?: (messageId: string, sectionId: string, content: string) => void
}

export function ChatPanel({ ideaId, className, onMessageInsert }: ChatPanelProps) {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [historyError, setHistoryError] = useState<Error | null>(null)

  // Use AI SDK's useChat hook - it has different properties than expected
  // const chat = useChat({
  //   api: `/api/ideas/${ideaId}/chat`,
  //   onError: (error) => {
  //     console.error('Chat streaming error:', error)
  //   },
  // })

  // Extract properties from chat object
  const messages: any[] = [] // chat.messages || []
  const isStreaming = false // chat.status === 'in_progress'
  const streamError = null // chat.error

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      const data = await safeAsync(
        () => ideaAPI.getChatHistory(ideaId),
        {
          onError: (err) => setHistoryError(err as Error),
          showToast: true,
        }
      )

      if (data) {
        // Convert database messages to AI SDK format
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.createdAt),
        }))
        
        // chat.setMessages(formattedMessages)
        setHistoryError(null)
      }
      
      setIsLoadingHistory(false)
    }

    loadChatHistory()
  }, [ideaId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    const message = formData.get('message') as string
    
    if (message?.trim()) {
      // chat.sendMessage(message.trim())
      console.log('Would send message:', message.trim())
    }
  }

  const retryLoadHistory = () => {
    setHistoryError(null)
    setIsLoadingHistory(true)
    // Trigger useEffect to reload
    window.location.reload()
  }

  // Combine errors
  const error = historyError || streamError

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        ...commonShortcuts.focusChat,
        action: () => {
          const chatInput = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement
          chatInput?.focus()
        }
      }
    ]
  })

  if (isLoadingHistory) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="border-b p-4">
          <h3 className="font-semibold">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Brainstorm and develop your idea
          </p>
        </div>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">Loading chat history...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="border-b p-4">
          <h3 className="font-semibold">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Brainstorm and develop your idea
          </p>
        </div>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-destructive">Failed to load chat</p>
            <Button onClick={retryLoadHistory} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary fallback={MinimalErrorFallback}>
      <div className={`flex flex-col h-full ${className}`}>
        {/* Chat Header */}
        <div className="border-b p-4">
          <h3 className="font-semibold">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Brainstorm and develop your idea
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.role === 'assistant' && onMessageInsert && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-6 text-xs"
                        onClick={() => onMessageInsert(message.id, 'content', message.content)}
                      >
                        Insert to Document
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              name="message"
              placeholder="Ask about your idea..."
              disabled={isStreaming || isLoadingHistory}
              className="flex-1"
            />
            <Button 
              type="submit"
              disabled={isStreaming || isLoadingHistory}
              size="icon"
            >
              {isStreaming ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </ErrorBoundary>
  )
}