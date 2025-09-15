import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createVersionSchema = z.object({
  content: z.string(),
  changeType: z.enum(['manual', 'ai_insert', 'auto_save']).default('manual'),
  summary: z.string().optional(),
})

const idSchema = z.string().cuid('Invalid ID format')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Validate ID format
    const validatedId = idSchema.parse(id)
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createVersionSchema.parse(body)

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if idea exists and belongs to user
    const idea = await prisma.idea.findFirst({
      where: {
        id: validatedId,
        ownerId: user.id,
      },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Create document version
    const version = await prisma.documentVersion.create({
      data: {
        ideaId: validatedId,
        content: validatedData.content,
        changeType: validatedData.changeType,
        summary: validatedData.summary,
      },
    })

    return NextResponse.json(version)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating document version:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Validate ID format
    const validatedId = idSchema.parse(id)
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if idea exists and belongs to user
    const idea = await prisma.idea.findFirst({
      where: {
        id: validatedId,
        ownerId: user.id,
      },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Get document versions
    const versions = await prisma.documentVersion.findMany({
      where: { ideaId: validatedId },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit to last 20 versions
      select: {
        id: true,
        changeType: true,
        summary: true,
        createdAt: true,
      },
    })

    return NextResponse.json(versions)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    console.error('Error fetching document versions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}