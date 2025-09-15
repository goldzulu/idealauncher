// Chat Theme Configuration
// This file defines consistent theming for the AI SDK Elements chat interface

export const chatTheme = {
  // Message bubble styles
  messages: {
    user: {
      background: 'hsl(var(--primary))',
      foreground: 'hsl(var(--primary-foreground))',
      borderRadius: '1rem 1rem 0.25rem 1rem',
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    },
    assistant: {
      background: 'hsl(var(--card))',
      foreground: 'hsl(var(--card-foreground))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '1rem 1rem 1rem 0.25rem',
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    },
    system: {
      background: 'hsl(var(--muted))',
      foreground: 'hsl(var(--muted-foreground))',
      borderRadius: '0.5rem',
      border: '1px solid hsl(var(--border))',
    }
  },

  // Input area styles
  input: {
    background: 'hsl(var(--background))',
    border: '1px solid hsl(var(--input))',
    borderRadius: '0.5rem',
    focusBorder: 'hsl(var(--ring))',
    placeholder: 'hsl(var(--muted-foreground))',
    height: '2.75rem', // 44px
  },

  // Button styles
  buttons: {
    primary: {
      background: 'hsl(var(--primary))',
      foreground: 'hsl(var(--primary-foreground))',
      hover: 'hsl(var(--primary) / 0.9)',
      borderRadius: '0.5rem',
    },
    secondary: {
      background: 'hsl(var(--secondary))',
      foreground: 'hsl(var(--secondary-foreground))',
      hover: 'hsl(var(--secondary) / 0.8)',
      borderRadius: '0.5rem',
    },
    ghost: {
      background: 'transparent',
      foreground: 'hsl(var(--foreground))',
      hover: 'hsl(var(--accent))',
      borderRadius: '0.5rem',
    }
  },

  // Loading states
  loading: {
    spinner: 'hsl(var(--primary))',
    background: 'hsl(var(--muted))',
    text: 'hsl(var(--muted-foreground))',
  },

  // Error states
  error: {
    background: 'hsl(var(--destructive) / 0.1)',
    border: 'hsl(var(--destructive) / 0.2)',
    text: 'hsl(var(--destructive))',
    button: 'hsl(var(--destructive))',
  },

  // Success states
  success: {
    background: 'hsl(142 76% 36% / 0.1)',
    border: 'hsl(142 76% 36% / 0.2)',
    text: 'hsl(142 76% 36%)',
  },

  // Layout
  layout: {
    header: {
      background: 'hsl(var(--card) / 0.5)',
      border: '1px solid hsl(var(--border))',
      backdropBlur: 'blur(8px)',
    },
    messagesArea: {
      background: 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--muted) / 0.2))',
    },
    inputArea: {
      background: 'hsl(var(--card) / 0.5)',
      border: '1px solid hsl(var(--border))',
      backdropBlur: 'blur(8px)',
    }
  },

  // Animations
  animations: {
    messageSlideIn: 'slide-in-from-bottom-2',
    fadeIn: 'fade-in',
    scaleIn: 'scale-in-95',
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    }
  },

  // Spacing
  spacing: {
    messagePadding: '1rem',
    messageGap: '1.5rem',
    headerPadding: '1rem',
    inputPadding: '1rem',
  },

  // Typography
  typography: {
    messageText: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.5',
      fontWeight: '400',
    },
    timestamp: {
      fontSize: '0.75rem', // 12px
      lineHeight: '1',
      fontWeight: '400',
      opacity: '0.7',
    },
    headerTitle: {
      fontSize: '1rem', // 16px
      lineHeight: '1.5',
      fontWeight: '600',
    },
    headerSubtitle: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.25',
      fontWeight: '400',
    }
  },

  // Responsive breakpoints
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
  }
} as const

// Helper function to get theme values
export function getThemeValue(path: string): string {
  const keys = path.split('.')
  let value: any = chatTheme
  
  for (const key of keys) {
    value = value?.[key]
  }
  
  return value || ''
}

// CSS custom properties for the chat theme
export const chatThemeCSS = `
  :root {
    --chat-message-user-bg: ${chatTheme.messages.user.background};
    --chat-message-user-fg: ${chatTheme.messages.user.foreground};
    --chat-message-assistant-bg: ${chatTheme.messages.assistant.background};
    --chat-message-assistant-fg: ${chatTheme.messages.assistant.foreground};
    --chat-input-bg: ${chatTheme.input.background};
    --chat-input-border: ${chatTheme.input.border};
    --chat-input-focus-border: ${chatTheme.input.focusBorder};
    --chat-loading-spinner: ${chatTheme.loading.spinner};
    --chat-error-bg: ${chatTheme.error.background};
    --chat-error-border: ${chatTheme.error.border};
    --chat-error-text: ${chatTheme.error.text};
    --chat-success-bg: ${chatTheme.success.background};
    --chat-success-border: ${chatTheme.success.border};
    --chat-success-text: ${chatTheme.success.text};
  }
`