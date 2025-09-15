import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const scoreSchema = z.object({
  framework: z.enum(['ICE', 'RICE']),
  impact: z.number().min(0).max(10),
  confidence: z.number().min(0).max(10),
  ease: z.number().min(0).max(10).optional(),
  reach: z.number().min(0).max(10).optional(),
  effort: z.number().min(1).max(10).optional(),
  total: z.number(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ideaId } = await params;

    // Verify idea ownership
    const idea = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        owner: { email: session.user.email },
      },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Get all scores for this idea, ordered by creation date (newest first)
    const scores = await prisma.score.findMany({
      where: { ideaId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ scores });
  } catch (error) {
    console.error('Error fetching scores:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ideaId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = scoreSchema.parse(body);

    // Verify idea ownership
    const idea = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        owner: { email: session.user.email },
      },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Validate framework-specific fields
    if (validatedData.framework === 'ICE') {
      if (validatedData.ease === undefined) {
        return NextResponse.json(
          { error: 'Ease is required for ICE framework' },
          { status: 400 }
        );
      }
      if (validatedData.reach !== undefined || validatedData.effort !== undefined) {
        return NextResponse.json(
          { error: 'Reach and effort are not valid for ICE framework' },
          { status: 400 }
        );
      }
    } else if (validatedData.framework === 'RICE') {
      if (validatedData.reach === undefined || validatedData.effort === undefined) {
        return NextResponse.json(
          { error: 'Reach and effort are required for RICE framework' },
          { status: 400 }
        );
      }
      if (validatedData.ease !== undefined) {
        return NextResponse.json(
          { error: 'Ease is not valid for RICE framework' },
          { status: 400 }
        );
      }
    }

    // Create new score record
    const score = await prisma.score.create({
      data: {
        ideaId,
        framework: validatedData.framework,
        impact: validatedData.impact,
        confidence: validatedData.confidence,
        ease: validatedData.ease,
        reach: validatedData.reach,
        effort: validatedData.effort,
        total: validatedData.total,
        notes: validatedData.notes,
      },
    });

    // Update the idea's computed score for dashboard sorting
    const scoreField = validatedData.framework === 'ICE' ? 'iceScore' : 'riceScore';
    await prisma.idea.update({
      where: { id: ideaId },
      data: {
        [scoreField]: validatedData.total,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      score,
      message: 'Score saved successfully. Dashboard will refresh when you return.'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}