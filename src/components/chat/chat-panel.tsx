'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send } from 'lucide-react'
import { MessageList } from './message-list'
import { LoadingSpinner, StreamingLoading, LoadingState, TypingIndicator } from '@/components/ui/loading'
import { ErrorBoundary, MinimalErrorFallback } from '@/components/error-boundary'
import { ideaAPI } from '@/lib/api-client'
import { safeAsync } from '@/lib/error-handling'
import { useOptimistic } from '@/hooks/use-optimistic-updates'
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
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [streamingProgress, setStreamingProgress] = useState(0)
  
  // Use optimistic updates for messages
  const {
    data: messages,
    updateOptimistic: updateMessages,
    commitUpdate: commitMessageUpdate
  } = useOptimistic<Message[]>([])

  // Load chat history on mount with caching
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
        
        updateMessages(() => formattedMessages)
        setError(null)
      }
      
      setIsLoading(false)
    }

    loadChatHistory()
  }, [ideaId, updateMessages])

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

    // Optimistically add both messages
    updateMessages(current => [...(current || []), userMessage, assistantMessage])
    
    const currentInput = input.trim()
    setInput('')
    setIsStreaming(true)
    setError(null)
    setStreamingProgress(0)

    // Handle streaming with proper callbacks
    try {
      let streamedContent = ''
      
      await ideaAPI.chat(ideaId, [...(messages || []), userMessage].map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
      })), {
        onChunk: (chunk: string) => {
          streamedContent += chunk
          // Update the assistant message with streamed content
          updateMessages(current => 
            (current || []).map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: streamedContent }
                : msg
            )
          )
          setStreamingProgress(Math.min(streamedContent.length / 10, 100))
        },
        onComplete: (fullText: string) => {
          // Final update with complete text
          updateMessages(current => 
            (current || []).map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: fullText }
                : msg
            )
          )
          setStreamingProgress(100)
          setTimeout(() => setStreamingProgress(0), 500)
        },
        onError: (err: Error) => {
          // Revert optimistic updates
          updateMessages(current => 
            (current || []).filter(msg => 
              msg.id !== userMessage.id && msg.id !== assistantMessage.id
            )
          )
          // Restore input
          setInput(currentInput)
          setError(err)
        }
      })
    } catch (err) {
      // Revert optimistic updates
      updateMessages(current => 
        (current || []).filter(msg => 
          msg.id !== userMessage.id && msg.id !== assistantMessage.id
        )
      )
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
    setIsLoading(true)
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
            updateMessages(() => [])
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
            isLoading={isLoading}
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
              {isStreaming && streamingProgress > 0 && (
                <div className="px-4 pb-2">
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${streamingProgress}%` }}
                    />
                  </div>
                </div>
              )}
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
              disabled={isStreaming || isLoading}
              className="flex-1"
            />
            <Button 
              type="submit"
              disabled={!input.trim() || isStreaming || isLoading}
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