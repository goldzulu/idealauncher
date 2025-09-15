import { google } from '@ai-sdk/google'

// Disable AI SDK warnings
if (typeof globalThis !== 'undefined') {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false
}

// Debug Google AI configuration
const apiKey = process.env.GEMINI_API_KEY || ''
const modelName = 'gemini-2.5-flash'

console.log('Google AI Configuration:', {
  hasApiKey: !!apiKey,
  modelName,
  apiKeyLength: apiKey.length
})

if (!apiKey) {
  console.error('GEMINI_API_KEY is missing!')
}

// Create the model using the default google provider
// We need to set the API key since we're using GEMINI_API_KEY instead of GOOGLE_GENERATIVE_AI_API_KEY
process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey
export const model = google(modelName)