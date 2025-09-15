'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  FileText, 
  Sparkles,
  Check 
} from 'lucide-react'
import { DOCUMENT_SECTIONS } from '@/lib/document-utils'
import { useToast } from '@/hooks/use-toast'
import { insertIntoDocument } from '@/lib/document-utils'

interface InsertContentButtonProps {
  content: string
  defaultSection?: string
  onInsert?: (sectionId: string, content: string) => void
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function InsertContentButton({ 
  content,
  defaultSection = 'solution',
  onInsert,
  className,
  variant = 'outline',
  size = 'sm'
}: InsertContentButtonProps) {
  const [selectedSection, setSelectedSection] = useState(defaultSection)
  const [isInserting, setIsInserting] = useState(false)
  const [justInserted, setJustInserted] = useState(false)
  const { toast } = useToast()

  const handleInsert = async () => {
    if (!content.trim() || !selectedSection) return

    setIsInserting(true)
    
    try {
      // Use the global insertion function with source type
      insertIntoDocument(selectedSection, content, 'Manual Insert')
      
      // Call the optional callback
      onInsert?.(selectedSection, content)
      
      const section = DOCUMENT_SECTIONS.find(s => s.id === selectedSection)
      
      setJustInserted(true)
      toast({
        title: 'Content inserted',
        description: `Added to ${section?.title || selectedSection} section`,
      })
      
      // Reset the success state after 2 seconds
      setTimeout(() => setJustInserted(false), 2000)
      
    } catch (error) {
      toast({
        title: 'Insert failed',
        description: 'Failed to insert content into document',
        variant: 'destructive',
      })
    } finally {
      setIsInserting(false)
    }
  }

  if (!content.trim()) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={selectedSection} onValueChange={setSelectedSection}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select section" />
        </SelectTrigger>
        <SelectContent>
          {DOCUMENT_SECTIONS.map((section) => (
            <SelectItem key={section.id} value={section.id}>
              {section.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        onClick={handleInsert}
        disabled={isInserting || !selectedSection}
        variant={justInserted ? 'default' : variant}
        size={size}
        className="min-w-[100px]"
      >
        {isInserting ? (
          <>
            <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
            Inserting...
          </>
        ) : justInserted ? (
          <>
            <Check className="mr-2 h-4 w-4 text-green-600" />
            Inserted!
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Insert to Document
          </>
        )}
      </Button>
    </div>
  )
}