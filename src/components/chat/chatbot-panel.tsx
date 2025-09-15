'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import './chatbot-panel.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, RotateCcw } from 'lucide-react'
import { LoadingSpinner, TypingIndicator, StreamingLoading } from '@/components/ui/loading'
import { ideaAPI } from '@/lib/api-client'
import { ChatMessage } from '@/types'
import { generateId } from 'ai'
import { cn } from '@/lib/utils'
import { MessageActions } from './message-actions'
import { useMessageActions } from '@/hooks/use-message-actions'
import { InsertionFeedbackList, useInsertionFeedback } from './insertion-feedback'
import { DOCUMENT_SECTIONS } from '@/lib/document-utils'
import ReactMarkdown from 'react-markdown'
import { chatPerformanceMonitor, throttle } from '@/lib/chat-performance'

interface ChatbotPanelProps {
  ideaId: string
  className?: string
  onMessageInsert?: (messageId: string, sectionId: string, content: string) => void
}

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
  metadata?: {
    tokens?: number
    model?: string
    responseTime?: number
    wordCount?: number
  }
}

export function ChatbotPanel({ ideaId, className, onMessageInsert }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  
  // Performance optimizations
  const [visibleMessageCount, setVisibleMessageCount] = useState(50) // Show last 50 messages initially
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Enhanced insertion feedback
  const { feedbacks, addFeedback, updateFeedback, removeFeedback } = useInsertionFeedback()

  // Performance optimization: Only render visible messages
  const visibleMessages = useMemo(() => {
    chatPerformanceMonitor.startRenderMeasurement()
    
    const result = messages.length <= visibleMessageCount 
      ? messages 
      : messages.slice(-visibleMessageCount)
    
    // Measure render performance in development
    setTimeout(() => {
      chatPerformanceMonitor.endRenderMeasurement(result.length)
    }, 0)
    
    return result
  }, [messages, visibleMessageCount])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isLoadingHistory && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, isLoadingHistory])

  // Load more messages when scrolling to top (throttled for performance)
  const handleScroll = useCallback(
    throttle((event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop } = event.currentTarget
      if (scrollTop === 0 && messages.length > visibleMessageCount) {
        const batchSize = chatPerformanceMonitor.getOptimalBatchSize(visibleMessageCount, messages.length)
        setVisibleMessageCount(prev => Math.min(prev + batchSize, messages.length))
      }
    }, 100),
    [messages.length, visibleMessageCount]
  )

  // Enhanced message actions with feedback integration
  const handleMessageInsert = useCallback((messageId: string, sectionId: string, content: string) => {
    const section = DOCUMENT_SECTIONS.find(s => s.id === sectionId)
    const feedbackId = addFeedback({
      messageId,
      sectionId,
      sectionTitle: section?.title || sectionId,
      status: 'pending',
      content,
    })

    try {
      // Call the original callback
      onMessageInsert?.(messageId, sectionId, content)
      
      // Update feedback to success
      updateFeedback(feedbackId, { status: 'success' })
    } catch (error) {
      // Update feedback to error
      updateFeedback(feedbackId, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [onMessageInsert, addFeedback, updateFeedback])

  const { customActions } = useMessageActions({
    onInsert: handleMessageInsert,
    enabledActions: ['share', 'bookmark', 'thumbs-up', 'thumbs-down', 'export']
  })
  
  const loadChatHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true)
      setHistoryError(null)
      
      const response = await ideaAPI.getChatHistory(ideaId)
      const dbMessages = response.messages || []
      
      // Convert database messages to display format with metadata
      const displayMessages: DisplayMessage[] = dbMessages.map((msg: ChatMessage) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        createdAt: new Date(msg.createdAt),
        metadata: {
          wordCount: msg.content.split(/\s+/).length,
          // Add more metadata if available from the API
        }
      }))
      
      setMessages(displayMessages)
      
    } catch (error) {
      console.error('Failed to load chat history:', error)
      setHistoryError('Failed to load chat history. You can still start a new conversation.')
    } finally {
      setIsLoadingHistory(false)
    }
  }, [ideaId])
  
  // Load chat history on component mount
  useEffect(() => {
    if (ideaId) {
      loadChatHistory()
    }
  }, [ideaId, loadChatHistory])

  const retryLoadHistory = async () => {
    if (ideaId) {
      await loadChatHistory()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const startTime = Date.now()
    const userMessage: DisplayMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
      metadata: {
        wordCount: input.trim().split(/\s+/).length,
      }
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setIsLoading(true)
    setIsTyping(true)

    try {
      // Prepare messages for API (include conversation history)
      const conversationMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      let assistantContent = ''
      let tokenCount = 0
      const assistantMessage: DisplayMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
        metadata: {
          wordCount: 0,
          tokens: 0,
          model: 'gemini-pro', // Default model
          responseTime: 0,
        }
      }

      // Add empty assistant message for streaming
      setMessages(prev => [...prev, assistantMessage])

      // Stream the response
      await ideaAPI.chat(ideaId, conversationMessages, {
        onChunk: (chunk) => {
          assistantContent += chunk
          tokenCount += chunk.split(/\s+/).length
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { 
                    ...msg, 
                    content: assistantContent,
                    metadata: {
                      ...msg.metadata,
                      wordCount: assistantContent.split(/\s+/).length,
                      tokens: tokenCount,
                    }
                  }
                : msg
            )
          )
        },
        onComplete: (fullText) => {
          const endTime = Date.now()
          const responseTime = endTime - startTime
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { 
                    ...msg, 
                    content: fullText,
                    metadata: {
                      ...msg.metadata,
                      wordCount: fullText.split(/\s+/).length,
                      responseTime,
                    }
                  }
                : msg
            )
          )
          setIsTyping(false)
        },
        onError: (error) => {
          console.error('Chat streaming error:', error)
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: 'Sorry, there was an error processing your message. Please try again.' }
                : msg
            )
          )
          setIsTyping(false)
        }
      })

    } catch (error) {
      console.error('Chat error:', error)
      // Restore input and remove failed message
      setInput(currentInput)
      setMessages(prev => prev.slice(0, -2)) // Remove both user and assistant messages
      setIsTyping(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Enhanced Chat Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Brainstorm and develop your idea
            </p>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {messages.length} messages
                </span>
                {messages.length > visibleMessageCount && (
                  <span className="text-xs text-muted-foreground bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Showing {visibleMessageCount}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        {historyError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-sm text-destructive font-medium">Connection Issue</p>
                <p className="text-xs text-destructive/80 mt-1">{historyError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-destructive/20 hover:bg-destructive/10"
                onClick={retryLoadHistory}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Messages Area */}
      <div className="flex-1 overflow-hidden messages-gradient">
        <ScrollArea 
          className="h-full chat-scroll-area" 
          ref={scrollAreaRef}
          onScrollCapture={handleScroll}
        >
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="flex flex-col items-center gap-3">
                <LoadingSpinner size="lg" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Loading chat history</p>
                  <p className="text-xs text-muted-foreground mt-1">Retrieving your conversation...</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Load more indicator */}
              {messages.length > visibleMessageCount && (
                <div className="text-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleMessageCount(prev => Math.min(prev + 25, messages.length))}
                    className="text-xs text-muted-foreground"
                  >
                    Load {Math.min(25, messages.length - visibleMessageCount)} more messages
                  </Button>
                </div>
              )}
              
              {visibleMessages.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <div className="max-w-sm mx-auto space-y-4">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      <Send className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">Welcome to AI Assistant!</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        I&apos;m here to help you develop and refine your idea. Here are some ways I can assist:
                      </p>
                    </div>
                    <div className="text-left space-y-3 bg-muted/50 p-4 rounded-lg">
                      <p className="text-xs font-medium text-foreground mb-2">Try asking me:</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-primary">💡</span>
                          <p className="text-xs text-muted-foreground">
                            &quot;Help me brainstorm features for my idea&quot;
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-primary">🎯</span>
                          <p className="text-xs text-muted-foreground">
                            &quot;How can I validate this concept with users?&quot;
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-primary">🚀</span>
                          <p className="text-xs text-muted-foreground">
                            &quot;What should I include in my MVP?&quot;
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-primary">📊</span>
                          <p className="text-xs text-muted-foreground">
                            &quot;Who are my main competitors?&quot;
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-primary">⚙️</span>
                          <p className="text-xs text-muted-foreground">
                            &quot;What technology stack should I use?&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Start by telling me about your idea or asking a question!
                    </p>
                  </div>
                </div>
              )}
              {visibleMessages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onMessageInsert={handleMessageInsert}
                  isLatest={index === visibleMessages.length - 1}
                  customActions={customActions}
                />
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <TypingIndicator isVisible={true} />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Insertion Feedback */}
      {feedbacks.length > 0 && (
        <div className="border-t bg-muted/30 p-3">
          <InsertionFeedbackList
            feedbacks={feedbacks}
            onDismiss={removeFeedback}
          />
        </div>
      )}

      {/* Enhanced Input Area */}
      <div className="border-t bg-card/50 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your idea..."
                disabled={isLoading || isLoadingHistory}
                className="pr-12 h-11 bg-background border-input focus:border-ring transition-colors chat-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              {input.trim() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {input.length} chars
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Enter to send
                  </span>
                </div>
              )}
            </div>
            <Button 
              type="submit"
              disabled={isLoading || isLoadingHistory || !input.trim()}
              size="icon"
              className="h-11 w-11 shrink-0 chat-button"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2">
              <StreamingLoading 
                isStreaming={true} 
                message={isTyping ? "AI is typing..." : "Generating response..."} 
              />
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

