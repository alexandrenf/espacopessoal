import React from 'react';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Check, X } from 'lucide-react';
import type { SpellCheckDiff } from '~/types/spellcheck';

interface Props {
  diffs: SpellCheckDiff[];
  onAccept: (diff: SpellCheckDiff) => void;
  onReject: (diff: SpellCheckDiff) => void;
  onAcceptAll: () => void;
}

export function SpellCheckDiffView({ diffs, onAccept, onReject, onAcceptAll }: Props) {
  return (
    <div className="fixed right-4 top-20 w-80 bg-white rounded-lg shadow-lg border p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Spelling Suggestions</h3>
        <Button size="sm" onClick={onAcceptAll}>Accept All</Button>
      </div>
      
      <ScrollArea className="h-[400px]">
        {diffs.map((diff, index) => (
          <div key={index} className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-red-500 line-through mb-1">{diff.original}</p>
            <p className="text-sm text-green-600 mb-2">{diff.suggestion}</p>
            <p className="text-xs text-gray-600 mb-2">{diff.reason}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => onAccept(diff)}
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
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}