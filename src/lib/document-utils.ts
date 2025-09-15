/**
 * Utility functions for document content manipulation
 */

export interface DocumentSection {
  id: string;
  title: string;
  placeholder: string;
}

export const DOCUMENT_SECTIONS: DocumentSection[] = [
  {
    id: 'problem',
    title: 'Problem',
    placeholder: 'What problem are you solving? Who experiences this problem and how painful is it?'
  },
  {
    id: 'users',
    title: 'Target Users',
    placeholder: 'Who are your target users? What are their characteristics, needs, and behaviors?'
  },
  {
    id: 'solution',
    title: 'Solution',
    placeholder: 'How does your solution address the problem? What makes it unique?'
  },
  {
    id: 'features',
    title: 'Key Features',
    placeholder: 'What are the core features that deliver value to users?'
  },
  {
    id: 'research',
    title: 'Research & Validation',
    placeholder: 'Market research, competitor analysis, and validation findings will appear here.'
  },
  {
    id: 'mvp',
    title: 'MVP Plan',
    placeholder: 'Minimum viable product features and development roadmap will be generated here.'
  },
  {
    id: 'tech',
    title: 'Tech Stack',
    placeholder: 'Technology recommendations and implementation details will be added here.'
  },
  {
    id: 'spec',
    title: 'Specification',
    placeholder: 'Final specification and export-ready documentation will be compiled here.'
  }
];

/**
 * Insert content into a specific section of a markdown document
 */
export function insertContentIntoSection(
  documentContent: string,
  sectionId: string,
  content: string
): string {
  const section = DOCUMENT_SECTIONS.find(s => s.id === sectionId);
  if (!section) {
    throw new Error(`Unknown section: ${sectionId}`);
  }

  const lines = documentContent.split('\n');
  const sectionHeaderPattern = new RegExp(`^##\\s+${section.title}\\s*$`, 'i');
  
  let sectionStartIndex = -1;
  let sectionEndIndex = lines.length;

  // Find the section header
  for (let i = 0; i < lines.length; i++) {
    if (sectionHeaderPattern.test(lines[i])) {
      sectionStartIndex = i;
      break;
    }
  }

  // If section doesn't exist, create it at the end
  if (sectionStartIndex === -1) {
    const newSection = [
      '',
      `## ${section.title}`,
      '',
      content,
      ''
    ];
    return documentContent + '\n' + newSection.join('\n');
  }

  // Find the end of the section (next ## header or end of document)
  for (let i = sectionStartIndex + 1; i < lines.length; i++) {
    if (lines[i].match(/^##\s+/)) {
      sectionEndIndex = i;
      break;
    }
  }

  // Find the last non-empty line in the section
  let insertIndex = sectionEndIndex;
  for (let i = sectionEndIndex - 1; i > sectionStartIndex; i--) {
    if (lines[i].trim() !== '') {
      insertIndex = i + 1;
      break;
    }
  }

  // Insert the content
  const newLines = [
    ...lines.slice(0, insertIndex),
    '',
    content,
    ...lines.slice(insertIndex)
  ];

  return newLines.join('\n');
}

/**
 * Extract content from a specific section
 */
export function extractSectionContent(
  documentContent: string,
  sectionId: string
): string {
  const section = DOCUMENT_SECTIONS.find(s => s.id === sectionId);
  if (!section) {
    return '';
  }

  const lines = documentContent.split('\n');
  const sectionHeaderPattern = new RegExp(`^##\\s+${section.title}\\s*$`, 'i');
  
  let sectionStartIndex = -1;
  let sectionEndIndex = lines.length;

  // Find the section header
  for (let i = 0; i < lines.length; i++) {
    if (sectionHeaderPattern.test(lines[i])) {
      sectionStartIndex = i;
      break;
    }
  }

  if (sectionStartIndex === -1) {
    return '';
  }

  // Find the end of the section
  for (let i = sectionStartIndex + 1; i < lines.length; i++) {
    if (lines[i].match(/^##\s+/)) {
      sectionEndIndex = i;
      break;
    }
  }

  // Extract content between headers
  const sectionLines = lines.slice(sectionStartIndex + 1, sectionEndIndex);
  return sectionLines.join('\n').trim();
}

/**
 * Get the initial structured document template
 */
export function getInitialDocumentTemplate(): string {
  return `# Idea Documentation

## Problem

What problem are you solving? Who experiences this problem and how painful is it?

## Target Users

Who are your target users? What are their characteristics, needs, and behaviors?

## Solution

How does your solution address the problem? What makes it unique?

## Key Features

What are the core features that deliver value to users?

## Research & Validation

Market research, competitor analysis, and validation findings will appear here.

## MVP Plan

Minimum viable product features and development roadmap will be generated here.

## Tech Stack

Technology recommendations and implementation details will be added here.

## Specification

Final specification and export-ready documentation will be compiled here.`;
}

/**
 * Format content for AI insertion with proper styling
 */
export function formatAIContent(content: string, sourceType?: string): string {
  const timestamp = new Date().toLocaleString();
  const source = sourceType ? ` (${sourceType})` : '';
  
  return `**AI Generated Content${source}** *(${timestamp})*

${content}

---`;
}

/**
 * Global function to insert content into document (used by other components)
 */
export function insertIntoDocument(sectionId: string, content: string, sourceType?: string): void {
  // This function will be called by other components to insert content
  // It uses the global window function set by DocumentEditor
  if (typeof window !== 'undefined' && (window as any).insertIntoDocumentSection) {
    const formattedContent = formatAIContent(content, sourceType);
    (window as any).insertIntoDocumentSection(sectionId, formattedContent);
  } else {
    console.warn('Document editor not available for content insertion');
  }
}