'use client'

import { useEffect, useCallback } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey
      const metaMatches = !!shortcut.metaKey === event.metaKey
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey
      const altMatches = !!shortcut.altKey === event.altKey

      if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }
        shortcut.action()
        break
      }
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

// Common keyboard shortcuts for the application
export const commonShortcuts = {
  // Navigation
  goToDashboard: { key: 'd', ctrlKey: true, description: 'Go to Dashboard' },
  newIdea: { key: 'n', ctrlKey: true, description: 'Create New Idea' },
  
  // Document editing
  save: { key: 's', ctrlKey: true, description: 'Save Document' },
  undo: { key: 'z', ctrlKey: true, description: 'Undo' },
  redo: { key: 'y', ctrlKey: true, description: 'Redo' },
  
  // Chat
  focusChat: { key: '/', description: 'Focus Chat Input' },
  clearChat: { key: 'c', ctrlKey: true, shiftKey: true, description: 'Clear Chat' },
  
  // Panels
  toggleResearch: { key: '1', altKey: true, description: 'Toggle Research Panel' },
  toggleScore: { key: '2', altKey: true, description: 'Toggle Score Panel' },
  toggleMVP: { key: '3', altKey: true, description: 'Toggle MVP Panel' },
  toggleExport: { key: '4', altKey: true, description: 'Toggle Export Panel' },
  
  // Quick actions
  quickSave: { key: 's', ctrlKey: true, shiftKey: true, description: 'Quick Save All' },
  showHelp: { key: '?', description: 'Show Keyboard Shortcuts' },
}

// Hook for showing keyboard shortcuts help
export function useShortcutsHelp() {
  const showHelp = useCallback(() => {
    // This could open a modal or toast with shortcuts
    console.log('Keyboard Shortcuts:', commonShortcuts)
  }, [])

  return { showHelp }
}