import { z } from 'zod'
import React, { useState, useCallback } from 'react'

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  oneLiner: z.string().max(200, 'One-liner must be less than 200 characters').optional(),
  url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  score: z.number().min(0, 'Score must be at least 0').max(10, 'Score must be at most 10'),
  text: z.string().min(1, 'This field is required'),
  optionalText: z.string().optional(),
}

// Form validation hook
export function useFormValidation<T extends z.ZodSchema>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  const validate = useCallback(async (data: unknown): Promise<z.infer<T> | null> => {
    setIsValidating(true)
    setErrors({})

    try {
      const result = await schema.parseAsync(data)
      setIsValidating(false)
      return result
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          const path = err.path.join('.')
          fieldErrors[path] = err.message
        })
        setErrors(fieldErrors)
      }
      setIsValidating(false)
      return null
    }
  }, [schema])

  const validateField = useCallback(async (fieldName: string, value: unknown): Promise<boolean> => {
    try {
      // For single field validation, we'll validate the entire object but only report errors for this field
      const testData = { [fieldName]: value }
      await schema.parseAsync(testData)
      
      // Clear error for this field
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
      
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err => err.path.includes(fieldName))
        if (fieldError) {
          setErrors(prev => ({
            ...prev,
            [fieldName]: fieldError.message
          }))
        }
      }
      return false
    }
  }, [schema])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])

  const hasErrors = Object.keys(errors).length > 0
  const getFieldError = useCallback((fieldName: string) => errors[fieldName], [errors])

  return {
    validate,
    validateField,
    errors,
    hasErrors,
    isValidating,
    clearErrors,
    clearFieldError,
    getFieldError,
  }
}

// Field validation component props
export interface FieldValidationProps {
  error?: string
  children: React.ReactNode
}

// Validation schemas for specific forms
export const ideaFormSchema = z.object({
  title: commonSchemas.title,
  oneLiner: commonSchemas.oneLiner,
})

export const scoreFormSchema = z.object({
  impact: commonSchemas.score,
  confidence: commonSchemas.score,
  ease: commonSchemas.score,
  notes: commonSchemas.optionalText,
})

export const researchFormSchema = z.object({
  type: z.enum(['competitors', 'monetization', 'naming']),
})

export const exportFormSchema = z.object({
  format: z.enum(['kiro', 'markdown', 'json']).default('kiro'),
  includeChat: z.boolean().default(false),
  includeResearch: z.boolean().default(true),
})

// Async validation for unique constraints (e.g., checking if idea title exists)
export async function validateUniqueTitle(title: string, userId: string, excludeId?: string): Promise<boolean> {
  try {
    const response = await fetch('/api/ideas/validate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, excludeId }),
    })
    
    if (!response.ok) {
      return false
    }
    
    const { isUnique } = await response.json()
    return isUnique
  } catch {
    return false
  }
}

// Real-time validation hook for form fields
export function useFieldValidation<T>(
  initialValue: T,
  validator: (value: T) => Promise<string | null> | string | null,
  debounceMs: number = 300
) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [touched, setTouched] = useState(false)

  const validate = useCallback(async (newValue: T) => {
    setIsValidating(true)
    
    try {
      const result = await validator(newValue)
      setError(result)
    } catch (err) {
      setError('Validation error occurred')
    } finally {
      setIsValidating(false)
    }
  }, [validator])

  const debouncedValidate = useCallback(
    (value: T) => debounce(validate, debounceMs)(value),
    [validate, debounceMs]
  )

  const handleChange = useCallback((newValue: T) => {
    setValue(newValue)
    setTouched(true)
    
    if (touched) {
      debouncedValidate(newValue)
    }
  }, [debouncedValidate, touched])

  const handleBlur = useCallback(() => {
    setTouched(true)
    validate(value)
  }, [validate, value])

  return {
    value,
    error,
    isValidating,
    touched,
    handleChange,
    handleBlur,
    setValue,
    setError,
  }
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}