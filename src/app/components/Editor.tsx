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
} from "lucide-react";
import { Converter } from "showdown";
import DOMPurify from "dompurify";
import type { Config } from "dompurify";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ShareModal } from "./ShareModal";

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
}

interface SpellCheckResponse {
  diffs: SpellCheckDiff[];
}

interface EditorProps {
  currentNote: Note;
  updateNote: (content: string) => void;
  isSaving: boolean;
  isLoading: boolean;
  session?: {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  } | null;
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
      <div className="bg-blue-50 p-3 text-sm text-blue-700 border-b">
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
                  “{diff.suggestion}”
                </span>
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
// ---------- The Editor Component Proper ----------
//

const Editor: React.FC<EditorProps> = ({
  currentNote,
  updateNote,
  isSaving,
  isLoading,
  session,
}) => {
  //
  // --- States & Refs ---
  //
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedTab, setSelectedTab] = useState<"write" | "preview">("write");
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Spell-check diffs
  const [spellCheckResults, setSpellCheckResults] = useState<SpellCheckDiff[]>(
    [],
  );
  const [isSpellChecking, setIsSpellChecking] = useState(false);

  // For highlight sync
  const [hoveredDiffId, setHoveredDiffId] = useState<string | null>(null);

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

  //
  // --- Note Title & Body Setup ---
  //
  useEffect(() => {
    const lines = currentNote.content.split("\n");
    const noteTitle = lines[0]?.trim() ?? "Nota sem título";
    const noteBody = lines.slice(1).join("\n");
    setTitle(noteTitle);
    setContent(noteBody);
  }, [currentNote.id, currentNote.content]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      updateNote(`${newTitle.trim()}\n${content}`);
    },
    [content, updateNote],
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      updateNote(`${title.trim()}\n${newContent}`);
    },
    [title, updateNote],
  );

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
        setSpellCheckResults((prev) => prev.filter((d) => d.id !== diff.id));
        return;
      }

      // Apply the text replacement
      const { newText } = applyTextReplacement(content, {
        start: updatedDiff.start,
        end: updatedDiff.end,
        content: updatedDiff.suggestion,
      });

      // Update content first
      handleContentChange(newText);

      // Then recalculate positions for all remaining diffs
      setSpellCheckResults((prev) => {
        const remainingDiffs = prev.filter((d) => d.id !== diff.id);
        return recalcDiffPositions(newText, remainingDiffs);
      });
    },
    [content, handleContentChange],
  );

  // 3) reject a single diff
  const handleRejectDiff = useCallback((diff: SpellCheckDiff) => {
    setSpellCheckResults((prev) => prev.filter((d) => d.id !== diff.id));
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

    // "Write" tab remains a textarea
    return (
      <textarea
        ref={textAreaRef}
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        className="h-[75vh] w-full resize-none rounded-lg bg-white/50 p-6 font-mono text-[15px] shadow-sm backdrop-blur-sm transition-all duration-200 focus:bg-white/80 focus:shadow-md focus:outline-none"
        disabled={isLoading}
        placeholder="Comece a escrever..."
      />
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

      {/* Editor Column */}
      <motion.div 
        className="flex-1"
        animate={{
          marginRight: sidebarOpen ? "320px" : "0px"
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
                {isSaving && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 shadow-sm"
                  >
                    <Save className="h-4 w-4 animate-pulse text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      Salvando...
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
                  Ortografia
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
                    Compartilhar
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
                      Escrever
                    </TabsTrigger>
                    <TabsTrigger
                      value="preview"
                      className="flex items-center gap-2 data-[state=active]:bg-white"
                    >
                      <Eye className="h-4 w-4" />
                      Visualizar
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
                    </div>
                  )}
                </div>

                {/* Main editor content */}
                <div className="relative">
                  {renderContent()}
                  <div className="absolute bottom-4 right-4 text-xs text-gray-400">
                    {content.length} characters
                  </div>
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
              className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gray-200/50 bg-white/90 p-2 shadow-lg backdrop-blur-md md:hidden"
            >
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
                onClick={handleSpellCheck}
                disabled={isSpellChecking || !session?.user}
                data-spellcheck-button
                className={`
                  group h-8 w-8 transition-all hover:bg-gray-100 hover:shadow-sm
                  [&.animate-success]:bg-green-100 [&.animate-success]:text-green-600
                  [&.animate-success]:scale-110 [&.animate-success]:rotate-[360deg]
                  [&.animate-success]:duration-500
                `}
                title={!session?.user ? "Faça login para usar o corretor ortográfico" : "Corretor ortográfico"}
              >
                {isSpellChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 transition-colors group-hover:text-yellow-500" />
                )}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Spell Check Sidebar */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ 
          x: sidebarOpen ? "0%" : "100%"
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed right-0 top-[64px] bottom-0 w-[320px] border-l bg-white shadow-lg z-20"
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
    </motion.div>
  );
};

export default Editor;
