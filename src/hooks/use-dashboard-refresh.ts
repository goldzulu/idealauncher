'use client'

import { useEffect, useCallback } from 'react'

// Custom hook to handle dashboard refresh when returning from idea pages
export function useDashboardRefresh(onRefresh: () => void) {
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      // Check if we should refresh based on localStorage flag
      const shouldRefresh = localStorage.getItem('dashboard-needs-refresh')
      if (shouldRefresh === 'true') {
        localStorage.removeItem('dashboard-needs-refresh')
        onRefresh()
      }
    }
  }, [onRefresh])

  const handleFocus = useCallback(() => {
    // Also check on window focus
    const shouldRefresh = localStorage.getItem('dashboard-needs-refresh')
    if (shouldRefresh === 'true') {
      localStorage.removeItem('dashboard-needs-refresh')
      onRefresh()
    }
  }, [onRefresh])

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [handleVisibilityChange, handleFocus])
}

// Utility function to mark dashboard for refresh (call this when scores are updated)
export function markDashboardForRefresh() {
  localStorage.setItem('dashboard-needs-refresh', 'true')
}