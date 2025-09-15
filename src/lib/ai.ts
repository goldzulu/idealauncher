import { createAzure } from '@ai-sdk/azure'

export const azure = createAzure({
  resourceName: process.env.AZURE_ENDPOINT?.replace('https://', '').replace('.cognitiveservices.azure.com/', '') || '',
  apiKey: process.env.AZURE_API_KEY || '',
})

export const model = azure(process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4')