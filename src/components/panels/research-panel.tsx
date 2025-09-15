'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Lightbulb, RefreshCw } from 'lucide-react';
import { CompetitorList } from './competitor-list';
import { MonetizationSuggestions } from './monetization-suggestions';
import { NameGenerator } from './name-generator';
import { LoadingButton, LoadingState, LoadingSkeleton } from '@/components/ui/loading';
import { ErrorBoundary, MinimalErrorFallback } from '@/components/error-boundary';
import { ideaAPI } from '@/lib/api-client';
import { showSuccessToast, showErrorToast, safeAsync } from '@/lib/error-handling';

interface ResearchPanelProps {
  ideaId: string;
  className?: string;
}

interface CompetitorData {
  id: string;
  name: string;
  description: string;
  url?: string;
  features: string[];
  differentiation?: string;
  isInserted?: boolean;
}

interface MonetizationModel {
  id: string;
  model: string;
  description: string;
  examples: string[];
  pricing?: string;
  pros?: string[];
  cons?: string[];
  isInserted?: boolean;
}

interface NameSuggestion {
  id: string;
  name: string;
  explanation: string;
  style: string;
  isInserted?: boolean;
}

export function ResearchPanel({ ideaId, className }: ResearchPanelProps) {
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [monetization, setMonetization] = useState<MonetizationModel[]>([]);
  const [names, setNames] = useState<NameSuggestion[]>([]);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);
  const [isLoadingMonetization, setIsLoadingMonetization] = useState(false);
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load existing research data on component mount
  useEffect(() => {
    const loadData = async () => {
      console.log('Loading research data for idea:', ideaId);
      
      try {
        // Just fetch existing data, don't generate new research automatically
        const response = await fetch(`/api/ideas/${ideaId}/research`);
        
        if (!response.ok) {
          if (response.status === 404) {
            // No research data exists yet, that's fine
            console.log('No research data found, showing empty state');
            setCompetitors([]);
            setMonetization([]);
            setNames([]);
            setError(null);
            setIsLoadingData(false);
            return;
          }
          throw new Error(`Failed to load research data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Research data loaded:', data);
        
        setCompetitors(data.competitors || []);
        setMonetization(data.monetization || []);
        setNames(data.names || []);
        setError(null);
      } catch (err) {
        console.error('Error loading research data:', err);
        // Don't set error for empty data, just show empty state
        setCompetitors([]);
        setMonetization([]);
        setNames([]);
        setError(null);
      }
      
      setIsLoadingData(false);
    };
    
    loadData();
  }, [ideaId]);



  const generateCompetitorAnalysis = async () => {
    setIsLoadingCompetitors(true);
    
    const data = await safeAsync(
      () => ideaAPI.research(ideaId, 'competitors'),
      {
        showToast: true,
        retries: 2,
      }
    );

    if (data) {
      setCompetitors(data.competitors || []);
      showSuccessToast('Competitor analysis generated successfully');
    }
    
    setIsLoadingCompetitors(false);
  };

  const generateMonetizationAnalysis = async () => {
    setIsLoadingMonetization(true);
    
    const data = await safeAsync(
      () => ideaAPI.research(ideaId, 'monetization'),
      {
        showToast: true,
        retries: 2,
      }
    );

    if (data) {
      setMonetization(data.monetization || []);
      showSuccessToast('Monetization analysis generated successfully');
    }
    
    setIsLoadingMonetization(false);
  };

  const insertToDocument = async (content: string, section: string) => {
    try {
      // Use the global function exposed by DocumentEditor
      if (typeof (window as any).insertIntoDocumentSection === 'function') {
        await (window as any).insertIntoDocumentSection(section, content);
        return Promise.resolve();
      } else {
        throw new Error('Document editor not available');
      }
    } catch (error) {
      console.error('Error inserting content:', error);
      throw error;
    }
  };

  const generateNameSuggestions = async () => {
    setIsLoadingNames(true);
    
    const data = await safeAsync(
      () => ideaAPI.research(ideaId, 'naming'),
      {
        showToast: true,
        retries: 2,
      }
    );

    if (data) {
      setNames(data.names || []);
      showSuccessToast('Name suggestions generated successfully');
    }
    
    setIsLoadingNames(false);
  };

  const markAsInserted = async (id: string, type: 'competitor' | 'monetization' | 'naming') => {
    try {
      // Update the isInserted flag in the database
      const response = await fetch(`/api/ideas/${ideaId}/research/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isInserted: true }),
      });

      if (response.ok) {
        // Update local state
        if (type === 'competitor') {
          setCompetitors(prev => 
            prev.map(c => c.id === id ? { ...c, isInserted: true } : c)
          );
        } else if (type === 'monetization') {
          setMonetization(prev => 
            prev.map(m => m.id === id ? { ...m, isInserted: true } : m)
          );
        } else if (type === 'naming') {
          setNames(prev => 
            prev.map(n => n.id === id ? { ...n, isInserted: true } : n)
          );
        }
      }
    } catch (error) {
      console.error('Error marking as inserted:', error);
    }
  };

  const retryLoadData = () => {
    setError(null);
    setIsLoadingData(true);
    // Trigger useEffect to reload
    window.location.reload();
  };

  return (
    <ErrorBoundary fallback={MinimalErrorFallback}>
      <div className={`flex flex-col h-full ${className}`}>
        {/* Research Header */}
        <div className="border-b p-4">
          <h3 className="font-semibold">Research & Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Discover competitors and monetization opportunities
          </p>
        </div>

        <LoadingState
          isLoading={isLoadingData}
          error={error}
          retryAction={retryLoadData}
          loadingComponent={
            <div className="p-4 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <LoadingSkeleton variant="text" className="w-32" />
                  <LoadingSkeleton variant="button" />
                </div>
                <LoadingSkeleton variant="card" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <LoadingSkeleton variant="text" className="w-40" />
                  <LoadingSkeleton variant="button" />
                </div>
                <LoadingSkeleton variant="card" />
              </div>
            </div>
          }
        >
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Competitor Analysis Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Competitor Analysis</h4>
                  <LoadingButton
                    onClick={generateCompetitorAnalysis}
                    isLoading={isLoadingCompetitors}
                    loadingText="Analyzing..."
                    size="sm"
                    variant="outline"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Generate Analysis
                  </LoadingButton>
                </div>

                <CompetitorList
                  competitors={competitors}
                  onInsertContent={insertToDocument}
                  onMarkInserted={(id) => markAsInserted(id, 'competitor')}
                />
              </div>

              {/* Monetization Analysis Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Monetization Models</h4>
                  <LoadingButton
                    onClick={generateMonetizationAnalysis}
                    isLoading={isLoadingMonetization}
                    loadingText="Analyzing..."
                    size="sm"
                    variant="outline"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Generate Models
                  </LoadingButton>
                </div>

                <MonetizationSuggestions
                  models={monetization}
                  onInsertContent={insertToDocument}
                  onMarkInserted={(id) => markAsInserted(id, 'monetization')}
                />
              </div>

              {/* Name Generation Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Name Suggestions</h4>
                  <LoadingButton
                    onClick={generateNameSuggestions}
                    isLoading={isLoadingNames}
                    loadingText="Generating..."
                    size="sm"
                    variant="outline"
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Generate Names
                  </LoadingButton>
                </div>

                <NameGenerator
                  names={names}
                  onInsertContent={insertToDocument}
                  onMarkInserted={(id) => markAsInserted(id, 'naming')}
                />
              </div>
            </div>
          </ScrollArea>
        </LoadingState>
      </div>
    </ErrorBoundary>
  );
}