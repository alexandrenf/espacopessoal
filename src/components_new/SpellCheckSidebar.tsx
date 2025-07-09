"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Editor } from "@tiptap/react";
import {
  Check,
  X,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";

export interface SpellCheckDiff {
  id: string;
  original: string;
  suggestion: string;
  start: number;
  end: number;
  reason: string;
}

interface ApiDiff {
  original: string;
  suggestion: string;
  start: number;
  end: number;
  reason: string;
}

interface SpellCheckResponse {
  diffs?: ApiDiff[];
}

interface SpellCheckSidebarProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SpellCheckSidebar({
  editor,
  isOpen,
  onClose,
}: SpellCheckSidebarProps) {
  const [diffs, setDiffs] = useState<SpellCheckDiff[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [hoveredDiffId, setHoveredDiffId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Runtime validation for API response
  const validateSpellCheckResponse = (
    data: unknown,
  ): { isValid: boolean; response?: SpellCheckResponse; error?: string } => {
    if (!data || typeof data !== "object") {
      return { isValid: false, error: "Invalid response format" };
    }

    const response = data as Record<string, unknown>;

    // Check if diffs property exists and is an array
    if (response.diffs !== undefined && !Array.isArray(response.diffs)) {
      return { isValid: false, error: "Invalid diffs format" };
    }

    // Validate each diff object
    if (response.diffs) {
      for (const diff of response.diffs) {
        if (!diff || typeof diff !== "object") {
          return { isValid: false, error: "Invalid diff object" };
        }

        const diffObj = diff as Record<string, unknown>;
        if (
          typeof diffObj.original !== "string" ||
          typeof diffObj.suggestion !== "string" ||
          typeof diffObj.start !== "number" ||
          typeof diffObj.end !== "number" ||
          typeof diffObj.reason !== "string"
        ) {
          return { isValid: false, error: "Invalid diff properties" };
        }
      }
    }

    return { isValid: true, response: response as SpellCheckResponse };
  };

  const handleSpellCheck = useCallback(async () => {
    if (!editor) return;

    // Cancel any ongoing spell check request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsChecking(true);
    setError(null);

    try {
      const content = editor.getText();
      const apiUrl = process.env.NEXT_PUBLIC_DENO_API_URL;

      if (!apiUrl) {
        throw new Error(
          "Spell check API URL is not configured. Please set NEXT_PUBLIC_DENO_API_URL environment variable.",
        );
      }

      const response = await fetch(`${apiUrl}/api/spellcheck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
        signal: abortController.signal, // Pass the abort signal
      });

      if (!response.ok) {
        throw new Error(
          `Spell check API returned error: ${response.status} ${response.statusText}`,
        );
      }

      const data: unknown = await response.json();

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      const validation = validateSpellCheckResponse(data);

      if (!validation.isValid) {
        throw new Error(
          validation.error ?? "Invalid response from spell check API",
        );
      }

      const diffsWithIds = (validation.response?.diffs ?? []).map(
        (diff: ApiDiff, idx: number) => ({
          ...diff,
          id: `diff-${Date.now()}-${idx}`,
        }),
      );

      setDiffs(diffsWithIds);

      if (diffsWithIds.length === 0) {
        setError("No spelling issues found!");
      }
    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      console.error("Spell check failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(`Spell check failed: ${errorMessage}`);
      setDiffs([]);
    } finally {
      // Only update loading state if this is still the current request
      if (abortControllerRef.current === abortController) {
        setIsChecking(false);
        abortControllerRef.current = null;
      }
    }
  }, [editor]);

  const recalculateDiffPosition = useCallback(
    (content: string, diff: SpellCheckDiff): SpellCheckDiff | null => {
      const index = content.indexOf(
        diff.original,
        Math.max(0, diff.start - 50),
      );

      if (index === -1) {
        return null;
      }

      return {
        ...diff,
        start: index,
        end: index + diff.original.length - 1,
      };
    },
    [],
  );

  const recalculateAllDiffPositions = useCallback(
    (content: string, diffsToRecalc: SpellCheckDiff[]): SpellCheckDiff[] => {
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
    },
    [],
  );

  const applyTextReplacement = useCallback(
    (
      content: string,
      replacement: { start: number; end: number; content: string },
    ) => {
      const before = content.slice(0, replacement.start);
      const after = content.slice(replacement.end + 1);
      return {
        newText: before + replacement.content + after,
        lengthDiff:
          replacement.content.length -
          (replacement.end - replacement.start + 1),
      };
    },
    [],
  );

  const handleAcceptDiff = useCallback(
    (diff: SpellCheckDiff) => {
      if (!editor) return;

      const content = editor.getText();

      // Recalculate the position of this specific diff
      const updatedDiff = recalculateDiffPosition(content, diff);
      if (!updatedDiff || updatedDiff.start === -1) {
        // Remove invalid diff
        setDiffs((prev) => prev.filter((d) => d.id !== diff.id));
        return;
      }

      // Apply the text replacement
      const { newText } = applyTextReplacement(content, {
        start: updatedDiff.start,
        end: updatedDiff.end,
        content: updatedDiff.suggestion,
      });

      // Update editor content while preserving cursor position
      const cursorPos = editor.state.selection.from;
      const tr = editor.state.tr.replaceWith(
        0,
        editor.state.doc.content.size,
        editor.schema.text(newText),
      );
      editor.view.dispatch(tr);

      // Restore cursor position if it's still valid
      const newDocSize = editor.state.doc.content.size;
      const safeCursorPos = Math.min(cursorPos, newDocSize);
      if (safeCursorPos >= 0) {
        editor.commands.setTextSelection(safeCursorPos);
      }

      // Remove this diff and recalculate positions for remaining diffs
      const remainingDiffs = diffs.filter((d) => d.id !== diff.id);
      const recalculatedDiffs = recalculateAllDiffPositions(
        newText,
        remainingDiffs,
      );

      setDiffs(recalculatedDiffs);

      if (recalculatedDiffs.length === 0) {
        onClose();
      }
    },
    [
      editor,
      diffs,
      recalculateDiffPosition,
      recalculateAllDiffPositions,
      applyTextReplacement,
      onClose,
    ],
  );

  const handleRejectDiff = useCallback(
    (diff: SpellCheckDiff) => {
      const newDiffs = diffs.filter((d) => d.id !== diff.id);
      setDiffs(newDiffs);

      if (newDiffs.length === 0) {
        onClose();
      }
    },
    [diffs, onClose],
  );

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

    // Update editor content while preserving cursor position
    const cursorPos = editor.state.selection.from;
    const tr = editor.state.tr.replaceWith(
      0,
      editor.state.doc.content.size,
      editor.schema.text(content),
    );
    editor.view.dispatch(tr);

    // Restore cursor position if it's still valid
    const newDocSize = editor.state.doc.content.size;
    const safeCursorPos = Math.min(cursorPos, newDocSize);
    if (safeCursorPos >= 0) {
      editor.commands.setTextSelection(safeCursorPos);
    }

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
                <h3 className="font-semibold text-gray-900">
                  Verificação Ortográfica
                </h3>
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isChecking ? "Verificando..." : "Verificar"}
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
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {isChecking ? (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
                <p className="text-gray-600">Analisando o texto...</p>
              </div>
            ) : diffs.length === 0 && !error ? (
              <div className="py-8 text-center">
                <Sparkles className="mx-auto mb-4 h-8 w-8 text-gray-400" />
                <p className="text-gray-600">
                  Clique em &quot;Verificar&quot; para iniciar a análise
                  ortográfica
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {diffs.map((diff) => (
                  <div
                    key={diff.id}
                    className={`rounded-lg border p-3 transition-all duration-200 hover:shadow-sm ${
                      hoveredDiffId === diff.id
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                    onMouseEnter={() => setHoveredDiffId(diff.id)}
                    onMouseLeave={() => setHoveredDiffId(null)}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="mb-1 text-sm font-medium text-red-600">
                          {diff.original}
                        </p>
                        <p className="text-sm font-medium text-green-600">
                          {diff.suggestion}
                        </p>
                      </div>
                      <div className="ml-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcceptDiff(diff)}
                          className="h-7 px-2 text-xs"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRejectDiff(diff)}
                          className="h-7 px-2 text-xs"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {diff.reason && (
                      <p className="mt-1 text-xs text-gray-500">
                        {diff.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
