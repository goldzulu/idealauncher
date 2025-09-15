'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, Plus, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Competitor {
  id: string;
  name: string;
  description: string;
  url?: string;
  features: string[];
  differentiation?: string;
  isInserted?: boolean;
}

interface CompetitorListProps {
  competitors: Competitor[];
  onInsertContent: (content: string, section: string) => Promise<void>;
  onMarkInserted: (id: string) => void;
}

export function CompetitorList({ 
  competitors, 
  onInsertContent, 
  onMarkInserted 
}: CompetitorListProps) {
  const { toast } = useToast();

  const handleInsert = async (competitor: Competitor) => {
    try {
      const content = `## ${competitor.name}

${competitor.description}

**Key Features:**
${competitor.features.map(feature => `- ${feature}`).join('\n')}

${competitor.differentiation ? `**Differentiation:** ${competitor.differentiation}` : ''}

${competitor.url ? `**Website:** ${competitor.url}` : ''}

---
`;

      await onInsertContent(content, 'Research');
      onMarkInserted(competitor.id);
      
      toast({
        title: 'Success',
        description: `${competitor.name} analysis inserted into document`,
      });
    } catch (error) {
      console.error('Error inserting competitor:', error);
      toast({
        title: 'Error',
        description: 'Failed to insert competitor analysis',
        variant: 'destructive',
      });
    }
  };

  if (competitors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No competitor analysis generated yet.</p>
        <p className="text-sm">Click &quot;Generate Analysis&quot; to discover similar tools.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {competitors.map((competitor) => (
        <div key={competitor.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h5 className="font-medium">{competitor.name}</h5>
                {competitor.isInserted && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
              </div>
              {competitor.url && (
                <a
                  href={competitor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2"
                >
                  Visit website <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <Button
              onClick={() => handleInsert(competitor)}
              disabled={competitor.isInserted}
              size="sm"
              variant={competitor.isInserted ? "secondary" : "ghost"}
            >
              {competitor.isInserted ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {competitor.description}
          </p>

          {competitor.features.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Key Features:</p>
              <div className="flex flex-wrap gap-1">
                {competitor.features.map((feature, index) => (
                  <span
                    key={index}
                    className="text-xs bg-muted px-2 py-1 rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {competitor.differentiation && (
            <div>
              <p className="text-sm font-medium mb-1">Differentiation:</p>
              <p className="text-sm text-muted-foreground">
                {competitor.differentiation}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}