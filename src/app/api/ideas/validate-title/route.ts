import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleAPIError, APIError, ErrorType } from '@/lib/error-handling'

const validateTitleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  excludeId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      throw new APIError('Unauthorized', 401, ErrorType.AUTHENTICATION)
    }

    const body = await request.json()
    const { title, excludeId } = validateTitleSchema.parse(body)

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      throw new APIError('User not found', 404, ErrorType.NOT_FOUND)
    }

    // Check if title already exists for this user
    const existingIdea = await prisma.idea.findFirst({
      where: {
        ownerId: user.id,
        title: {
          equals: title,
          mode: 'insensitive', // Case-insensitive comparison
        },
        isArchived: false,
        ...(excludeId && { id: { not: excludeId } }), // Exclude current idea when editing
      },
    })

    const isUnique = !existingIdea

    return Response.json({ 
      isUnique,
      message: isUnique ? 'Title is available' : 'Title already exists'
    })
  } catch (error) {
    return handleAPIError(error)
  }
}