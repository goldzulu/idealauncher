import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PATCH, DELETE } from '@/app/api/ideas/route'
import { POST as chatPost } from '@/app/api/ideas/[id]/chat/route'
import { POST as scorePost } from '@/app/api/ideas/[id]/score/route'
import { POST as exportPost } from '@/app/api/ideas/[id]/export/route'

// Mock Prisma client
const mockPrisma = {
  idea: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  chatMessage: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  score: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  specExport: {
    create: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

// Mock authentication
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({
    user: { id: 'test-user-id', email: 'test@example.com' }
  })),
}))

// Mock AI SDK
vi.mock('ai', () => ({
  streamText: vi.fn(() => Promise.resolve({
    toTextStreamResponse: () => new Response('AI response'),
  })),
}))

describe('API Routes Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('/api/ideas', () => {
    it('GET returns user ideas', async () => {
      const mockIdeas = [
        {
          id: 'idea-1',
          title: 'Test Idea 1',
          oneLiner: 'First test idea',
          iceScore: 7.5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      
      mockPrisma.idea.findMany.mockResolvedValue(mockIdeas)
      
      const request = new NextRequest('http://localhost:3000/api/ideas')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toEqual(mockIdeas)
      expect(mockPrisma.idea.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'test-user-id', isArchived: false },
        orderBy: { updatedAt: 'desc' },
      })
    })

    it('POST creates new idea', async () => {
      const newIdea = {
        id: 'new-idea-id',
        title: 'New Idea',
        oneLiner: 'A new test idea',
        ownerId: 'test-user-id',
        documentMd: '',
        phase: 'ideation',
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      mockPrisma.idea.create.mockResolvedValue(newIdea)
      
      const request = new NextRequest('http://localhost:3000/api/ideas', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Idea',
          oneLiner: 'A new test idea',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.title).toBe('New Idea')
      expect(mockPrisma.idea.create).toHaveBeenCalledWith({
        data: {
          title: 'New Idea',
          oneLiner: 'A new test idea',
          ownerId: 'test-user-id',
          documentMd: '',
          phase: 'ideation',
        },
      })
    })

    it('POST validates required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ideas', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('/api/ideas/[id]/chat', () => {
    it('handles chat messages', async () => {
      const mockMessages = [
        { role: 'user', content: 'Tell me about my idea' },
      ]
      
      mockPrisma.chatMessage.findMany.mockResolvedValue([])
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: 'msg-id',
        content: 'Tell me about my idea',
        role: 'user',
        ideaId: 'test-idea-id',
        createdAt: new Date(),
      })
      
      const request = new NextRequest('http://localhost:3000/api/ideas/test-idea-id/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: mockMessages }),
      })
      
      const response = await chatPost(request, { params: { id: 'test-idea-id' } })
      
      expect(response.status).toBe(200)
      expect(mockPrisma.chatMessage.create).toHaveBeenCalled()
    })
  })

  describe('/api/ideas/[id]/score', () => {
    it('saves ICE scores', async () => {
      const scoreData = {
        framework: 'ICE',
        impact: 8,
        confidence: 7,
        ease: 6,
        notes: 'Test notes',
      }
      
      mockPrisma.score.findFirst.mockResolvedValue(null)
      mockPrisma.score.create.mockResolvedValue({
        id: 'score-id',
        ...scoreData,
        total: 7.0,
        ideaId: 'test-idea-id',
        createdAt: new Date(),
      })
      
      const request = new NextRequest('http://localhost:3000/api/ideas/test-idea-id/score', {
        method: 'POST',
        body: JSON.stringify(scoreData),
      })
      
      const response = await scorePost(request, { params: { id: 'test-idea-id' } })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.total).toBe(7.0)
      expect(mockPrisma.score.create).toHaveBeenCalled()
    })

    it('updates existing scores', async () => {
      const existingScore = {
        id: 'existing-score-id',
        framework: 'ICE',
        impact: 5,
        confidence: 5,
        ease: 5,
        total: 5.0,
        ideaId: 'test-idea-id',
      }
      
      mockPrisma.score.findFirst.mockResolvedValue(existingScore)
      mockPrisma.score.update.mockResolvedValue({
        ...existingScore,
        impact: 8,
        total: 7.0,
      })
      
      const request = new NextRequest('http://localhost:3000/api/ideas/test-idea-id/score', {
        method: 'POST',
        body: JSON.stringify({
          framework: 'ICE',
          impact: 8,
          confidence: 7,
          ease: 6,
        }),
      })
      
      const response = await scorePost(request, { params: { id: 'test-idea-id' } })
      
      expect(response.status).toBe(200)
      expect(mockPrisma.score.update).toHaveBeenCalled()
    })
  })

  describe('/api/ideas/[id]/export', () => {
    it('generates Kiro spec export', async () => {
      const mockIdea = {
        id: 'test-idea-id',
        title: 'Test Idea',
        oneLiner: 'A test idea',
        documentMd: '# Test Document\n\nContent here',
        ownerId: 'test-user-id',
      }
      
      mockPrisma.idea.findUnique.mockResolvedValue(mockIdea)
      mockPrisma.specExport.create.mockResolvedValue({
        id: 'export-id',
        format: 'kiro',
        content: '# Kiro Spec\n\nGenerated spec content',
        ideaId: 'test-idea-id',
        createdAt: new Date(),
      })
      
      const request = new NextRequest('http://localhost:3000/api/ideas/test-idea-id/export', {
        method: 'POST',
      })
      
      const response = await exportPost(request, { params: { id: 'test-idea-id' } })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.content).toContain('# Kiro Spec')
      expect(mockPrisma.specExport.create).toHaveBeenCalled()
    })

    it('handles missing idea', async () => {
      mockPrisma.idea.findUnique.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/ideas/nonexistent/export', {
        method: 'POST',
      })
      
      const response = await exportPost(request, { params: { id: 'nonexistent' } })
      
      expect(response.status).toBe(404)
    })
  })
})