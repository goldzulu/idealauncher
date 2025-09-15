'use client';

import { DocumentEditor } from './document-editor';
import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DocumentEditorWrapperProps {
  ideaId: string;
  initialContent?: string;
  onContentUpdate?: (content: string) => void;
}

export function DocumentEditorWrapper({ 
  ideaId, 
  initialContent = '',
  onContentUpdate 
}: DocumentEditorWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = useCallback(async (content: string) => {
    setIsLoading(true);
    
    try {
      // Save the document
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentMd: content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save document');
      }

      const updatedIdea = await response.json();
      onContentUpdate?.(updatedIdea.documentMd);

      // Save document version for history tracking
      try {
        await fetch(`/api/ideas/${ideaId}/versions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            changeType: 'auto_save',
            summary: 'Auto-saved document changes',
          }),
        });
      } catch (versionError) {
        // Don't fail the main save if version tracking fails
        console.warn('Failed to save document version:', versionError);
      }
      
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: 'Save Error',
        description: error instanceof Error ? error.message : 'Failed to save document',
        variant: 'destructive',
      });
      throw error; // Re-throw to let DocumentEditor handle the error state
    } finally {
      setIsLoading(false);
    }
  }, [ideaId, onContentUpdate, toast]);

  const handleContentChange = useCallback((content: string) => {
    // Immediate local update for responsive UI
    onContentUpdate?.(content);
  }, [onContentUpdate]);

  return (
    <DocumentEditor
      ideaId={ideaId}
      initialContent={initialContent}
      onContentChange={handleContentChange}
      onSave={handleSave}
    />
  );
}