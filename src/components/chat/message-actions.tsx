'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal, 
  FileText, 
  Copy, 
  Check,
  Sparkles 
} from 'lucide-react'
import { DOCUMENT_SECTIONS } from '@/lib/document-utils'
import { useToast } from '@/hooks/use-toast'
import { insertIntoDocument } from '@/lib/document-utils'

interface MessageActionsProps {
  messageId: string
  content: string
  role: 'user' | 'assistant' | 'system'
  onInsert?: (sectionId: string, content: string) => void
}

export function MessageActions({ 
  messageId, 
  content, 
  role,
  onInsert 
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [inserting, setInserting] = useState<string | null>(null)
  const { toast } = useToast()

  // Only show insert actions for assistant messages
  const showInsertActions = role === 'assistant' && content.trim().length > 0

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast({
        title: 'Copied',
        description: 'Message content copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy content to clipboard',
        variant: 'destructive',
      })
    }
  }

  const handleInsertToSection = async (sectionId: string) => {
    setInserting(sectionId)
    
    try {
      // Use the global insertion function with source type
      insertIntoDocument(sectionId, content, 'Chat Message')
      
      // Call the optional callback
      onInsert?.(sectionId, content)
      
      const section = DOCUMENT_SECTIONS.find(s => s.id === sectionId)
      toast({
        title: 'Content inserted',
        description: `Added to ${section?.title || sectionId} section`,
      })
    } catch (error) {
      toast({
        title: 'Insert failed',
        description: 'Failed to insert content into document',
        variant: 'destructive',
      })
    } finally {
      setInserting(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-3 w-3" />
          <span className="sr-only">Message actions</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? (
            <Check className="mr-2 h-4 w-4 text-green-600" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copied ? 'Copied!' : 'Copy content'}
        </DropdownMenuItem>
        
        {showInsertActions && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Insert to Document
            </DropdownMenuLabel>
            
            {DOCUMENT_SECTIONS.map((section) => (
              <DropdownMenuItem
                key={section.id}
                onClick={() => handleInsertToSection(section.id)}
                disabled={inserting === section.id}
                className="pl-8"
              >
                {inserting === section.id ? (
                  <>
                    <Sparkles className="mr-2 h-3 w-3 animate-pulse" />
                    Inserting...
                  </>
                ) : (
                  section.title
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}