"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Editor } from '@tiptap/react';
import { 
  Check, 
  X, 
  Sparkles, 
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';

export interface SpellCheckDiff {
  id: string;
  original: string;
  suggestion: string;
  start: number;
  end: number;
  reason: string;
}

interface SpellCheckSidebarProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Renders a sidebar UI for spell-checking text within a TipTap editor, allowing users to review, accept, or reject spelling suggestions.
 *
 * The sidebar fetches spelling suggestions from an external API, displays detected issues, and provides controls to apply or dismiss corrections individually or all at once. It manages synchronization between the editor content and the list of suggestions, recalculating positions as changes are made. The sidebar is animated and closes automatically when all suggestions are resolved.
 *
 * @returns The spell-check sidebar React element, or `null` if not open.
 */
export function SpellCheckSidebar({ editor, isOpen, onClose }: SpellCheckSidebarProps) {
  const [diffs, setDiffs] = useState<SpellCheckDiff[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [hoveredDiffId, setHoveredDiffId] = useState<string | null>(null);

  const handleSpellCheck = useCallback(async () => {
    if (!editor) return;
    
    setIsChecking(true);
    try {
      const content = editor.getText();
      const apiUrl = process.env.NEXT_PUBLIC_DENO_API_URL ?? 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/spellcheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      });
      
      const data = await response.json();
      const diffsWithIds = (data.diffs || []).map((diff: any, idx: number) => ({
        ...diff,
        id: `diff-${Date.now()}-${idx}`,
      }));
      
      setDiffs(diffsWithIds);
    } catch (error) {
      console.error('Spell check failed:', error);
      setDiffs([]);
    } finally {
      setIsChecking(false);
    }
  }, [editor]);

  const recalculateDiffPosition = useCallback((content: string, diff: SpellCheckDiff): SpellCheckDiff | null => {
    const index = content.indexOf(diff.original, Math.max(0, diff.start - 50));
    
    if (index === -1) {
      return null;
    }
    
    return {
      ...diff,
      start: index,
      end: index + diff.original.length - 1,
    };
  }, []);

  const recalculateAllDiffPositions = useCallback((content: string, diffsToRecalc: SpellCheckDiff[]): SpellCheckDiff[] => {
    let searchStart = 0;
    const updated: SpellCheckDiff[] = [];

    diffsToRecalc.forEach((diff) => {
      let index = content.indexOf(diff.original, searchStart);
      if (index === -1) {
        index = content.indexOf(diff.original);
      }
      if (index !== -1) {
        searchStart = index + diff.original.length;
        updated.push({
          ...diff,
          start: index,
          end: index + diff.original.length - 1,
        });
      }
    });

    return updated;
  }, []);

  const applyTextReplacement = useCallback((content: string, replacement: { start: number; end: number; content: string }) => {
    const before = content.slice(0, replacement.start);
    const after = content.slice(replacement.end + 1);
    return {
      newText: before + replacement.content + after,
      lengthDiff: replacement.content.length - (replacement.end - replacement.start + 1),
    };
  }, []);

  const handleAcceptDiff = useCallback((diff: SpellCheckDiff) => {
    if (!editor) return;

    const content = editor.getText();
    
    // Recalculate the position of this specific diff
    const updatedDiff = recalculateDiffPosition(content, diff);
    if (!updatedDiff || updatedDiff.start === -1) {
      // Remove invalid diff
      setDiffs(prev => prev.filter(d => d.id !== diff.id));
      return;
    }

    // Apply the text replacement
    const { newText } = applyTextReplacement(content, {
      start: updatedDiff.start,
      end: updatedDiff.end,
      content: updatedDiff.suggestion,
    });

    // Update editor content
    editor.commands.setContent(newText);

    // Remove this diff and recalculate positions for remaining diffs
    const remainingDiffs = diffs.filter(d => d.id !== diff.id);
    const recalculatedDiffs = recalculateAllDiffPositions(newText, remainingDiffs);
    
    setDiffs(recalculatedDiffs);
    
    if (recalculatedDiffs.length === 0) {
      onClose();
    }
  }, [editor, diffs, recalculateDiffPosition, recalculateAllDiffPositions, applyTextReplacement, onClose]);

  const handleRejectDiff = useCallback((diff: SpellCheckDiff) => {
    const newDiffs = diffs.filter(d => d.id !== diff.id);
    setDiffs(newDiffs);
    
    if (newDiffs.length === 0) {
      onClose();
    }
  }, [diffs, onClose]);

  const handleAcceptAllDiffs = useCallback(() => {
    if (!editor) return;

    let content = editor.getText();
    
    // Sort diffs by position (descending) to avoid position shifts
    const sortedDiffs = [...diffs].sort((a, b) => b.start - a.start);
    
    for (const diff of sortedDiffs) {
      const updatedDiff = recalculateDiffPosition(content, diff);
      if (updatedDiff && updatedDiff.start !== -1) {
        const { newText } = applyTextReplacement(content, {
          start: updatedDiff.start,
          end: updatedDiff.end,
          content: updatedDiff.suggestion,
        });
        content = newText;
      }
    }

    editor.commands.setContent(content);
    setDiffs([]);
    onClose();
  }, [editor, diffs, recalculateDiffPosition, applyTextReplacement, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed right-0 top-16 z-20 h-[calc(100vh-4rem)] w-[320px] border-l border-gray-200/80 bg-white shadow-lg"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Verificação Ortográfica</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="mt-3 flex gap-2">
              <Button
                onClick={handleSpellCheck}
                disabled={isChecking}
                size="sm"
                className="flex-1"
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isChecking ? 'Verificando...' : 'Verificar'}
              </Button>
              
              {diffs.length > 0 && (
                <Button
                  onClick={handleAcceptAllDiffs}
                  variant="outline"
                  size="sm"
                >
                  Aceitar Todas
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isChecking ? (
              <div className="flex flex-col items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                <p className="text-sm text-gray-600">Analisando texto...</p>
              </div>
            ) : diffs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32">
                <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  Nenhum erro encontrado ou clique em "Verificar" para começar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  {diffs.length} {diffs.length === 1 ? 'sugestão encontrada' : 'sugestões encontradas'}
                </p>
                
                {diffs.map((diff) => (
                  <motion.div
                    key={diff.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      hoveredDiffId === diff.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onMouseEnter={() => setHoveredDiffId(diff.id)}
                    onMouseLeave={() => setHoveredDiffId(null)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-red-600 line-through">
                          "{diff.original}"
                        </span>
                        <span className="text-sm text-gray-400">→</span>
                        <span className="text-sm text-green-600 font-medium">
                          "{diff.suggestion}"
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500">{diff.reason}</p>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAcceptDiff(diff)}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs hover:bg-green-50 hover:border-green-300"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Aceitar
                        </Button>
                        <Button
                          onClick={() => handleRejectDiff(diff)}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs hover:bg-red-50 hover:border-red-300"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 