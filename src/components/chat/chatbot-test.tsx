'use client'

import { ChatbotPanel } from './chatbot-panel'

interface ChatbotTestProps {
  ideaId?: string
}

export function ChatbotTest({ ideaId = 'test-idea-id' }: ChatbotTestProps) {
  const handleMessageInsert = (messageId: string, sectionId: string, content: string) => {
    console.log('Insert to document:', { messageId, sectionId, content })
    // For testing, just log the action
    alert(`Would insert message to document: ${content.substring(0, 50)}...`)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">AI SDK Elements Chatbot Test</h1>
        <p className="text-muted-foreground">
          Testing the new ChatbotPanel component with AI Elements
        </p>
      </div>
      
      <div className="h-[600px] w-full max-w-4xl mx-auto border rounded-lg">
        <ChatbotPanel
          ideaId={ideaId}
          onMessageInsert={handleMessageInsert}
        />
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>Try sending a message to test the AI Elements integration!</p>
        <p>The chat should load history, handle streaming responses, and provide insert buttons.</p>
      </div>
    </div>
  )
}