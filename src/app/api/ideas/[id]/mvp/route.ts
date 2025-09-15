import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { model } from '@/lib/ai';
import { generateText } from 'ai';
import { z } from 'zod';

const featureSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(['MUST', 'SHOULD', 'COULD']),
  estimate: z.enum(['S', 'M', 'L']).optional(),
  dependencies: z.array(z.string()).default([]),
});

const generateRequestSchema = z.object({
  action: z.literal('generate'),
});

const updateRequestSchema = z.object({
  featureId: z.string(),
  estimate: z.enum(['S', 'M', 'L']),
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

    // Get all features for this idea, ordered by priority and creation date
    const features = await prisma.feature.findMany({
      where: { ideaId },
      orderBy: [
        { priority: 'asc' }, // COULD < MUST < SHOULD alphabetically, but we want MUST first
        { createdAt: 'asc' },
      ],
    });

    // Sort features properly: MUST, SHOULD, COULD
    const sortedFeatures = features.sort((a, b) => {
      const priorityOrder = { MUST: 0, SHOULD: 1, COULD: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - 
             priorityOrder[b.priority as keyof typeof priorityOrder];
    });

    return NextResponse.json({ features: sortedFeatures });
  } catch (error) {
    console.error('Error fetching MVP features:', error);
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
    const validatedData = generateRequestSchema.parse(body);

    // Verify idea ownership and get idea details
    const idea = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        owner: { email: session.user.email },
      },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Get recent context
        },
        research: {
          where: { type: 'competitor' },
          take: 5,
        },
      },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Generate MVP features using AI
    const features = await generateMVPFeatures(idea);

    // Clear existing features and create new ones
    await prisma.feature.deleteMany({
      where: { ideaId },
    });

    const createdFeatures = await Promise.all(
      features.map((feature) =>
        prisma.feature.create({
          data: {
            ideaId,
            title: feature.title,
            description: feature.description,
            priority: feature.priority,
            estimate: feature.estimate,
            dependencies: feature.dependencies,
          },
        })
      )
    );

    return NextResponse.json({ features: createdFeatures }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error generating MVP features:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const validatedData = updateRequestSchema.parse(body);

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

    // Update the feature estimate
    const updatedFeature = await prisma.feature.update({
      where: {
        id: validatedData.featureId,
        ideaId, // Ensure the feature belongs to this idea
      },
      data: {
        estimate: validatedData.estimate,
      },
    });

    return NextResponse.json({ feature: updatedFeature });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating feature estimate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ResearchFinding {
  title: string;
  content: string;
}

interface IdeaWithContext {
  title: string;
  oneLiner?: string | null;
  documentMd: string;
  chatMessages: ChatMessage[];
  research: ResearchFinding[];
}

async function generateMVPFeatures(idea: IdeaWithContext): Promise<Array<{
  title: string;
  description?: string;
  priority: 'MUST' | 'SHOULD' | 'COULD';
  estimate?: 'S' | 'M' | 'L';
  dependencies: string[];
}>> {
  // Build context from idea data
  const context = {
    title: idea.title,
    oneLiner: idea.oneLiner,
    document: idea.documentMd,
    recentChat: idea.chatMessages.slice(0, 5).map((msg: ChatMessage) => ({
      role: msg.role,
      content: msg.content.substring(0, 500), // Limit content length
    })),
    competitors: idea.research.map((r: ResearchFinding) => ({
      title: r.title,
      content: r.content.substring(0, 200),
    })),
  };

  const prompt = `You are an expert product manager helping to define an MVP (Minimum Viable Product) for a startup idea.

IDEA CONTEXT:
Title: ${context.title}
One-liner: ${context.oneLiner || 'Not provided'}

Document Content:
${context.document.substring(0, 1500) || 'No document content yet'}

Recent Chat Context:
${context.recentChat.map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`).join('\n').substring(0, 800)}

Competitor Research:
${context.competitors.map((comp: { title: string; content: string }) => `- ${comp.title}: ${comp.content}`).join('\n').substring(0, 600)}

TASK:
Generate a prioritized list of features for the MVP using MoSCoW methodology:
- MUST: Core features absolutely essential for the product to work (3-4 features max)
- SHOULD: Important features that add significant value (2-3 features max)  
- COULD: Nice-to-have features that enhance the experience (2-3 features max)

REQUIREMENTS:
- Total features should be ≤10 items
- Focus on features that can be built and tested quickly
- Each feature should be specific and actionable
- Consider technical feasibility for a small team
- Prioritize features that validate core assumptions
- Include rough effort estimates (S=1-3 days, M=1-2 weeks, L=2-4 weeks)

RESPONSE FORMAT:
Return a JSON array of features with this exact structure:
[
  {
    "title": "Feature name (concise)",
    "description": "Brief description of what this feature does and why it's important",
    "priority": "MUST|SHOULD|COULD",
    "estimate": "S|M|L",
    "dependencies": []
  }
]

Focus on building the core value proposition first, then adding features that enhance and validate the concept.`;

  try {
    const result = await generateText({
      model,
      prompt,
      temperature: 0.7,
    });

    // Parse the AI response
    const responseText = result.text.trim();
    
    // Extract JSON from the response (handle cases where AI adds extra text)
    let jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Fallback: try to find JSON-like content
      jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonMatch[0] = '[' + jsonMatch[0] + ']';
      }
    }

    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const features = JSON.parse(jsonMatch[0]);
    
    // Validate each feature
    const validatedFeatures = features
      .map((feature: any) => featureSchema.parse(feature))
      .slice(0, 10); // Ensure max 10 features

    // Ensure we have a good distribution
    const mustCount = validatedFeatures.filter((f: any) => f.priority === 'MUST').length;
    const shouldCount = validatedFeatures.filter((f: any) => f.priority === 'SHOULD').length;
    const couldCount = validatedFeatures.filter((f: any) => f.priority === 'COULD').length;

    // Validate distribution (at least 2 MUST features, max 4 MUST)
    if (mustCount < 2) {
      throw new Error('Need at least 2 MUST features for a viable MVP');
    }
    if (mustCount > 5) {
      throw new Error('Too many MUST features - MVP should be focused');
    }

    return validatedFeatures;
  } catch (error) {
    console.error('Error generating MVP features with AI:', error);
    
    // Fallback: return basic MVP structure
    return [
      {
        title: 'User Registration & Authentication',
        description: 'Allow users to create accounts and securely log in',
        priority: 'MUST' as const,
        estimate: 'M' as const,
        dependencies: [],
      },
      {
        title: 'Core Feature Implementation',
        description: 'Implement the main value proposition of the product',
        priority: 'MUST' as const,
        estimate: 'L' as const,
        dependencies: [],
      },
      {
        title: 'Basic User Interface',
        description: 'Clean, intuitive interface for core functionality',
        priority: 'MUST' as const,
        estimate: 'M' as const,
        dependencies: [],
      },
      {
        title: 'Data Persistence',
        description: 'Store and retrieve user data reliably',
        priority: 'MUST' as const,
        estimate: 'S' as const,
        dependencies: [],
      },
      {
        title: 'User Profile Management',
        description: 'Allow users to manage their account settings',
        priority: 'SHOULD' as const,
        estimate: 'S' as const,
        dependencies: [],
      },
      {
        title: 'Basic Analytics',
        description: 'Track key user interactions and usage patterns',
        priority: 'COULD' as const,
        estimate: 'M' as const,
        dependencies: [],
      },
    ];
  }
}