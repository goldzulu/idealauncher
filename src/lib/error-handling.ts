import { toast } from '@/hooks/use-toast'
import { ZodError } from 'zod'

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  AI_SERVICE = 'AI_SERVICE',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN'
}

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public type: ErrorType = ErrorType.UNKNOWN,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// Error classification helper
export function classifyError(error: unknown): ErrorType {
  if (error instanceof APIError) {
    return error.type
  }
  
  if (error instanceof ZodError) {
    return ErrorType.VALIDATION
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorType.AUTHENTICATION
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return ErrorType.AUTHORIZATION
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return ErrorType.NOT_FOUND
    }
    
    if (message.includes('ai') || message.includes('openai') || message.includes('model')) {
      return ErrorType.AI_SERVICE
    }
    
    if (message.includes('database') || message.includes('prisma')) {
      return ErrorType.DATABASE
    }
  }
  
  return ErrorType.UNKNOWN
}

// User-friendly error messages
export function getErrorMessage(error: unknown): string {
  const errorType = classifyError(error)
  
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Network connection failed. Please check your internet connection and try again.'
    
    case ErrorType.VALIDATION:
      if (error instanceof ZodError) {
        const firstError = error.errors[0]
        return firstError?.message || 'Please check your input and try again.'
      }
      return 'Please check your input and try again.'
    
    case ErrorType.AUTHENTICATION:
      return 'Please sign in to continue.'
    
    case ErrorType.AUTHORIZATION:
      return 'You don\'t have permission to perform this action.'
    
    case ErrorType.NOT_FOUND:
      return 'The requested resource was not found.'
    
    case ErrorType.AI_SERVICE:
      return 'AI service is temporarily unavailable. Please try again in a moment.'
    
    case ErrorType.DATABASE:
      return 'Database error occurred. Please try again.'
    
    case ErrorType.SERVER:
      return 'Server error occurred. Please try again later.'
    
    default:
      if (error instanceof Error) {
        return error.message
      }
      return 'An unexpected error occurred. Please try again.'
  }
}

// Toast notification helpers
export function showErrorToast(error: unknown, title?: string) {
  const message = getErrorMessage(error)
  const errorType = classifyError(error)
  
  toast({
    variant: 'destructive',
    title: title || getErrorTitle(errorType),
    description: message,
  })
}

export function showSuccessToast(message: string, title?: string) {
  toast({
    title: title || 'Success',
    description: message,
  })
}

export function showInfoToast(message: string, title?: string) {
  toast({
    title: title || 'Info',
    description: message,
  })
}

function getErrorTitle(errorType: ErrorType): string {
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Connection Error'
    case ErrorType.VALIDATION:
      return 'Validation Error'
    case ErrorType.AUTHENTICATION:
      return 'Authentication Required'
    case ErrorType.AUTHORIZATION:
      return 'Access Denied'
    case ErrorType.NOT_FOUND:
      return 'Not Found'
    case ErrorType.AI_SERVICE:
      return 'AI Service Error'
    case ErrorType.DATABASE:
      return 'Database Error'
    case ErrorType.SERVER:
      return 'Server Error'
    default:
      return 'Error'
  }
}

// API error handler for server-side routes
export function handleAPIError(error: unknown) {
  console.error('API Error:', error)
  
  if (error instanceof APIError) {
    return Response.json(
      { 
        error: error.message, 
        code: error.code,
        type: error.type,
        details: error.details 
      },
      { status: error.statusCode }
    )
  }
  
  if (error instanceof ZodError) {
    return Response.json(
      { 
        error: 'Validation error', 
        type: ErrorType.VALIDATION,
        details: error.errors 
      },
      { status: 400 }
    )
  }
  
  const errorType = classifyError(error)
  const message = getErrorMessage(error)
  
  let statusCode = 500
  if (errorType === ErrorType.AUTHENTICATION) statusCode = 401
  if (errorType === ErrorType.AUTHORIZATION) statusCode = 403
  if (errorType === ErrorType.NOT_FOUND) statusCode = 404
  if (errorType === ErrorType.VALIDATION) statusCode = 400
  
  return Response.json(
    { 
      error: message,
      type: errorType
    },
    { status: statusCode }
  )
}

// Retry mechanism for failed requests
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: unknown
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on certain error types
      const errorType = classifyError(error)
      if (
        errorType === ErrorType.AUTHENTICATION ||
        errorType === ErrorType.AUTHORIZATION ||
        errorType === ErrorType.VALIDATION ||
        errorType === ErrorType.NOT_FOUND
      ) {
        throw error
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before retrying with exponential backoff
      const waitTime = delay * Math.pow(backoffMultiplier, attempt)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  throw lastError
}

// Async operation wrapper with error handling
export async function safeAsync<T>(
  operation: () => Promise<T>,
  options: {
    onError?: (error: unknown) => void
    showToast?: boolean
    retries?: number
  } = {}
): Promise<T | null> {
  const { onError, showToast = true, retries = 0 } = options
  
  try {
    if (retries > 0) {
      return await withRetry(operation, retries)
    }
    return await operation()
  } catch (error) {
    if (showToast) {
      showErrorToast(error)
    }
    
    if (onError) {
      onError(error)
    }
    
    return null
  }
}