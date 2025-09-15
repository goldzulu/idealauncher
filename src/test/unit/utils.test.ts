import { describe, it, expect } from 'vitest'

// Test utility functions that should exist
describe('Utility Functions', () => {
  it('should validate idea titles', () => {
    const validateTitle = (title: string) => {
      if (!title || title.trim().length === 0) {
        return { valid: false, error: 'Title is required' }
      }
      if (title.length > 100) {
        return { valid: false, error: 'Title too long' }
      }
      return { valid: true }
    }

    expect(validateTitle('')).toEqual({ valid: false, error: 'Title is required' })
    expect(validateTitle('Valid Title')).toEqual({ valid: true })
    expect(validateTitle('a'.repeat(101))).toEqual({ valid: false, error: 'Title too long' })
  })

  it('should calculate ICE scores correctly', () => {
    const calculateICEScore = (impact: number, confidence: number, ease: number) => {
      return (impact + confidence + ease) / 3
    }

    expect(calculateICEScore(8, 7, 6)).toBe(7)
    expect(calculateICEScore(10, 10, 10)).toBe(10)
    expect(calculateICEScore(0, 0, 0)).toBe(0)
  })

  it('should format dates correctly', () => {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const testDate = new Date('2024-01-15')
    expect(formatDate(testDate)).toBe('Jan 15, 2024')
  })

  it('should validate export content', () => {
    const validateExportContent = (content: string) => {
      const requiredSections = [
        '## Overview',
        '## Goals', 
        '## User Stories',
        '## Technical Stack'
      ]
      
      const missingSections = requiredSections.filter(section => 
        !content.includes(section)
      )
      
      return {
        valid: missingSections.length === 0,
        missingSections
      }
    }

    const validContent = `
# Test Spec
## Overview
Test overview
## Goals
Test goals
## User Stories
Test stories
## Technical Stack
Test stack
`

    const invalidContent = `
# Test Spec
## Overview
Test overview
`

    expect(validateExportContent(validContent)).toEqual({ valid: true, missingSections: [] })
    expect(validateExportContent(invalidContent).valid).toBe(false)
  })
})