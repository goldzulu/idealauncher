'use client'

import { useState, useCallback, useRef } from 'react'
import { clientCache, optimisticUpdate } from '@/lib/cache'

interface OptimisticState<T> {
  data: T | null
  isOptimistic: boolean
  error: Error | null
}

interface UseOptimisticOptions<T> {
  cacheKey?: string
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  revertOnError?: boolean
}

export function useOptimistic<T>(
  initialData: T | null = null,
  options: UseOptimisticOptions<T> = {}
) {
  const { cacheKey, onSuccess, onError, revertOnError = true } = options
  
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
    error: null
  })
  
  const originalDataRef = useRef<T | null>(initialData)

  const updateOptimistic = useCallback((updater: (current: T | null) => T) => {
    setState(current => {
      const newData = updater(current.data)
      
      // Cache the optimistic update
      if (cacheKey) {
        optimisticUpdate(cacheKey, () => newData)
      }
      
      return {
        data: newData,
        isOptimistic: true,
        error: null
      }
    })
  }, [cacheKey])

  const commitUpdate = useCallback(async <R>(
    asyncAction: () => Promise<R>,
    successUpdater?: (result: R, current: T | null) => T
  ): Promise<R | null> => {
    try {
      const result = await asyncAction()
      
      setState(current => {
        const finalData = successUpdater ? successUpdater(result, current.data) : current.data
        originalDataRef.current = finalData
        
        // Update cache with final data
        if (cacheKey && finalData) {
          clientCache.set(cacheKey, finalData)
        }
        
        return {
          data: finalData,
          isOptimistic: false,
          error: null
        }
      })
      
      onSuccess?.(state.data!)
      return result
    } catch (error) {
      const err = error as Error
      
      if (revertOnError) {
        setState(current => ({
          data: originalDataRef.current,
          isOptimistic: false,
          error: err
        }))
        
        // Revert cache
        if (cacheKey && originalDataRef.current) {
          clientCache.set(cacheKey, originalDataRef.current)
        }
      } else {
        setState(current => ({
          ...current,
          isOptimistic: false,
          error: err
        }))
      }
      
      onError?.(err)
      return null
    }
  }, [cacheKey, onSuccess, onError, revertOnError, state.data])

  const reset = useCallback(() => {
    setState({
      data: originalDataRef.current,
      isOptimistic: false,
      error: null
    })
  }, [])

  return {
    data: state.data,
    isOptimistic: state.isOptimistic,
    error: state.error,
    updateOptimistic,
    commitUpdate,
    reset
  }
}

// Specialized hook for document editing
export function useOptimisticDocument(ideaId: string, initialContent: string = '') {
  const cacheKey = `document:${ideaId}`
  
  return useOptimistic(initialContent, {
    cacheKey,
    onError: (error) => {
      console.error('Document update failed:', error)
    }
  })
}

// Specialized hook for scoring
export function useOptimisticScore(ideaId: string, initialScore: any = null) {
  const cacheKey = `score:${ideaId}`
  
  return useOptimistic(initialScore, {
    cacheKey,
    onSuccess: (score) => {
      // Invalidate ideas cache to refresh dashboard
      clientCache.delete(`ideas:${ideaId}`)
    }
  })
}

// Specialized hook for ideas list
export function useOptimisticIdeas(userId: string, initialIdeas: any[] = []) {
  const cacheKey = `ideas:${userId}`
  
  const optimistic = useOptimistic(initialIdeas, {
    cacheKey
  })

  const addIdea = useCallback((newIdea: any) => {
    optimistic.updateOptimistic(current => [newIdea, ...(current || [])])
  }, [optimistic])

  const updateIdea = useCallback((ideaId: string, updates: Partial<any>) => {
    optimistic.updateOptimistic(current => 
      (current || []).map(idea => 
        idea.id === ideaId ? { ...idea, ...updates } : idea
      )
    )
  }, [optimistic])

  const removeIdea = useCallback((ideaId: string) => {
    optimistic.updateOptimistic(current => 
      (current || []).filter(idea => idea.id !== ideaId)
    )
  }, [optimistic])

  return {
    ...optimistic,
    addIdea,
    updateIdea,
    removeIdea
  }
}