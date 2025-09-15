#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync } from 'fs'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
}

class TestRunner {
  private results: TestResult[] = []

  async runTest(name: string, command: string): Promise<TestResult> {
    console.log(`\n🧪 Running ${name}...`)
    const startTime = Date.now()
    
    try {
      execSync(command, { 
        stdio: 'inherit',
        timeout: 300000 // 5 minutes timeout
      })
      
      const duration = Date.now() - startTime
      const result: TestResult = { name, passed: true, duration }
      this.results.push(result)
      console.log(`✅ ${name} passed (${duration}ms)`)
      return result
      
    } catch (error) {
      const duration = Date.now() - startTime
      const result: TestResult = { 
        name, 
        passed: false, 
        duration,
        error: error instanceof Error ? error.message : String(error)
      }
      this.results.push(result)
      console.log(`❌ ${name} failed (${duration}ms)`)
      return result
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive test suite...\n')

    // Check if required files exist
    const requiredFiles = [
      'vitest.config.ts',
      'playwright.config.ts',
      'src/test/setup.ts'
    ]

    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        console.error(`❌ Required file missing: ${file}`)
        process.exit(1)
      }
    }

    // Run linting
    await this.runTest('ESLint', 'npm run lint')

    // Run type checking
    await this.runTest('TypeScript', 'npx tsc --noEmit')

    // Run unit tests
    await this.runTest('Unit Tests', 'npm run test')

    // Run integration tests
    await this.runTest('Integration Tests', 'npx vitest run src/test/integration --reporter=verbose')

    // Install Playwright browsers if needed
    try {
      execSync('npx playwright install --with-deps', { stdio: 'pipe' })
    } catch (error) {
      console.log('⚠️  Playwright browsers installation skipped')
    }

    // Run E2E tests
    await this.runTest('E2E Tests', 'npm run test:e2e')

    // Generate test report
    this.generateReport()
  }

  private generateReport(): void {
    console.log('\n📊 Test Results Summary')
    console.log('=' .repeat(50))

    const totalTests = this.results.length
    const passedTests = this.results.filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)

    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests}`)
    console.log(`Failed: ${failedTests}`)
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`)
        })
    }

    console.log('\n📋 Detailed Results:')
    this.results.forEach(r => {
      const status = r.passed ? '✅' : '❌'
      console.log(`  ${status} ${r.name} (${r.duration}ms)`)
    })

    // Exit with error code if any tests failed
    if (failedTests > 0) {
      console.log('\n💥 Some tests failed. Please fix the issues before deployment.')
      process.exit(1)
    } else {
      console.log('\n🎉 All tests passed! Ready for deployment.')
      process.exit(0)
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner()
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error)
    process.exit(1)
  })
}

export { TestRunner }