import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateIdeaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long').optional(),
  oneLiner: z.string().optional(),
  documentMd: z.string().optional(),
  phase: z.enum(['ideation', 'validation', 'scoring', 'mvp', 'export']).optional(),
  isArchived: z.boolean().optional(),
})

const idSchema = z.string().cuid('Invalid ID format')

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

    // Get idea with all related data
    const idea = await prisma.idea.findFirst({
      where: {
        id: validatedId,
        ownerId: user.id,
      },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
        research: {
          orderBy: { createdAt: 'desc' },
        },
        features: {
          orderBy: { createdAt: 'asc' },
        },
        scores: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get latest score
        },
        exports: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    return NextResponse.json(idea)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    console.error('Error fetching idea:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const validatedData = updateIdeaSchema.parse(body)

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if idea exists and belongs to user
    const existingIdea = await prisma.idea.findFirst({
      where: {
        id: validatedId,
        ownerId: user.id,
      },
    })

    if (!existingIdea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Update the idea
    const updatedIdea = await prisma.idea.update({
      where: { id: validatedId },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        oneLiner: true,
        documentMd: true,
        iceScore: true,
        riceScore: true,
        phase: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updatedIdea)
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Check if it's an ID validation error or body validation error
      const idError = error.errors.find(e => e.path.length === 0)
      if (idError) {
        return NextResponse.json(
          { error: 'Invalid ID format' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating idea:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Delete the idea (cascade will handle related data)
    await prisma.idea.delete({
      where: { id: validatedId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    console.error('Error deleting idea:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}