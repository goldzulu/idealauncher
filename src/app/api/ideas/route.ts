import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleAPIError, APIError, ErrorType } from '@/lib/error-handling'

const createIdeaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  oneLiner: z.string().optional(),
})

const querySchema = z.object({
  sortBy: z.enum(['title', 'iceScore', 'riceScore', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      throw new APIError('Unauthorized', 401, ErrorType.AUTHENTICATION)
    }

    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryParams = querySchema.parse({
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })
    
    const sortBy = queryParams.sortBy || 'updatedAt'
    const sortOrder = queryParams.sortOrder || 'desc'

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      throw new APIError('User not found', 404, ErrorType.NOT_FOUND)
    }

    // Build orderBy clause
    let orderBy: any = {}
    if (sortBy === 'title') {
      orderBy.title = sortOrder
    } else if (sortBy === 'iceScore') {
      orderBy.iceScore = sortOrder
    } else if (sortBy === 'riceScore') {
      orderBy.riceScore = sortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else {
      orderBy.updatedAt = sortOrder
    }

    const ideas = await prisma.idea.findMany({
      where: {
        ownerId: user.id,
        isArchived: false,
      },
      orderBy,
      select: {
        id: true,
        title: true,
        oneLiner: true,
        iceScore: true,
        riceScore: true,
        phase: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(ideas)
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      throw new APIError('Unauthorized', 401, ErrorType.AUTHENTICATION)
    }

    const body = await request.json()
    const validatedData = createIdeaSchema.parse(body)

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      throw new APIError('User not found', 404, ErrorType.NOT_FOUND)
    }

    const idea = await prisma.idea.create({
      data: {
        title: validatedData.title,
        oneLiner: validatedData.oneLiner,
        ownerId: user.id,
      },
      select: {
        id: true,
        title: true,
        oneLiner: true,
        iceScore: true,
        riceScore: true,
        phase: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    return handleAPIError(error)
  }
}