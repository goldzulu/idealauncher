import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateText } from 'ai';
import { model } from '@/lib/ai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await request.json();
    const ideaId = id;

    // Verify idea ownership
    const idea = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        owner: { email: session.user.email }
      }
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    if (type === 'competitors') {
      return await generateCompetitorAnalysis(ideaId, idea);
    } else if (type === 'monetization') {
      return await generateMonetizationAnalysis(ideaId, idea);
    } else if (type === 'naming') {
      return await generateNameSuggestions(ideaId, idea);
    } else {
      return NextResponse.json({ error: 'Invalid research type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateCompetitorAnalysis(ideaId: string, idea: any) {
  const prompt = `
Analyze the following startup idea and identify 3-5 similar existing tools/competitors:

Idea: ${idea.title}
Description: ${idea.oneLiner || 'No description provided'}
Document content: ${idea.documentMd.substring(0, 1000)}

For each competitor, provide:
1. Name of the tool/company
2. Brief description (1-2 sentences)
3. Website URL (if known, or make reasonable guess)
4. 3-5 key features that make them competitive
5. How they differentiate from the user's idea

Return the response as a JSON array with this structure:
[
  {
    "name": "Competitor Name",
    "description": "Brief description of what they do",
    "url": "https://example.com",
    "features": ["Feature 1", "Feature 2", "Feature 3"],
    "differentiation": "How they differ from the user's idea"
  }
]

Focus on real, existing tools when possible. If exact matches don't exist, find tools in adjacent spaces.
`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.7,
  });

  let competitors;
  try {
    competitors = JSON.parse(text);
  } catch (e) {
    // Fallback parsing if JSON is malformed
    competitors = [
      {
        name: "Analysis Error",
        description: "Unable to parse competitor analysis. Please try again.",
        url: "",
        features: [],
        differentiation: ""
      }
    ];
  }

  // Save research findings to database
  const savedFindings = await Promise.all(
    competitors.map(async (competitor: any) => {
      return await prisma.researchFinding.create({
        data: {
          ideaId,
          type: 'competitor',
          title: competitor.name,
          content: competitor.description,
          url: competitor.url || null,
          metadata: {
            features: competitor.features,
            differentiation: competitor.differentiation
          }
        }
      });
    })
  );

  return NextResponse.json({
    competitors: savedFindings.map(finding => {
      const metadata = finding.metadata as any;
      return {
        id: finding.id,
        name: finding.title,
        description: finding.content,
        url: finding.url,
        features: metadata?.features || [],
        differentiation: metadata?.differentiation || ''
      };
    })
  });
}

