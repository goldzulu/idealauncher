'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { Form, ValidatedInput, SubmitButton, FieldValidation } from '@/components/ui/form'
import { ideaFormSchema } from '@/lib/form-validation'
import { ideaAPI } from '@/lib/api-client'
import { showSuccessToast, showErrorToast } from '@/lib/error-handling'
import { ErrorBoundary, MinimalErrorFallback } from '@/components/error-boundary'

interface CreateIdeaModalProps {
  onIdeaCreated: () => void
}

export function CreateIdeaModal({ onIdeaCreated }: CreateIdeaModalProps) {
  const [open, setOpen] = useState(false)

  const handleSubmit = async (data: { title: string; oneLiner?: string }) => {
    try {
      await ideaAPI.create({
        title: data.title.trim(),
        oneLiner: data.oneLiner?.trim() || undefined,
      })

      showSuccessToast('Idea created successfully')
      setOpen(false)
      onIdeaCreated()
    } catch (error) {
      showErrorToast(error, 'Failed to create idea')
      throw error // Re-throw to keep form in submitting state if needed
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Idea
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Idea</DialogTitle>
          <DialogDescription>
            Start with a title and optional one-liner to capture your idea.
          </DialogDescription>
        </DialogHeader>
        
        <ErrorBoundary fallback={MinimalErrorFallback}>
          <Form
            schema={ideaFormSchema}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {({ register, isSubmitting, hasErrors }) => (
              <>
                <div className="grid gap-4 py-4">
                  <ValidatedInput
                    label="Title"
                    placeholder="Enter your idea title..."
                    maxLength={100}
                    required
                    {...register('title')}
                  />
                  
                  <ValidatedInput
                    label="One-liner (optional)"
                    placeholder="Brief description of your idea..."
                    maxLength={200}
                    {...register('oneLiner')}
                  />
                </div>
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <SubmitButton
                    isSubmitting={isSubmitting}
                    hasErrors={hasErrors}
                    loadingText="Creating..."
                  >
                    Create Idea
                  </SubmitButton>
                </DialogFooter>
              </>
            )}
          </Form>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}