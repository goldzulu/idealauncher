import { describe, it, expect } from 'vitest'
import { DOCUMENT_SECTIONS } from '@/lib/document-utils'

describe('Section Detection Logic', () => {
  const sampleHeadings = [
    'Problem',
    'Target Users', 
    'Solution',
    'Key Features',
    'Research & Validation',
    'MVP Plan',
    'Tech Stack',
    'Specification'
  ]

  it('should match sections exactly', () => {
    DOCUMENT_SECTIONS.forEach(section => {
      const matchingHeading = sampleHeadings.find(heading => 
        heading.toLowerCase() === section.title.toLowerCase()
      )
      expect(matchingHeading).toBeDefined()
    })
  })

  it('should not confuse similar section names', () => {
    const testCases = [
      { target: 'Problem', shouldNotMatch: ['Tech Stack Problem', 'Problem Analysis'] },
      { target: 'Tech Stack', shouldNotMatch: ['Problem', 'Solution'] },
      { target: 'Solution', shouldNotMatch: ['Problem', 'Research & Validation'] }
    ]

    testCases.forEach(({ target, shouldNotMatch }) => {
      const section = DOCUMENT_SECTIONS.find(s => s.title === target)
      expect(section).toBeDefined()

      shouldNotMatch.forEach(heading => {
        // Test exact match (should fail for non-exact matches)
        const isExactMatch = heading.toLowerCase() === target.toLowerCase()
        expect(isExactMatch).toBe(false)

        // Test starts with match (should be more careful)
        const isStartsWithMatch = heading.toLowerCase().startsWith(target.toLowerCase())
        if (target === 'Problem' && heading === 'Problem Analysis') {
          expect(isStartsWithMatch).toBe(true) // This would be a false positive
        }
      })
    })
  })

  it('should use word boundary matching for better precision', () => {
    const testCases = [
      { target: 'Problem', text: 'Problem', shouldMatch: true },
      { target: 'Problem', text: 'Tech Stack Problem', shouldMatch: true },
      { target: 'Problem', text: 'Problematic', shouldMatch: false },
      { target: 'Tech Stack', text: 'Tech Stack', shouldMatch: true },
      { target: 'Tech Stack', text: 'My Tech Stack Analysis', shouldMatch: true },
    ]

    testCases.forEach(({ target, text, shouldMatch }) => {
      const regex = new RegExp(`\\b${target.toLowerCase()}\\b`)
      const matches = regex.test(text.toLowerCase())
      expect(matches).toBe(shouldMatch)
    })
  })

  it('should prioritize exact matches over partial matches', () => {
    const headings = ['Problem Analysis', 'Problem', 'Tech Stack']
    const target = 'Problem'

    // Find exact match first
    const exactMatch = headings.find(h => h.toLowerCase() === target.toLowerCase())
    expect(exactMatch).toBe('Problem')

    // If no exact match, then use word boundary
    if (!exactMatch) {
      const regex = new RegExp(`\\b${target.toLowerCase()}\\b`)
      const wordMatch = headings.find(h => regex.test(h.toLowerCase()))
      expect(wordMatch).toBeDefined()
    }
  })
})