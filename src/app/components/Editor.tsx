"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  FileText,
  Eye,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  CheckSquare,
  Share2,
  Sparkles,
  Save,
  ArrowUpRight,
  Replace,
  Check,
  X,
} from "lucide-react";
import { Converter } from "showdown";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ShareModal } from "./ShareModal";
import { DictionaryModal } from "./DictionaryModal";
import { api } from "~/trpc/react";

//
// ---------- Types ----------
//

interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SpellCheckDiff {
  id?: string;
  original: string;
  suggestion: string;
  start: number;
  end: number;
  reason: string;
}

interface SpellCheckResponse {
  diffs: SpellCheckDiff[];
}

interface EditorProps {
  currentNote: Note;
  updateNote: (text: string) => void;
  isSaving: boolean;
  isLoading: boolean;
  publicOrPrivate: boolean; // Private if true
  session?: {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  } | null;
}

interface DictionaryEntry {
  id: string;
  from: string;
  to: string;
}

//
// ---------- Utility Functions ----------
//

function recalcDiffPositions(
  currentContent: string,
  diffs: SpellCheckDiff[],
): SpellCheckDiff[] {
  let searchStart = 0;
  const updated: SpellCheckDiff[] = [];

  diffs.forEach((diff) => {
    let index = currentContent.indexOf(diff.original, searchStart);
    if (index === -1) {
      index = currentContent.indexOf(diff.original);
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
}

function applyTextReplacement(
  text: string,
  replacement: { start: number; end: number; content: string },
): { newText: string; offset: number } {
  const beforeText = text.slice(0, replacement.start);
  const afterText = text.slice(replacement.end + 1);
  const newText = beforeText + replacement.content + afterText;
  return {
    newText,
    offset:
      replacement.content.length - (replacement.end - replacement.start + 1),
  };
}

//
// ---------- SpellCheckDiffView: The Sidebar UI ----------
//

function SpellCheckDiffView({
  diffs,
  hoveredDiffId,
  onHoverDiff,
  onAccept,
  onReject,
  onAcceptAll,
}: {
  diffs: SpellCheckDiff[];
  hoveredDiffId: string | null;
  onHoverDiff: (id: string | null) => void;
  onAccept: (diff: SpellCheckDiff) => void;
  onReject: (diff: SpellCheckDiff) => void;
  onAcceptAll: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Correções ({diffs.length})</h2>
        <Button variant="outline" onClick={onAcceptAll} size="sm">
          Aceitar todas
        </Button>
      </div>
      <div className="hidden md:block bg-blue-50 p-3 text-sm text-blue-700 border-b">
        Retorne ao modo de escrita após finalizar as correções
      </div>
      <div className="flex-1 overflow-auto">
        {diffs.map((diff) => {
          const isHovered = diff.id === hoveredDiffId;
          return (
            <div
              key={diff.id}
              onMouseEnter={() => onHoverDiff(diff.id ?? null)}
              onMouseLeave={() => onHoverDiff(null)}
              className={`
                border-b p-4 transition-colors 
                ${isHovered ? "bg-blue-50" : "hover:bg-gray-50"}
              `}
            >
              <div className="mb-2 text-sm text-gray-500">
                Encontrado:{" "}
                <span className="text-red-600">“{diff.original}”</span>
              </div>
              <div className="text-sm text-gray-500">
                Sugestão:{" "}
                <span className="font-semibold text-green-600">
                  &ldquo;{diff.suggestion}&rdquo;
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {diff.reason}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => onAccept(diff)}>
                  Aceitar
                </Button>
                <Button variant="outline" size="sm" onClick={() => onReject(diff)}>
                  Rejeitar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

//
// ---------- Replacement Popup Component ----------
//

function ReplacementPopup({
  word,
  replacement,
  onAccept,
  onReject,
}: {
  word: string;
  replacement: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed left-1/2 top-[120px] z-30 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg border border-gray-200/50 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="text-red-500">{word}</span>
        <span>→</span>
        <span className="text-green-500">{replacement}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAccept}
          className="h-6 w-6 p-0 hover:bg-green-50"
        >
          <Check className="h-3 w-3 text-green-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          className="h-6 w-6 p-0 hover:bg-red-50"
        >
          <X className="h-3 w-3 text-red-500" />
        </Button>
      </div>
    </motion.div>
  );
}

//
// ---------- The Editor Component Proper ----------
//

const Editor: React.FC<EditorProps> = ({
  currentNote,
  updateNote,
  isSaving,
  isLoading,
  publicOrPrivate,
  session,
}) => {
  //
  // --- States & Refs ---
  //
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const currentNoteIdRef = useRef<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<"write" | "preview">("write");
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDictionaryModalOpen, setIsDictionaryModalOpen] = useState(false);
  const [spellCheckResults, setSpellCheckResults] = useState<SpellCheckDiff[]>([]);
  const [isSpellChecking, setIsSpellChecking] = useState(false);
  const [hoveredDiffId, setHoveredDiffId] = useState<string | null>(null);
  const [replacementSuggestion, setReplacementSuggestion] = useState<{
    word: string;
    replacement: string;
    start: number;
    end: number;
    position: { top: number; left: number };
  } | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [recentlyRejected, setRecentlyRejected] = useState<string | null>(null);
  
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>();

  const converter = useMemo(
    () =>
      new Converter({
        tables: true,
        simplifiedAutoLink: true,
        strikethrough: true,
        tasklists: true,
      }),
    [],
  );

  // Show sidebar if we have any diffs
  const sidebarOpen = spellCheckResults.length > 0;

  // Get dictionary data
  const { data: dictionaryData = [] } = publicOrPrivate 
    ? api.dictionary.getPublicDictionary.useQuery({ userId: session?.user?.id ?? "" })
    : api.dictionary.getDictionary.useQuery(undefined, {
        enabled: !!session?.user
      });

  // Update content when currentNote changes
  useEffect(() => {
    if (currentNote) {
      // Only update if we're switching to a different note
      if (currentNoteIdRef.current !== currentNote.id) {
        const lines = currentNote.content.split('\n');
        setTitle(lines[0] ?? '');
        setContent(lines.slice(1).join('\n'));
        currentNoteIdRef.current = currentNote.id;
      }
    }
  }, [currentNote]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      updateNote(`${newTitle.trim()}\n${content}`);
    },
    [content, updateNote],
  );

  // New function to find all possible replacements in text
  const findReplacements = useCallback((text: string) => {
    if (!dictionaryData) return [];
    
    const result = [];
    for (const entry of dictionaryData) {
      const regex = new RegExp(entry.from, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        result.push({
          from: entry.from,
          to: entry.to,
          start: match.index,
          end: match.index + entry.from.length
        });
      }
    }
    return result;
  }, [dictionaryData]);

  // New function to apply all replacements to text
  const applyReplacements = useCallback((text: string, replacements: Array<{ from: string; to: string; start: number; end: number }>) => {
    let result = text;
    // Apply replacements from end to start to avoid index issues
    for (let i = replacements.length - 1; i >= 0; i--) {
      const replacement = replacements[i];
      if (!replacement || typeof replacement.from !== 'string' || typeof replacement.to !== 'string' || 
          typeof replacement.start !== 'number' || typeof replacement.end !== 'number') {
        continue;
      }
      
      const { from, to, start, end } = replacement;
      result = result.slice(0, start) + to + result.slice(end);
    }
    return result;
  }, []);

  // Define rejectReplacement first since it's used by other functions
  const rejectReplacement = useCallback(() => {
    if (replacementSuggestion) {
      setRecentlyRejected(replacementSuggestion.word);
    }
    setReplacementSuggestion(null);
  }, [replacementSuggestion]);

  // Then define acceptReplacement which uses rejectReplacement
  const acceptReplacement = useCallback(() => {
    if (!replacementSuggestion) return;
    
    // Apply only the specific replacement we accepted
    const { start, end, replacement } = replacementSuggestion;
    const newContent = content.slice(0, start) + 
                      replacement + 
                      content.slice(end + 1);
    
    // Update content without triggering save
    setContent(newContent);
    setReplacementSuggestion(null);
  }, [content, replacementSuggestion]);

  // Then define handleTextReplace which uses acceptReplacement
  const handleTextReplace = useCallback(() => {
    const textarea = textAreaRef.current;
    if (!textarea || !content) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPosition);
    
    // Get only the last word before cursor
    const regex = /\S+$/;
    const lastWordMatch = regex.exec(textBeforeCursor);
    if (!lastWordMatch) return;
    
    const lastWord = lastWordMatch[0];
    const lastWordStart = textBeforeCursor.lastIndexOf(lastWord);
    
    // Find if the last word matches any dictionary entry
    const match = dictionaryData?.find(entry => 
      entry.from === lastWord || 
      (lastWord.startsWith('@') && entry.from === lastWord.slice(1))
    );

    if (match && lastWord !== recentlyRejected) {
      // Clear any existing timeout
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }

      setReplacementSuggestion({
        word: lastWord,
        replacement: match.to,
        start: lastWordStart,
        end: lastWordStart + lastWord.length - 1,
        position: { top: 0, left: 0 }
      });

      // Auto-accept after 2 seconds
      suggestionTimeoutRef.current = setTimeout(() => {
        acceptReplacement();
      }, 2000);
    }
  }, [content, dictionaryData, recentlyRejected]);

  const handleContentChange = useCallback(
    (newContent: string, skipUpdate = false) => {
      setContent(newContent);
      // Only update if it's not a replacement operation and not explicitly skipped
      if (!replacementSuggestion && !skipUpdate) {
        updateNote(`${title.trim()}\n${newContent}`);
      }
      
      // Remove this block as it's causing the issue
      // if (replacementSuggestion && !newContent.endsWith(' ')) {
      //   acceptReplacement();
      // }
      
      // Check for new replacements
      handleTextReplace();
    },
    [title, updateNote, replacementSuggestion, acceptReplacement, handleTextReplace],
  );

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    const textarea = textAreaRef.current;
    if (!textarea || !content || !dictionaryData) return;

    // If there's a replacement suggestion and space is pressed, accept it
    // Only if it wasn't recently rejected
    if (replacementSuggestion && e.key === ' ' && 
        replacementSuggestion.word !== recentlyRejected) {
      acceptReplacement();
      return;
    }

    // Reset rejected state when a new word starts
    if (e.key === ' ') {
      setRecentlyRejected(null);
    }

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPosition);
    
    // Get the last word before the cursor
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1]?.trim();
    
    if (!lastWord) return;

    // Find matching dictionary entry - try exact match first, then with @ prefix
    let match = dictionaryData.find((entry: DictionaryEntry) => entry.from === lastWord);
    
    // If no exact match found, try matching with @ prefix
    if (!match && lastWord.startsWith('@')) {
      const wordWithoutPrefix = lastWord.slice(1); // Remove @ prefix
      match = dictionaryData.find((entry: DictionaryEntry) => entry.from === wordWithoutPrefix);
    }
    
    if (match) {
      // Calculate word position
      const wordStart = textBeforeCursor.lastIndexOf(lastWord);
      const wordEnd = wordStart + lastWord.length;

      // Set the replacement suggestion without position
      setReplacementSuggestion({
        word: lastWord,
        replacement: match.to,
        start: wordStart,
        end: wordEnd,
        position: { top: 0, left: 0 }
      });

      // Auto-accept after 2 seconds
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
      suggestionTimeoutRef.current = setTimeout(() => {
        acceptReplacement();
      }, 2000);
    }
  }, [content, dictionaryData, acceptReplacement, replacementSuggestion, recentlyRejected]);

  //
  // --- Spell Check Logic ---
  //

  // 1) fetch diffs from /api/spellcheck
  const handleSpellCheck = async () => {
    if (!session?.user) {
      alert("Faça login para usar o corretor ortográfico");
      return;
    }

    try {
      setIsSpellChecking(true);
      const resp = await fetch("/api/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      const data = (await resp.json()) as SpellCheckResponse;

      // Add IDs so we can map them more easily
      const diffsWithIds = data.diffs.map((diff, idx) => ({
        ...diff,
        id: `diff-${Date.now()}-${idx}`,
      }));

      setSpellCheckResults(diffsWithIds);
      
      if (diffsWithIds.length === 0) {
        // Show success animation
        const button = document.querySelector('[data-spellcheck-button]');
        if (button) {
          button.classList.add('animate-success');
          setTimeout(() => {
            button.classList.remove('animate-success');
          }, 2000);
        }
      } else {
        // Switch to preview mode if we have results
        setSelectedTab("preview");
      }
    } catch (err) {
      console.error("Spell check failed:", err);
      alert("Falha ao checar ortografia");
    } finally {
      setIsSpellChecking(false);
    }
  };

  // 2) accept a single diff
  const handleAcceptDiff = useCallback(
    (diff: SpellCheckDiff) => {
      // First, update the current diff position
      const [updatedDiff] = recalcDiffPositions(content, [diff]);
      if (!updatedDiff || updatedDiff.start === -1) {
        setSpellCheckResults((prev) => {
          const newResults = prev.filter((d) => d.id !== diff.id);
          if (newResults.length === 0) setSelectedTab("write");
          return newResults;
        });
        return;
      }

      // Apply the text replacement
      const { newText } = applyTextReplacement(content, {
        start: updatedDiff.start,
        end: updatedDiff.end,
        content: updatedDiff.suggestion,
      });

      // Update content first
      handleContentChange(newText, true);

      // Then recalculate positions for all remaining diffs
      setSpellCheckResults((prev) => {
        const remainingDiffs = prev.filter((d) => d.id !== diff.id);
        const recalculatedDiffs = recalcDiffPositions(newText, remainingDiffs);
        if (recalculatedDiffs.length === 0) setSelectedTab("write");
        return recalculatedDiffs;
      });
    },
    [content, handleContentChange],
  );

  // 3) reject a single diff
  const handleRejectDiff = useCallback((diff: SpellCheckDiff) => {
    setSpellCheckResults((prev) => {
      const newResults = prev.filter((d) => d.id !== diff.id);
      if (newResults.length === 0) setSelectedTab("write");
      return newResults;
    });
  }, []);

  // 4) accept all
  const handleAcceptAllDiffs = useCallback(() => {
    let current = content;
    const remaining = [...spellCheckResults];
    remaining.sort((a, b) => b.start - a.start);

    remaining.forEach((diff) => {
      const [updated] = recalcDiffPositions(current, [diff]);
      if (updated && updated.start !== -1) {
        const { newText } = applyTextReplacement(current, {
          start: updated.start,
          end: updated.end,
          content: updated.suggestion,
        });
        current = newText;
      }
    });

    handleContentChange(current);
    setSpellCheckResults([]);
    setSelectedTab("write"); // Switch back to write mode
  }, [spellCheckResults, content, handleContentChange]);

  //
  // --- Markdown Insert ---
  //
  const insertMarkdown = (prefix: string, suffix = "") => {
    if (!textAreaRef.current) return;
    const start = textAreaRef.current.selectionStart;
    const end = textAreaRef.current.selectionEnd;
    const beforeText = content.substring(0, start);
    const selectedText = content.substring(start, end);
    const afterText = content.substring(end);

    const newContent = beforeText + prefix + selectedText + suffix + afterText;
    handleContentChange(newContent);

    // reposition cursor
    setTimeout(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.setSelectionRange(
        start + prefix.length,
        end + prefix.length,
      );
    }, 0);
  };

  const convertToUppercase = () => {
    if (!textAreaRef.current) return;
    const start = textAreaRef.current.selectionStart;
    const end = textAreaRef.current.selectionEnd;
    
    // If no text is selected, convert entire content
    if (start === end) {
      const newContent = content.toUpperCase();
      handleContentChange(newContent);
      return;
    }
    
    // If text is selected, convert only selection
    const beforeText = content.substring(0, start);
    const selectedText = content.substring(start, end).toUpperCase();
    const afterText = content.substring(end);

    const newContent = beforeText + selectedText + afterText;
    handleContentChange(newContent);

    // reposition cursor
    setTimeout(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.setSelectionRange(start, end);
    }, 0);
  };

  //
  // --- Touch Behavior for Mobile Toolbar ---
  //
  const handleTouchStart = useCallback(() => {
    setIsToolbarVisible(true);
  }, []);
  const handleTouchEnd = useCallback(() => {
    setTimeout(() => setIsToolbarVisible(false), 2000);
  }, []);

  //
  // --- Highlight in Preview ---
  //
  function buildPreviewElements(
    text: string,
    diffs: SpellCheckDiff[],
    hoveredId: string | null,
  ): React.ReactNode[] {
    // Sort diffs by ascending 'start'
    const sortedDiffs = [...diffs].sort((a, b) => a.start - b.start);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const diff of sortedDiffs) {
      // If the diff is out of bounds or not found, skip
      if (diff.start < 0 || diff.start >= text.length) continue;
      // Add text before the diff
      if (diff.start > lastIndex) {
        elements.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, diff.start)}</span>);
      }
      // Mark the portion
      const diffText = text.slice(diff.start, diff.end + 1);
      const isHovered = diff.id === hoveredId;

      elements.push(
        <span
          key={diff.id}
          onMouseEnter={() => setHoveredDiffId(diff.id ?? null)}
          onMouseLeave={() => setHoveredDiffId(null)}
          className={`
            relative cursor-pointer transition-all duration-200
            ${isHovered 
              ? "bg-blue-100 text-blue-900 rounded px-0.5" 
              : "bg-yellow-50 border-b-2 border-yellow-300"}
          `}
        >
          {diffText}
        </span>
      );
      lastIndex = diff.end + 1;
    }

    // Remainder of text
    if (lastIndex < text.length) {
      elements.push(<span key={`text-end`}>{text.slice(lastIndex)}</span>);
    }

    return elements;
  }

  //
  // --- Render Content (Write vs. Preview) ---
  //
  const renderContent = () => {
    if (selectedTab === "preview") {
      // Build highlight spans
      const previewElements = buildPreviewElements(
        content,
        spellCheckResults,
        hoveredDiffId,
      );

      // We'll sanitize only if you do raw HTML. Here, we build React elements,
      // so no dangerouslySetInnerHTML is needed. We'll do minimal styling here.
      return (
        <div
          className="min-h-[75vh] w-full rounded-lg bg-white/50 p-6 shadow-sm backdrop-blur-sm prose prose-slate"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {previewElements}
        </div>
      );
    }

    return (
      <>
        <div className="relative">
          <textarea
            ref={textAreaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyUp={handleKeyUp}
            className="h-[75vh] w-full resize-none rounded-lg bg-white/50 p-6 font-mono text-[15px] shadow-sm backdrop-blur-sm transition-all duration-200 focus:bg-white/80 focus:shadow-md focus:outline-none"
            disabled={isLoading}
            placeholder="Comece a escrever..."
          />
          <div className="absolute bottom-4 right-4 text-xs text-gray-400">
            {content.length} characters
          </div>
        </div>
        
        {/* Replacement Popup - moved outside the textarea container */}
        <AnimatePresence>
          {replacementSuggestion && (
            <ReplacementPopup
              word={replacementSuggestion.word}
              replacement={replacementSuggestion.replacement}
              onAccept={acceptReplacement}
              onReject={rejectReplacement}
            />
          )}
        </AnimatePresence>
      </>
    );
  };

  //
  // --- Main Return ---
  //
  return (
    <motion.div
      className="relative flex h-screen w-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* SHARE MODAL */}
      {currentNote.id && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          noteId={currentNote.id}
          session={session}
        />
      )}

      {/* DICTIONARY MODAL */}
      <DictionaryModal
        isOpen={isDictionaryModalOpen}
        onClose={() => setIsDictionaryModalOpen(false)}
        publicOrPrivate={publicOrPrivate}
        session={session}
      />

      {/* Editor Column */}
      <motion.div 
        className="flex-1 md:flex-1 md:[&[style*='margin-bottom']]:mb-0"
        animate={{
          marginRight: sidebarOpen ? "320px" : "0px",
          marginBottom: sidebarOpen ? "60vh" : "0px",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative h-screen w-full bg-gradient-to-b from-white to-gray-50"
        >
          {/* LOADING OVERLAY */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                // Keep z-index moderate
                className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center gap-3 rounded-lg bg-white/80 p-6 shadow-lg"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="text-sm font-medium text-gray-600">
                    Carregando nota...
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={isLoading ? "opacity-50 transition-all" : "transition-all"}>
            {/* ---------- HEADER BAR ---------- */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200/50 bg-white/70 p-4 shadow-sm backdrop-blur-md">
              {/* Title field */}
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ rotate: 15 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FileText className="h-5 w-5 text-blue-500" />
                </motion.div>
                <input
                  id="note-title"
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  className="flex-1 rounded-md bg-transparent px-2 py-1 text-xl font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  placeholder="Nota sem título"
                  aria-label="Note title"
                  disabled={isLoading}
                />
              </div>

              {/* Right side actions */}
              <div className="flex items-center gap-2">
                {/* Saving indicator */}
                {(isSaving || saveError) && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`fixed md:relative top-20 right-4 md:top-auto md:right-auto flex items-center gap-2 rounded-full px-4 py-2 shadow-sm z-30 ${
                      saveError ? 'bg-red-50' : 'bg-green-50'
                    }`}
                  >
                    {saveError ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : (
                      <Save className="h-4 w-4 animate-pulse text-green-500" />
                    )}
                    <span className={`text-sm font-medium hidden md:inline ${
                      saveError ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {saveError ? 'Erro ao salvar' : 'Salvando...'}
                    </span>
                  </motion.div>
                )}

                {/* Spell Check */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSpellCheck}
                  disabled={isSpellChecking}
                  className="flex items-center gap-1"
                >
                  {isSpellChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span className="hidden md:inline">Ortografia</span>
                </Button>

                {/* Dictionary Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDictionaryModalOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Replace className="h-4 w-4" />
                  <span className="hidden md:inline">Substituir</span>
                </Button>

                {/* Share Button */}
                {currentNote.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden md:inline">Compartilhar</span>
                  </Button>
                )}
              </div>
            </div>

            {/* ---------- Tabs + Editor Area ---------- */}
            <div className="p-4">
              <Tabs
                value={selectedTab}
                onValueChange={(val) =>
                  setSelectedTab(val as "write" | "preview")
                }
              >
                <div className="flex items-center justify-between">
                  <TabsList className="mb-4 bg-gray-100/50 backdrop-blur-sm">
                    <TabsTrigger
                      value="write"
                      className="flex items-center gap-2 data-[state=active]:bg-white"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden md:inline">Escrever</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="preview"
                      className="flex items-center gap-2 data-[state=active]:bg-white"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden md:inline">Visualizar</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Desktop toolbar (write mode) */}
                  {selectedTab === "write" && (
                    <div className="hidden items-center gap-1 rounded-lg border border-gray-200/50 bg-gray-100/50 p-1.5 backdrop-blur-sm md:flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown("**", "**")}
                        className="h-8 w-8 hover:bg-white hover:shadow-sm"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown("*", "*")}
                        className="h-8 w-8 hover:bg-white hover:shadow-sm"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown("\n- [ ] ")}
                        className="h-8 w-8 hover:bg-white hover:shadow-sm"
                      >
                        <CheckSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown("\n- ")}
                        className="h-8 w-8 hover:bg-white hover:shadow-sm"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown("\n1. ")}
                        className="h-8 w-8 hover:bg-white hover:shadow-sm"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown("\n> ")}
                        className="h-8 w-8 hover:bg-white hover:shadow-sm"
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown("`", "`")}
                        className="h-8 w-8 hover:bg-white hover:shadow-sm"
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={convertToUppercase}
                        className="h-8 w-8 hover:bg-white hover:shadow-sm"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Main editor content */}
                <div className="relative">
                  {renderContent()}
                </div>
              </Tabs>
            </div>
          </div>

          {/* Mobile floating toolbar (write mode) */}
          {selectedTab === "write" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{
                opacity: isToolbarVisible ? 1 : 0,
                y: isToolbarVisible ? 0 : -20,
              }}
              transition={{ duration: 0.2 }}
              className={`
                fixed left-1/2 z-30 -translate-x-1/2 
                max-w-[calc(100vw-2rem)] mx-auto
                rounded-full border border-gray-200/50 bg-white/90 p-2 
                shadow-lg backdrop-blur-md md:hidden
                ${sidebarOpen && 'bottom-[45vh]'} // Move up when spell checker is open
              `}
            >
              <div className="flex items-center gap-1 px-1 flex-wrap justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("**", "**")}
                  className="h-8 w-8 hover:bg-gray-100 hover:shadow-sm"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("*", "*")}
                  className="h-8 w-8 hover:bg-gray-100 hover:shadow-sm"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("\n- [ ] ")}
                  className="h-8 w-8 hover:bg-gray-100 hover:shadow-sm"
                >
                  <CheckSquare className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("\n- ")}
                  className="h-8 w-8 hover:bg-gray-100 hover:shadow-sm"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("\n1. ")}
                  className="h-8 w-8 hover:bg-gray-100 hover:shadow-sm"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("\n> ")}
                  className="h-8 w-8 hover:bg-gray-100 hover:shadow-sm"
                >
                  <Quote className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("`", "`")}
                  className="h-8 w-8 hover:bg-gray-100 hover:shadow-sm"
                >
                  <Code className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={convertToUppercase}
                  className="h-8 w-8 hover:bg-gray-100 hover:shadow-sm"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Spell Check Sidebar - Desktop */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ 
          x: sidebarOpen ? "0%" : "100%"
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed right-0 top-[64px] bottom-0 w-[320px] border-l bg-white shadow-lg z-20 hidden md:block"
      >
        {spellCheckResults.length > 0 && (
          <SpellCheckDiffView
            diffs={spellCheckResults}
            hoveredDiffId={hoveredDiffId}
            onHoverDiff={setHoveredDiffId}
            onAccept={handleAcceptDiff}
            onReject={handleRejectDiff}
            onAcceptAll={handleAcceptAllDiffs}
          />
        )}
      </motion.div>

      {/* Spell Check Bottom Sheet - Mobile */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ 
          y: sidebarOpen ? "0%" : "100%"
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 right-0 bottom-0 h-[40vh] bg-white shadow-lg z-20 rounded-t-xl border-t md:hidden"
      >
        {spellCheckResults.length > 0 && (
          <>
            {/* Mobile drag handle */}
            <div className="flex justify-center p-2 border-b">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>
            <SpellCheckDiffView
              diffs={spellCheckResults}
              hoveredDiffId={hoveredDiffId}
              onHoverDiff={setHoveredDiffId}
              onAccept={handleAcceptDiff}
              onReject={handleRejectDiff}
              onAcceptAll={handleAcceptAllDiffs}
            />
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Editor;
