'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface InsertionFeedback {
  id: string
  messageId: string
  sectionId: string
  sectionTitle: string
  status: 'success' | 'error' | 'pending'
  timestamp: Date
  content?: string
  error?: string
}

interface InsertionFeedbackProps {
  feedback: InsertionFeedback
  onDismiss: (id: string) => void
  autoHide?: boolean
  autoHideDelay?: number
}

export function InsertionFeedbackItem({ 
  feedback, 
  onDismiss, 
  autoHide = true, 
  autoHideDelay = 5000 
}: InsertionFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoHide && feedback.status !== 'pending') {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismiss(feedback.id), 300) // Allow fade out animation
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, feedback.status, feedback.id, onDismiss])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all duration-300",
        "animate-in slide-in-from-right-2 fade-in-0",
        feedback.status === 'success' && "bg-green-50 border-green-200 text-green-800",
        feedback.status === 'error' && "bg-red-50 border-red-200 text-red-800",
        feedback.status === 'pending' && "bg-blue-50 border-blue-200 text-blue-800",
        !isVisible && "animate-out slide-out-to-right-2 fade-out-0"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {feedback.status === 'success' && (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        )}
        {feedback.status === 'error' && (
          <AlertCircle className="h-4 w-4 text-red-600" />
        )}
        {feedback.status === 'pending' && (
          <FileText className="h-4 w-4 text-blue-600 animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            {feedback.status === 'success' && 'Content inserted'}
            {feedback.status === 'error' && 'Insertion failed'}
            {feedback.status === 'pending' && 'Inserting content'}
          </p>
          <span className="text-xs opacity-70">
            {feedback.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        
        <p className="text-xs mt-1 opacity-80">
          {feedback.status === 'success' && `Added to ${feedback.sectionTitle} section`}
          {feedback.status === 'error' && (feedback.error || 'Failed to insert content')}
          {feedback.status === 'pending' && `Adding to ${feedback.sectionTitle}...`}
        </p>

        {feedback.content && feedback.content.length > 100 && (
          <p className="text-xs mt-2 opacity-60 truncate">
            &quot;{feedback.content.substring(0, 100)}...&quot;
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
        onClick={() => onDismiss(feedback.id)}
      >
        <X className="h-3 w-3" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  )
}

interface InsertionFeedbackListProps {
  feedbacks: InsertionFeedback[]
  onDismiss: (id: string) => void
  className?: string
}

export function InsertionFeedbackList({ 
  feedbacks, 
  onDismiss, 
  className 
}: InsertionFeedbackListProps) {
  if (feedbacks.length === 0) return null

  return (
    <div className={cn("space-y-2", className)}>
      {feedbacks.map((feedback) => (
        <InsertionFeedbackItem
          key={feedback.id}
          feedback={feedback}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}

// Hook for managing insertion feedback
export function useInsertionFeedback() {
  const [feedbacks, setFeedbacks] = useState<InsertionFeedback[]>([])

  const addFeedback = (feedback: Omit<InsertionFeedback, 'id' | 'timestamp'>) => {
    const newFeedback: InsertionFeedback = {
      ...feedback,
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }
    
    setFeedbacks(prev => [newFeedback, ...prev])
    return newFeedback.id
  }

  const updateFeedback = (id: string, updates: Partial<InsertionFeedback>) => {
    setFeedbacks(prev => 
      prev.map(feedback => 
        feedback.id === id 
          ? { ...feedback, ...updates }
          : feedback
      )
    )
  }

  const removeFeedback = (id: string) => {
    setFeedbacks(prev => prev.filter(feedback => feedback.id !== id))
  }

  const clearAll = () => {
    setFeedbacks([])
  }

  return {
    feedbacks,
    addFeedback,
    updateFeedback,
    removeFeedback,
    clearAll,
  }
}