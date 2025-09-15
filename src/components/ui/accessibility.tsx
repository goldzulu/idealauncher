'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// Skip to main content link
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
    >
      Skip to main content
    </a>
  )
}

// Focus trap for modals and dialogs
interface FocusTrapProps {
  children: React.ReactNode
  enabled?: boolean
  className?: string
}

export function FocusTrap({ children, enabled = true, className }: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }, [enabled])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

// Announce changes to screen readers
interface LiveRegionProps {
  message: string
  politeness?: 'polite' | 'assertive'
  className?: string
}

export function LiveRegion({ message, politeness = 'polite', className }: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      className={cn('sr-only', className)}
    >
      {message}
    </div>
  )
}

// Progress indicator with accessibility
interface AccessibleProgressProps {
  value: number
  max?: number
  label: string
  className?: string
}

export function AccessibleProgress({ value, max = 100, label, className }: AccessibleProgressProps) {
  const percentage = Math.round((value / max) * 100)
  
  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{percentage}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${percentage}% complete`}
        className="w-full h-2 bg-muted rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Keyboard navigation helper
export function useKeyboardNavigation(
  items: string[],
  onSelect: (index: number) => void,
  enabled = true
) {
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex(prev => (prev + 1) % items.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex(prev => (prev - 1 + items.length) % items.length)
          break
        case 'Enter':
        case ' ':
          if (activeIndex >= 0) {
            e.preventDefault()
            onSelect(activeIndex)
          }
          break
        case 'Escape':
          setActiveIndex(-1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [items.length, activeIndex, onSelect, enabled])

  return { activeIndex, setActiveIndex }
}

// High contrast mode detector
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const isWindows = navigator.platform.indexOf('Win') > -1
      if (isWindows) {
        const testElement = document.createElement('div')
        testElement.style.borderColor = 'rgb(31, 31, 31)'
        testElement.style.borderStyle = 'solid'
        testElement.style.borderWidth = '1px'
        testElement.style.position = 'absolute'
        testElement.style.height = '5px'
        testElement.style.top = '-999px'
        testElement.style.backgroundColor = 'rgb(31, 31, 31)'
        
        document.body.appendChild(testElement)
        
        const computedStyle = window.getComputedStyle(testElement)
        const isHighContrastDetected = computedStyle.borderTopColor !== computedStyle.backgroundColor
        
        document.body.removeChild(testElement)
        setIsHighContrast(isHighContrastDetected)
      }
    }

    checkHighContrast()
    
    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    const handleChange = () => setIsHighContrast(mediaQuery.matches)
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isHighContrast
}

// Reduced motion detector
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// Screen reader only text
interface ScreenReaderOnlyProps {
  children: React.ReactNode
  className?: string
}

export function ScreenReaderOnly({ children, className }: ScreenReaderOnlyProps) {
  return (
    <span className={cn('sr-only', className)}>
      {children}
    </span>
  )
}

// Accessible button with loading state
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
  children: React.ReactNode
}

export function AccessibleButton({ 
  isLoading, 
  loadingText = 'Loading...', 
  children, 
  disabled,
  ...props 
}: AccessibleButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      aria-describedby={isLoading ? 'loading-description' : undefined}
    >
      {isLoading ? (
        <>
          <span aria-hidden="true">⏳</span>
          <ScreenReaderOnly>{loadingText}</ScreenReaderOnly>
        </>
      ) : (
        children
      )}
      {isLoading && (
        <span id="loading-description" className="sr-only">
          Please wait while the action completes
        </span>
      )}
    </button>
  )
}