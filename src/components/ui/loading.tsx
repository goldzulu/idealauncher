'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 
      className={cn('animate-spin', sizeClasses[size], className)} 
    />
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  message?: string
  className?: string
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  message = 'Loading...', 
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface LoadingButtonProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function LoadingButton({ 
  isLoading, 
  children, 
  loadingText,
  className,
  disabled,
  onClick,
  type = 'button',
  variant = 'default',
  size = 'default',
  ...props 
}: LoadingButtonProps) {
  const buttonClasses = cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
      'h-10 px-4 py-2': size === 'default',
      'h-9 rounded-md px-3': size === 'sm',
      'h-11 rounded-md px-8': size === 'lg',
      'h-10 w-10': size === 'icon',
    },
    {
      'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
      'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
      'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
      'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
      'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
      'text-primary underline-offset-4 hover:underline': variant === 'link',
    },
    className
  )
  
  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
      {isLoading ? (loadingText || 'Loading...') : children}
    </button>
  )
}

interface LoadingSkeletonProps {
  className?: string
  lines?: number
  variant?: 'text' | 'card' | 'avatar' | 'button'
}

export function LoadingSkeleton({ 
  className, 
  lines = 1, 
  variant = 'text' 
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-muted rounded'
  
  const variantClasses = {
    text: 'h-4',
    card: 'h-32',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-20'
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              variantClasses.text,
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div 
      className={cn(
        baseClasses, 
        variantClasses[variant],
        variant === 'text' ? 'w-full' : '',
        className
      )} 
    />
  )
}

interface LoadingStateProps {
  isLoading: boolean
  error?: Error | null
  children: React.ReactNode
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  retryAction?: () => void
}

export function LoadingState({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent,
  retryAction
}: LoadingStateProps) {
  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>
    }
    
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-destructive mb-4">Error: {error.message}</p>
        {retryAction && (
          <LoadingButton 
            isLoading={false} 
            onClick={retryAction}
            variant="outline"
          >
            Try Again
          </LoadingButton>
        )}
      </div>
    )
  }

  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }
    
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Streaming loading component for AI responses
interface StreamingLoadingProps {
  isStreaming: boolean
  className?: string
  message?: string
  showProgress?: boolean
  progress?: number
}

export function StreamingLoading({ 
  isStreaming, 
  className, 
  message = 'AI is thinking...',
  showProgress = false,
  progress = 0
}: StreamingLoadingProps) {
  if (!isStreaming) return null

  return (
    <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
      </div>
      <span className="text-sm">{message}</span>
      {showProgress && (
        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

// Enhanced streaming indicator with typing animation
interface TypingIndicatorProps {
  isVisible: boolean
  className?: string
}

export function TypingIndicator({ isVisible, className }: TypingIndicatorProps) {
  if (!isVisible) return null

  return (
    <div className={cn('flex items-center gap-2 p-3 text-muted-foreground', className)}>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse [animation-delay:0ms] [animation-duration:1.4s]" />
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse [animation-delay:160ms] [animation-duration:1.4s]" />
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse [animation-delay:320ms] [animation-duration:1.4s]" />
      </div>
      <span className="text-xs">Generating response...</span>
    </div>
  )
}

// Progress bar for long operations
interface ProgressBarProps {
  progress: number
  className?: string
  showPercentage?: boolean
  color?: 'primary' | 'success' | 'warning' | 'error'
}

export function ProgressBar({ 
  progress, 
  className, 
  showPercentage = false,
  color = 'primary'
}: ProgressBarProps) {
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-1">
        {showPercentage && (
          <span className="text-xs text-muted-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            colorClasses[color]
          )}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </div>
  )
}