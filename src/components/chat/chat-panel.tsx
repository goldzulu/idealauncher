'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send } from 'lucide-react'
import { MessageList } from './message-list'
import { LoadingSpinner, StreamingLoading, LoadingState, TypingIndicator } from '@/components/ui/loading'
import { ErrorBoundary, MinimalErrorFallback } from '@/components/error-boundary'
// import { useChat } from 'ai/react' // Not available in current version
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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      const data = await safeAsync(
        () => ideaAPI.getChatHistory(ideaId),
        {
          onError: (err) => setError(err as Error),
          showToast: true,
        }
      )

      if (data) {
        // Convert database messages to component format
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.createdAt),
        }))
        
        setMessages(formattedMessages)
        setError(null)
      }
      
      setIsLoadingHistory(false)
    }

    loadChatHistory()
  }, [ideaId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    
    const currentInput = input.trim()
    setInput('')
    setIsStreaming(true)
    setError(null)

    try {
      // Simple fetch with streaming
      const response = await fetch(`/api/ideas/${ideaId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
          }))
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Add assistant message placeholder
      setMessages(prev => [...prev, assistantMessage])

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let streamedContent = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          streamedContent += chunk
          
          // Update assistant message with streamed content
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: streamedContent }
                : msg
            )
          )
        }
      } finally {
        reader.releaseLock()
      }

    } catch (err) {
      // Remove assistant message on error
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessage.id))
      // Restore input
      setInput(currentInput)
      setError(err as Error)
    }

    setIsStreaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const retryLoadHistory = () => {
    setError(null)
    setIsLoadingHistory(true)
    // Trigger useEffect to reload
    window.location.reload()
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        ...commonShortcuts.focusChat,
        action: () => {
          const chatInput = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement
          chatInput?.focus()
        }
      },
      {
        ...commonShortcuts.clearChat,
        action: () => {
          if (confirm('Clear chat history?')) {
            setMessages([])
          }
        }
      }
    ]
  })

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
          <LoadingState
            isLoading={isLoadingHistory}
            error={error}
            retryAction={retryLoadHistory}
            loadingComponent={
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-muted-foreground">Loading chat history...</p>
                </div>
              </div>
            }
          >
            <ScrollArea className="h-full">
              <MessageList 
                messages={messages || []} 
                isLoading={isStreaming} 
                onMessageInsert={onMessageInsert}
              />
              <TypingIndicator 
                isVisible={isStreaming} 
                className="p-4" 
              />
            </ScrollArea>
          </LoadingState>
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your idea..."
              disabled={isStreaming || isLoadingHistory}
              className="flex-1"
            />
            <Button 
              type="submit"
              disabled={!input.trim() || isStreaming || isLoadingHistory}
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