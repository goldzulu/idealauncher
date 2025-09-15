'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, Plus, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MVPPanelProps {
  ideaId: string;
  className?: string;
}

interface Feature {
  id: string;
  title: string;
  description?: string;
  priority: 'MUST' | 'SHOULD' | 'COULD';
  estimate: 'S' | 'M' | 'L' | null;
  dependencies: string[];
}

const priorityColors = {
  MUST: 'bg-red-100 text-red-800 border-red-200',
  SHOULD: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COULD: 'bg-green-100 text-green-800 border-green-200',
};

const estimateLabels = {
  S: 'Small (1-3 days)',
  M: 'Medium (1-2 weeks)',
  L: 'Large (2-4 weeks)',
};

export function MVPPanel({ ideaId, className }: MVPPanelProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load existing features
  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const response = await fetch(`/api/ideas/${ideaId}/mvp`);
        if (response.ok) {
          const data = await response.json();
          setFeatures(data.features || []);
        }
      } catch (error) {
        console.error('Error loading features:', error);
      }
    };

    loadFeatures();
  }, [ideaId]);

  const generateMVPFeatures = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/mvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate' }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate MVP features');
      }

      const data = await response.json();
      setFeatures(data.features || []);
      
      toast({
        title: 'Success',
        description: 'MVP features generated successfully',
      });
    } catch (error) {
      console.error('Error generating MVP features:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate MVP features',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateFeatureEstimate = async (featureId: string, estimate: 'S' | 'M' | 'L') => {
    try {
      const updatedFeatures = features.map(f => 
        f.id === featureId ? { ...f, estimate } : f
      );
      setFeatures(updatedFeatures);

      // Save to backend
      await fetch(`/api/ideas/${ideaId}/mvp`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featureId,
          estimate,
        }),
      });
    } catch (error) {
      console.error('Error updating feature estimate:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feature estimate',
        variant: 'destructive',
      });
    }
  };

  const insertMVPToDocument = async () => {
    setIsSaving(true);
    try {
      const mvpContent = generateMVPContent();
      
      // Use the global function exposed by DocumentEditor
      if (typeof (window as any).insertIntoDocumentSection === 'function') {
        await (window as any).insertIntoDocumentSection('mvp', mvpContent);
        toast({
          title: 'Success',
          description: 'MVP plan inserted into document',
        });
      } else {
        throw new Error('Document editor not available');
      }
    } catch (error) {
      console.error('Error inserting MVP content:', error);
      toast({
        title: 'Error',
        description: 'Failed to insert MVP content into document',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateMVPContent = () => {
    const mustFeatures = features.filter(f => f.priority === 'MUST');
    const shouldFeatures = features.filter(f => f.priority === 'SHOULD');
    const couldFeatures = features.filter(f => f.priority === 'COULD');

    let content = '## MVP Feature Plan\n\n';
    
    if (mustFeatures.length > 0) {
      content += '### Must Have (Core Features)\n';
      mustFeatures.forEach(feature => {
        const estimate = feature.estimate ? ` (${estimateLabels[feature.estimate]})` : '';
        content += `- **${feature.title}**${estimate}\n`;
        if (feature.description) {
          content += `  ${feature.description}\n`;
        }
      });
      content += '\n';
    }

    if (shouldFeatures.length > 0) {
      content += '### Should Have (Important)\n';
      shouldFeatures.forEach(feature => {
        const estimate = feature.estimate ? ` (${estimateLabels[feature.estimate]})` : '';
        content += `- **${feature.title}**${estimate}\n`;
        if (feature.description) {
          content += `  ${feature.description}\n`;
        }
      });
      content += '\n';
    }

    if (couldFeatures.length > 0) {
      content += '### Could Have (Nice to Have)\n';
      couldFeatures.forEach(feature => {
        const estimate = feature.estimate ? ` (${estimateLabels[feature.estimate]})` : '';
        content += `- **${feature.title}**${estimate}\n`;
        if (feature.description) {
          content += `  ${feature.description}\n`;
        }
      });
      content += '\n';
    }

    // Add timeline estimate
    const totalEstimate = calculateTimelineEstimate();
    if (totalEstimate) {
      content += `### Estimated Timeline\n`;
      content += `**Time to MVP**: ${totalEstimate}\n\n`;
      content += `*Note: Estimates are rough and may vary based on team size and complexity.*\n`;
    }

    return content;
  };

  const calculateTimelineEstimate = () => {
    const mustFeatures = features.filter(f => f.priority === 'MUST' && f.estimate);
    if (mustFeatures.length === 0) return null;

    let totalDays = 0;
    mustFeatures.forEach(feature => {
      switch (feature.estimate) {
        case 'S': totalDays += 2; break; // Average 2 days
        case 'M': totalDays += 7; break; // Average 1 week
        case 'L': totalDays += 21; break; // Average 3 weeks
      }
    });

    if (totalDays <= 7) return `${totalDays} days`;
    if (totalDays <= 30) return `${Math.ceil(totalDays / 7)} weeks`;
    return `${Math.ceil(totalDays / 30)} months`;
  };

  const groupedFeatures = {
    MUST: features.filter(f => f.priority === 'MUST'),
    SHOULD: features.filter(f => f.priority === 'SHOULD'),
    COULD: features.filter(f => f.priority === 'COULD'),
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* MVP Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">MVP Planning</h3>
          {features.length > 0 && (
            <Button
              onClick={insertMVPToDocument}
              disabled={isSaving}
              size="sm"
              variant="outline"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Insert to Doc
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Define your Minimum Viable Product using MoSCoW prioritization
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Generate Features */}
          {features.length === 0 && (
            <div className="text-center py-8">
              <div className="mb-4">
                <Wand2 className="h-12 w-12 mx-auto text-muted-foreground" />
              </div>
              <h4 className="font-medium mb-2">No MVP features yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Generate AI-powered feature recommendations for your MVP
              </p>
              <Button
                onClick={generateMVPFeatures}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'Generate MVP Features'}
              </Button>
            </div>
          )}

          {/* Feature Lists */}
          {features.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Feature Breakdown</h4>
                <Button
                  onClick={generateMVPFeatures}
                  disabled={isGenerating}
                  size="sm"
                  variant="outline"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
                </Button>
              </div>

              {/* Timeline Summary */}
              {calculateTimelineEstimate() && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Estimated Timeline</span>
                  </div>
                  <p className="text-sm">
                    Time to MVP: <span className="font-medium">{calculateTimelineEstimate()}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on Must Have features only
                  </p>
                </div>
              )}

              {/* Feature Categories */}
              {(['MUST', 'SHOULD', 'COULD'] as const).map(priority => (
                groupedFeatures[priority].length > 0 && (
                  <div key={priority} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[priority]}>
                        {priority} HAVE
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({groupedFeatures[priority].length} features)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {groupedFeatures[priority].map((feature) => (
                        <div key={feature.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h5 className="font-medium">{feature.title}</h5>
                              {feature.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {feature.description}
                                </p>
                              )}
                            </div>
                            <div className="ml-2">
                              <Select
                                value={feature.estimate || ''}
                                onValueChange={(value: 'S' | 'M' | 'L') => 
                                  updateFeatureEstimate(feature.id, value)
                                }
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue placeholder="Size" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="S">S</SelectItem>
                                  <SelectItem value="M">M</SelectItem>
                                  <SelectItem value="L">L</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {feature.estimate && (
                            <div className="text-xs text-muted-foreground">
                              Estimate: {estimateLabels[feature.estimate]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}