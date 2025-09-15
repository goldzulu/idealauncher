'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { markDashboardForRefresh } from '@/hooks/use-dashboard-refresh';
import { useOptimisticScore } from '@/hooks/use-optimistic-updates';
import { ideaAPI } from '@/lib/api-client';
import { useKeyboardShortcuts, commonShortcuts } from '@/hooks/use-keyboard-shortcuts';

interface ScorePanelProps {
  ideaId: string;
  className?: string;
  onScoreUpdate?: (score: number, framework: 'ICE' | 'RICE') => void;
}

interface ScoreData {
  id?: string;
  framework: 'ICE' | 'RICE';
  impact: number;
  confidence: number;
  ease?: number;
  reach?: number;
  effort?: number;
  total: number;
  notes?: string;
}

export function ScorePanel({ ideaId, className, onScoreUpdate }: ScorePanelProps) {
  const [framework, setFramework] = useState<'ICE' | 'RICE'>('ICE');
  const [impact, setImpact] = useState([5]);
  const [confidence, setConfidence] = useState([5]);
  const [ease, setEase] = useState([5]);
  const [reach, setReach] = useState([5]);
  const [effort, setEffort] = useState([5]);
  const [notes, setNotes] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  
  // Use optimistic updates for scoring
  const {
    isOptimistic: isSaving,
    commitUpdate: commitScoreUpdate
  } = useOptimisticScore(ideaId);

  // Calculate composite score
  const calculateScore = () => {
    if (framework === 'ICE') {
      return (impact[0] * confidence[0] * ease[0]) / 100;
    } else {
      // RICE: (Reach * Impact * Confidence) / Effort
      return (reach[0] * impact[0] * confidence[0]) / effort[0];
    }
  };

  const compositeScore = calculateScore();

  // Load existing scores with caching
  useEffect(() => {
    const loadScores = async () => {
      try {
        const data = await ideaAPI.getScores(ideaId);
        if (data.scores && data.scores.length > 0) {
          const latestScore = data.scores[0]; // Assuming sorted by date
          setFramework(latestScore.framework);
          setImpact([latestScore.impact]);
          setConfidence([latestScore.confidence]);
          if (latestScore.ease !== null) setEase([latestScore.ease]);
          if (latestScore.reach !== null) setReach([latestScore.reach]);
          if (latestScore.effort !== null) setEffort([latestScore.effort]);
          setNotes(latestScore.notes || '');
          setLastSaved(new Date(latestScore.createdAt));
        }
      } catch (error) {
        console.error('Error loading scores:', error);
      }
    };

    loadScores();
  }, [ideaId]);

  const saveScore = async () => {
    const scoreData: Omit<ScoreData, 'id'> = {
      framework,
      impact: impact[0],
      confidence: confidence[0],
      ease: framework === 'ICE' ? ease[0] : undefined,
      reach: framework === 'RICE' ? reach[0] : undefined,
      effort: framework === 'RICE' ? effort[0] : undefined,
      total: compositeScore,
      notes: notes.trim() || undefined,
    };

    const result = await commitScoreUpdate(
      () => ideaAPI.score(ideaId, scoreData),
      () => scoreData
    );

    if (result !== null) {
      setLastSaved(new Date());
      
      // Mark dashboard for refresh when user returns
      markDashboardForRefresh();
      
      // Notify parent component of score update
      if (onScoreUpdate) {
        onScoreUpdate(compositeScore, framework);
      }
      
      toast({
        title: 'Success',
        description: 'Score saved successfully. Dashboard will refresh when you return.',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to save score',
        variant: 'destructive',
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (framework === 'ICE') {
      if (score >= 7) return 'text-green-600';
      if (score >= 4) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (score >= 50) return 'text-green-600';
      if (score >= 20) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  // Keyboard shortcuts for scoring
  useKeyboardShortcuts({
    shortcuts: [
      {
        ...commonShortcuts.quickSave,
        action: saveScore
      }
    ]
  });

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Score Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Idea Scoring</h3>
          <div className={`text-2xl font-bold ${getScoreColor(compositeScore)}`}>
            {compositeScore.toFixed(1)}
            {isSaving && (
              <span className="ml-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin inline" />
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Score your idea using proven frameworks
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Framework Selection */}
          <div className="space-y-2">
            <Label>Scoring Framework</Label>
            <div className="flex gap-2">
              <Button
                variant={framework === 'ICE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFramework('ICE')}
              >
                ICE Framework
              </Button>
              <Button
                variant={framework === 'RICE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFramework('RICE')}
              >
                RICE Framework
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {framework === 'ICE' 
                ? 'Impact × Confidence × Ease (0-10 scale)'
                : 'Reach × Impact × Confidence ÷ Effort (0-10 scale)'
              }
            </p>
          </div>

          {/* Scoring Sliders */}
          <div className="space-y-6">
            {/* Impact */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Impact</Label>
                <span className="text-sm font-medium">{impact[0]}/10</span>
              </div>
              <Slider
                value={impact}
                onValueChange={setImpact}
                max={10}
                min={0}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                How much will this idea impact your target users?
              </p>
            </div>

            {/* Confidence */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Confidence</Label>
                <span className="text-sm font-medium">{confidence[0]}/10</span>
              </div>
              <Slider
                value={confidence}
                onValueChange={setConfidence}
                max={10}
                min={0}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                How confident are you in your estimates?
              </p>
            </div>

            {/* Framework-specific sliders */}
            {framework === 'ICE' ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Ease</Label>
                  <span className="text-sm font-medium">{ease[0]}/10</span>
                </div>
                <Slider
                  value={ease}
                  onValueChange={setEase}
                  max={10}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How easy will this be to implement?
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Reach</Label>
                    <span className="text-sm font-medium">{reach[0]}/10</span>
                  </div>
                  <Slider
                    value={reach}
                    onValueChange={setReach}
                    max={10}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many users will this reach?
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Effort</Label>
                    <span className="text-sm font-medium">{effort[0]}/10</span>
                  </div>
                  <Slider
                    value={effort}
                    onValueChange={setEffort}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How much effort will this require? (Higher = more effort)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Score Breakdown */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Score Breakdown</h4>
            <div className="space-y-1 text-sm">
              {framework === 'ICE' ? (
                <>
                  <div className="flex justify-between">
                    <span>Impact:</span>
                    <span>{impact[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span>{confidence[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ease:</span>
                    <span>{ease[0]}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-medium">
                    <span>Total (I×C×E÷100):</span>
                    <span className={getScoreColor(compositeScore)}>
                      {compositeScore.toFixed(1)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Reach:</span>
                    <span>{reach[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impact:</span>
                    <span>{impact[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span>{confidence[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Effort:</span>
                    <span>{effort[0]}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-medium">
                    <span>Total (R×I×C÷E):</span>
                    <span className={getScoreColor(compositeScore)}>
                      {compositeScore.toFixed(1)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Rationale & Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain your scoring rationale..."
              rows={4}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={saveScore}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Score'}
          </Button>

          {lastSaved && (
            <p className="text-xs text-muted-foreground text-center">
              Last saved: {lastSaved.toLocaleString()}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}