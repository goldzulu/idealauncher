import { describe, it, expect } from 'vitest'

// Test validation logic that would be used in API routes
describe('API Validation', () => {
  describe('Idea validation', () => {
    const validateIdeaData = (data: any) => {
      const errors: string[] = []
      
      if (!data.title || typeof data.title !== 'string') {
        errors.push('Title is required and must be a string')
      }
      
      if (data.title && data.title.length > 100) {
        errors.push('Title must be less than 100 characters')
      }
      
      if (data.oneLiner && typeof data.oneLiner !== 'string') {
        errors.push('One-liner must be a string')
      }
      
      if (data.oneLiner && data.oneLiner.length > 200) {
        errors.push('One-liner must be less than 200 characters')
      }
      
      return {
        valid: errors.length === 0,
        errors
      }
    }

    it('validates required fields', () => {
      const result = validateIdeaData({})
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Title is required and must be a string')
    })

    it('validates field types', () => {
      const result = validateIdeaData({ title: 123 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Title is required and must be a string')
    })

    it('validates field lengths', () => {
      const result = validateIdeaData({ 
        title: 'a'.repeat(101),
        oneLiner: 'b'.repeat(201)
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Title must be less than 100 characters')
      expect(result.errors).toContain('One-liner must be less than 200 characters')
    })

    it('passes valid data', () => {
      const result = validateIdeaData({
        title: 'Valid Idea Title',
        oneLiner: 'A valid one-liner description'
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Score validation', () => {
    const validateScoreData = (data: any) => {
      const errors: string[] = []
      
      if (!data.framework || !['ICE', 'RICE'].includes(data.framework)) {
        errors.push('Framework must be ICE or RICE')
      }
      
      const requiredFields = data.framework === 'ICE' 
        ? ['impact', 'confidence', 'ease']
        : ['impact', 'confidence', 'reach', 'effort']
      
      for (const field of requiredFields) {
        if (typeof data[field] !== 'number' || data[field] < 0 || data[field] > 10) {
          errors.push(`${field} must be a number between 0 and 10`)
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      }
    }

    it('validates ICE framework', () => {
      const result = validateScoreData({
        framework: 'ICE',
        impact: 8,
        confidence: 7,
        ease: 6
      })
      expect(result.valid).toBe(true)
    })

    it('validates RICE framework', () => {
      const result = validateScoreData({
        framework: 'RICE',
        impact: 8,
        confidence: 7,
        reach: 9,
        effort: 5
      })
      expect(result.valid).toBe(true)
    })

    it('rejects invalid framework', () => {
      const result = validateScoreData({
        framework: 'INVALID',
        impact: 8
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Framework must be ICE or RICE')
    })

    it('validates score ranges', () => {
      const result = validateScoreData({
        framework: 'ICE',
        impact: 11,
        confidence: -1,
        ease: 'invalid'
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('impact must be a number between 0 and 10')
      expect(result.errors).toContain('confidence must be a number between 0 and 10')
      expect(result.errors).toContain('ease must be a number between 0 and 10')
    })
  })

  describe('Export validation', () => {
    const validateExportRequest = (data: any) => {
      const errors: string[] = []
      
      if (!data.ideaId || typeof data.ideaId !== 'string') {
        errors.push('Idea ID is required')
      }
      
      if (data.format && !['kiro', 'markdown', 'json'].includes(data.format)) {
        errors.push('Format must be kiro, markdown, or json')
      }
      
      return {
        valid: errors.length === 0,
        errors
      }
    }

    it('validates export request', () => {
      const result = validateExportRequest({
        ideaId: 'test-idea-id',
        format: 'kiro'
      })
      expect(result.valid).toBe(true)
    })

    it('requires idea ID', () => {
      const result = validateExportRequest({})
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Idea ID is required')
    })

    it('validates format options', () => {
      const result = validateExportRequest({
        ideaId: 'test-idea-id',
        format: 'invalid'
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Format must be kiro, markdown, or json')
    })
  })
})