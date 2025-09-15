/**
 * Performance monitoring and optimization utilities
 */

// Performance timing utilities
export class PerformanceTimer {
  private startTime: number
  private marks: Map<string, number> = new Map()

  constructor(private label: string) {
    this.startTime = performance.now()
  }

  mark(name: string): void {
    this.marks.set(name, performance.now() - this.startTime)
  }

  measure(name: string): number {
    const time = performance.now() - this.startTime
    this.marks.set(name, time)
    return time
  }

  getResults(): Record<string, number> {
    const results: Record<string, number> = {}
    for (const [name, time] of this.marks) {
      results[name] = Math.round(time * 100) / 100 // Round to 2 decimal places
    }
    return results
  }

  log(): void {
    const results = this.getResults()
    console.group(`⏱️ Performance: ${this.label}`)
    for (const [name, time] of Object.entries(results)) {
      console.log(`${name}: ${time}ms`)
    }
    console.groupEnd()
  }
}

// Debounced function utility for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }

    const callNow = immediate && !timeout

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)

    if (callNow) func(...args)
  }
}

// Throttle function for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Lazy loading utility
export function createLazyComponent(
  importFunc: () => Promise<{ default: React.ComponentType<any> }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFunc)
  
  return function WrappedComponent(props: any) {
    const fallbackElement = fallback ? React.createElement(fallback) : React.createElement('div', {}, 'Loading...')
    
    return React.createElement(
      React.Suspense,
      { fallback: fallbackElement },
      React.createElement(LazyComponent, props)
    )
  }
}

// Memory usage monitoring
export function getMemoryUsage(): {
  used: number
  total: number
  percentage: number
} | null {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
      percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
    }
  }
  return null
}

// Bundle size analyzer (development only)
export function logBundleInfo(): void {
  if (process.env.NODE_ENV === 'development') {
    const scripts = Array.from(document.querySelectorAll('script[src]'))
    const totalSize = scripts.reduce((acc, script) => {
      const src = (script as HTMLScriptElement).src
      if (src.includes('/_next/static/')) {
        // Estimate size based on typical Next.js bundle patterns
        return acc + 100 // Rough estimate in KB
      }
      return acc
    }, 0)
    
    console.log(`📦 Estimated bundle size: ~${totalSize}KB`)
  }
}

// Performance observer for Core Web Vitals
export function observeWebVitals(): void {
  if (typeof window === 'undefined') return

  // Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.log('🎯 LCP:', Math.round(lastEntry.startTime), 'ms')
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (entry.processingStart) {
            console.log('⚡ FID:', Math.round(entry.processingStart - entry.startTime), 'ms')
          }
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        console.log('📐 CLS:', Math.round(clsValue * 1000) / 1000)
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (error) {
      console.warn('Performance Observer not supported:', error)
    }
  }
}

// API response time monitoring
export function measureApiCall<T>(
  apiCall: () => Promise<T>,
  endpoint: string
): Promise<T> {
  const timer = new PerformanceTimer(`API: ${endpoint}`)
  
  return apiCall()
    .then((result) => {
      timer.measure('success')
      if (process.env.NODE_ENV === 'development') {
        timer.log()
      }
      return result
    })
    .catch((error) => {
      timer.measure('error')
      if (process.env.NODE_ENV === 'development') {
        timer.log()
      }
      throw error
    })
}

// React component performance wrapper
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    React.useEffect(() => {
      const timer = new PerformanceTimer(`Component: ${componentName}`)
      timer.mark('mount')
      
      return () => {
        timer.measure('unmount')
        if (process.env.NODE_ENV === 'development') {
          timer.log()
        }
      }
    }, [])

    return React.createElement(Component, props)
  }
}

// Initialize performance monitoring
export function initPerformanceMonitoring(): void {
  if (typeof window !== 'undefined') {
    // Start observing web vitals
    observeWebVitals()
    
    // Log bundle info in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(logBundleInfo, 1000)
    }
    
    // Monitor memory usage periodically in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const memory = getMemoryUsage()
        if (memory && memory.percentage > 80) {
          console.warn(`🚨 High memory usage: ${memory.percentage}% (${memory.used}MB/${memory.total}MB)`)
        }
      }, 30000) // Check every 30 seconds
    }
  }
}

// React import for lazy loading
import React from 'react'