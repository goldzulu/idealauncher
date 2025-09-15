'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { History, Clock, User, Bot, Save } from 'lucide-react';

interface DocumentVersion {
  id: string;
  changeType: 'manual' | 'ai_insert' | 'auto_save';
  summary?: string;
  createdAt: string;
}

interface VersionHistoryProps {
  ideaId: string;
}

const changeTypeIcons = {
  manual: User,
  ai_insert: Bot,
  auto_save: Save,
};

const changeTypeLabels = {
  manual: 'Manual Edit',
  ai_insert: 'AI Content',
  auto_save: 'Auto Save',
};

export function VersionHistory({ ideaId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [ideaId]);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, ideaId, fetchVersions]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="w-4 h-4 mr-1" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Document History</SheetTitle>
          <SheetDescription>
            Track changes and versions of your document
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No version history yet</p>
              <p className="text-sm">Changes will appear here as you edit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => {
                const Icon = changeTypeIcons[version.changeType];
                const isLatest = index === 0;
                
                return (
                  <div
                    key={version.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      isLatest ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                    }`}
                  >
                    <div className={`p-1.5 rounded ${
                      version.changeType === 'manual' ? 'bg-blue-100 text-blue-600' :
                      version.changeType === 'ai_insert' ? 'bg-purple-100 text-purple-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {changeTypeLabels[version.changeType]}
                        </span>
                        {isLatest && (
                          <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      
                      {version.summary && (
                        <p className="text-sm text-muted-foreground mb-1">
                          {version.summary}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}