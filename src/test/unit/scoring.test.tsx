import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../utils'
import { ScorePanel } from '@/components/panels/score-panel'
import { createMockScore } from '../utils'

// Mock API calls
global.fetch = vi.fn()

describe('Scoring Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ScorePanel', () => {
    it('renders ICE scoring sliders', () => {
      render(<ScorePanel ideaId="test-idea-id" />)
      
      expect(screen.getByLabelText(/impact/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confidence/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/ease/i)).toBeInTheDocument()
    })

    it('calculates composite ICE score', async () => {
      render(<ScorePanel ideaId="test-idea-id" />)
      
      // Set slider values
      const impactSlider = screen.getByLabelText(/impact/i)
      const confidenceSlider = screen.getByLabelText(/confidence/i)
      const easeSlider = screen.getByLabelText(/ease/i)
      
      fireEvent.change(impactSlider, { target: { value: '8' } })
      fireEvent.change(confidenceSlider, { target: { value: '7' } })
      fireEvent.change(easeSlider, { target: { value: '6' } })
      
      // Check calculated score (8 + 7 + 6) / 3 = 7.0
      await waitFor(() => {
        expect(screen.getByText('7.0')).toBeInTheDocument()
      })
    })

    it('saves score data', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockScore(),
      } as Response)

      render(<ScorePanel ideaId="test-idea-id" />)
      
      // Set values and save
      fireEvent.change(screen.getByLabelText(/impact/i), { target: { value: '8' } })
      fireEvent.change(screen.getByLabelText(/confidence/i), { target: { value: '7' } })
      fireEvent.change(screen.getByLabelText(/ease/i), { target: { value: '6' } })
      
      const saveButton = screen.getByRole('button', { name: /save score/i })
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/ideas/test-idea-id/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            framework: 'ICE',
            impact: 8,
            confidence: 7,
            ease: 6,
            notes: ''
          })
        })
      })
    })

    it('loads existing score data', async () => {
      const existingScore = createMockScore({
        impact: 9,
        confidence: 8,
        ease: 7
      })
      
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => existingScore,
      } as Response)

      render(<ScorePanel ideaId="test-idea-id" />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('9')).toBeInTheDocument() // Impact
        expect(screen.getByDisplayValue('8')).toBeInTheDocument() // Confidence
        expect(screen.getByDisplayValue('7')).toBeInTheDocument() // Ease
      })
    })

    it('handles scoring errors gracefully', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<ScorePanel ideaId="test-idea-id" />)
      
      fireEvent.click(screen.getByRole('button', { name: /save score/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/failed to save score/i)).toBeInTheDocument()
      })
    })
  })
})