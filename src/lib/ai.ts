import { createAzure } from '@ai-sdk/azure'

// Extract resource name from Azure endpoint URL
const getResourceName = (endpoint: string) => {
  if (!endpoint) return ''
  try {
    const url = new URL(endpoint)
    return url.hostname.split('.')[0] || ''
  } catch {
    // Fallback for malformed URLs
    return endpoint.replace('https://', '').replace('.cognitiveservices.azure.com/', '').split('.')[0] || ''
  }
}

export const azure = createAzure({
  resourceName: getResourceName(process.env.AZURE_ENDPOINT || ''),
  apiKey: process.env.AZURE_API_KEY || '',
})

export const model = azure(process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4')