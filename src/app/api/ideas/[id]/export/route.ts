import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { model } from '@/lib/ai';
import { generateText } from 'ai';
import { z } from 'zod';

const generateRequestSchema = z.object({
  action: z.literal('generate'),
  format: z.enum(['kiro']).default('kiro'),
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

    // Get the most recent export
    const latestExport = await prisma.specExport.findFirst({
      where: { ideaId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ 
      export: latestExport,
      hasExport: !!latestExport 
    });
  } catch (error) {
    console.error('Error fetching spec export:', error);
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

    // Verify idea ownership and get comprehensive idea data
    const idea = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        owner: { email: session.user.email },
      },
      include: {
        features: {
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        scores: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        research: {
          orderBy: { createdAt: 'desc' },
        },
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Generate Kiro-ready specification
    const specContent = await generateKiroSpec(idea);

    // Save the export
    const specExport = await prisma.specExport.create({
      data: {
        ideaId,
        format: validatedData.format,
        content: specContent,
        metadata: {
          generatedAt: new Date().toISOString(),
          ideaTitle: idea.title,
          version: '1.0',
        },
      },
    });

    return NextResponse.json({ 
      export: specExport,
      content: specContent 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error generating spec export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface IdeaWithFullContext {
  id: string;
  title: string;
  oneLiner?: string | null;
  documentMd: string;
  iceScore?: number | null;
  features: Array<{
    title: string;
    description?: string | null;
    priority: string;
    estimate?: string | null;
  }>;
  scores: Array<{
    framework: string;
    impact: number;
    confidence: number;
    ease?: number | null;
    total: number;
    notes?: string | null;
  }>;
  research: Array<{
    type: string;
    title: string;
    content: string;
  }>;
  chatMessages: Array<{
    role: string;
    content: string;
  }>;
}

async function generateKiroSpec(idea: IdeaWithFullContext): Promise<string> {
  // Extract key information
  const mustFeatures = idea.features.filter(f => f.priority === 'MUST');
  const shouldFeatures = idea.features.filter(f => f.priority === 'SHOULD');
  const couldFeatures = idea.features.filter(f => f.priority === 'COULD');
  const latestScore = idea.scores[0];
  const competitors = idea.research.filter(r => r.type === 'competitor');
  const techResearch = idea.research.filter(r => r.type === 'tech_stack');

  // Build context for AI generation
  const context = {
    title: idea.title,
    oneLiner: idea.oneLiner,
    document: idea.documentMd,
    mustFeatures: mustFeatures.map(f => ({ title: f.title, description: f.description })),
    shouldFeatures: shouldFeatures.map(f => ({ title: f.title, description: f.description })),
    couldFeatures: couldFeatures.map(f => ({ title: f.title, description: f.description })),
    score: latestScore ? {
      framework: latestScore.framework,
      impact: latestScore.impact,
      confidence: latestScore.confidence,
      ease: latestScore.ease,
      total: latestScore.total,
      notes: latestScore.notes,
    } : null,
    competitors: competitors.slice(0, 3).map(c => ({ title: c.title, content: c.content })),
    techStack: techResearch.slice(0, 1).map(t => ({ title: t.title, content: t.content })),
    recentChat: idea.chatMessages.slice(0, 10).map(msg => ({
      role: msg.role,
      content: msg.content.substring(0, 300),
    })),
  };

  const prompt = `You are an expert technical writer creating a comprehensive Kiro-ready specification document for a software project.

IDEA CONTEXT:
Title: ${context.title}
One-liner: ${context.oneLiner || 'Not provided'}

Current Document:
${context.document.substring(0, 2000) || 'No document content yet'}

FEATURES:
Must Have Features:
${context.mustFeatures.map(f => `- ${f.title}: ${f.description || 'No description'}`).join('\n')}

Should Have Features:
${context.shouldFeatures.map(f => `- ${f.title}: ${f.description || 'No description'}`).join('\n')}

Could Have Features:
${context.couldFeatures.map(f => `- ${f.title}: ${f.description || 'No description'}`).join('\n')}

SCORING:
${context.score ? `ICE Score: ${context.score.total}/10 (Impact: ${context.score.impact}, Confidence: ${context.score.confidence}, Ease: ${context.score.ease})
Notes: ${context.score.notes || 'No notes'}` : 'No scoring data available'}

COMPETITIVE LANDSCAPE:
${context.competitors.map(c => `- ${c.title}: ${c.content.substring(0, 150)}`).join('\n')}

TECH STACK RESEARCH:
${context.techStack.map(t => `${t.content.substring(0, 300)}`).join('\n')}

RECENT CONTEXT:
${context.recentChat.map(msg => `${msg.role}: ${msg.content}`).join('\n').substring(0, 800)}

TASK:
Generate a comprehensive, Kiro-ready specification document that follows this exact structure:

# [Project Title] - Technical Specification

## Overview
[2-3 paragraph overview of the project, its purpose, and value proposition]

## Goals
[3-5 clear, measurable goals for the project]

## User Stories
[Convert the Must Have and Should Have features into proper user stories with acceptance criteria]

### Core Features (Must Have)
[Each feature as a user story with acceptance criteria]

### Enhanced Features (Should Have)  
[Each feature as a user story with acceptance criteria]

## Scope
### In Scope
[What will be built in this project]

### Out of Scope
[What will NOT be built - include Could Have features here]

## Non-Functional Requirements
[Performance, security, scalability, usability requirements]

## Technical Architecture
[High-level technical approach and key technologies]

## Implementation Milestones
[Break down the work into 3-4 logical phases/milestones]

REQUIREMENTS:
- Write in clear, technical language suitable for developers
- Each user story must follow the format: "As a [user type], I want [functionality], so that [benefit]"
- Include specific acceptance criteria for each user story using "WHEN/THEN" format
- Be specific about technical requirements and constraints
- Focus on actionable, implementable requirements
- Ensure the specification is complete enough for a development team to start building immediately
- Include realistic timelines and effort estimates where appropriate
- Reference the competitive analysis and technical research where relevant

Generate a professional, comprehensive specification that a development team can use to build this product.`;

  try {
    const result = await generateText({
      model,
      prompt,
      temperature: 0.3, // Lower temperature for more consistent, structured output
    });

    return result.text.trim();
  } catch (error) {
    console.error('Error generating Kiro spec with AI:', error);
    
    // Fallback: generate basic spec structure
    return generateFallbackSpec(idea);
  }
}

function generateFallbackSpec(idea: IdeaWithFullContext): string {
  const mustFeatures = idea.features.filter(f => f.priority === 'MUST');
  const shouldFeatures = idea.features.filter(f => f.priority === 'SHOULD');
  const couldFeatures = idea.features.filter(f => f.priority === 'COULD');

  return `# ${idea.title} - Technical Specification

## Overview

${idea.oneLiner || 'A software solution designed to solve specific user needs.'}

This project aims to build a minimum viable product that addresses core user requirements while maintaining high quality and usability standards.

## Goals

- Deliver core functionality that solves the primary user problem
- Create an intuitive and responsive user experience
- Build a scalable and maintainable technical foundation
- Validate product-market fit through user feedback
- Establish a foundation for future feature development

## User Stories

### Core Features (Must Have)

${mustFeatures.map((feature, index) => `
#### ${index + 1}. ${feature.title}

**User Story:** As a user, I want ${feature.title.toLowerCase()}, so that I can achieve my goals efficiently.

**Acceptance Criteria:**
- WHEN I access this feature THEN the system SHALL provide the expected functionality
- WHEN I interact with the interface THEN the system SHALL respond appropriately
- WHEN errors occur THEN the system SHALL handle them gracefully

${feature.description ? `**Description:** ${feature.description}` : ''}
`).join('\n')}

### Enhanced Features (Should Have)

${shouldFeatures.map((feature, index) => `
#### ${index + 1}. ${feature.title}

**User Story:** As a user, I want ${feature.title.toLowerCase()}, so that I can have an enhanced experience.

**Acceptance Criteria:**
- WHEN I use this feature THEN the system SHALL provide additional value
- WHEN I interact with enhanced functionality THEN the system SHALL maintain performance
- WHEN this feature is unavailable THEN the core functionality SHALL remain intact

${feature.description ? `**Description:** ${feature.description}` : ''}
`).join('\n')}

## Scope

### In Scope
- All Must Have features listed above
- Should Have features as time and resources permit
- Basic user authentication and data persistence
- Responsive web interface
- Core API functionality
- Basic error handling and validation

### Out of Scope
${couldFeatures.length > 0 ? `- ${couldFeatures.map(f => f.title).join('\n- ')}` : '- Advanced analytics and reporting'}
- Mobile native applications (initial release)
- Advanced integrations with third-party services
- Complex user role management
- Advanced performance optimization

## Non-Functional Requirements

### Performance
- Page load times under 3 seconds
- API response times under 500ms for standard operations
- Support for concurrent users as needed

### Security
- Secure user authentication and session management
- Data encryption in transit and at rest
- Input validation and sanitization
- Protection against common web vulnerabilities

### Usability
- Intuitive user interface following modern design principles
- Responsive design supporting desktop and mobile devices
- Accessible design following WCAG guidelines
- Clear error messages and user feedback

### Scalability
- Database design supporting growth
- Modular architecture for feature additions
- Efficient resource utilization

## Technical Architecture

### Technology Stack
- Frontend: Modern web framework (React/Next.js recommended)
- Backend: RESTful API with appropriate framework
- Database: Relational database (PostgreSQL recommended)
- Authentication: Secure authentication system
- Hosting: Cloud platform with CI/CD pipeline

### Key Components
- User interface layer
- API service layer
- Data access layer
- Authentication service
- Database schema

## Implementation Milestones

### Phase 1: Foundation (Weeks 1-2)
- Set up development environment and project structure
- Implement basic authentication system
- Create core database schema
- Build basic UI framework

### Phase 2: Core Features (Weeks 3-4)
- Implement Must Have features
- Create API endpoints for core functionality
- Build user interface for primary workflows
- Add basic error handling

### Phase 3: Enhancement (Weeks 5-6)
- Implement Should Have features
- Add comprehensive testing
- Optimize performance and user experience
- Prepare for deployment

### Phase 4: Launch Preparation (Week 7)
- Final testing and bug fixes
- Documentation and deployment setup
- User acceptance testing
- Production deployment

---

*This specification serves as a living document and may be updated as requirements evolve during development.*`;
}