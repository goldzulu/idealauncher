'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  FileText, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Wand2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportPanelProps {
  ideaId: string;
  className?: string;
}

interface SpecExport {
  id: string;
  format: string;
  content: string;
  metadata?: {
    generatedAt: string;
    ideaTitle: string;
    version: string;
  };
  createdAt: string;
}

export function ExportPanel({ ideaId, className }: ExportPanelProps) {
  const [specExport, setSpecExport] = useState<SpecExport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const { toast } = useToast();

  // Load existing export
  useEffect(() => {
    const loadExport = async () => {
      try {
        const response = await fetch(`/api/ideas/${ideaId}/export`);
        if (response.ok) {
          const data = await response.json();
          if (data.export) {
            setSpecExport(data.export);
          }
        }
      } catch (error) {
        console.error('Error loading spec export:', error);
      }
    };

    loadExport();
  }, [ideaId]);

  const generateSpec = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'generate',
          format: 'kiro' 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate specification');
      }

      const data = await response.json();
      setSpecExport(data.export);
      
      toast({
        title: 'Success',
        description: 'Kiro specification generated successfully',
      });
    } catch (error) {
      console.error('Error generating specification:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate specification',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!specExport?.content) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(specExport.content);
      toast({
        title: 'Copied!',
        description: 'Specification copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    } finally {
      setIsCopying(false);
    }
  };

  const downloadSpec = () => {
    if (!specExport?.content) return;

    const blob = new Blob([specExport.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${specExport.metadata?.ideaTitle || 'spec'}-kiro-spec.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'Specification downloaded successfully',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Export Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Kiro Spec Export</h3>
          {specExport && (
            <div className="flex gap-2">
              <Button
                onClick={copyToClipboard}
                disabled={isCopying}
                size="sm"
                variant="outline"
              >
                {isCopying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
              <Button
                onClick={downloadSpec}
                size="sm"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Generate a comprehensive, Kiro-ready specification document
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Generate Spec */}
          {!specExport && (
            <div className="text-center py-8">
              <div className="mb-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              </div>
              <h4 className="font-medium mb-2">No specification generated yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Create a comprehensive Kiro-ready specification from your idea, research, and planning
              </p>
              <Button
                onClick={generateSpec}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Kiro Spec'}
              </Button>
            </div>
          )}

          {/* Spec Preview */}
          {specExport && (
            <>
              {/* Spec Metadata */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Specification Ready</span>
                  </div>
                  <Badge variant="secondary">
                    {specExport.format.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Generated:</span>
                    <div className="font-medium">
                      {formatDate(specExport.createdAt)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version:</span>
                    <div className="font-medium">
                      {specExport.metadata?.version || '1.0'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <Button
                    onClick={generateSpec}
                    disabled={isGenerating}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-2" />
                    )}
                    Regenerate Spec
                  </Button>
                </div>
              </div>

              {/* Spec Content Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Specification Preview</h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={copyToClipboard}
                      disabled={isCopying}
                      size="sm"
                      variant="ghost"
                    >
                      {isCopying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={downloadSpec}
                      size="sm"
                      variant="ghost"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <div className="bg-muted/30 px-3 py-2 border-b">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">
                        {specExport.metadata?.ideaTitle || 'Specification'}.md
                      </span>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-96">
                    <div className="p-4">
                      <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                        {specExport.content}
                      </pre>
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Usage Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-blue-900 mb-1">
                      Ready for Kiro
                    </h5>
                    <p className="text-sm text-blue-800 mb-2">
                      This specification is formatted for immediate use in Kiro. 
                      Copy the content or download the file to get started with implementation.
                    </p>
                    <div className="text-xs text-blue-700">
                      <strong>Next steps:</strong> Create a new Kiro spec, paste this content, 
                      and begin implementing the tasks.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}