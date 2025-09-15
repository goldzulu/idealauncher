import { APIError, ErrorType, withRetry, showErrorToast } from './error-handling'
import { clientCache, cacheKeys, withCache, invalidateCache } from './cache'

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  retries?: number
  timeout?: number
  showErrorToast?: boolean
}

interface StreamingConfig extends Omit<RequestConfig, 'retries'> {
  onChunk?: (chunk: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: Error) => void
}

class APIClient {
  private baseURL: string

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  private async makeRequest<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      retries = 3,
      timeout = 30000,
      showErrorToast: showToast = true,
    } = config

    const url = `${this.baseURL}${endpoint}`
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    }

    const makeRequestWithTimeout = async (): Promise<T> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          ...requestConfig,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`
          let errorType = ErrorType.SERVER
          let errorDetails: any = null

          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
            errorType = errorData.type || errorType
            errorDetails = errorData.details
          } catch {
            // If we can't parse the error response, use the default message
          }

          // Classify error type based on status code
          if (response.status === 401) {
            errorType = ErrorType.AUTHENTICATION
          } else if (response.status === 403) {
            errorType = ErrorType.AUTHORIZATION
          } else if (response.status === 404) {
            errorType = ErrorType.NOT_FOUND
          } else if (response.status >= 400 && response.status < 500) {
            errorType = ErrorType.VALIDATION
          }

          throw new APIError(errorMessage, response.status, errorType, undefined, errorDetails)
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          return {} as T
        }

        return await response.json()
      } catch (error) {
        clearTimeout(timeoutId)
        
        if (error instanceof APIError) {
          throw error
        }

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new APIError('Request timeout', 408, ErrorType.NETWORK)
          }
          
          if (error.message.includes('fetch')) {
            throw new APIError('Network error', 0, ErrorType.NETWORK)
          }
        }

        throw new APIError('Unknown error occurred', 500, ErrorType.UNKNOWN)
      }
    }

    try {
      return await withRetry(makeRequestWithTimeout, retries)
    } catch (error) {
      if (showToast) {
        showErrorToast(error)
      }
      throw error
    }
  }

  // Streaming request for AI responses
  async streamRequest(
    endpoint: string,
    config: StreamingConfig = {}
  ): Promise<void> {
    const {
      method = 'POST',
      headers = {},
      body,
      timeout = 60000,
      onChunk,
      onComplete,
      onError,
    } = config

    const url = `${this.baseURL}${endpoint}`
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Use default message if parsing fails
        }
        
        const error = new APIError(errorMessage, response.status)
        if (onError) {
          onError(error)
        } else {
          showErrorToast(error)
        }
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new APIError('No response body', 500)
      }

      const decoder = new TextDecoder()
      let fullText = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          
          if (onChunk) {
            onChunk(chunk)
          }
        }

        if (onComplete) {
          onComplete(fullText)
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      clearTimeout(timeoutId)
      
      let apiError: APIError
      
      if (error instanceof APIError) {
        apiError = error
      } else if (error instanceof Error) {
        if (error.name === 'AbortError') {
          apiError = new APIError('Request timeout', 408, ErrorType.NETWORK)
        } else {
          apiError = new APIError(error.message, 500, ErrorType.UNKNOWN)
        }
      } else {
        apiError = new APIError('Unknown streaming error', 500, ErrorType.UNKNOWN)
      }

      if (onError) {
        onError(apiError)
      } else {
        showErrorToast(apiError)
      }
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'POST', body })
  }

  async put<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PUT', body })
  }

  async patch<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PATCH', body })
  }

  async delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'DELETE' })
  }
}

// Default API client instance
export const apiClient = new APIClient()

// Typed API methods with caching for specific endpoints
export const ideaAPI = {
  list: async (params?: { sortBy?: string; sortOrder?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy)
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder)
    
    const query = searchParams.toString()
    
    return apiClient.get<any[]>(`/api/ideas${query ? `?${query}` : ''}`)
  },

  create: async (data: { title: string; oneLiner?: string }) => {
    const result = await apiClient.post<any>('/api/ideas', data)
    return result
  },

  get: (id: string) => {
    const cacheKey = cacheKeys.idea(id)
    return withCache(
      cacheKey,
      () => apiClient.get<any>(`/api/ideas/${id}`),
      5 * 60 * 1000 // 5 minutes cache
    )
  },

  update: async (id: string, data: Partial<{ title: string; oneLiner?: string; documentMd?: string }>) => {
    const result = await apiClient.patch<any>(`/api/ideas/${id}`, data)
    // Invalidate related caches
    invalidateCache.idea(id)
    return result
  },

  delete: async (id: string) => {
    const result = await apiClient.delete<void>(`/api/ideas/${id}`)
    // Invalidate caches
    invalidateCache.idea(id)
    return result
  },

  getChatHistory: (id: string) => {
    const cacheKey = cacheKeys.chatHistory(id)
    return withCache(
      cacheKey,
      () => apiClient.get<{ messages: any[] }>(`/api/ideas/${id}/chat`),
      10 * 60 * 1000 // 10 minutes cache for chat history
    )
  },

  chat: (id: string, messages: any[], streamConfig?: {
    onChunk?: (chunk: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: Error) => void;
  }) => {
    // Invalidate chat cache after new message
    clientCache.delete(cacheKeys.chatHistory(id))
    return apiClient.streamRequest(`/api/ideas/${id}/chat`, {
      body: { messages },
      ...streamConfig,
    })
  },

  research: async (id: string, type: 'competitors' | 'monetization' | 'naming') => {
    const result = await apiClient.post<any>(`/api/ideas/${id}/research`, { type })
    // Cache research results
    const cacheKey = cacheKeys.research(id, type)
    clientCache.set(cacheKey, result, 30 * 60 * 1000) // 30 minutes
    return result
  },

  getResearch: (id: string, type: string) => {
    const cacheKey = cacheKeys.research(id, type)
    return withCache(
      cacheKey,
      () => apiClient.get<any>(`/api/ideas/${id}/research?type=${type}`),
      30 * 60 * 1000 // 30 minutes cache
    )
  },

  score: async (id: string, scores: { 
    framework: string;
    impact: number; 
    confidence: number; 
    ease?: number;
    reach?: number;
    effort?: number;
    total: number;
    notes?: string;
  }) => {
    const result = await apiClient.post<any>(`/api/ideas/${id}/score`, scores)
    // Invalidate related caches
    clientCache.delete(cacheKeys.scores(id))
    invalidateCache.idea(id)
    return result
  },

  getScores: (id: string) => {
    const cacheKey = cacheKeys.scores(id)
    return withCache(
      cacheKey,
      () => apiClient.get<any>(`/api/ideas/${id}/score`),
      5 * 60 * 1000 // 5 minutes cache
    )
  },

  mvp: async (id: string) => {
    const result = await apiClient.post<any>(`/api/ideas/${id}/mvp`)
    // Cache MVP features
    const cacheKey = cacheKeys.features(id)
    clientCache.set(cacheKey, result, 15 * 60 * 1000) // 15 minutes
    return result
  },

  getFeatures: (id: string) => {
    const cacheKey = cacheKeys.features(id)
    return withCache(
      cacheKey,
      () => apiClient.get<any>(`/api/ideas/${id}/mvp`),
      15 * 60 * 1000 // 15 minutes cache
    )
  },

  tech: (id: string) =>
    apiClient.post<any>(`/api/ideas/${id}/tech`),

  export: async (id: string, format: string = 'kiro') => {
    const result = await apiClient.post<any>(`/api/ideas/${id}/export`, { format })
    // Cache export
    const cacheKey = cacheKeys.exports(id)
    clientCache.set(cacheKey, result, 5 * 60 * 1000) // 5 minutes
    return result
  },

  getExports: (id: string) => {
    const cacheKey = cacheKeys.exports(id)
    return withCache(
      cacheKey,
      () => apiClient.get<any>(`/api/ideas/${id}/export`),
      5 * 60 * 1000 // 5 minutes cache
    )
  },
}

// Domain checking API with caching
export const domainAPI = {
  check: (names: string[]) => {
    const cacheKey = cacheKeys.domainCheck(names)
    return withCache(
      cacheKey,
      () => apiClient.post<any>('/api/domain-check', { names }),
      60 * 60 * 1000 // 1 hour cache for domain checks
    )
  },
}