'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Target, Award, BarChart3 } from 'lucide-react'
import type { Idea } from '@/types'

interface ScoreSummaryProps {
  ideas: Idea[]
  className?: string
}

export function ScoreSummary({ ideas, className }: ScoreSummaryProps) {
  const stats = useMemo(() => {
    const totalIdeas = ideas.length
    const scoredIdeas = ideas.filter(idea => 
      (idea.iceScore !== null && idea.iceScore !== undefined) || 
      (idea.riceScore !== null && idea.riceScore !== undefined)
    )
    const unscoredIdeas = totalIdeas - scoredIdeas.length
    
    const iceScores = ideas.filter(idea => idea.iceScore !== null && idea.iceScore !== undefined).map(idea => idea.iceScore!)
    const riceScores = ideas.filter(idea => idea.riceScore !== null && idea.riceScore !== undefined).map(idea => idea.riceScore!)
    
    const avgIceScore = iceScores.length > 0 ? iceScores.reduce((sum, score) => sum + score, 0) / iceScores.length : 0
    const avgRiceScore = riceScores.length > 0 ? riceScores.reduce((sum, score) => sum + score, 0) / riceScores.length : 0
    
    const highPerformers = ideas.filter(idea => 
      (idea.iceScore !== null && idea.iceScore !== undefined && idea.iceScore >= 7) || 
      (idea.riceScore !== null && idea.riceScore !== undefined && idea.riceScore >= 50)
    )
    
    const topIdea = ideas.length > 0 ? ideas.reduce((top, current) => {
      const currentScore = Math.max(current.iceScore ?? 0, current.riceScore ?? 0)
      const topScore = Math.max(top.iceScore ?? 0, top.riceScore ?? 0)
      return currentScore > topScore ? current : top
    }, ideas[0]) : null
    
    return {
      totalIdeas,
      scoredIdeas: scoredIdeas.length,
      unscoredIdeas,
      avgIceScore,
      avgRiceScore,
      highPerformers: highPerformers.length,
      topIdea: topIdea && ((topIdea.iceScore !== null && topIdea.iceScore !== undefined) || (topIdea.riceScore !== null && topIdea.riceScore !== undefined)) ? topIdea : null
    }
  }, [ideas])

  if (stats.totalIdeas === 0) {
    return null
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 ${className}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalIdeas}</div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {stats.scoredIdeas} scored
            </Badge>
            {stats.unscoredIdeas > 0 && (
              <Badge variant="outline" className="text-xs">
                {stats.unscoredIdeas} unscored
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Scores</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {stats.avgIceScore > 0 && (
              <div className="flex justify-between text-sm">
                <span>ICE:</span>
                <span className="font-medium">{stats.avgIceScore.toFixed(1)}</span>
              </div>
            )}
            {stats.avgRiceScore > 0 && (
              <div className="flex justify-between text-sm">
                <span>RICE:</span>
                <span className="font-medium">{stats.avgRiceScore.toFixed(1)}</span>
              </div>
            )}
            {stats.avgIceScore === 0 && stats.avgRiceScore === 0 && (
              <div className="text-sm text-muted-foreground">No scores yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Performers</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.highPerformers}</div>
          <p className="text-xs text-muted-foreground mt-1">
            ICE ≥7 or RICE ≥50
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.topIdea ? (
            <div>
              <div className="text-sm font-medium truncate" title={stats.topIdea.title}>
                {stats.topIdea.title}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Score: {Math.max(stats.topIdea.iceScore ?? 0, stats.topIdea.riceScore ?? 0).toFixed(1)}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No scores yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}