async function generateMonetizationAnalysis(ideaId: string, idea: any) {
  const prompt = `
Analyze the following startup idea and suggest 3-5 viable monetization models:

Idea: ${idea.title}
Description: ${idea.oneLiner || 'No description provided'}
Document content: ${idea.documentMd.substring(0, 1000)}

For each monetization model, provide:
1. Model name (e.g., "Freemium", "Subscription", "Marketplace Commission")
2. Description of how it would work for this specific idea
3. 2-3 examples of successful companies using this model
4. Estimated pricing range or structure
5. Pros and cons for this specific idea

Return the response as a JSON array with this structure:
[
  {
    "model": "Model Name",
    "description": "How this model would work for the idea",
    "examples": ["Company 1", "Company 2", "Company 3"],
    "pricing": "Pricing structure or range",
    "pros": ["Pro 1", "Pro 2"],
    "cons": ["Con 1", "Con 2"]
  }
]

Focus on realistic, proven monetization strategies that fit the idea's target market and value proposition.
`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.7,
  });

  let monetizationModels;
  try {
    monetizationModels = JSON.parse(text);
  } catch (e) {
    // Fallback parsing if JSON is malformed
    monetizationModels = [
      {
        model: "Analysis Error",
        description: "Unable to parse monetization analysis. Please try again.",
        examples: [],
        pricing: "",
        pros: [],
        cons: []
      }
    ];
  }

  // Save research findings to database
  const savedFindings = await Promise.all(
    monetizationModels.map(async (model: any) => {
      return await prisma.researchFinding.create({
        data: {
          ideaId,
          type: 'monetization',
          title: model.model,
          content: model.description,
          metadata: {
            examples: model.examples,
            pricing: model.pricing,
            pros: model.pros,
            cons: model.cons
          }
        }
      });
    })
  );

  return NextResponse.json({
    monetization: savedFindings.map(finding => {
      const metadata = finding.metadata as any;
      return {
        id: finding.id,
        model: finding.title,
        description: finding.content,
        examples: metadata?.examples || [],
        pricing: metadata?.pricing || '',
        pros: metadata?.pros || [],
        cons: metadata?.cons || []
      };
    })
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ideaId = id;

    // Verify idea ownership and get research findings
    const idea = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        owner: { email: session.user.email }
      },
      include: {
        research: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const competitors = idea.research
      .filter(r => r.type === 'competitor')
      .map(finding => {
        const metadata = finding.metadata as any;
        return {
          id: finding.id,
          name: finding.title,
          description: finding.content,
          url: finding.url,
          features: metadata?.features || [],
          differentiation: metadata?.differentiation || '',
          isInserted: finding.isInserted
        };
      });

    const monetization = idea.research
      .filter(r => r.type === 'monetization')
      .map(finding => {
        const metadata = finding.metadata as any;
        return {
          id: finding.id,
          model: finding.title,
          description: finding.content,
          examples: metadata?.examples || [],
          pricing: metadata?.pricing || '',
          pros: metadata?.pros || [],
          cons: metadata?.cons || [],
          isInserted: finding.isInserted
        };
      });

    const names = idea.research
      .filter(r => r.type === 'naming')
      .map(finding => {
        const metadata = finding.metadata as any;
        return {
          id: finding.id,
          name: finding.title,
          explanation: finding.content,
          style: metadata?.style || 'Unknown',
          isInserted: finding.isInserted
        };
      });

    return NextResponse.json({
      competitors,
      monetization,
      names
    });
  } catch (error) {
    console.error('Research GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateNameSuggestions(ideaId: string, idea: any) {
  const prompt = `
Generate 8-12 brandable name suggestions for the following startup idea:

Idea: ${idea.title}
Description: ${idea.oneLiner || 'No description provided'}
Document content: ${idea.documentMd.substring(0, 1000)}

Requirements for names:
- Should be brandable and memorable
- Easy to pronounce and spell
- Suitable for a tech startup
- Avoid generic or overly descriptive names
- Mix of different styles: compound words, made-up words, creative spellings
- Should work well as a domain name

For each name, provide:
1. The name itself
2. Brief explanation of why it fits the idea
3. Style category (e.g., "Compound", "Abstract", "Descriptive", "Made-up")

Return the response as a JSON array with this structure:
[
  {
    "name": "BrandName",
    "explanation": "Why this name fits the idea",
    "style": "Style category"
  }
]

Focus on creating names that are unique, professional, and would work well for a startup brand.
`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.8, // Higher temperature for more creative names
  });

  let namesSuggestions;
  try {
    namesSuggestions = JSON.parse(text);
  } catch (e) {
    // Fallback parsing if JSON is malformed
    namesSuggestions = [
      {
        name: "Analysis Error",
        explanation: "Unable to parse name suggestions. Please try again.",
        style: "Error"
      }
    ];
  }

  // Save research findings to database
  const savedFindings = await Promise.all(
    namesSuggestions.map(async (nameData: any) => {
      return await prisma.researchFinding.create({
        data: {
          ideaId,
          type: 'naming',
          title: nameData.name,
          content: nameData.explanation,
          metadata: {
            style: nameData.style
          }
        }
      });
    })
  );

  return NextResponse.json({
    names: savedFindings.map(finding => {
      const metadata = finding.metadata as any;
      return {
        id: finding.id,
        name: finding.title,
        explanation: finding.content,
        style: metadata?.style || 'Unknown'
      };
    })
  });
}