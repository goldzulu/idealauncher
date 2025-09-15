'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DOCUMENT_SECTIONS, insertIntoDocument, formatAIContent } from '@/lib/document-utils'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, AlertCircle, FileText, Zap } from 'lucide-react'

export function InsertionDemo() {
  const [isEditorAvailable, setIsEditorAvailable] = useState(false)
  const [testContent, setTestContent] = useState(`# Problem Analysis

The main issue users face is **inefficient workflow management** that leads to:

- Decreased productivity
- Missed deadlines  
- Team communication gaps

## Proposed Solution

Implement an *AI-powered* task prioritization system that:

1. Analyzes task complexity
2. Considers team capacity
3. Suggests optimal scheduling

\`\`\`javascript
// Example implementation
const prioritizeTasks = (tasks) => {
  return tasks.sort((a, b) => a.priority - b.priority)
}
\`\`\`

This approach will improve efficiency by **40-60%** based on initial testing.`)
  
  const [selectedSection, setSelectedSection] = useState('problem')
  const [isInserting, setIsInserting] = useState(false)
  const [lastInsertResult, setLastInsertResult] = useState<'success' | 'error' | null>(null)
  const { toast } = useToast()

  // Check if document editor is available
  useEffect(() => {
    const checkEditor = () => {
      const available = typeof window !== 'undefined' && 
                       typeof (window as any).insertIntoDocumentSection === 'function'
      setIsEditorAvailable(available)
    }

    checkEditor()
    
    // Check periodically in case editor loads later
    const interval = setInterval(checkEditor, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const handleTestInsertion = async () => {
    if (!testContent.trim()) {
      toast({
        title: 'No content',
        description: 'Please enter some content to test insertion',
        variant: 'destructive'
      })
      return
    }

    setIsInserting(true)
    setLastInsertResult(null)

    try {
      await insertIntoDocument(selectedSection, testContent, 'Demo Test')
      
      setLastInsertResult('success')
      toast({
        title: 'Content inserted successfully!',
        description: `Added to ${DOCUMENT_SECTIONS.find(s => s.id === selectedSection)?.title} section`,
      })
    } catch (error) {
      console.error('Insertion failed:', error)
      setLastInsertResult('error')
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast({
        title: 'Insertion failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsInserting(false)
    }
  }

  const previewFormatted = formatAIContent(testContent, 'Demo Test')

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Insertion Demo
          </CardTitle>
          <CardDescription>
            Test the AI content insertion functionality into document sections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Editor Status */}
          <div className="flex items-center gap-2">
            <Badge variant={isEditorAvailable ? 'default' : 'destructive'}>
              {isEditorAvailable ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Document Editor Available
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Document Editor Not Available
                </>
              )}
            </Badge>
            
            {lastInsertResult && (
              <Badge variant={lastInsertResult === 'success' ? 'default' : 'destructive'}>
                {lastInsertResult === 'success' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Last Insert: Success
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Last Insert: Failed
                  </>
                )}
              </Badge>
            )}
          </div>

          {/* Content Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Content (Markdown supported)</label>
            <Textarea
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              placeholder="Enter content to test insertion..."
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {testContent.length} characters • Supports markdown formatting
            </p>
          </div>

          {/* Section Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Section</label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_SECTIONS.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleTestInsertion}
              disabled={!isEditorAvailable || isInserting || !testContent.trim()}
              className="flex items-center gap-2"
            >
              {isInserting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Inserting...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Test Insertion
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setTestContent('')}
              disabled={isInserting}
            >
              Clear Content
            </Button>
          </div>

          {/* Troubleshooting */}
          {!isEditorAvailable && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4">
                <h4 className="font-medium text-yellow-800 mb-2">Troubleshooting</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Make sure the Document Editor component is loaded on the page</li>
                  <li>• Check that you're on a page with an active document editor</li>
                  <li>• Try refreshing the page if the editor was recently loaded</li>
                  <li>• Check the browser console for any JavaScript errors</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Formatted Content Preview</CardTitle>
          <CardDescription>
            This is how the content will appear when inserted into the document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="border rounded-lg p-4 bg-muted/50"
            dangerouslySetInnerHTML={{ __html: previewFormatted }}
          />
        </CardContent>
      </Card>
    </div>
  )
}