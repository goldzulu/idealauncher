'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Focus from '@tiptap/extension-focus';
import Typography from '@tiptap/extension-typography';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDistanceToNow } from 'date-fns';
import { DOCUMENT_SECTIONS, getInitialDocumentTemplate } from '@/lib/document-utils';
import { VersionHistory } from './version-history';
import { useOptimisticDocument } from '@/hooks/use-optimistic-updates';
import { useKeyboardShortcuts, commonShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { ideaAPI } from '@/lib/api-client';
import { marked } from 'marked';

interface DocumentEditorProps {
  ideaId: string;
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onSave?: (content: string) => Promise<void>;
}

export function DocumentEditor({ 
  ideaId, 
  initialContent = '', 
  onContentChange,
  onSave 
}: DocumentEditorProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  
  // Use optimistic updates for document content
  const {
    data: content,
    isOptimistic,
    updateOptimistic: updateContent,
    commitUpdate: commitContentUpdate
  } = useOptimisticDocument(ideaId, initialContent);
  
  const debouncedContent = useDebounce(content || '', 500); // Reduced debounce for better UX

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Enter a heading...';
          }
          return 'Start writing your idea documentation...';
        }
      }),
      Focus.configure({
        className: 'has-focus',
        mode: 'all'
      }),
      Typography
    ],
    content: getInitialStructuredContent(initialContent),
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4'
      }
    },
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      // Optimistically update content
      updateContent(() => newContent);
      onContentChange?.(newContent);
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    }
  });

  // Auto-save functionality with optimistic updates
  useEffect(() => {
    if (debouncedContent && debouncedContent !== initialContent) {
      setSaveError(null);
      
      if (onSave) {
        commitContentUpdate(
          () => onSave(debouncedContent),
          () => debouncedContent
        ).then((result) => {
          if (result !== null) {
            setLastSaved(new Date());
          }
        }).catch((error) => {
          setSaveError(error.message || 'Failed to save document');
        });
      } else {
        // Fallback to API call if no onSave provided
        commitContentUpdate(
          () => ideaAPI.update(ideaId, { documentMd: debouncedContent }),
          () => debouncedContent
        ).then((result) => {
          if (result !== null) {
            setLastSaved(new Date());
          }
        }).catch((error) => {
          setSaveError(error.message || 'Failed to save document');
        });
      }
    }
  }, [debouncedContent, initialContent, onSave, ideaId, commitContentUpdate]);

  // Helper function to find section position more reliably
  const findSectionPosition = useCallback((doc: any, targetTitle: string) => {
    let sectionPos = -1;
    let allHeadings: Array<{pos: number, text: string, level: number}> = [];
    
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'heading') {
        const headingText = node.textContent.trim();
        const level = node.attrs.level || 2;
        allHeadings.push({ pos, text: headingText, level });
        
        // Try multiple matching strategies
        const isExactMatch = headingText.toLowerCase() === targetTitle.toLowerCase();
        const isStartsWithMatch = headingText.toLowerCase().startsWith(targetTitle.toLowerCase());
        const isWordMatch = new RegExp(`\\b${targetTitle.toLowerCase()}\\b`).test(headingText.toLowerCase());
        
        if (isExactMatch || (isStartsWithMatch && level <= 2) || (isWordMatch && level <= 2)) {
          if (sectionPos === -1) { // Take the first match
            sectionPos = pos;
          }
        }
      }
      return true;
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('All headings found:', allHeadings);
      console.log(`Looking for "${targetTitle}", found at position:`, sectionPos);
    }
    
    return { sectionPos, allHeadings };
  }, []);

  // Insert content into specific section with visual feedback
  const insertIntoSection = useCallback(async (sectionId: string, content: string) => {
    if (!editor) {
      console.error('Editor not available');
      return;
    }

    const sectionHeader = DOCUMENT_SECTIONS.find(s => s.id === sectionId);
    if (!sectionHeader) {
      console.error(`Section not found for id: ${sectionId}`);
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Inserting content into section: ${sectionHeader.title} (${sectionId})`);
      console.log('Content to insert:', content.substring(0, 100) + '...');
    }

    // Convert markdown content to HTML if needed
    let htmlContent = content;
    try {
      // Check if content contains markdown patterns
      if (content.includes('**') || content.includes('*') || content.includes('#') || content.includes('```')) {
        htmlContent = marked.parse(content) as string;
      }
    } catch (error) {
      console.warn('Failed to parse markdown content, using as-is:', error);
      htmlContent = content;
    }

    // Find the section in the document
    const doc = editor.state.doc;
    const { sectionPos, allHeadings } = findSectionPosition(doc, sectionHeader.title);
    let nextSectionPos = doc.content.size;

    if (sectionPos === -1) {
      // Section doesn't exist, create it in the correct position
      if (process.env.NODE_ENV === 'development') {
        console.log(`Section "${sectionHeader.title}" not found, creating new section`);
      }
      
      // Find the correct position to insert the new section based on DOCUMENT_SECTIONS order
      const sectionIndex = DOCUMENT_SECTIONS.findIndex(s => s.id === sectionId);
      let insertPosition = doc.content.size; // Default to end
      
      // Look for the next section that exists to insert before it
      for (let i = sectionIndex + 1; i < DOCUMENT_SECTIONS.length; i++) {
        const nextSection = DOCUMENT_SECTIONS[i];
        const { sectionPos: nextPos } = findSectionPosition(doc, nextSection.title);
        if (nextPos !== -1) {
          insertPosition = nextPos;
          if (process.env.NODE_ENV === 'development') {
            console.log(`Found next section "${nextSection.title}" at ${nextPos}, inserting before it`);
          }
          break;
        }
      }
      
      const sectionHTML = `<h2>${sectionHeader.title}</h2><div class="ai-insertion">${htmlContent}</div>`;
      editor.chain().focus().insertContentAt(insertPosition, sectionHTML).run();
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Found section "${sectionHeader.title}" at position ${sectionPos}, looking for insertion point`);
      }
      
      // Find the next section to determine insertion point
      // Use the allHeadings we already collected to find the next section
      const currentSectionIndex = allHeadings.findIndex(h => h.pos === sectionPos);
      let foundNextSection = false;
      
      if (currentSectionIndex !== -1) {
        // Look for the next heading with level <= 2 after the current section
        for (let i = currentSectionIndex + 1; i < allHeadings.length; i++) {
          const heading = allHeadings[i];
          if (heading.level <= 2) {
            nextSectionPos = heading.pos;
            foundNextSection = true;
            if (process.env.NODE_ENV === 'development') {
              console.log(`Found next section at position ${heading.pos}: "${heading.text}"`);
            }
            break; // Stop at the first next section found
          }
        }
      }

      if (!foundNextSection) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`No next section found, inserting at end of document`);
        }
        nextSectionPos = doc.content.size;
      }

      // Insert content at the end of the current section, before the next section
      const insertPos = nextSectionPos;
      if (process.env.NODE_ENV === 'development') {
        console.log(`Inserting content at position ${insertPos}`);
      }
      
      // Ensure proper spacing and formatting
      const formattedContent = `<div class="ai-insertion">${htmlContent}</div>`;
      
      editor.chain().focus().insertContentAt(insertPos, formattedContent).run();
      
      // Scroll to the inserted content with a slight delay
      setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Scrolling to inserted content');
        }
        editor.chain().focus().setTextSelection(insertPos).scrollIntoView().run();
      }, 100);
    }

    // Save version for AI content insertion
    try {
      const newContent = editor.getHTML();
      await fetch(`/api/ideas/${ideaId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newContent,
          changeType: 'ai_insert',
          summary: `Inserted AI content into ${sectionHeader.title} section`,
        }),
      });
    } catch (error) {
      console.warn('Failed to save AI insertion version:', error);
    }
  }, [editor, ideaId]);

  // Expose insertIntoSection method and debugging functions
  useEffect(() => {
    if (editor) {
      (window as any).insertIntoDocumentSection = insertIntoSection;
      
      // Add debugging function for development
      if (process.env.NODE_ENV === 'development') {
        (window as any).debugDocumentSections = () => {
          const doc = editor.state.doc;
          const headings: Array<{pos: number, text: string, level: number}> = [];
          
          doc.descendants((node: any, pos: number) => {
            if (node.type.name === 'heading') {
              headings.push({
                pos,
                text: node.textContent.trim(),
                level: node.attrs.level || 2
              });
            }
            return true;
          });
          
          console.log('=== Document Structure Debug ===');
          console.log('Available sections in DOCUMENT_SECTIONS:', DOCUMENT_SECTIONS.map(s => s.title));
          console.log('Headings found in document:', headings);
          
          DOCUMENT_SECTIONS.forEach(section => {
            const { sectionPos } = findSectionPosition(doc, section.title);
            console.log(`Section "${section.title}" (${section.id}): ${sectionPos !== -1 ? `found at ${sectionPos}` : 'not found'}`);
          });
          
          return { headings, sections: DOCUMENT_SECTIONS };
        };
      }
    }
    return () => {
      delete (window as any).insertIntoDocumentSection;
      if (process.env.NODE_ENV === 'development') {
        delete (window as any).debugDocumentSections;
      }
    };
  }, [editor, insertIntoSection, findSectionPosition]);

  // Keyboard shortcuts for document editing
  useKeyboardShortcuts({
    shortcuts: [
      {
        ...commonShortcuts.save,
        action: () => {
          if (editor && content) {
            // Force save current content
            onSave?.(content);
          }
        }
      },
      {
        ...commonShortcuts.undo,
        action: () => editor?.chain().focus().undo().run()
      },
      {
        ...commonShortcuts.redo,
        action: () => editor?.chain().focus().redo().run()
      }
    ],
    enabled: !!editor
  });

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Document</h3>
          {isOptimistic && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Saving...
            </div>
          )}
          {lastSaved && !isOptimistic && (
            <div className="text-sm text-muted-foreground">
              Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </div>
          )}
          {saveError && (
            <div className="text-sm text-red-500">
              {saveError}
            </div>
          )}
        </div>
        
        {/* Document Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1 rounded hover:bg-muted disabled:opacity-50"
            title="Undo"
          >
            ↶
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1 rounded hover:bg-muted disabled:opacity-50"
            title="Redo"
          >
            ↷
          </button>
          <VersionHistory ideaId={ideaId} />
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <EditorContent 
          editor={editor} 
          className="h-full"
        />
      </div>

      {/* Section Quick Navigation */}
      <div className="p-4 border-t bg-muted/50">
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                // Scroll to section
                const doc = editor.state.doc;
                doc.descendants((node, pos) => {
                  if (node.type.name === 'heading' && 
                      node.textContent.toLowerCase().includes(section.title.toLowerCase())) {
                    editor.chain().focus().setTextSelection(pos).run();
                    return false;
                  }
                  return true;
                });
              }}
              className="px-2 py-1 text-xs rounded bg-background hover:bg-muted transition-colors"
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to create initial structured content
function getInitialStructuredContent(content: string): string {
  if (content && content.trim()) {
    // If content looks like markdown (contains ## headers), convert to HTML
    if (content.includes('##') || content.includes('# ')) {
      try {
        return marked.parse(content) as string;
      } catch (error) {
        console.warn('Failed to parse markdown, using as-is:', error);
        return content;
      }
    }
    return content;
  }

  // Convert the initial template from markdown to HTML
  const template = getInitialDocumentTemplate();
  try {
    return marked.parse(template) as string;
  } catch (error) {
    console.warn('Failed to parse initial template, using as-is:', error);
    return template;
  }
}