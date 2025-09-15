import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../utils'
import { CreateIdeaModal } from '@/components/dashboard/create-idea-modal'
import { IdeaCard } from '@/components/dashboard/idea-card'
import { createMockIdea } from '../utils'

// Mock API calls
global.fetch = vi.fn()

describe('Dashboard Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CreateIdeaModal', () => {
    it('renders create idea form', () => {
      render(<CreateIdeaModal open={true} onOpenChange={() => {}} />)
      
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/one-liner/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create idea/i })).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const onOpenChange = vi.fn()
      render(<CreateIdeaModal open={true} onOpenChange={onOpenChange} />)
      
      const createButton = screen.getByRole('button', { name: /create idea/i })
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })
    })

    it('submits form with valid data', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-idea-id' }),
      } as Response)

      const onOpenChange = vi.fn()
      render(<CreateIdeaModal open={true} onOpenChange={onOpenChange} />)
      
      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'New Test Idea' }
      })
      fireEvent.change(screen.getByLabelText(/one-liner/i), {
        target: { value: 'A new test idea' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: /create idea/i }))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/ideas', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New Test Idea',
            oneLiner: 'A new test idea'
          })
        }))
      })
    })
  })

  describe('IdeaCard', () => {
    const mockIdea = createMockIdea()

    it('displays idea information', () => {
      render(<IdeaCard idea={mockIdea} />)
      
      expect(screen.getByText(mockIdea.title)).toBeInTheDocument()
      expect(screen.getByText(mockIdea.oneLiner!)).toBeInTheDocument()
      expect(screen.getByText('7.5')).toBeInTheDocument() // ICE score
    })

    it('handles idea deletion', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      render(<IdeaCard idea={mockIdea} />)
      
      // Open dropdown menu
      const menuButton = screen.getByRole('button', { name: /more options/i })
      fireEvent.click(menuButton)
      
      // Click delete option
      const deleteButton = screen.getByRole('menuitem', { name: /delete/i })
      fireEvent.click(deleteButton)
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/ideas/${mockIdea.id}`, {
          method: 'DELETE'
        })
      })
    })
  })
})