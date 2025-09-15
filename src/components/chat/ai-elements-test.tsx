'use client'

import { ChatbotPanel } from './chatbot-panel'

interface AIElementsTestProps {
  ideaId: string
}

export function AIElementsTest({ ideaId }: AIElementsTestProps) {
  return (
    <div className="h-[600px] w-full max-w-2xl mx-auto border rounded-lg">
      <ChatbotPanel ideaId={ideaId} />
    </div>
  )
}