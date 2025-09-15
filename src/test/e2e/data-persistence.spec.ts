import { test, expect } from '@playwright/test'

test.describe('Data Persistence', () => {
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
  })

  test('persists chat messages across page refreshes', async ({ page }) => {
    const mockMessages = [
      {
        id: 'msg-1',
        content: 'What are the key features for my app?',
        role: 'user',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'msg-2',
        content: 'Based on your idea, here are the key features: 1. User authentication, 2. Task management, 3. AI prioritization',
        role: 'assistant',
        createdAt: new Date().toISOString(),
      },
    ]

    // Mock chat history API
    await page.route('**/api/ideas/test-idea/chat', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockMessages),
        })
      }
    })

    // Mock idea data
    await page.route('**/api/ideas/test-idea', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-idea',
          title: 'Test Idea',
          oneLiner: 'A test idea',
          documentMd: '# Test Document\n\nSome content here',
        }),
      })
    })

    await page.goto('/ideas/test-idea')

    // Verify chat messages are loaded
    await expect(page.getByText('What are the key features for my app?')).toBeVisible()
    await expect(page.getByText('User authentication')).toBeVisible()

    // Refresh the page
    await page.reload()

    // Verify messages persist after refresh
    await expect(page.getByText('What are the key features for my app?')).toBeVisible()
    await expect(page.getByText('User authentication')).toBeVisible()
  })

  test('persists document changes with auto-save', async ({ page }) => {
    let savedContent = '# Initial Document\n\nInitial content'

    // Mock document API with auto-save
    await page.route('**/api/ideas/test-idea', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-idea',
            title: 'Test Idea',
            documentMd: savedContent,
          }),
        })
      } else if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON()
        savedContent = body.documentMd
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-idea',
            documentMd: savedContent,
            updatedAt: new Date().toISOString(),
          }),
        })
      }
    })

    await page.goto('/ideas/test-idea')

    // Wait for document to load
    await expect(page.getByText('Initial content')).toBeVisible()

    // Edit document content
    const editor = page.locator('[data-testid="document-editor"]')
    await editor.click()
    await editor.fill('# Updated Document\n\nThis content has been updated')

    // Wait for auto-save (debounced)
    await page.waitForTimeout(2000)

    // Verify save indicator
    await expect(page.getByText(/saved/i)).toBeVisible()

    // Refresh page to verify persistence
    await page.reload()

    // Verify updated content persists
    await expect(page.getByText('This content has been updated')).toBeVisible()
  })

  test('persists scoring data', async ({ page }) => {
    let savedScore = null

    // Mock scoring API
    await page.route('**/api/ideas/test-idea/score', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(savedScore),
        })
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        savedScore = {
          id: 'score-id',
          ...body,
          total: (body.impact + body.confidence + body.ease) / 3,
          createdAt: new Date().toISOString(),
        }
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(savedScore),
        })
      }
    })

    await page.route('**/api/ideas/test-idea', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-idea',
          title: 'Test Idea',
          documentMd: '',
        }),
      })
    })

    await page.goto('/ideas/test-idea')
    await page.getByRole('tab', { name: /score/i }).click()

    // Set scores
    await page.getByLabel(/impact/i).fill('9')
    await page.getByLabel(/confidence/i).fill('8')
    await page.getByLabel(/ease/i).fill('7')

    // Save scores
    await page.getByRole('button', { name: /save score/i }).click()

    // Verify score calculation
    await expect(page.getByText('8.0')).toBeVisible()

    // Refresh page
    await page.reload()
    await page.getByRole('tab', { name: /score/i }).click()

    // Verify scores persist
    await expect(page.getByDisplayValue('9')).toBeVisible() // Impact
    await expect(page.getByDisplayValue('8')).toBeVisible() // Confidence  
    await expect(page.getByDisplayValue('7')).toBeVisible() // Ease
    await expect(page.getByText('8.0')).toBeVisible() // Total
  })

  test('persists research findings', async ({ page }) => {
    const mockResearch = {
      competitors: [
        { name: 'Competitor A', description: 'First competitor' },
        { name: 'Competitor B', description: 'Second competitor' },
      ],
      monetization: [
        { model: 'Freemium', description: 'Free with premium features' },
      ],
    }

    // Mock research API
    await page.route('**/api/ideas/test-idea/research', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResearch),
        })
      } else if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResearch),
        })
      }
    })

    await page.route('**/api/ideas/test-idea', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-idea',
          title: 'Test Idea',
          documentMd: '',
        }),
      })
    })

    await page.goto('/ideas/test-idea')
    await page.getByRole('tab', { name: /research/i }).click()

    // Generate research
    await page.getByRole('button', { name: /analyze competitors/i }).click()

    // Verify research results
    await expect(page.getByText('Competitor A')).toBeVisible()
    await expect(page.getByText('Competitor B')).toBeVisible()

    // Refresh page
    await page.reload()
    await page.getByRole('tab', { name: /research/i }).click()

    // Verify research persists
    await expect(page.getByText('Competitor A')).toBeVisible()
    await expect(page.getByText('Competitor B')).toBeVisible()
  })

  test('handles concurrent user sessions', async ({ browser }) => {
    // Create two browser contexts (simulating two users)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // Mock different users
    await page1.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-1', email: 'user1@example.com' },
        }),
      })
    })

    await page2.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-2', email: 'user2@example.com' },
        }),
      })
    })

    // Mock user-specific data
    await page1.route('**/api/ideas', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'idea-1', title: 'User 1 Idea', ownerId: 'user-1' },
        ]),
      })
    })

    await page2.route('**/api/ideas', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'idea-2', title: 'User 2 Idea', ownerId: 'user-2' },
        ]),
      })
    })

    // Navigate both users to dashboard
    await page1.goto('/dashboard')
    await page2.goto('/dashboard')

    // Verify each user sees only their own ideas
    await expect(page1.getByText('User 1 Idea')).toBeVisible()
    await expect(page1.getByText('User 2 Idea')).not.toBeVisible()

    await expect(page2.getByText('User 2 Idea')).toBeVisible()
    await expect(page2.getByText('User 1 Idea')).not.toBeVisible()

    await context1.close()
    await context2.close()
  })
})