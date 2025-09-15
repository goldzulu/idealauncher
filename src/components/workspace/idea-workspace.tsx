'use client';

import { useState, useEffect } from 'react';
import { DocumentEditorWrapper } from '@/components/editor';
import { ChatbotPanel } from '@/components/chat/chatbot-panel';
import { ResearchPanel, ScorePanel, MVPPanel, ExportPanel, TechStackPanel } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ContentInsertionIndicator } from '@/components/editor/content-insertion-indicator';
import { DOCUMENT_SECTIONS } from '@/lib/document-utils';
import { useKeyboardShortcuts, commonShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useOptimisticIdeas } from '@/hooks/use-optimistic-updates';
import { ideaAPI } from '@/lib/api-client';
import { PerformanceTimer } from '@/lib/performance';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';

interface Idea {
  id: string;
  title: string;
  oneLiner?: string;
  documentMd: string;
  iceScore?: number;
  riceScore?: number;
  phase: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

type PanelType = 'document' | 'research' | 'score' | 'mvp' | 'tech' | 'export';

interface IdeaWorkspaceProps {
  ideaId: string;
}

export function IdeaWorkspace({ ideaId }: IdeaWorkspaceProps) {
  const [idea, setIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelType>(() => {
    // Restore last active panel from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`idea-${ideaId}-active-panel`);
      if (saved && ['document', 'research', 'score', 'mvp', 'tech', 'export'].includes(saved)) {
        return saved as PanelType;
      }
    }
    return 'document';
  });
  const [panelStatus, setPanelStatus] = useState({
    document: false,
    research: false,
    score: false,
    mvp: false,
    tech: false,
    export: false,
  });
  const [insertionState, setInsertionState] = useState({
    isInserting: false,
    justInserted: false,
    sectionTitle: '',
  });
  const { toast } = useToast();

  // Fetch idea data with performance monitoring and caching
  useEffect(() => {
    async function fetchIdea() {
      const timer = new PerformanceTimer('Idea Load');
      
      try {
        setIsLoading(true);
        timer.mark('fetch-start');
        
        const ideaData = await ideaAPI.get(ideaId);
        timer.mark('fetch-complete');
        
        setIdea(ideaData);
        
        // Update panel status based on existing data
        setPanelStatus({
          document: ideaData.documentMd && ideaData.documentMd.length > 100,
          research: false, // Will be updated when research data is loaded
          score: ideaData.iceScore !== null || ideaData.riceScore !== null,
          mvp: false, // Will be updated when MVP data is loaded
          tech: false, // Will be updated when tech data is loaded
          export: false, // Will be updated when export data is loaded
        });
        
        timer.mark('render-complete');
        if (process.env.NODE_ENV === 'development') {
          timer.log();
        }
      } catch (err) {
        timer.mark('error');
        const errorMessage = err instanceof Error ? err.message : 'Failed to load idea';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchIdea();
  }, [ideaId, toast]);

  const handleDocumentUpdate = (content: string) => {
    if (idea) {
      setIdea({
        ...idea,
        documentMd: content,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleScoreUpdate = (score: number, framework: 'ICE' | 'RICE') => {
    if (idea) {
      const updatedIdea = {
        ...idea,
        updatedAt: new Date().toISOString(),
      };
      
      if (framework === 'ICE') {
        updatedIdea.iceScore = score;
      } else {
        updatedIdea.riceScore = score;
      }
      
      setIdea(updatedIdea);
      
      // Update panel status to show score is available
      setPanelStatus(prev => ({
        ...prev,
        score: true,
      }));
    }
  };

  const handlePhaseUpdate = (phase: string) => {
    if (idea) {
      setIdea({
        ...idea,
        phase,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleMessageInsert = async (messageId: string, sectionId: string, content: string) => {
    const section = DOCUMENT_SECTIONS.find(s => s.id === sectionId);
    
    setInsertionState({
      isInserting: true,
      justInserted: false,
      sectionTitle: section?.title || sectionId,
    });

    try {
      // The actual insertion is handled by the global function in DocumentEditor
      // This is just for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate insertion delay
      
      setInsertionState({
        isInserting: false,
        justInserted: true,
        sectionTitle: section?.title || sectionId,
      });

      // Switch to document panel to show the insertion
      setActivePanel('document');
      
    } catch (error) {
      setInsertionState({
        isInserting: false,
        justInserted: false,
        sectionTitle: '',
      });
      
      toast({
        title: 'Insertion failed',
        description: 'Failed to insert content into document',
        variant: 'destructive',
      });
    }
  };

  // Save active panel to localStorage
  useEffect(() => {
    localStorage.setItem(`idea-${ideaId}-active-panel`, activePanel);
  }, [activePanel, ideaId]);

  // Enhanced keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        ...commonShortcuts.toggleResearch,
        action: () => setActivePanel('research')
      },
      {
        ...commonShortcuts.toggleScore,
        action: () => setActivePanel('score')
      },
      {
        ...commonShortcuts.toggleMVP,
        action: () => setActivePanel('mvp')
      },
      {
        ...commonShortcuts.toggleExport,
        action: () => setActivePanel('export')
      },
      {
        key: '1',
        ctrlKey: true,
        description: 'Switch to Document',
        action: () => setActivePanel('document')
      },
      {
        key: '5',
        altKey: true,
        description: 'Switch to Tech Stack',
        action: () => setActivePanel('tech')
      }
    ]
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading idea...</p>
        </div>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">
            {error || 'Idea not found'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.history.back()}
              className="p-1 rounded hover:bg-muted"
              title="Back to dashboard"
            >
              ←
            </button>
            <div>
              <h1 className="font-semibold">{idea.title}</h1>
              {idea.oneLiner && (
                <p className="text-sm text-muted-foreground">{idea.oneLiner}</p>
              )}
            </div>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <KeyboardShortcutsHelp />
            <div className="text-sm text-muted-foreground">
              Phase: <span className="capitalize">{idea.phase}</span>
            </div>
            {idea.iceScore && (
              <div className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                ICE: {idea.iceScore.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Two Pane Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane - Chat Panel */}
        <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r h-1/2 lg:h-full">
          <ChatbotPanel 
            ideaId={ideaId} 
            className="h-full" 
            onMessageInsert={handleMessageInsert}
          />
        </div>

        {/* Right Pane - Tabbed Panels */}
        <div className="w-full lg:w-1/2 flex flex-col h-1/2 lg:h-full">
          {/* Tab Navigation */}
          <div className="border-b bg-muted/50">
            <div className="flex overflow-x-auto">
              {[
                { id: 'document', label: 'Document', icon: '📝', shortcut: '⌘1' },
                { id: 'research', label: 'Research', icon: '🔍', shortcut: '⌘2' },
                { id: 'score', label: 'Score', icon: '📊', shortcut: '⌘3' },
                { id: 'mvp', label: 'MVP', icon: '🚀', shortcut: '⌘4' },
                { id: 'tech', label: 'Tech', icon: '⚙️', shortcut: '⌘5' },
                { id: 'export', label: 'Export', icon: '📤', shortcut: '⌘6' },
              ].map((tab) => {
                const hasData = panelStatus[tab.id as keyof typeof panelStatus];
                return (
                  <Button
                    key={tab.id}
                    variant={activePanel === tab.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActivePanel(tab.id as PanelType)}
                    className="rounded-none border-r last:border-r-0 flex-shrink-0 relative group"
                    title={`${tab.label} (${tab.shortcut})`}
                  >
                    <span className="mr-2 relative">
                      {tab.icon}
                      {hasData && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.icon}</span>
                    {activePanel === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            {activePanel === 'document' && (
              <DocumentEditorWrapper
                ideaId={ideaId}
                initialContent={idea.documentMd}
                onContentUpdate={handleDocumentUpdate}
              />
            )}
            {activePanel === 'research' && (
              <ResearchPanel ideaId={ideaId} className="h-full" />
            )}
            {activePanel === 'score' && (
              <ScorePanel 
                ideaId={ideaId} 
                className="h-full" 
                onScoreUpdate={handleScoreUpdate}
              />
            )}
            {activePanel === 'mvp' && (
              <MVPPanel ideaId={ideaId} className="h-full" />
            )}
            {activePanel === 'tech' && (
              <TechStackPanel ideaId={ideaId} className="h-full" />
            )}
            {activePanel === 'export' && (
              <ExportPanel ideaId={ideaId} className="h-full" />
            )}
          </div>
        </div>
      </div>

      {/* Content Insertion Indicator */}
      <ContentInsertionIndicator
        isVisible={insertionState.isInserting}
        isInserting={insertionState.isInserting}
        justInserted={insertionState.justInserted}
        sectionTitle={insertionState.sectionTitle}
      />
    </div>
  );
}