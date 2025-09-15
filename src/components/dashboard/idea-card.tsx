'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MoreHorizontal, Trash2, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Idea } from '@/types'

interface IdeaCardProps {
  idea: Idea
  onIdeaDeleted: () => void
  allIdeas?: Idea[] // For ranking calculations
}

export function IdeaCard({ idea, onIdeaDeleted, allIdeas = [] }: IdeaCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/ideas/${idea.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete idea')
      }

      toast({
        title: 'Success',
        description: 'Idea deleted successfully',
      })

      setShowDeleteDialog(false)
      onIdeaDeleted()
    } catch (error) {
      console.error('Error deleting idea:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete idea',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'ideation':
        return 'bg-blue-100 text-blue-800'
      case 'validation':
        return 'bg-yellow-100 text-yellow-800'
      case 'scoring':
        return 'bg-purple-100 text-purple-800'
      case 'mvp':
        return 'bg-green-100 text-green-800'
      case 'export':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'N/A'
    return score.toFixed(1)
  }

  const getScoreColor = (score: number | null | undefined, type: 'ICE' | 'RICE') => {
    if (score === null || score === undefined) return 'bg-gray-100 text-gray-600 border-gray-200'
    
    // ICE scoring: 0-10 scale, higher is better
    // RICE scoring: varies but typically 0-100+, higher is better
    const maxScore = type === 'ICE' ? 10 : 100
    const percentage = Math.min(score / maxScore, 1)
    
    if (percentage >= 0.8) return 'bg-green-100 text-green-800 border-green-200'
    if (percentage >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (percentage >= 0.4) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getScoreRank = (score: number | null | undefined, allScores: number[], type: 'ICE' | 'RICE') => {
    if (score === null || score === undefined || allScores.length === 0) return null
    
    const validScores = allScores.filter(s => s !== null && s !== undefined).sort((a, b) => b - a)
    const rank = validScores.indexOf(score) + 1
    const total = validScores.length
    
    if (rank === 1 && total > 1) return '🏆'
    if (rank <= Math.ceil(total * 0.3)) return '⭐'
    return null
  }

  return (
    <>
      <div className="group relative rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link
              href={`/ideas/${idea.id}`}
              className="block hover:text-primary transition-colors"
            >
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                {idea.title}
              </h3>
            </Link>
            
            {idea.oneLiner && (
              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                {idea.oneLiner}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              <Badge 
                variant="secondary" 
                className={getPhaseColor(idea.phase)}
              >
                {idea.phase}
              </Badge>
              
              {(idea.iceScore !== null && idea.iceScore !== undefined) && (
                <Badge 
                  variant="outline" 
                  className={`border ${getScoreColor(idea.iceScore, 'ICE')}`}
                >
                  <span className="flex items-center gap-1">
                    ICE: {formatScore(idea.iceScore)}
                    {getScoreRank(idea.iceScore, allIdeas.map(i => i.iceScore).filter(s => s !== null && s !== undefined) as number[], 'ICE')}
                  </span>
                </Badge>
              )}
              
              {(idea.riceScore !== null && idea.riceScore !== undefined) && (
                <Badge 
                  variant="outline" 
                  className={`border ${getScoreColor(idea.riceScore, 'RICE')}`}
                >
                  <span className="flex items-center gap-1">
                    RICE: {formatScore(idea.riceScore)}
                    {getScoreRank(idea.riceScore, allIdeas.map(i => i.riceScore).filter(s => s !== null && s !== undefined) as number[], 'RICE')}
                  </span>
                </Badge>
              )}
              
              {!idea.iceScore && !idea.riceScore && (
                <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                  Not scored
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Updated {formatDistanceToNow(new Date(idea.updatedAt), { addSuffix: true })}
              </span>
              <span>
                Created {formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/ideas/${idea.id}`} className="flex items-center">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Idea</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{idea.title}&quot;? This action cannot be undone and will remove all associated data including chat history, research, and scores.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}