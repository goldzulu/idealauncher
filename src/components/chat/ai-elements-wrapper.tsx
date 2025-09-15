'use client'

import { useState } from 'react'
import { ChatbotPanel } from './chatbot-panel'
import { MessageActionsDemo } from './message-actions-demo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageSquare, Sparkles, FileText, Palette, Settings } from 'lucide-react'

export function AIElementsWrapper() {
  const [testIdeaId] = useState('test-idea-123') // Mock idea ID for testing
  const [currentView, setCurrentView] = useState<'chat' | 'actions'>('chat')

  const handleMessageInsert = (messageId: string, sectionId: string, content: string) => {
    console.log('Document insertion:', { messageId, sectionId, content })
    // In a real app, this would insert content into the document editor
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">AI SDK Elements Chat</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Experience the enhanced chat interface with custom styling, improved UX patterns, 
          and seamless integration with the existing design system.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <Palette className="h-3 w-3" />
            Custom Styling
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            Enhanced UX
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            Document Integration
          </Badge>
        </div>
        
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={currentView === 'chat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('chat')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat Interface
          </Button>
          <Button
            variant={currentView === 'actions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('actions')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Message Actions Demo
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {currentView === 'chat' ? (
        <Card className="mx-auto max-w-4xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Enhanced Chat Interface
            </CardTitle>
            <CardDescription>
              Featuring improved styling, better accessibility, and enhanced user experience patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[600px] border-t">
              <ChatbotPanel 
                ideaId={testIdeaId} 
                onMessageInsert={handleMessageInsert}
                className="rounded-none"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <MessageActionsDemo />
      )}
      
      {/* Feature Highlights */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Enhanced Styling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Consistent design system integration</p>
            <p>• Improved message bubble styling</p>
            <p>• Enhanced loading states and animations</p>
            <p>• Better visual hierarchy and spacing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Better UX Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Improved message actions on hover</p>
            <p>• Copy to clipboard functionality</p>
            <p>• Enhanced error handling and recovery</p>
            <p>• Better keyboard navigation support</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Document Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• One-click content insertion</p>
            <p>• Visual feedback for actions</p>
            <p>• Seamless workflow integration</p>
            <p>• Context-aware suggestions</p>
          </CardContent>
        </Card>
      </div>

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Testing Guide</CardTitle>
          <CardDescription>
            Try these features to experience the enhanced chat interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                1
              </div>
              <div>
                <p className="font-medium text-sm">Send a Message</p>
                <p className="text-xs text-muted-foreground">
                  Type a message and press Enter to see the enhanced streaming response
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                2
              </div>
              <div>
                <p className="font-medium text-sm">Hover Over AI Messages</p>
                <p className="text-xs text-muted-foreground">
                  Hover over assistant messages to see copy and insert actions
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-sm">Test Document Integration</p>
                <p className="text-xs text-muted-foreground">
                  Click &quot;Insert to Document&quot; to see the integration in action (check console)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}