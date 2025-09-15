'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Copy, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NameSuggestion {
  id: string;
  name: string;
  explanation: string;
  style: string;
  isInserted?: boolean;
  domainStatus?: {
    com: DomainStatus;
    dev: DomainStatus;
  };
}

interface DomainStatus {
  available: boolean;
  status: string;
  summary: string;
}

interface NameGeneratorProps {
  names: NameSuggestion[];
  onInsertContent: (content: string, section: string) => Promise<void>;
  onMarkInserted: (id: string) => Promise<void>;
  className?: string;
}

export function NameGenerator({ 
  names, 
  onInsertContent, 
  onMarkInserted, 
  className 
}: NameGeneratorProps) {
  const [namesWithDomains, setNamesWithDomains] = useState<NameSuggestion[]>(names);
  const [isCheckingDomains, setIsCheckingDomains] = useState(false);
  const { toast } = useToast();

  const checkDomainAvailability = async () => {
    if (names.length === 0) return;

    setIsCheckingDomains(true);
    try {
      // Generate domain names for .com and .dev
      const domains = names.flatMap(name => [
        `${name.name.toLowerCase().replace(/\s+/g, '')}.com`,
        `${name.name.toLowerCase().replace(/\s+/g, '')}.dev`
      ]);

      const response = await fetch('/api/domain-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domains }),
      });

      if (!response.ok) {
        throw new Error('Failed to check domain availability');
      }

      const { results } = await response.json();

      // Map results back to names
      const updatedNames = names.map(name => {
        const cleanName = name.name.toLowerCase().replace(/\s+/g, '');
        const comResult = results.find((r: any) => r.domain === `${cleanName}.com`);
        const devResult = results.find((r: any) => r.domain === `${cleanName}.dev`);

        return {
          ...name,
          domainStatus: {
            com: comResult || { available: false, status: 'unknown', summary: 'Check failed' },
            dev: devResult || { available: false, status: 'unknown', summary: 'Check failed' }
          }
        };
      });

      setNamesWithDomains(updatedNames);
      
      toast({
        title: 'Success',
        description: 'Domain availability checked successfully',
      });
    } catch (error) {
      console.error('Error checking domain availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to check domain availability',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingDomains(false);
    }
  };

  const handleInsertName = async (name: NameSuggestion) => {
    try {
      const domainInfo = name.domainStatus ? 
        `\n\nDomain Availability:\n- ${name.name.toLowerCase().replace(/\s+/g, '')}.com: ${name.domainStatus.com.available ? '✅ Available' : '❌ Taken'}\n- ${name.name.toLowerCase().replace(/\s+/g, '')}.dev: ${name.domainStatus.dev.available ? '✅ Available' : '❌ Taken'}` : 
        '';

      const content = `**${name.name}** (${name.style})\n${name.explanation}${domainInfo}`;
      
      await onInsertContent(content, 'Research');
      await onMarkInserted(name.id);
      
      toast({
        title: 'Success',
        description: `Name "${name.name}" inserted into document`,
      });
    } catch (error) {
      console.error('Error inserting name:', error);
      toast({
        title: 'Error',
        description: 'Failed to insert name into document',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Name copied to clipboard',
    });
  };

  const getDomainStatusIcon = (status: DomainStatus) => {
    if (status.available) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (status.status === 'unknown' || status.status === 'error') {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getDomainStatusColor = (status: DomainStatus) => {
    if (status.available) return 'bg-green-100 text-green-800 border-green-200';
    if (status.status === 'unknown' || status.status === 'error') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  if (namesWithDomains.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <p>No name suggestions generated yet.</p>
        <p className="text-sm mt-1">Generate name suggestions to see brandable options for your idea.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Domain Check Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {namesWithDomains.length} name suggestions
        </p>
        <Button
          onClick={checkDomainAvailability}
          disabled={isCheckingDomains}
          size="sm"
          variant="outline"
        >
          {isCheckingDomains ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-2" />
          )}
          {isCheckingDomains ? 'Checking...' : 'Check Domains'}
        </Button>
      </div>

      {/* Name Suggestions */}
      <div className="space-y-3">
        {namesWithDomains.map((name) => (
          <Card key={name.id} className="relative">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg">{name.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {name.style}
                    </Badge>
                    {name.isInserted && (
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                        Inserted
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {name.explanation}
                  </p>

                  {/* Domain Status */}
                  {name.domainStatus && (
                    <div className="flex gap-2 mb-3">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${getDomainStatusColor(name.domainStatus.com)}`}>
                        {getDomainStatusIcon(name.domainStatus.com)}
                        <span>.com</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${getDomainStatusColor(name.domainStatus.dev)}`}>
                        {getDomainStatusIcon(name.domainStatus.dev)}
                        <span>.dev</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    onClick={() => copyToClipboard(name.name)}
                    size="sm"
                    variant="ghost"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => handleInsertName(name)}
                    disabled={name.isInserted}
                    size="sm"
                  >
                    {name.isInserted ? 'Inserted' : 'Insert'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}