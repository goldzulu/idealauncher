import { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bot, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { MessageActions } from './message-actions'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
  onMessageInsert?: (messageId: string, sectionId: string, content: string) => void
}

export function MessageList({ messages, isLoading, onMessageInsert }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div className="max-w-sm">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">Start a conversation</h3>
          <p className="text-sm text-muted-foreground">
            Ask me anything about your idea. I can help you brainstorm, validate concepts, or explore different aspects of your project.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message} 
          onInsert={onMessageInsert ? (sectionId, content) => onMessageInsert(message.id, sectionId, content) : undefined}
        />
      ))}
      {isLoading && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback>
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start max-w-[80%]">
            <div className="rounded-lg px-3 py-2 text-sm bg-muted">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  onInsert?: (sectionId: string, content: string) => void
}

function MessageBubble({ message, onInsert }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const createdAt = message.createdAt || new Date()

  return (
    <div className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className="relative">
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
          
          {/* Message Actions - positioned absolutely */}
          <div className={`absolute top-1 ${isUser ? 'left-1' : 'right-1'}`}>
            <MessageActions
              messageId={message.id}
              content={message.content}
              role={message.role}
              onInsert={onInsert}
            />
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </div>
      </div>
    </div>
  )
}