import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { insertIntoDocument, formatAIContent, DOCUMENT_SECTIONS } from '@/lib/document-utils'

describe('Document Insertion Functionality', () => {
  let mockInsertFunction: any

  beforeEach(() => {
    // Mock the global window function
    mockInsertFunction = vi.fn()
    ;(global as any).window = {
      insertIntoDocumentSection: mockInsertFunction
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete (global as any).window
  })

  it('formats AI content correctly with metadata', () => {
    const content = 'This is a test content with **bold** text and *italic* text.'
    const sourceType = 'Chat Message'
    
    const formatted = formatAIContent(content, sourceType)
    
    expect(formatted).toContain('AI Generated Content (Chat Message)')
    expect(formatted).toContain(content)
    expect(formatted).toContain('<div class="ai-generated-content">')
    expect(formatted).toContain('<hr />')
  })

  it('inserts content into document successfully', async () => {
    const sectionId = 'problem'
    const content = 'This is test content for the problem section.'
    const sourceType = 'Chat Message'

    await insertIntoDocument(sectionId, content, sourceType)

    expect(mockInsertFunction).toHaveBeenCalledOnce()
    expect(mockInsertFunction).toHaveBeenCalledWith(
      sectionId,
      expect.stringContaining(content)
    )
  })

  it('handles insertion failure when document editor is not available', async () => {
    // Remove the mock function to simulate unavailable editor
    delete (global as any).window.insertIntoDocumentSection

    const sectionId = 'problem'
    const content = 'This is test content.'

    await expect(insertIntoDocument(sectionId, content)).rejects.toThrow(
      'Document editor not available for content insertion'
    )
  })

  it('validates all document sections exist', () => {
    const expectedSections = [
      'problem', 'users', 'solution', 'features', 
      'research', 'mvp', 'tech', 'spec'
    ]

    expectedSections.forEach(sectionId => {
      const section = DOCUMENT_SECTIONS.find(s => s.id === sectionId)
      expect(section).toBeDefined()
      expect(section?.title).toBeTruthy()
      expect(section?.placeholder).toBeTruthy()
    })
  })

  it('cleans up content formatting properly', () => {
    const messyContent = `


This is content with


multiple line breaks



and extra spaces.


`
    
    const formatted = formatAIContent(messyContent)
    
    // Should not contain excessive line breaks
    expect(formatted).not.toMatch(/\n{3,}/)
    // Should contain the cleaned content
    expect(formatted).toContain('This is content with')
    expect(formatted).toContain('multiple line breaks')
  })

  it('handles markdown content in formatting', () => {
    const markdownContent = `# Heading

This is **bold** text and *italic* text.

- List item 1
- List item 2

\`\`\`javascript
console.log('code block');
\`\`\``

    const formatted = formatAIContent(markdownContent, 'Test')
    
    // Check that the content is preserved within the HTML structure
    expect(formatted).toContain('# Heading')
    expect(formatted).toContain('**bold** text')
    expect(formatted).toContain('AI Generated Content (Test)')
    expect(formatted).toContain('<div class="ai-generated-content">')
  })
})