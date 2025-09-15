import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domains } = await request.json();
    
    if (!domains || !Array.isArray(domains)) {
      return NextResponse.json({ error: 'Invalid domains array' }, { status: 400 });
    }

    const domainrApiKey = process.env.DOMAINR_API_KEY;
    if (!domainrApiKey) {
      return NextResponse.json({ error: 'Domain checking service not configured' }, { status: 500 });
    }

    // Check availability for each domain
    const results = await Promise.all(
      domains.map(async (domain: string) => {
        try {
          const response = await fetch(
            `https://domainr.p.rapidapi.com/v2/status?domain=${encodeURIComponent(domain)}`,
            {
              headers: {
                'X-RapidAPI-Key': domainrApiKey,
                'X-RapidAPI-Host': 'domainr.p.rapidapi.com'
              }
            }
          );

          if (!response.ok) {
            throw new Error(`Domain check failed for ${domain}`);
          }

          const data = await response.json();
          const status = data.status?.[0];
          
          return {
            domain,
            available: status?.status === 'undelegated' || status?.status === 'inactive',
            status: status?.status || 'unknown',
            summary: status?.summary || 'Unknown status'
          };
        } catch (error) {
          console.error(`Error checking domain ${domain}:`, error);
          return {
            domain,
            available: false,
            status: 'error',
            summary: 'Check failed'
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Domain check API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}