import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  try {
    const { id: ideaId, findingId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isInserted } = await request.json();

    // Verify idea ownership and update research finding
    const finding = await prisma.researchFinding.findFirst({
      where: {
        id: findingId,
        ideaId,
        idea: {
          owner: { email: session.user.email }
        }
      }
    });

    if (!finding) {
      return NextResponse.json({ error: 'Research finding not found' }, { status: 404 });
    }

    const updatedFinding = await prisma.researchFinding.update({
      where: { id: findingId },
      data: { isInserted }
    });

    return NextResponse.json({
      id: updatedFinding.id,
      isInserted: updatedFinding.isInserted
    });
  } catch (error) {
    console.error('Research finding update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}