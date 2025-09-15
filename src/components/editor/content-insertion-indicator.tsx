'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentInsertionIndicatorProps {
  isVisible: boolean
  isInserting?: boolean
  justInserted?: boolean
  sectionTitle?: string
  className?: string
}

export function ContentInsertionIndicator({
  isVisible,
  isInserting = false,
  justInserted = false,
  sectionTitle,
  className
}: ContentInsertionIndicatorProps) {
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (justInserted) {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [justInserted])

  if (!isVisible && !showSuccess) return null

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 transition-all duration-300 ease-in-out",
      "bg-background border rounded-lg shadow-lg p-3 min-w-[200px]",
      isVisible || showSuccess ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
      className
    )}>
      <div className="flex items-center gap-2">
        {isInserting ? (
          <>
            <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
            <span className="text-sm font-medium">Inserting content...</span>
          </>
        ) : showSuccess ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-700">
              Content inserted!
            </span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Ready to insert</span>
          </>
        )}
      </div>
      
      {sectionTitle && (
        <div className="text-xs text-muted-foreground mt-1">
          Into {sectionTitle} section
        </div>
      )}
    </div>
  )
}