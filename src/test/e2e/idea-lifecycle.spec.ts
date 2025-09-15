import { test, expect } from '@playwright/test'

test.describe('Complete Idea Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
          },
        }),
      })
    })

    // Mock API responses
    await page.route('**/api/ideas', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      } else if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-idea-id',
            title: 'Test Idea',
            oneLiner: 'A test idea for e2e testing',
            documentMd: '',
            phase: 'ideation',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        })
      }
    })

    await page.goto('/dashboard')
  })

  test('complete idea creation to export workflow', async ({ page }) => {
    // Step 1: Create new idea
    await page.getByRole('button', { name: /create new idea/i }).click()
    await page.getByLabel(/title/i).fill('AI-Powered Task Manager')
    await page.getByLabel(/one-liner/i).fill('Smart task management with AI prioritization')
    await page.getByRole('button', { name: /create idea/i }).click()

    // Verify idea creation
    await expect(page.getByText('AI-Powered Task Manager')).toBeVisible()

    // Step 2: Navigate to idea workspace
    await page.getByText('AI-Powered Task Manager').click()
    await expect(page).toHaveURL(/\/ideas\/new-idea-id/)

    // Mock chat API
    await page.route('**/api/ideas/*/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'This is a great idea for a task management app. It could help users prioritize their work more effectively.',
      })
    })

    // Step 3: Chat interaction
    await page.getByPlaceholder(/ask about your idea/i).fill('What do you think about this idea?')
    await page.getByRole('button', { name: /send/i }).click()
    
    // Wait for AI response
    await expect(page.getByText(/great idea for a task management/i)).toBeVisible()

    // Step 4: Insert AI content to document
    await page.getByRole('button', { name: /insert to document/i }).first().click()
    
    // Verify content insertion
    await expect(page.locator('[data-testid="document-editor"]')).toContainText('great idea')

    // Mock research API
    await page.route('**/api/ideas/*/research', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          competitors: [
            { name: 'Todoist', description: 'Popular task management app' },
            { name: 'Asana', description: 'Team collaboration platform' },
          ],
          monetization: [
            { model: 'Freemium', description: 'Free basic features, paid premium' },
            { model: 'Subscription', description: 'Monthly/yearly subscription model' },
          ],
        }),
      })
    })

    // Step 5: Research phase
    await page.getByRole('tab', { name: /research/i }).click()
    await page.getByRole('button', { name: /analyze competitors/i }).click()
    
    // Verify research results
    await expect(page.getByText('Todoist')).toBeVisible()
    await expect(page.getByText('Asana')).toBeVisible()

    // Mock scoring API
    await page.route('**/api/ideas/*/score', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'score-id',
          framework: 'ICE',
          impact: 8,
          confidence: 7,
          ease: 6,
          total: 7.0,
          ideaId: 'new-idea-id',
        }),
      })
    })

    // Step 6: Scoring phase
    await page.getByRole('tab', { name: /score/i }).click()
    
    // Set ICE scores
    await page.getByLabel(/impact/i).fill('8')
    await page.getByLabel(/confidence/i).fill('7')
    await page.getByLabel(/ease/i).fill('6')
    
    await page.getByRole('button', { name: /save score/i }).click()
    
    // Verify score calculation
    await expect(page.getByText('7.0')).toBeVisible()

    // Mock MVP API
    await page.route('**/api/ideas/*/mvp', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          features: [
            { title: 'User Authentication', priority: 'MUST', estimate: 'M' },
            { title: 'Task Creation', priority: 'MUST', estimate: 'L' },
            { title: 'AI Prioritization', priority: 'SHOULD', estimate: 'L' },
          ],
        }),
      })
    })

    // Step 7: MVP planning
    await page.getByRole('tab', { name: /mvp/i }).click()
    await page.getByRole('button', { name: /generate mvp features/i }).click()
    
    // Verify MVP features
    await expect(page.getByText('User Authentication')).toBeVisible()
    await expect(page.getByText('Task Creation')).toBeVisible()

    // Mock export API
    await page.route('**/api/ideas/*/export', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: `# AI-Powered Task Manager Specification

## Overview
Smart task management with AI prioritization

## Requirements
- User authentication and account management
- Task creation and management
- AI-powered prioritization engine

## Technical Stack
- Frontend: Next.js 15, React, TypeScript
- Backend: Node.js, Prisma, PostgreSQL
- AI: OpenAI API integration

## Implementation Plan
1. Set up project structure
2. Implement authentication
3. Build task management features
4. Integrate AI prioritization
5. Testing and deployment`,
        }),
      })
    })

    // Step 8: Export specification
    await page.getByRole('tab', { name: /export/i }).click()
    await page.getByRole('button', { name: /generate spec/i }).click()
    
    // Verify export content
    await expect(page.getByText(/AI-Powered Task Manager Specification/i)).toBeVisible()
    await expect(page.getByText(/User authentication and account management/i)).toBeVisible()
    
    // Test copy to clipboard
    await page.getByRole('button', { name: /copy to clipboard/i }).click()
    await expect(page.getByText(/copied to clipboard/i)).toBeVisible()
  })

  test('handles authentication flow', async ({ page }) => {
    // Test unauthenticated access
    await page.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      })
    })

    await page.goto('/ideas/test-idea')
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/signin/)
    
    // Test login process
    await page.getByRole('button', { name: /sign in with github/i }).click()
    
    // Mock successful authentication
    await page.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
          },
        }),
      })
    })
    
    // Should redirect back to dashboard after login
    await expect(page).toHaveURL('/dashboard')
  })

  test('handles error states gracefully', async ({ page }) => {
    // Test API error handling
    await page.route('**/api/ideas', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await page.goto('/dashboard')
    
    // Should show error message
    await expect(page.getByText(/failed to load ideas/i)).toBeVisible()
    
    // Test retry functionality
    await page.getByRole('button', { name: /retry/i }).click()
    
    // Mock successful retry
    await page.route('**/api/ideas', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    
    await expect(page.getByText(/no ideas yet/i)).toBeVisible()
  })

  test('validates Kiro spec export quality', async ({ page }) => {
    // Navigate to existing idea with full data
    await page.route('**/api/ideas/test-idea', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-idea',
          title: 'Complete Test Idea',
          oneLiner: 'Fully developed test idea',
          documentMd: `# Problem
Users struggle with task prioritization

# Solution  
AI-powered task management system

# Features
- Smart prioritization
- Team collaboration
- Analytics dashboard`,
          iceScore: 8.5,
        }),
      })
    })

    await page.goto('/ideas/test-idea')
    await page.getByRole('tab', { name: /export/i }).click()

    // Mock comprehensive export
    await page.route('**/api/ideas/*/export', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: `# Complete Test Idea Specification

## Overview
Fully developed test idea with comprehensive documentation

## Goals
- Improve user productivity through AI-powered task prioritization
- Provide seamless team collaboration features
- Deliver actionable analytics and insights

## User Stories
1. As a busy professional, I want AI to prioritize my tasks so that I focus on what matters most
2. As a team lead, I want to assign and track tasks so that projects stay on schedule
3. As a manager, I want analytics on team productivity so that I can optimize workflows

## Scope
### In Scope
- Task creation and management
- AI prioritization engine
- Team collaboration features
- Basic analytics dashboard

### Out of Scope
- Advanced reporting features
- Third-party integrations (Phase 2)
- Mobile app (Phase 2)

## Non-Functional Requirements
- Response time: < 200ms for task operations
- Availability: 99.9% uptime
- Security: SOC 2 Type II compliance
- Scalability: Support 10,000+ concurrent users

## Technical Stack
- Frontend: Next.js 15, React 18, TypeScript
- Backend: Node.js, Prisma ORM, PostgreSQL
- AI: OpenAI GPT-4 API
- Infrastructure: Vercel, Railway
- Authentication: NextAuth.js

## Implementation Milestones
### Phase 1: Core Features (4 weeks)
- [ ] User authentication and onboarding
- [ ] Basic task CRUD operations
- [ ] Simple prioritization algorithm

### Phase 2: AI Integration (3 weeks)  
- [ ] OpenAI API integration
- [ ] Smart task prioritization
- [ ] Natural language task creation

### Phase 3: Collaboration (3 weeks)
- [ ] Team management
- [ ] Task assignment and sharing
- [ ] Real-time updates

### Phase 4: Analytics (2 weeks)
- [ ] Productivity metrics
- [ ] Team performance dashboard
- [ ] Export capabilities`,
        }),
      })
    })

    await page.getByRole('button', { name: /generate spec/i }).click()

    // Validate spec completeness
    const specContent = page.locator('[data-testid="spec-preview"]')
    
    // Check required sections
    await expect(specContent).toContainText('## Overview')
    await expect(specContent).toContainText('## Goals')
    await expect(specContent).toContainText('## User Stories')
    await expect(specContent).toContainText('## Scope')
    await expect(specContent).toContainText('## Non-Functional Requirements')
    await expect(specContent).toContainText('## Technical Stack')
    await expect(specContent).toContainText('## Implementation Milestones')
    
    // Validate actionable content
    await expect(specContent).toContainText('- [ ]') // Has checkboxes
    await expect(specContent).toContainText('Phase 1:') // Has phases
    await expect(specContent).toContainText('weeks') // Has time estimates
    
    // Validate technical details
    await expect(specContent).toContainText('Next.js 15')
    await expect(specContent).toContainText('PostgreSQL')
    await expect(specContent).toContainText('OpenAI')
    
    // Test download functionality
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /download/i }).click()
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toBe('complete-test-idea-spec.md')
  })
})