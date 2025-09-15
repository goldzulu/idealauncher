'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { NavigationHeader } from '@/components/dashboard/navigation-header'
import { CreateIdeaModal } from '@/components/dashboard/create-idea-modal'
import { IdeaCard } from '@/components/dashboard/idea-card'
import { IdeasFilter } from '@/components/dashboard/ideas-filter'
import { ScoreSummary } from '@/components/dashboard/score-summary'
import { useToast } from '@/hooks/use-toast'
import { useDashboardRefresh } from '@/hooks/use-dashboard-refresh'
import type { Idea } from '@/types'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [scoreFilter, setScoreFilter] = useState('all')
  const { toast } = useToast()

  const fetchIdeas = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        sortBy,
        sortOrder,
      })
      
      const response = await fetch(`/api/ideas?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch ideas')
      }

      const data = await response.json()
      setIdeas(data)
    } catch (error) {
      console.error('Error fetching ideas:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch ideas',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [sortBy, sortOrder, toast])

  // Filter ideas based on search query and score filter
  const filteredIdeas = useMemo(() => {
    let filtered = ideas

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (idea) =>
          idea.title.toLowerCase().includes(query) ||
          (idea.oneLiner && idea.oneLiner.toLowerCase().includes(query))
      )
    }

    // Apply score filter
    switch (scoreFilter) {
      case 'scored':
        filtered = filtered.filter(idea => 
          (idea.iceScore !== null && idea.iceScore !== undefined) || 
          (idea.riceScore !== null && idea.riceScore !== undefined)
        )
        break
      case 'unscored':
        filtered = filtered.filter(idea => 
          (idea.iceScore === null || idea.iceScore === undefined) && 
          (idea.riceScore === null || idea.riceScore === undefined)
        )
        break
      case 'high-ice':
        filtered = filtered.filter(idea => idea.iceScore !== null && idea.iceScore !== undefined && idea.iceScore >= 7)
        break
      case 'high-rice':
        filtered = filtered.filter(idea => idea.riceScore !== null && idea.riceScore !== undefined && idea.riceScore >= 50)
        break
      case 'top-performers':
        // Get top 30% of scored ideas
        const scoredIdeas = filtered.filter(idea => 
          (idea.iceScore !== null && idea.iceScore !== undefined) || 
          (idea.riceScore !== null && idea.riceScore !== undefined)
        )
        if (scoredIdeas.length > 0) {
          const topCount = Math.max(1, Math.ceil(scoredIdeas.length * 0.3))
          const sortedByScore = scoredIdeas.sort((a, b) => {
            const scoreA = Math.max(a.iceScore ?? 0, a.riceScore ?? 0)
            const scoreB = Math.max(b.iceScore ?? 0, b.riceScore ?? 0)
            return scoreB - scoreA
          })
          const topScoreIds = new Set(sortedByScore.slice(0, topCount).map(idea => idea.id))
          filtered = filtered.filter(idea => topScoreIds.has(idea.id))
        } else {
          filtered = []
        }
        break
      default:
        // 'all' - no additional filtering
        break
    }

    return filtered
  }, [ideas, searchQuery, scoreFilter])

  useEffect(() => {
    if (session) {
      fetchIdeas()
    }
  }, [session, fetchIdeas])

  // Handle dashboard refresh when returning from idea pages
  useDashboardRefresh(fetchIdeas)

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin')
  }

  const handleIdeaCreated = () => {
    fetchIdeas()
  }

  const handleIdeaDeleted = () => {
    fetchIdeas()
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Ideas</h1>
            <p className="text-muted-foreground mt-2">
              Transform raw ideas into validated, prioritized specifications
            </p>
          </div>
          <CreateIdeaModal onIdeaCreated={handleIdeaCreated} />
        </div>

        <ScoreSummary ideas={ideas} />

        <IdeasFilter
          sortBy={sortBy}
          sortOrder={sortOrder}
          searchQuery={searchQuery}
          scoreFilter={scoreFilter}
          onSortByChange={setSortBy}
          onSortOrderChange={setSortOrder}
          onSearchChange={setSearchQuery}
          onScoreFilterChange={setScoreFilter}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card p-6 shadow-sm animate-pulse"
              >
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded mb-3 w-3/4" />
                <div className="flex gap-2 mb-3">
                  <div className="h-5 bg-muted rounded w-16" />
                  <div className="h-5 bg-muted rounded w-20" />
                </div>
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto max-w-md">
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No ideas found' : 'No ideas yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? 'Try adjusting your search query or create a new idea.'
                  : 'Get started by creating your first idea and begin your journey from concept to specification.'}
              </p>
              {!searchQuery && <CreateIdeaModal onIdeaCreated={handleIdeaCreated} />}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onIdeaDeleted={handleIdeaDeleted}
                allIdeas={ideas}
              />
            ))}
          </div>
        )}

        {filteredIdeas.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Showing {filteredIdeas.length} of {ideas.length} ideas
          </div>
        )}
      </main>
    </div>
  )
}