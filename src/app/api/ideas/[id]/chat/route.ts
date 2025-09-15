import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { model } from '@/lib/ai'
import { streamText } from 'ai'
import { z } from 'zod'

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id: ideaId } = await params
    
    // Verify user owns this idea
    const idea = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        owner: { email: session.user.email }
      },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          take: 50 // Limit context to last 50 messages
        }
      }
    })

    if (!idea) {
      return new Response('Idea not found', { status: 404 })
    }

    const body = await request.json()
    const { messages } = chatRequestSchema.parse(body)

    // Get the latest user message
    const latestMessage = messages[messages.length - 1]
    if (latestMessage.role !== 'user') {
      return new Response('Invalid message format', { status: 400 })
    }

    // Save user message to database
    await prisma.chatMessage.create({
      data: {
        content: latestMessage.content,
        role: 'user',
        ideaId: ideaId,
      }
    })

    // Prepare conversation history for AI
    const conversationHistory = [
      {
        role: 'system' as const,
        content: `You are an AI assistant helping with startup idea development. The user is working on an idea titled "${idea.title}"${idea.oneLiner ? ` with the tagline: "${idea.oneLiner}"` : ''}. 

Current document content:
${idea.documentMd || 'No content yet.'}

Help them brainstorm, validate, and develop their idea. Be concise but insightful. Focus on practical advice and actionable suggestions.`
      },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }))
    ]

    // Stream AI response
    console.log('Starting AI stream with model:', model)
    
    const result = await streamText({
      model,
      messages: conversationHistory,
      temperature: 0.7,
      async onFinish({ text }) {
        try {
          // Save the complete assistant message after streaming
          await prisma.chatMessage.create({
            data: {
              content: text,
              role: 'assistant',
              ideaId: ideaId,
            }
          })
          console.log('Assistant message saved successfully')
        } catch (error) {
          console.error('Failed to save assistant message:', error)
        }
      },
    })

    return result.toTextStreamResponse()

  } catch (error) {
    console.error('Chat API error:', error)
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response('Internal server error', { status: 500 })
  }
}

// Get chat history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id: ideaId } = await params
    
    // Verify user owns this idea and get messages
    const idea = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        owner: { email: session.user.email }
      },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!idea) {
      return new Response('Idea not found', { status: 404 })
    }

    return new Response(
      JSON.stringify({ messages: idea.chatMessages }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Get chat history error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}