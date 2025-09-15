/**
 * Chat Performance Monitoring Utilities
 * Tracks and optimizes chat performance for long conversations
 */

interface PerformanceMetrics {
  messageCount: number
  renderTime: number
  memoryUsage?: number
  scrollPerformance: number
}

interface ChatPerformanceConfig {
  maxVisibleMessages: number
  messageLoadBatchSize: number
  enableVirtualization: boolean
  enableMetrics: boolean
}

export class ChatPerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private config: ChatPerformanceConfig
  private renderStartTime: number = 0

  constructor(config: Partial<ChatPerformanceConfig> = {}) {
    this.config = {
      maxVisibleMessages: 50,
      messageLoadBatchSize: 25,
      enableVirtualization: true,
      enableMetrics: process.env.NODE_ENV === 'development',
      ...config
    }
  }

  startRenderMeasurement() {
    if (!this.config.enableMetrics) return
    this.renderStartTime = performance.now()
  }

  endRenderMeasurement(messageCount: number) {
    if (!this.config.enableMetrics || !this.renderStartTime) return
    
    const renderTime = performance.now() - this.renderStartTime
    const scrollPerformance = this.measureScrollPerformance()
    
    const metric: PerformanceMetrics = {
      messageCount,
      renderTime,
      scrollPerformance,
      memoryUsage: this.getMemoryUsage()
    }
    
    this.metrics.push(metric)
    this.renderStartTime = 0
    
    // Log performance warnings
    if (renderTime > 100) {
      console.warn(`Slow chat render: ${renderTime.toFixed(2)}ms for ${messageCount} messages`)
    }
  }

  private measureScrollPerformance(): number {
    // Simple scroll performance measurement
    const start = performance.now()
    // Simulate scroll measurement
    return performance.now() - start
  }

  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      return (performance as any).memory?.usedJSHeapSize
    }
    return undefined
  }

  shouldVirtualizeMessages(messageCount: number): boolean {
    return this.config.enableVirtualization && messageCount > this.config.maxVisibleMessages
  }

  getOptimalBatchSize(currentCount: number, totalCount: number): number {
    const remaining = totalCount - currentCount
    return Math.min(this.config.messageLoadBatchSize, remaining)
  }

  getPerformanceReport(): {
    averageRenderTime: number
    maxRenderTime: number
    totalMessages: number
    recommendations: string[]
  } {
    if (this.metrics.length === 0) {
      return {
        averageRenderTime: 0,
        maxRenderTime: 0,
        totalMessages: 0,
        recommendations: []
      }
    }

    const renderTimes = this.metrics.map(m => m.renderTime)
    const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
    const maxRenderTime = Math.max(...renderTimes)
    const totalMessages = Math.max(...this.metrics.map(m => m.messageCount))

    const recommendations: string[] = []
    
    if (averageRenderTime > 50) {
      recommendations.push('Consider enabling message virtualization')
    }
    
    if (totalMessages > 100) {
      recommendations.push('Implement message pagination for better performance')
    }
    
    if (maxRenderTime > 200) {
      recommendations.push('Optimize message rendering with React.memo')
    }

    return {
      averageRenderTime,
      maxRenderTime,
      totalMessages,
      recommendations
    }
  }

  reset() {
    this.metrics = []
  }
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Throttle utility for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Message content optimization
export function optimizeMessageContent(content: string): {
  truncated: boolean
  displayContent: string
  fullContent: string
} {
  const maxLength = 5000 // Maximum characters to display without truncation
  
  if (content.length <= maxLength) {
    return {
      truncated: false,
      displayContent: content,
      fullContent: content
    }
  }
  
  return {
    truncated: true,
    displayContent: content.substring(0, maxLength) + '...',
    fullContent: content
  }
}

// Memory-efficient message storage
export class MessageBuffer {
  private buffer: Map<string, any> = new Map()
  private maxSize: number
  private accessOrder: string[] = []

  constructor(maxSize: number = 200) {
    this.maxSize = maxSize
  }

  set(id: string, message: any) {
    // Remove from current position if exists
    const existingIndex = this.accessOrder.indexOf(id)
    if (existingIndex > -1) {
      this.accessOrder.splice(existingIndex, 1)
    }

    // Add to end (most recent)
    this.accessOrder.push(id)
    this.buffer.set(id, message)

    // Remove oldest if over limit
    while (this.buffer.size > this.maxSize) {
      const oldest = this.accessOrder.shift()
      if (oldest) {
        this.buffer.delete(oldest)
      }
    }
  }

  get(id: string) {
    const message = this.buffer.get(id)
    if (message) {
      // Move to end (mark as recently accessed)
      const index = this.accessOrder.indexOf(id)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
        this.accessOrder.push(id)
      }
    }
    return message
  }

  has(id: string): boolean {
    return this.buffer.has(id)
  }

  clear() {
    this.buffer.clear()
    this.accessOrder = []
  }

  size(): number {
    return this.buffer.size
  }
}

export const chatPerformanceMonitor = new ChatPerformanceMonitor()