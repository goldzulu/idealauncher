import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    exclude: [
      '**/node_modules/**', 
      '**/e2e/**',
      '**/src/test/unit/chat.test.tsx',
      '**/src/test/unit/dashboard.test.tsx',
      '**/src/test/unit/scoring.test.tsx',
      '**/src/test/integration/api.test.ts'
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'ai/react': resolve(__dirname, './src/test/mocks/ai-react.ts'),
    },
  },
})