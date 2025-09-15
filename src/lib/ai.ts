import { createGoogleGenerativeAI } from '@ai-sdk/google'

// Disable AI SDK warnings
if (typeof globalThis !== 'undefined') {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false
}

// Debug Google AI configuration
const apiKey = process.env.GEMINI_API_KEY || ''
const modelName = 'gemini-2.0-flash-exp'

console.log('Google AI Configuration:', {
  hasApiKey: !!apiKey,
  modelName,
  apiKeyLength: apiKey.length
})

if (!apiKey) {
  console.error('GEMINI_API_KEY is missing!')
}

// Create Google AI provider
const google = createGoogleGenerativeAI({
  apiKey: apiKey,
})

// Create the model
export const model = google(modelName)