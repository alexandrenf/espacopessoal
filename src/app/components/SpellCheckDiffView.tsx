import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Check, X } from 'lucide-react';
import type { SpellCheckDiff } from '~/types/spellcheck';
import { cn } from '~/lib/utils';
import { useCallback } from 'react';

interface Props {
  diffs: SpellCheckDiff[];
  onAccept: (diff: SpellCheckDiff) => void;
  onReject: (diff: SpellCheckDiff) => void;
  onAcceptAll: () => void;
  activeId?: string;
  onHover: (id: string | null) => void;
}

export function SpellCheckDiffView({ 
  diffs, 
  onAccept, 
  onReject, 
  onAcceptAll,
  activeId,
  onHover
}: Props) {
  // Add error boundary
  const handleAcceptClick = useCallback((diff: SpellCheckDiff) => {
    try {
      onAccept(diff);
    } catch (error) {
      console.error('Error accepting diff:', error);
    }
  }, [onAccept]);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.3 }}
      className="w-80 h-full bg-white rounded-lg shadow-lg border p-4 z-50 flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Spelling Suggestions</h3>
        <Button size="sm" onClick={onAcceptAll}>Accept All</Button>
      </div>

      <ScrollArea className="flex-1">
        {diffs.map((diff) => (
          <motion.div 
            key={diff.id}
            className={cn(
              "mb-4 p-3 rounded-md transition-all duration-200",
              activeId === diff.id ? "bg-blue-50 shadow-md scale-[1.02]" : "bg-gray-50 hover:bg-gray-100"
            )}
            onMouseEnter={() => onHover(diff.id)}
            onMouseLeave={() => onHover(null)}
          >
            <p className="text-sm text-red-500 line-through mb-1">{diff.original}</p>
            <p className="text-sm text-green-600 mb-2">{diff.suggestion}</p>
            <p className="text-xs text-gray-600 mb-2">{diff.reason}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => handleAcceptClick(diff)}
              >
                <Check className="h-4 w-4 mr-1" /> Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => onReject(diff)}
              >
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          </motion.div>
        ))}
      </ScrollArea>
    </motion.div>
  );
}
