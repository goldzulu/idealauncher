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

  // Insert content into specific section with visual feedback
  const insertIntoSection = useCallback(async (sectionId: string, content: string) => {
    if (!editor) return;

    const sectionHeader = DOCUMENT_SECTIONS.find(s => s.id === sectionId);
    if (!sectionHeader) return;

    // Find the section in the document
    const doc = editor.state.doc;
    let sectionPos = -1;
    let nextSectionPos = doc.content.size;

    doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && 
          node.textContent.toLowerCase().includes(sectionHeader.title.toLowerCase())) {
        sectionPos = pos;
        return false;
      }
      return true;
    });

    if (sectionPos === -1) {
      // Section doesn't exist, create it
      const sectionContent = `\n\n## ${sectionHeader.title}\n\n${content}\n`;
      editor.chain().focus().insertContent(sectionContent).run();
    } else {
      // Find the next section to determine insertion point
      doc.descendants((node, pos) => {
        if (pos > sectionPos && node.type.name === 'heading' && node.attrs.level <= 2) {
          nextSectionPos = pos;
          return false;
        }
        return true;
      });

      // Insert content at the end of the section
      const insertPos = nextSectionPos;
      editor.chain().focus().insertContentAt(insertPos, `\n\n${content}\n`).run();
      
      // Scroll to the inserted content
      setTimeout(() => {
        editor.chain().focus().setTextSelection(insertPos).run();
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

  // Expose insertIntoSection method and keyboard shortcuts
  useEffect(() => {
    if (editor) {
      (window as any).insertIntoDocumentSection = insertIntoSection;
    }
    return () => {
      delete (window as any).insertIntoDocumentSection;
    };
  }, [editor, insertIntoSection]);

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
    return content;
  }

  return getInitialDocumentTemplate();
}