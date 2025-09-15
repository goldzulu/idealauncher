# Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for IdeaLauncher MVP, covering unit tests, integration tests, end-to-end tests, and deployment verification.

## Test Structure

```
src/test/
├── unit/                 # Unit tests for individual components
│   ├── utils.test.ts    # Utility function tests
│   ├── dashboard.test.tsx # Dashboard component tests
│   ├── chat.test.tsx    # Chat component tests
│   └── scoring.test.tsx # Scoring component tests
├── integration/         # Integration tests for API routes
│   ├── validation.test.ts # Input validation tests
│   └── api.test.ts      # API endpoint tests
├── e2e/                 # End-to-end workflow tests
│   ├── idea-lifecycle.spec.ts # Complete user journey
│   └── data-persistence.spec.ts # Data persistence tests
├── mocks/               # Test mocks and fixtures
│   └── ai-react.ts      # AI SDK mocks
├── utils.tsx            # Test utilities and helpers
├── setup.ts             # Test environment setup
└── run-all-tests.ts     # Comprehensive test runner
```

## Test Categories

### 1. Unit Tests
Tests individual functions and components in isolation.

**Coverage:**
- Utility functions (validation, calculations, formatting)
- Component rendering and user interactions
- State management and hooks
- Error handling

**Run Command:**
```bash
npm run test
```

### 2. Integration Tests
Tests API routes and data validation logic.

**Coverage:**
- API endpoint validation
- Database operations (mocked)
- Authentication flows
- Error responses

**Run Command:**
```bash
npx vitest run src/test/integration
```

### 3. End-to-End Tests
Tests complete user workflows using Playwright.

**Coverage:**
- Complete idea lifecycle (creation → research → scoring → MVP → export)
- Authentication and authorization
- Data persistence across page refreshes
- Error handling and recovery
- Kiro spec export quality validation

**Run Command:**
```bash
npm run test:e2e
```

## Test Scenarios

### Critical User Workflows

#### 1. Idea Creation to Export
- ✅ User creates new idea with title and one-liner
- ✅ User navigates to idea workspace
- ✅ User chats with AI about the idea
- ✅ User inserts AI content into document
- ✅ User conducts competitor research
- ✅ User scores idea using ICE framework
- ✅ User generates MVP feature list
- ✅ User exports Kiro-ready specification

#### 2. Authentication Flow
- ✅ Unauthenticated users redirected to login
- ✅ OAuth authentication with GitHub/Google
- ✅ Session persistence across page refreshes
- ✅ Proper logout and session cleanup

#### 3. Data Persistence
- ✅ Chat messages persist across sessions
- ✅ Document auto-save functionality
- ✅ Scoring data persistence
- ✅ Research findings storage
- ✅ User-specific data isolation

#### 4. Error Handling
- ✅ API error responses with user-friendly messages
- ✅ Network failure recovery
- ✅ Invalid input validation
- ✅ Graceful degradation when AI services fail

### Kiro Spec Export Validation

The export functionality is tested to ensure generated specifications are:

- **Complete**: Contains all required sections (Overview, Goals, User Stories, Scope, Technical Stack, Implementation Plan)
- **Actionable**: Includes checkboxes, time estimates, and specific tasks
- **Well-structured**: Proper markdown formatting and hierarchy
- **Technically detailed**: Specific technology choices and implementation guidance

## Test Data and Fixtures

### Mock Data Factories
```typescript
// Create test idea
const mockIdea = createMockIdea({
  title: 'AI Task Manager',
  oneLiner: 'Smart task prioritization',
  iceScore: 8.5
})

// Create test chat message
const mockMessage = createMockChatMessage({
  role: 'assistant',
  content: 'AI generated response'
})

// Create test score
const mockScore = createMockScore({
  framework: 'ICE',
  impact: 8,
  confidence: 7,
  ease: 6
})
```

### API Mocking
Tests use comprehensive API mocking to simulate:
- Authentication responses
- Database operations
- AI service responses
- External API calls (domain checking)

## Running Tests

### Development Workflow
```bash
# Run tests in watch mode during development
npm run test:watch

# Run specific test file
npm run test -- src/test/unit/utils.test.ts

# Run tests with UI
npm run test:ui
```

### CI/CD Pipeline
```bash
# Run all tests (used in CI)
npm run test:all

# Run comprehensive test suite
npx tsx src/test/run-all-tests.ts
```

### Pre-Deployment Checklist
```bash
# 1. Lint code
npm run lint

# 2. Type check
npx tsc --noEmit

# 3. Run unit tests
npm run test

# 4. Run integration tests
npx vitest run src/test/integration

# 5. Run E2E tests
npm run test:e2e

# 6. Build verification
npm run build
```

## Test Configuration

### Vitest Configuration
- **Environment**: jsdom for React component testing
- **Setup**: Automatic mocking of NextAuth, Next.js router, and AI SDK
- **Coverage**: Configured for comprehensive code coverage reporting
- **Aliases**: Path aliases for clean imports

### Playwright Configuration
- **Browsers**: Chrome, Firefox, Safari testing
- **Base URL**: http://localhost:3000
- **Retries**: 2 retries in CI environment
- **Trace**: Enabled for debugging failed tests

## Continuous Integration

### GitHub Actions Workflow
The CI pipeline runs:
1. **Linting**: ESLint code quality checks
2. **Type Checking**: TypeScript compilation verification
3. **Unit Tests**: Component and utility function tests
4. **Integration Tests**: API validation and logic tests
5. **E2E Tests**: Complete user workflow validation
6. **Build Verification**: Production build testing

### Test Artifacts
- Test results and coverage reports
- Playwright test reports and traces
- Build artifacts for deployment verification

## Performance Testing

### Metrics Monitored
- Page load times (< 3 seconds target)
- API response times (< 500ms target)
- AI streaming response latency
- Database query performance

### Load Testing Considerations
- Concurrent user simulation
- AI service rate limiting
- Database connection pooling
- Memory usage optimization

## Security Testing

### Areas Covered
- Authentication and session management
- API authorization checks
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Maintenance

### Regular Tasks
- Update test dependencies
- Review and update test scenarios
- Monitor test execution times
- Maintain test data freshness
- Update mocks for API changes

### Test Quality Metrics
- Code coverage percentage
- Test execution time
- Flaky test identification
- Test maintenance overhead

## Troubleshooting

### Common Issues
1. **Mock Import Errors**: Ensure proper path aliases in vitest.config.ts
2. **Playwright Browser Issues**: Run `npx playwright install`
3. **Database Connection**: Verify test database configuration
4. **AI SDK Mocking**: Check mock implementations match actual API

### Debug Commands
```bash
# Debug specific test
npm run test -- --reporter=verbose src/test/unit/utils.test.ts

# Debug E2E test with UI
npm run test:e2e:ui

# Generate test coverage report
npm run test -- --coverage
```

This comprehensive testing strategy ensures the IdeaLauncher MVP is thoroughly validated before deployment and maintains high quality throughout development.