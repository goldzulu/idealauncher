'use client'

import { useState } from 'react'
import { MessageActions } from './message-actions'
import { InsertionFeedbackList, useInsertionFeedback } from './insertion-feedback'
import { useMessageActions } from '@/hooks/use-message-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DOCUMENT_SECTIONS } from '@/lib/document-utils'

export function MessageActionsDemo() {
  const [insertedContent, setInsertedContent] = useState<Array<{
    sectionId: string
    content: string
    timestamp: Date
  }>>([])

  // Enhanced insertion feedback
  const { feedbacks, addFeedback, updateFeedback, removeFeedback } = useInsertionFeedback()

  // Enhanced message actions with feedback integration
  const handleMessageInsert = (messageId: string, sectionId: string, content: string) => {
    const section = DOCUMENT_SECTIONS.find(s => s.id === sectionId)
    const feedbackId = addFeedback({
      messageId,
      sectionId,
      sectionTitle: section?.title || sectionId,
      status: 'pending',
      content,
    })

    // Simulate async insertion
    setTimeout(() => {
      try {
        // Simulate successful insertion
        setInsertedContent(prev => [...prev, {
          sectionId,
          content,
          timestamp: new Date(),
        }])
        
        // Update feedback to success
        updateFeedback(feedbackId, { status: 'success' })
      } catch (error) {
        // Update feedback to error
        updateFeedback(feedbackId, { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }, 1000) // 1 second delay to show pending state
  }

  const { customActions } = useMessageActions({
    onInsert: handleMessageInsert,
    enabledActions: ['share', 'bookmark', 'thumbs-up', 'thumbs-down', 'export']
  })

  const sampleMessages = [
    {
      id: 'msg-1',
      content: 'Your idea for a task management app is interesting. Here are some key features to consider:\n\n1. User authentication and profiles\n2. Project creation and management\n3. Task assignment and tracking\n4. Real-time collaboration\n5. Progress reporting and analytics',
      role: 'assistant' as const,
    },
    {
      id: 'msg-2', 
      content: 'To validate your idea, consider conducting user interviews with potential customers. Focus on understanding their current pain points with existing task management tools.',
      role: 'assistant' as const,
    },
    {
      id: 'msg-3',
      content: 'For the MVP, I recommend starting with these core features:\n\n• Simple task creation and editing\n• Basic project organization\n• User authentication\n• Mobile-responsive design\n\nThis will allow you to test the core value proposition quickly.',
      role: 'assistant' as const,
    },
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Message Actions Demo</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test the enhanced message actions system with visual feedback and document integration.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Message Actions Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Message Actions</CardTitle>
            <CardDescription>
              Hover over messages to see available actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sampleMessages.map((message) => (
              <div key={message.id} className="group p-4 border rounded-lg bg-card">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">AI Assistant</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  
                  <MessageActions
                    messageId={message.id}
                    content={message.content}
                    role={message.role}
                    onInsert={handleMessageInsert}
                    customActions={customActions}
                    showInline={true}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Insertion Feedback and Results */}
        <div className="space-y-6">
          {/* Live Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Live Insertion Feedback</CardTitle>
              <CardDescription>
                Real-time feedback for document insertions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedbacks.length > 0 ? (
                <InsertionFeedbackList
                  feedbacks={feedbacks}
                  onDismiss={removeFeedback}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active insertions. Try inserting a message above.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Inserted Content Log */}
          <Card>
            <CardHeader>
              <CardTitle>Inserted Content</CardTitle>
              <CardDescription>
                Content that has been successfully inserted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insertedContent.length > 0 ? (
                <div className="space-y-3">
                  {insertedContent.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">
                          {DOCUMENT_SECTIONS.find(s => s.id === item.sectionId)?.title || item.sectionId}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.content.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No content inserted yet. Try the &quot;Insert to Document&quot; action above.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                1
              </div>
              <div>
                <p className="font-medium text-sm">Hover over messages</p>
                <p className="text-xs text-muted-foreground">
                  Message actions will appear when you hover over the AI assistant messages
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                2
              </div>
              <div>
                <p className="font-medium text-sm">Try different actions</p>
                <p className="text-xs text-muted-foreground">
                  Copy content, share, bookmark, give feedback, or insert to document
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-sm">Watch the feedback</p>
                <p className="text-xs text-muted-foreground">
                  See real-time feedback for insertions and track successful operations
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}