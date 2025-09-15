import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { model } from '@/lib/ai';
import { generateText } from 'ai';
import { z } from 'zod';

const techRecommendationSchema = z.object({
  category: z.string(),
  technology: z.string(),
  description: z.string(),
  rationale: z.string(),
  implementationTips: z.array(z.string()),
  alternatives: z.array(z.string()).optional(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
});

const generateRequestSchema = z.object({
  action: z.literal('generate'),
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

    // Get tech stack research findings
    const techFindings = await prisma.researchFinding.findMany({
      where: { 
        ideaId,
        type: 'tech_stack'
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ recommendations: techFindings });
  } catch (error) {
    console.error('Error fetching tech recommendations:', error);
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
        features: {
          where: { priority: 'MUST' },
          take: 10,
        },
      },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Generate tech stack recommendations using AI
    const recommendations = await generateTechStackRecommendations(idea);

    // Clear existing tech stack findings and create new ones
    await prisma.researchFinding.deleteMany({
      where: { 
        ideaId,
        type: 'tech_stack'
      },
    });

    const createdFindings = await Promise.all(
      recommendations.map((rec) =>
        prisma.researchFinding.create({
          data: {
            ideaId,
            type: 'tech_stack',
            title: `${rec.category}: ${rec.technology}`,
            content: rec.description,
            metadata: {
              category: rec.category,
              technology: rec.technology,
              rationale: rec.rationale,
              implementationTips: rec.implementationTips,
              alternatives: rec.alternatives || [],
              difficulty: rec.difficulty,
            },
          },
        })
      )
    );

    return NextResponse.json({ recommendations: createdFindings }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error generating tech stack recommendations:', error);
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

interface Feature {
  title: string;
  description?: string | null;
  priority: string;
}

interface IdeaWithContext {
  title: string;
  oneLiner?: string | null;
  documentMd: string;
  chatMessages: ChatMessage[];
  research: ResearchFinding[];
  features: Feature[];
}

async function generateTechStackRecommendations(idea: IdeaWithContext): Promise<Array<{
  category: string;
  technology: string;
  description: string;
  rationale: string;
  implementationTips: string[];
  alternatives?: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
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
    mustHaveFeatures: idea.features.map((f: Feature) => ({
      title: f.title,
      description: f.description?.substring(0, 200) || '',
    })),
  };

  const prompt = `You are a senior technical architect helping to recommend a modern, production-ready tech stack for a startup idea.

IDEA CONTEXT:
Title: ${context.title}
One-liner: ${context.oneLiner || 'Not provided'}

Document Content:
${context.document.substring(0, 1500) || 'No document content yet'}

Recent Chat Context:
${context.recentChat.map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`).join('\n').substring(0, 800)}

Must-Have Features:
${context.mustHaveFeatures.map((f: { title: string; description: string }) => `- ${f.title}: ${f.description}`).join('\n').substring(0, 600)}

Competitor Research:
${context.competitors.map((comp: { title: string; content: string }) => `- ${comp.title}: ${comp.content}`).join('\n').substring(0, 600)}

BASELINE STACK (must include these):
- Frontend: Next.js 15 with App Router
- Deployment: Vercel
- Database: PostgreSQL
- ORM: Prisma
- Authentication: NextAuth.js

TASK:
Recommend a complete, modern tech stack that builds on the baseline. Focus on technologies that:
1. Integrate well with the baseline stack
2. Are production-ready and well-maintained
3. Have good developer experience
4. Scale appropriately for a startup
5. Match the specific needs of this idea

CATEGORIES TO COVER:
- Frontend Framework & UI (beyond Next.js)
- Backend & API
- Database & Storage
- Authentication & Security
- Deployment & Infrastructure
- Monitoring & Analytics
- Testing & Quality
- Additional Services (if needed)

REQUIREMENTS:
- Provide 6-8 technology recommendations total
- Each recommendation should include 3-5 specific implementation tips
- Consider the team size (assume 1-3 developers initially)
- Prioritize technologies with good documentation and community support
- Include difficulty level for each technology

RESPONSE FORMAT:
Return a JSON array with this exact structure:
[
  {
    "category": "Category name",
    "technology": "Technology name",
    "description": "Brief description of what this technology does and why it's recommended",
    "rationale": "Specific reasons why this technology fits this project",
    "implementationTips": [
      "Specific tip 1",
      "Specific tip 2", 
      "Specific tip 3"
    ],
    "alternatives": ["Alternative 1", "Alternative 2"],
    "difficulty": "Beginner|Intermediate|Advanced"
  }
]

Focus on practical, actionable recommendations that a small team can implement successfully.`;

  try {
    const result = await generateText({
      model,
      prompt,
      temperature: 0.7,
    });

    // Parse the AI response
    const responseText = result.text.trim();
    
    // Extract JSON from the response
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

    const recommendations = JSON.parse(jsonMatch[0]);
    
    // Validate each recommendation
    const validatedRecommendations = recommendations
      .map((rec: any) => techRecommendationSchema.parse(rec))
      .slice(0, 8); // Ensure max 8 recommendations

    return validatedRecommendations;
  } catch (error) {
    console.error('Error generating tech stack recommendations with AI:', error);
    
    // Fallback: return basic tech stack recommendations
    return [
      {
        category: 'Frontend Framework & UI',
        technology: 'shadcn/ui + Tailwind CSS',
        description: 'Modern component library built on Radix UI primitives with Tailwind CSS for styling',
        rationale: 'Provides consistent, accessible components that integrate perfectly with Next.js and offer excellent developer experience',
        implementationTips: [
          'Use the shadcn/ui CLI to add components as needed',
          'Customize the design system through tailwind.config.ts',
          'Leverage Radix UI primitives for complex interactions'
        ],
        alternatives: ['Chakra UI', 'Mantine', 'Ant Design'],
        difficulty: 'Beginner' as const,
      },
      {
        category: 'Backend & API',
        technology: 'Next.js API Routes + tRPC',
        description: 'Type-safe API layer using tRPC for end-to-end type safety between frontend and backend',
        rationale: 'Eliminates API contract issues and provides excellent developer experience with TypeScript',
        implementationTips: [
          'Set up tRPC router with input validation using Zod',
          'Use tRPC React Query integration for client-side data fetching',
          'Implement middleware for authentication and error handling'
        ],
        alternatives: ['GraphQL', 'REST APIs', 'Supabase'],
        difficulty: 'Intermediate' as const,
      },
      {
        category: 'Database & Storage',
        technology: 'PostgreSQL + Prisma + Vercel Postgres',
        description: 'Managed PostgreSQL database with Prisma ORM for type-safe database operations',
        rationale: 'Vercel Postgres integrates seamlessly with deployment, Prisma provides excellent TypeScript support',
        implementationTips: [
          'Use Prisma migrations for database schema changes',
          'Implement connection pooling for production',
          'Set up database indexes for query optimization'
        ],
        alternatives: ['Supabase', 'PlanetScale', 'Railway'],
        difficulty: 'Beginner' as const,
      },
      {
        category: 'Authentication & Security',
        technology: 'NextAuth.js + OAuth Providers',
        description: 'Complete authentication solution with support for multiple OAuth providers',
        rationale: 'Handles complex authentication flows securely and integrates well with Next.js and Prisma',
        implementationTips: [
          'Configure OAuth providers (Google, GitHub) in environment variables',
          'Use Prisma adapter for session storage',
          'Implement role-based access control with custom callbacks'
        ],
        alternatives: ['Clerk', 'Auth0', 'Supabase Auth'],
        difficulty: 'Intermediate' as const,
      },
      {
        category: 'Deployment & Infrastructure',
        technology: 'Vercel + GitHub Integration',
        description: 'Seamless deployment platform with automatic deployments from Git',
        rationale: 'Built by the Next.js team, provides optimal performance and developer experience',
        implementationTips: [
          'Set up preview deployments for pull requests',
          'Configure environment variables for different environments',
          'Use Vercel Analytics for performance monitoring'
        ],
        alternatives: ['Netlify', 'Railway', 'AWS Amplify'],
        difficulty: 'Beginner' as const,
      },
      {
        category: 'Testing & Quality',
        technology: 'Vitest + Testing Library',
        description: 'Fast unit testing framework with React Testing Library for component testing',
        rationale: 'Vitest provides excellent TypeScript support and fast test execution, integrates well with Next.js',
        implementationTips: [
          'Set up test utilities for mocking Prisma and NextAuth',
          'Write integration tests for API routes',
          'Use MSW for mocking external API calls'
        ],
        alternatives: ['Jest', 'Playwright', 'Cypress'],
        difficulty: 'Intermediate' as const,
      },
    ];
  }
}