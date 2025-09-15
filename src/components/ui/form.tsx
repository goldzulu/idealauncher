'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/ui/loading'
import { useFormValidation, FieldValidationProps } from '@/lib/form-validation'
import { z } from 'zod'

// Field validation component
export function FieldValidation({ error, children }: FieldValidationProps) {
  return (
    <div className="space-y-1">
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function FormField({ 
  label, 
  error, 
  required, 
  children, 
  className 
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-destructive')}>
        {label}
      </Label>
      <FieldValidation error={error}>
        {children}
      </FieldValidation>
    </div>
  )
}

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  required?: boolean
  onValueChange?: (value: string) => void
}

export function ValidatedInput({ 
  label, 
  error, 
  required, 
  onValueChange,
  onChange,
  className,
  ...props 
}: ValidatedInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (onValueChange) {
      onValueChange(value)
    }
    if (onChange) {
      onChange(e)
    }
  }

  return (
    <FormField label={label} error={error} required={required}>
      <Input
        {...props}
        onChange={handleChange}
        className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
      />
    </FormField>
  )
}

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  required?: boolean
  onValueChange?: (value: string) => void
}

export function ValidatedTextarea({ 
  label, 
  error, 
  required, 
  onValueChange,
  onChange,
  className,
  ...props 
}: ValidatedTextareaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (onValueChange) {
      onValueChange(value)
    }
    if (onChange) {
      onChange(e)
    }
  }

  return (
    <FormField label={label} error={error} required={required}>
      <Textarea
        {...props}
        onChange={handleChange}
        className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
      />
    </FormField>
  )
}

interface FormProps<T extends z.ZodSchema> {
  schema: T
  onSubmit: (data: z.infer<T>) => Promise<void> | void
  children: (props: {
    register: (name: keyof z.infer<T>) => {
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
      onBlur: () => void
      error?: string
    }
    errors: Record<string, string>
    isValidating: boolean
    isSubmitting: boolean
    hasErrors: boolean
  }) => React.ReactNode
  className?: string
}

export function Form<T extends z.ZodSchema>({ 
  schema, 
  onSubmit, 
  children, 
  className 
}: FormProps<T>) {
  const [formData, setFormData] = React.useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { validate, validateField, errors, hasErrors, isValidating } = useFormValidation(schema)

  const register = (name: keyof z.infer<T>) => ({
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setFormData(prev => ({ ...prev, [name]: value }))
      validateField(name as string, value)
    },
    onBlur: () => {
      validateField(name as string, formData[name as string])
    },
    error: errors[name as string],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting || isValidating) return

    const validatedData = await validate(formData)
    if (!validatedData) return

    setIsSubmitting(true)
    try {
      await onSubmit(validatedData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children({
        register,
        errors,
        isValidating,
        isSubmitting,
        hasErrors,
      })}
    </form>
  )
}

interface SubmitButtonProps {
  isSubmitting: boolean
  hasErrors: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
}

export function SubmitButton({ 
  isSubmitting, 
  hasErrors, 
  children, 
  loadingText = 'Submitting...',
  className 
}: SubmitButtonProps) {
  return (
    <LoadingButton
      type="submit"
      isLoading={isSubmitting}
      loadingText={loadingText}
      disabled={hasErrors}
      className={className}
    >
      {children}
    </LoadingButton>
  )
}