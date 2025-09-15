'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Keyboard, Command } from 'lucide-react'
import { commonShortcuts } from '@/hooks/use-keyboard-shortcuts'

interface ShortcutGroup {
  title: string
  shortcuts: Array<{
    key: string
    ctrlKey?: boolean
    metaKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
    description: string
  }>
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      commonShortcuts.goToDashboard,
      commonShortcuts.newIdea,
    ]
  },
  {
    title: 'Document Editing',
    shortcuts: [
      commonShortcuts.save,
      commonShortcuts.undo,
      commonShortcuts.redo,
    ]
  },
  {
    title: 'Chat & Communication',
    shortcuts: [
      commonShortcuts.focusChat,
      commonShortcuts.clearChat,
    ]
  },
  {
    title: 'Panel Navigation',
    shortcuts: [
      commonShortcuts.toggleResearch,
      commonShortcuts.toggleScore,
      commonShortcuts.toggleMVP,
      commonShortcuts.toggleExport,
    ]
  },
  {
    title: 'Quick Actions',
    shortcuts: [
      commonShortcuts.quickSave,
      commonShortcuts.showHelp,
    ]
  }
]

function formatShortcut(shortcut: any) {
  const keys = []
  
  if (shortcut.ctrlKey) keys.push('Ctrl')
  if (shortcut.metaKey) keys.push('Cmd')
  if (shortcut.shiftKey) keys.push('Shift')
  if (shortcut.altKey) keys.push('Alt')
  
  keys.push(shortcut.key.toUpperCase())
  
  return keys
}

function ShortcutBadge({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          <Badge variant="outline" className="font-mono text-xs px-2 py-1">
            {key}
          </Badge>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-xs">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

interface KeyboardShortcutsHelpProps {
  trigger?: React.ReactNode
}

export function KeyboardShortcutsHelp({ trigger }: KeyboardShortcutsHelpProps) {
  const [open, setOpen] = useState(false)

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-2">
      <Keyboard className="h-4 w-4" />
      Shortcuts
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Command className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {shortcutGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <ShortcutBadge keys={formatShortcut(shortcut)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="border-t pt-4 mt-6">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Shortcuts work when not typing in input fields</p>
                <p>• Use <Badge variant="outline" className="text-xs">?</Badge> to open this help anytime</p>
                <p>• Some shortcuts may vary based on your operating system</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// Hook to show shortcuts help with ? key
export function useShortcutsHelpModal() {
  const [open, setOpen] = useState(false)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't trigger if typing in an input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }
        
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    open,
    setOpen,
    ShortcutsModal: () => (
      <KeyboardShortcutsHelp 
        trigger={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <div style={{ display: 'none' }} />
            </DialogTrigger>
          </Dialog>
        }
      />
    )
  }
}