import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { model } from '@/lib/ai'
import { streamText } from 'ai'

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
    console.log('Request body received:', JSON.stringify(body, null, 2))
    
    const { messages } = body

    // Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages format:', { messages, type: typeof messages, isArray: Array.isArray(messages) })
      return new Response('Invalid messages format - expected non-empty array', { status: 400 })
    }

    // Validate message format
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      if (!msg || typeof msg !== 'object' || !msg.role || !msg.content) {
        console.error('Invalid message at index', i, ':', msg)
        return new Response(`Invalid message format at index ${i} - missing role or content`, { status: 400 })
      }
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage || latestMessage.role !== 'user') {
      console.error('Last message is not from user:', latestMessage)
      return new Response('Invalid message format - last message must be from user', { status: 400 })
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
    const systemMessage = {
      role: 'system' as const,
      content: `You are an AI assistant helping with startup idea development. The user is working on an idea titled "${idea.title}"${idea.oneLiner ? ` with the tagline: "${idea.oneLiner}"` : ''}. 

Current document content:
${idea.documentMd || 'No content yet.'}

Help them brainstorm, validate, and develop their idea. Be concise but insightful. Focus on practical advice and actionable suggestions.`
    }

    const conversationHistory = [systemMessage, ...messages]

    // Debug logging
    console.log('Messages received:', messages.length)
    console.log('Conversation history length:', conversationHistory.length)
    console.log('Starting AI stream with model:', model)
    
    // Validate conversationHistory before passing to AI
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      throw new Error('Invalid conversation history format')
    }

    // Validate each message has the correct format for AI SDK
    const validatedMessages = conversationHistory.map((msg, index) => {
      if (!msg.role || !msg.content) {
        throw new Error(`Message at index ${index} missing role or content`)
      }
      return {
        role: msg.role,
        content: msg.content
      }
    })

    console.log('Messages validated successfully:', validatedMessages.length)

    const result = streamText({
      model,
      messages: validatedMessages,
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