// Enhanced Message Bubble Component with memoization for performance
interface MessageBubbleProps {
  message: DisplayMessage
  onMessageInsert?: (messageId: string, sectionId: string, content: string) => void
  isLatest?: boolean
  customActions?: any[]
}

const MessageBubble = React.memo(function MessageBubble({ message, onMessageInsert, isLatest, customActions }: MessageBubbleProps) {
  // Enhanced message actions are now handled by the MessageActions component

  return (
    <div
      className={cn(
        "flex group message-group",
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      <div className={cn(
        "max-w-[80%] relative",
        message.role === 'user' ? 'order-2' : 'order-1'
      )}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 message-bubble",
            message.role === 'user'
              ? 'bg-primary text-primary-foreground rounded-br-md message-bubble-user'
              : 'bg-card border rounded-bl-md message-bubble-assistant',
            isLatest && "animate-in slide-in-from-bottom-2 duration-300"
          )}
        >
          {message.role === 'assistant' ? (
            <div className="text-sm leading-relaxed prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  // Customize markdown components for better chat styling
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                      {children}
                    </pre>
                  ),
                  h1: ({ children }) => <h1 className="text-base font-semibold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-semibold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}
          
          {/* Enhanced message metadata */}
          <div className={cn(
            "text-xs mt-2 space-y-1 opacity-70",
            message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            <div className="flex items-center justify-between">
              <span>
                {message.createdAt.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              {message.metadata && (
                <div className="flex items-center gap-2 text-xs">
                  {message.metadata.wordCount && (
                    <span>{message.metadata.wordCount} words</span>
                  )}
                  {message.metadata.responseTime && (
                    <span>{(message.metadata.responseTime / 1000).toFixed(1)}s</span>
                  )}
                </div>
              )}
            </div>
            {message.metadata?.model && message.role === 'assistant' && (
              <div className="text-xs opacity-50">
                {message.metadata.model}
                {message.metadata.tokens && ` • ${message.metadata.tokens} tokens`}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Message Actions */}
        {message.role === 'assistant' && (
          <MessageActions
            messageId={message.id}
            content={message.content}
            role={message.role}
            onInsert={onMessageInsert}
            customActions={customActions}
            showInline={true}
          />
        )}
      </div>
    </div>
  )
})