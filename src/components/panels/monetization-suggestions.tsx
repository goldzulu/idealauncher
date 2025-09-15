'use client';

import { Button } from '@/components/ui/button';
import { Plus, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface MonetizationSuggestionsProps {
  models: MonetizationModel[];
  onInsertContent: (content: string, section: string) => Promise<void>;
  onMarkInserted: (id: string) => void;
}

export function MonetizationSuggestions({ 
  models, 
  onInsertContent, 
  onMarkInserted 
}: MonetizationSuggestionsProps) {
  const { toast } = useToast();

  const handleInsert = async (model: MonetizationModel) => {
    try {
      const content = `## ${model.model}

${model.description}

${model.pricing ? `**Pricing Structure:** ${model.pricing}` : ''}

${model.examples.length > 0 ? `**Examples:** ${model.examples.join(', ')}` : ''}

${model.pros && model.pros.length > 0 ? `
**Pros:**
${model.pros.map(pro => `- ${pro}`).join('\n')}
` : ''}

${model.cons && model.cons.length > 0 ? `
**Cons:**
${model.cons.map(con => `- ${con}`).join('\n')}
` : ''}

---
`;

      await onInsertContent(content, 'Research');
      onMarkInserted(model.id);
      
      toast({
        title: 'Success',
        description: `${model.model} monetization model inserted into document`,
      });
    } catch (error) {
      console.error('Error inserting monetization model:', error);
      toast({
        title: 'Error',
        description: 'Failed to insert monetization model',
        variant: 'destructive',
      });
    }
  };

  if (models.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No monetization models generated yet.</p>
        <p className="text-sm">Click &quot;Generate Models&quot; to explore revenue opportunities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {models.map((model) => (
        <div key={model.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h5 className="font-medium">{model.model}</h5>
                {model.isInserted && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
            <Button
              onClick={() => handleInsert(model)}
              disabled={model.isInserted}
              size="sm"
              variant={model.isInserted ? "secondary" : "ghost"}
            >
              {model.isInserted ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {model.description}
          </p>

          {model.pricing && (
            <div>
              <p className="text-sm font-medium mb-1">Pricing Structure:</p>
              <p className="text-sm text-muted-foreground">
                {model.pricing}
              </p>
            </div>
          )}

          {model.examples.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Examples:</p>
              <div className="flex flex-wrap gap-1">
                {model.examples.map((example, index) => (
                  <span
                    key={index}
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                  >
                    {example}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {model.pros && model.pros.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-green-700">Pros:</p>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {model.pros.map((pro, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {model.cons && model.cons.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium text-red-700">Cons:</p>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {model.cons.map((con, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-red-600 mt-1">•</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}