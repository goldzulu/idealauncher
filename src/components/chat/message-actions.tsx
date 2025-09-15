'use client'

import { useState, useCallback } from 'react'
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
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { DOCUMENT_SECTIONS } from '@/lib/document-utils'
import { useToast } from '@/hooks/use-toast'
import { insertIntoDocument } from '@/lib/document-utils'
import { cn } from '@/lib/utils'

export interface MessageAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  handler: (messageId: string, content: string) => void | Promise<void>
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'success'
}

interface MessageActionsProps {
  messageId: string
  content: string
  role: 'user' | 'assistant' | 'system'
  onInsert?: (messageId: string, sectionId: string, content: string) => void
  customActions?: MessageAction[]
  showInline?: boolean
}

export function MessageActions({ 
  messageId, 
  content, 
  role,
  onInsert,
  customActions = [],
  showInline = false
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [inserting, setInserting] = useState<string | null>(null)
  const [insertSuccess, setInsertSuccess] = useState<string | null>(null)
  const [insertError, setInsertError] = useState<string | null>(null)
  const { toast } = useToast()

  // Only show insert actions for assistant messages
  const showInsertActions = role === 'assistant' && content.trim().length > 0

  const handleCopy = useCallback(async () => {
    try {
      // Enhanced copy with metadata
      const copyText = content
      const metadata = `\n\n---\nCopied from AI Assistant at ${new Date().toLocaleString()}`
      const fullText = copyText + metadata
      
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      toast({
        title: 'Copied to clipboard',
        description: `${content.length} characters copied with timestamp`,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = content
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        
        setCopied(true)
        toast({
          title: 'Copied to clipboard',
          description: 'Message content copied successfully',
        })
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackError) {
        toast({
          title: 'Copy failed',
          description: 'Unable to copy to clipboard. Please select and copy manually.',
          variant: 'destructive',
        })
      }
    }
  }, [content, toast])

  const handleInsertToSection = useCallback(async (sectionId: string) => {
    setInserting(sectionId)
    setInsertError(null)
    setInsertSuccess(null)
    
    try {
      // Use the updated insertIntoDocument function
      await insertIntoDocument(sectionId, content, 'Chat Message')
      
      // Call the optional callback with messageId
      onInsert?.(messageId, sectionId, content)
      
      const section = DOCUMENT_SECTIONS.find(s => s.id === sectionId)
      setInsertSuccess(sectionId)
      
      toast({
        title: 'Content inserted successfully',
        description: `Added to ${section?.title || sectionId} section`,
      })

      // Clear success state after 3 seconds
      setTimeout(() => setInsertSuccess(null), 3000)
    } catch (error) {
      console.error('Content insertion failed:', error)
      setInsertError(sectionId)
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to insert content into document'
      
      toast({
        title: 'Insert failed',
        description: errorMessage,
        variant: 'destructive',
      })
      
      // Clear error state after 5 seconds for errors
      setTimeout(() => setInsertError(null), 5000)
    } finally {
      setInserting(null)
    }
  }, [messageId, content, onInsert, toast])

  const handleCustomAction = useCallback(async (action: MessageAction) => {
    try {
      await action.handler(messageId, content)
    } catch (error) {
      toast({
        title: 'Action failed',
        description: `Failed to execute ${action.label}`,
        variant: 'destructive',
      })
    }
  }, [messageId, content, toast])

  // Render inline actions for better UX
  if (showInline) {
    return (
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs hover:bg-muted"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
        
        {showInsertActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 text-xs hover:bg-muted",
                  insertSuccess && "text-green-600",
                  insertError && "text-red-600"
                )}
              >
                {insertSuccess ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Inserted!
                  </>
                ) : insertError ? (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Failed
                  </>
                ) : (
                  <>
                    <FileText className="h-3 w-3 mr-1" />
                    Insert to Document
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Choose section</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {DOCUMENT_SECTIONS.map((section) => (
                <DropdownMenuItem
                  key={section.id}
                  onClick={() => handleInsertToSection(section.id)}
                  disabled={inserting === section.id}
                  className={cn(
                    insertSuccess === section.id && "bg-green-50 text-green-700",
                    insertError === section.id && "bg-red-50 text-red-700"
                  )}
                >
                  {inserting === section.id ? (
                    <>
                      <Sparkles className="mr-2 h-3 w-3 animate-pulse" />
                      Inserting...
                    </>
                  ) : insertSuccess === section.id ? (
                    <>
                      <CheckCircle2 className="mr-2 h-3 w-3 text-green-600" />
                      {section.title}
                    </>
                  ) : insertError === section.id ? (
                    <>
                      <AlertCircle className="mr-2 h-3 w-3 text-red-600" />
                      {section.title}
                    </>
                  ) : (
                    section.title
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Custom actions */}
        {customActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 text-xs hover:bg-muted",
              action.variant === 'destructive' && "hover:bg-destructive/10 hover:text-destructive",
              action.variant === 'success' && "hover:bg-green-50 hover:text-green-700"
            )}
            onClick={() => handleCustomAction(action)}
            disabled={action.disabled}
          >
            <action.icon className="h-3 w-3 mr-1" />
            {action.label}
          </Button>
        ))}
      </div>
    )
  }

  // Render dropdown menu for compact view
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
                className={cn(
                  "pl-8",
                  insertSuccess === section.id && "bg-green-50 text-green-700",
                  insertError === section.id && "bg-red-50 text-red-700"
                )}
              >
                {inserting === section.id ? (
                  <>
                    <Sparkles className="mr-2 h-3 w-3 animate-pulse" />
                    Inserting...
                  </>
                ) : insertSuccess === section.id ? (
                  <>
                    <CheckCircle2 className="mr-2 h-3 w-3 text-green-600" />
                    {section.title}
                  </>
                ) : insertError === section.id ? (
                  <>
                    <AlertCircle className="mr-2 h-3 w-3 text-red-600" />
                    {section.title}
                  </>
                ) : (
                  section.title
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Custom actions */}
        {customActions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {customActions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                onClick={() => handleCustomAction(action)}
                disabled={action.disabled}
                className={cn(
                  action.variant === 'destructive' && "text-destructive focus:text-destructive",
                  action.variant === 'success' && "text-green-700 focus:text-green-700"
                )}
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}