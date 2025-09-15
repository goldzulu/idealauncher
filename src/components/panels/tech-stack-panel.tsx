'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cpu, ArrowRight, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TechStackPanelProps {
  ideaId: string;
  className?: string;
}

interface TechRecommendation {
  id: string;
  title: string;
  content: string;
  metadata: {
    category: string;
    technology: string;
    rationale: string;
    implementationTips: string[];
    alternatives?: string[];
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  };
  isInserted: boolean;
  createdAt: string;
}

const difficultyColors = {
  Beginner: 'bg-green-100 text-green-800 border-green-200',
  Intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Advanced: 'bg-red-100 text-red-800 border-red-200',
};

export function TechStackPanel({ ideaId, className }: TechStackPanelProps) {
  const [recommendations, setRecommendations] = useState<TechRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [copiedTips, setCopiedTips] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  // Load existing tech stack recommendations on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const response = await fetch(`/api/ideas/${ideaId}/tech`);
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        }
      } catch (error) {
        console.error('Error loading tech stack data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadData();
  }, [ideaId]);

  const generateTechStack = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/tech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate' }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tech stack recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      
      toast({
        title: 'Success',
        description: 'Tech stack recommendations generated successfully',
      });
    } catch (error) {
      console.error('Error generating tech stack:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate tech stack recommendations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const insertToDocument = async (recommendation: TechRecommendation) => {
    try {
      const content = formatTechStackContent(recommendation);
      
      // Use the global function exposed by DocumentEditor
      if (typeof (window as any).insertIntoDocumentSection === 'function') {
        await (window as any).insertIntoDocumentSection('tech', content);
        
        // Mark as inserted
        await markAsInserted(recommendation.id);
        
        toast({
          title: 'Content inserted',
          description: `${recommendation.metadata.technology} added to Tech section`,
        });
      } else {
        throw new Error('Document editor not available');
      }
    } catch (error) {
      console.error('Error inserting content:', error);
      toast({
        title: 'Error',
        description: 'Failed to insert content into document',
        variant: 'destructive',
      });
    }
  };

  const insertAllToDocument = async () => {
    try {
      const allContent = recommendations
        .map(rec => formatTechStackContent(rec))
        .join('\n\n');
      
      if (typeof (window as any).insertIntoDocumentSection === 'function') {
        await (window as any).insertIntoDocumentSection('tech', allContent);
        
        // Mark all as inserted
        await Promise.all(recommendations.map(rec => markAsInserted(rec.id)));
        
        toast({
          title: 'Content inserted',
          description: 'Complete tech stack added to Tech section',
        });
      } else {
        throw new Error('Document editor not available');
      }
    } catch (error) {
      console.error('Error inserting all content:', error);
      toast({
        title: 'Error',
        description: 'Failed to insert content into document',
        variant: 'destructive',
      });
    }
  };

  const formatTechStackContent = (recommendation: TechRecommendation): string => {
    const { metadata } = recommendation;
    
    let content = `## ${metadata.category}: ${metadata.technology}\n\n`;
    content += `${metadata.rationale}\n\n`;
    
    if (metadata.implementationTips.length > 0) {
      content += `**Implementation Tips:**\n`;
      metadata.implementationTips.forEach(tip => {
        content += `- ${tip}\n`;
      });
      content += '\n';
    }
    
    if (metadata.alternatives && metadata.alternatives.length > 0) {
      content += `**Alternatives:** ${metadata.alternatives.join(', ')}\n\n`;
    }
    
    return content;
  };

  const markAsInserted = async (id: string) => {
    try {
      const response = await fetch(`/api/ideas/${ideaId}/research/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isInserted: true }),
      });

      if (response.ok) {
        setRecommendations(prev => 
          prev.map(rec => rec.id === id ? { ...rec, isInserted: true } : rec)
        );
      }
    } catch (error) {
      console.error('Error marking as inserted:', error);
    }
  };

  const copyImplementationTips = async (recommendation: TechRecommendation) => {
    const tips = recommendation.metadata.implementationTips.join('\n• ');
    const content = `${recommendation.metadata.technology} Implementation Tips:\n• ${tips}`;
    
    try {
      await navigator.clipboard.writeText(content);
      setCopiedTips(prev => ({ ...prev, [recommendation.id]: true }));
      
      setTimeout(() => {
        setCopiedTips(prev => ({ ...prev, [recommendation.id]: false }));
      }, 2000);
      
      toast({
        title: 'Copied',
        description: 'Implementation tips copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  if (isLoadingData) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="border-b p-4">
          <h3 className="font-semibold">Tech Stack Recommendations</h3>
          <p className="text-sm text-muted-foreground">
            AI-powered technology recommendations for your project
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Tech Stack Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered technology recommendations for your project
            </p>
          </div>
          <div className="flex gap-2">
            {recommendations.length > 0 && (
              <Button
                onClick={insertAllToDocument}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Insert All
              </Button>
            )}
            <Button
              onClick={generateTechStack}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Cpu className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Generating...' : 'Generate Stack'}
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-8">
              <Cpu className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-medium mb-2">No tech stack recommendations yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Generate AI-powered technology recommendations based on your idea and requirements.
              </p>
              <Button onClick={generateTechStack} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Cpu className="h-4 w-4 mr-2" />
                )}
                Generate Tech Stack
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((recommendation) => (
                <Card key={recommendation.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {recommendation.metadata.technology}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {recommendation.metadata.category}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={difficultyColors[recommendation.metadata.difficulty]}
                        >
                          {recommendation.metadata.difficulty}
                        </Badge>
                        {recommendation.isInserted && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Inserted
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Description */}
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {recommendation.content}
                      </p>
                    </div>

                    {/* Rationale */}
                    <div>
                      <h5 className="font-medium text-sm mb-2">Why this technology?</h5>
                      <p className="text-sm text-muted-foreground">
                        {recommendation.metadata.rationale}
                      </p>
                    </div>

                    {/* Implementation Tips */}
                    {recommendation.metadata.implementationTips.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm">Implementation Tips</h5>
                          <Button
                            onClick={() => copyImplementationTips(recommendation)}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                          >
                            {copiedTips[recommendation.id] ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {recommendation.metadata.implementationTips.map((tip, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-primary mr-2">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Alternatives */}
                    {recommendation.metadata.alternatives && recommendation.metadata.alternatives.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Alternatives</h5>
                        <div className="flex flex-wrap gap-1">
                          {recommendation.metadata.alternatives.map((alt, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {alt}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => insertToDocument(recommendation)}
                        disabled={recommendation.isInserted}
                        size="sm"
                        variant="outline"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        {recommendation.isInserted ? 'Inserted' : 'Insert to Tech Section'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}