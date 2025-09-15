import { vi } from 'vitest'

export const useChat = vi.fn(() => ({
  messages: [],
  input: '',
  handleInputChange: vi.fn(),
  handleSubmit: vi.fn(),
  isLoading: false,
  error: null,
  append: vi.fn(),
  reload: vi.fn(),
  stop: vi.fn(),
  setMessages: vi.fn(),
  setInput: vi.fn(),
}))

export const useCompletion = vi.fn(() => ({
  completion: '',
  input: '',
  handleInputChange: vi.fn(),
  handleSubmit: vi.fn(),
  isLoading: false,
  error: null,
  complete: vi.fn(),
  stop: vi.fn(),
  setCompletion: vi.fn(),
  setInput: vi.fn(),
}))

const aiReactMocks = {
  useChat,
  useCompletion,
}

export default aiReactMocks