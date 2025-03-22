"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Converter } from "showdown";
import DOMPurify from "dompurify";
import type { Config } from "dompurify";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, FileText, Eye, Bold, Italic, List, ListOrdered, Quote, Code, CheckSquare, Share2, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ShareModal } from "./ShareModal";
import { toast } from "~/hooks/use-toast";
import { SpellCheckDiffView } from './SpellCheckDiffView';
import type { SpellCheckDiff, SpellCheckResponse } from '~/types/spellcheck';
import { cn } from "~/lib/utils";
import { AnimatedTextReplacement } from './AnimatedTextReplacement';

interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EditorProps {
  currentNote: Note | { id: number | null; content: string };
  updateNote: (text: string) => void;
  isSaving?: boolean;
  isLoading?: boolean;
}

// Remove the local SpellCheckResponse and SpellCheckDiff interfaces since we're importing them

// Add this utility function before the Editor component
const applyTextReplacement = (
  text: string,
  replacement: { start: number; end: number; content: string }
): { newText: string; offset: number } => {
  const beforeText = text.slice(0, replacement.start);
  // Slice from replacement.end + 1 instead of 0
  const afterText = text.slice(replacement.end + 1);
  const newText = beforeText + replacement.content + afterText;
  return {
    newText,
    offset: replacement.content.length - (replacement.end - replacement.start + 1)
  };
};

const recalcDiffPositions = (
  currentContent: string,
  diffs: SpellCheckDiff[]
): SpellCheckDiff[] => {
  let searchStart = 0;
  return diffs.map(diff => {
    // Attempt to find the exact occurrence of diff.original starting from searchStart
    let index = currentContent.indexOf(diff.original, searchStart);
    if (index === -1) {
      // Fallback: search from the beginning in case the sequence has shifted unexpectedly
      index = currentContent.indexOf(diff.original);
    }
    if (index !== -1) {
      // Update searchStart to ensure subsequent diffs are found after this one
      searchStart = index + diff.original.length;
      return { 
        ...diff,
        start: index, 
        end: index + diff.original.length - 1 
      };
    }
    return diff; // Preserve the original diff with its ID if not found
  });
};

function highlightDiffs(content: string, diffs: SpellCheckDiff[]): string {
  const sortedDiffs = [...diffs].sort((a, b) => b.start - a.start);
  let highlighted = content;
  sortedDiffs.forEach(diff => {
    if (diff.start !== -1 && diff.end !== -1) {
      const before = highlighted.slice(0, diff.start);
      const match = highlighted.slice(diff.start, diff.end + 1);
      const after = highlighted.slice(diff.end + 1);
      // Wrap the diff in a clickable span
      highlighted = `${before}<span data-diff-id="${diff.original}" style="background-color: #fffa65; cursor: pointer;">${match}</span>${after}`;
    }
  });
  return highlighted;
}

const Editor: React.FC<EditorProps> = ({
  currentNote,
  updateNote,
  isSaving,
  isLoading,
}) => {
  const [selectedTab, setSelectedTab] = React.useState<"write" | "preview">("write");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [isToolbarVisible, setIsToolbarVisible] = React.useState(false);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [spellCheckResults, setSpellCheckResults] = useState<SpellCheckDiff[]>([]);
  const [isSpellChecking, setIsSpellChecking] = useState(false);
  const [useGrammarlyHighlight, setUseGrammarlyHighlight] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCorrection, setActiveCorrection] = useState<{
    diff: SpellCheckDiff;
    position: { x: number; y: number };
  } | null>(null);
  const [hoveredDiffId, setHoveredDiffId] = useState<string | null>(null);
  const [activeReplacement, setActiveReplacement] = useState<{
    id: string;
    original: string;
    replacement: string;
    start: number;
    end: number;
  } | null>(null);

  const l18n = {
    write: "Escrever",
    preview: "Visualizar",
    uploadingImage: "Enviando imagem...",
    pasteDropSelect: "Clique para colar uma imagem, ou arraste e solte",
    untitledNote: "Nota sem título"
  };

  // Improved content parsing
  const parseNote = useCallback((fullContent: string) => {
    const lines = fullContent.split('\n');
    const noteTitle = lines[0]?.trim() ?? l18n.untitledNote;
    const noteContent = lines.slice(1).join('\n');
    return { noteTitle, noteContent };
  }, [l18n.untitledNote]);

  // Initialize and update content when note changes
  useEffect(() => {
    const { noteTitle, noteContent } = parseNote(currentNote.content);
    setTitle(noteTitle);
    setContent(noteContent);
  }, [currentNote.id, currentNote.content, parseNote]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    updateNote(`${newTitle.trim()}\n${content}`);
  }, [content, updateNote]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    updateNote(`${title.trim()}\n${newContent}`);
  }, [title, updateNote]);

  const converter = new Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
  });

  const insertMarkdown = (prefix: string, suffix = "") => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    const newContent = `${beforeText}${prefix}${selectedText}${suffix}${afterText}`;
    handleContentChange(newContent);

    // Reset selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        end + prefix.length
      );
    }, 0);
  };

  // Add touch event handlers for mobile
  const handleTouchStart = useCallback(() => {
    setIsToolbarVisible(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Hide toolbar after 2 seconds of inactivity
    setTimeout(() => {
      setIsToolbarVisible(false);
    }, 2000);
  }, []);

  const handleSpellCheck = async () => {
    setIsSpellChecking(true);
    try {
      const response = await fetch('/api/spellcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      });
      const results = (await response.json()) as SpellCheckResponse;
      
      // Ensure each diff has a unique ID
      const diffsWithIds = results.diffs.map((diff, index) => ({
        ...diff,
        id: `diff-${Date.now()}-${index}`
      }));
      
      setSpellCheckResults(diffsWithIds);
    } catch (error) {
      console.error('Spell check failed:', error);
      toast({
        title: "Error",
        description: "Failed to check spelling",
        variant: "destructive"
      });
    } finally {
      setIsSpellChecking(false);
    }
  };

  const handleAcceptSpellCheck = useCallback((diff: SpellCheckDiff) => {
    // Recalculate the diff in the current content
    const updatedDiffs = recalcDiffPositions(content, [diff]);
    const updatedDiff = updatedDiffs[0];
    
    if (!updatedDiff || updatedDiff.start === -1) {
      // If we can't find the diff, remove it from results anyway
      setSpellCheckResults(prev => prev.filter(d => d.id !== diff.id));
      return;
    }

    // Apply the replacement immediately
    const { newText } = applyTextReplacement(content, {
      start: updatedDiff.start,
      end: updatedDiff.end,
      content: updatedDiff.suggestion
    });

    // Update content
    handleContentChange(newText);
    
    // Remove the diff from results
    setSpellCheckResults(prev => prev.filter(d => d.id !== diff.id));
  }, [content, handleContentChange]);

  const handleReplacementComplete = useCallback(() => {
    if (!activeReplacement) return;

    const { start, end, replacement } = activeReplacement;
    const newText = content.slice(0, start) + replacement + content.slice(end + 1);
    
    // Update content
    handleContentChange(newText);
    
    // Remove the active replacement
    setActiveReplacement(null);
    
    // Update spell check results
    setSpellCheckResults(prev => prev.filter(d => d.id !== activeReplacement.id));
  }, [activeReplacement, content, handleContentChange]);

  const handleAcceptAllSpellCheck = () => {
    let currentContent = content;
    // Sort diffs by starting index
    let remainingDiffs = [...spellCheckResults].sort((a, b) => a.start - b.start);

    while (remainingDiffs.length > 0) {
      const currentDiff = remainingDiffs.shift();
      if (!currentDiff) break;

      const { newText } = applyTextReplacement(currentContent, {
        start: currentDiff.start,
        end: currentDiff.end,
        content: currentDiff.suggestion
      });
      currentContent = newText;

      // Recalculate positions for remaining diffs based on the updated content
      remainingDiffs = recalcDiffPositions(currentContent, remainingDiffs);
    }

    handleContentChange(currentContent);
    setSpellCheckResults([]);
  };

  const handleRejectSpellCheck = useCallback((diff: SpellCheckDiff) => {
    setSpellCheckResults(prev => prev.filter(d => d !== diff));
  }, []);

  // Remove the duplicate handleAcceptAllSpellCheck here

  const grammarlyStyles = useMemo(() => ({
    container: `
      w-full h-[75vh] 
      bg-white/50 backdrop-blur-sm rounded-lg p-6 
      font-[16px] leading-relaxed text-gray-800
      shadow-sm focus:outline-none
      selection:bg-blue-100
    `,
    highlight: (isHovered: boolean): string => cn(
      "relative inline-block transition-all duration-200",
      "border-b-2 border-dotted border-red-400/50",
      isHovered ? "bg-blue-50 rounded px-0.5 -mx-0.5 border-blue-400" : ""
    ),
    tooltip: `
      absolute -top-2 left-0 transform -translate-y-full
      min-w-[280px] max-w-[320px]
      bg-white rounded-lg shadow-xl
      border border-gray-200
      p-4 z-50
      animate-in fade-in-0 zoom-in-95
    `,
    tooltipArrow: `
      absolute -bottom-2 left-4
      border-8 border-transparent
      border-t-white
    `
  }), []);

  const renderGrammarlyContent = useCallback(() => {
    if (!content || !spellCheckResults.length) {
      return (
        <div 
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => handleContentChange(e.currentTarget.innerText)}
          className={grammarlyStyles.container}
        >
          {content}
        </div>
      );
    }

    let lastIndex = 0;
    const elements: JSX.Element[] = [];
    
    spellCheckResults.forEach((diff, idx) => {
      const startIndex = content.indexOf(diff.original, lastIndex);
      if (startIndex === -1) return;

      // Add text before the correction
      if (startIndex > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>
            {content.slice(lastIndex, startIndex)}
          </span>
        );
      }

      // Check if this diff is being replaced
      if (activeReplacement?.id === diff.id) {
        elements.push(
          <AnimatedTextReplacement
            key={`replacement-${diff.id}`}
            original={diff.original}
            replacement={diff.suggestion}
            onComplete={handleReplacementComplete}
          />
        );
      } else {
        // Regular diff highlight
        elements.push(
          <span
            key={`correction-${diff.id}`}
            className={grammarlyStyles.highlight(hoveredDiffId === diff.id)}
            onMouseEnter={() => setHoveredDiffId(diff.id)}
            onMouseLeave={() => setHoveredDiffId(null)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setActiveCorrection({
                diff,
                position: { x: rect.left, y: rect.top }
              });
            }}
          >
            {diff.original}
            {activeCorrection?.diff.id === diff.id && (
              <div 
                className={grammarlyStyles.tooltip}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      Suggested Change
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {diff.reason}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleAcceptSpellCheck(diff);
                      setActiveCorrection(null);
                    }}
                    className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Accept
                  </button>
                </div>
                
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <p className="text-red-600 line-through">
                      {diff.original}
                    </p>
                    <p className="text-green-600 font-medium">
                      {diff.suggestion}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleRejectSpellCheck(diff);
                      setActiveCorrection(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Ignore
                  </button>
                </div>
                <div className={grammarlyStyles.tooltipArrow} />
              </div>
            )}
          </span>
        );
      }

      lastIndex = startIndex + diff.original.length;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(
        <span key="text-end">
          {content.slice(lastIndex)}
        </span>
      );
    }

    return (
      <div 
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleContentChange(e.currentTarget.innerText)}
        className={grammarlyStyles.container}
        onClick={() => activeCorrection && setActiveCorrection(null)}
      >
        {elements}
      </div>
    );
  }, [content, spellCheckResults, activeCorrection, handleContentChange, grammarlyStyles, handleAcceptSpellCheck, handleRejectSpellCheck, hoveredDiffId, handleReplacementComplete]);

  const renderContent = () => {
    if (selectedTab === "preview") {
      // Use highlightDiffs here
      const contentWithHighlights = highlightDiffs(content, spellCheckResults);
      const html = converter.makeHtml(contentWithHighlights);
      const purify = DOMPurify as {
        sanitize: (dirty: string, config?: Config) => string;
      };
      const sanitizedHtml = purify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'a', 'strong', 'em',
          'code', 'pre', 'blockquote', 'input' // Add input to allowed tags
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'title', 'aria-label', 'class', 'type', 'checked'] // Add type and checked attributes
      });
      
      return (
        <div 
          className="prose prose-slate max-w-none p-6 bg-white/50 backdrop-blur-sm rounded-lg shadow-sm min-h-[75vh]"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    } else if (useGrammarlyHighlight) {
      return renderGrammarlyContent();
    }

    // Default write mode with plain textarea
    return (
      <textarea
        ref={textAreaRef}
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        className="w-full h-[75vh] bg-white/50 backdrop-blur-sm rounded-lg p-6 focus:outline-none font-mono text-[15px] resize-none shadow-sm transition-all duration-200 focus:shadow-md focus:bg-white/80"
        disabled={isLoading}
        placeholder="Comece a escrever..."
      />
    );
  };

  // Example: open sidebar when any diffs exist
  useEffect(() => {
    setSidebarOpen(spellCheckResults.length > 0);
  }, [spellCheckResults]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeCorrection && !e.defaultPrevented) {
        setActiveCorrection(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeCorrection]);

  return (
    <motion.div className="flex h-screen w-full relative">
      {/* Main editor container shrinks when sidebar is open */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'mr-80' : ''}`}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative w-full h-screen bg-gradient-to-b from-white to-gray-50"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Share Modal */}
          {currentNote.id && (
            <ShareModal
              isOpen={isShareModalOpen}
              onClose={() => setIsShareModalOpen(false)}
              noteId={currentNote.id}
            />
          )}

          <AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center"
              >
                <motion.div 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-lg shadow-lg"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="text-sm font-medium text-gray-600">Carregando nota...</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`${isLoading ? 'opacity-50' : ''} transition-all duration-300`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50 bg-white/70 backdrop-blur-md sticky top-0 z-20 shadow-sm">
              <div className="flex-1 flex items-center gap-3">
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
                  className="flex-1 text-xl font-semibold text-gray-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/10 rounded-md px-2 py-1 transition-all"
                  placeholder={l18n.untitledNote}
                  aria-label="Note title"
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex items-center gap-2">
                {isSaving && !isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full shadow-sm"
                  >
                    <Save className="h-4 w-4 text-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-600">Salvando...</span>
                  </motion.div>
                )}

                {/* Share Button */}
                {currentNote.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => setIsShareModalOpen(true)}
                    aria-label="Compartilhar nota"
                  >
                    <Share2 className="h-4 w-4" />
                    Compartilhar
                  </Button>
                )}
              </div>
            </div>

            <div className="p-4">
              <div className="flex flex-col gap-4">
                <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as "write" | "preview")}>
                  <div className="flex items-center justify-between">
                    <TabsList className="mb-4 bg-gray-100/50 backdrop-blur-sm">
                      <TabsTrigger value="write" className="flex items-center gap-2 data-[state=active]:bg-white">
                        <FileText className="h-4 w-4" />
                        {l18n.write}
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex items-center gap-2 data-[state=active]:bg-white">
                        <Eye className="h-4 w-4" />
                        {l18n.preview}
                      </TabsTrigger>
                    </TabsList>

                    {selectedTab === "write" && (
                      <>
                        {/* Desktop Fixed Toolbar */}
                        <div className="hidden md:flex items-center gap-1 bg-gray-100/50 backdrop-blur-sm p-1.5 rounded-lg border border-gray-200/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('**', '**')}
                            title="Bold"
                            className="hover:bg-white hover:shadow-sm transition-all h-8 w-8"
                          >
                            <Bold className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('*', '*')}
                            title="Italic"
                            className="hover:bg-white hover:shadow-sm transition-all h-8 w-8"
                          >
                            <Italic className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('\n- [ ] ')}
                            title="Task List"
                            className="hover:bg-white hover:shadow-sm transition-all h-8 w-8"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('\n- ')}
                            title="Unordered List"
                            className="hover:bg-white hover:shadow-sm transition-all h-8 w-8"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('\n1. ')}
                            title="Ordered List"
                            className="hover:bg-white hover:shadow-sm transition-all h-8 w-8"
                          >
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('\n> ')}
                            title="Quote"
                            className="hover:bg-white hover:shadow-sm transition-all h-8 w-8"
                          >
                            <Quote className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('`', '`')}
                            title="Code"
                            className="hover:bg-white hover:shadow-sm transition-all h-8 w-8"
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSpellCheck}
                            title="Spell Check"
                            className="hover:bg-white hover:shadow-sm transition-all h-8 w-8 group"
                            disabled={isSpellChecking}
                          >
                            {isSpellChecking ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4 group-hover:text-yellow-500 transition-colors" />
                            )}
                          </Button>
                        </div>

                        {/* Mobile Floating Toolbar */}
                        <motion.div 
                          ref={toolbarRef}
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ 
                            opacity: isToolbarVisible ? 1 : 0,
                            y: isToolbarVisible ? 0 : -20
                          }}
                          transition={{ duration: 0.2 }}
                          className="md:hidden fixed bottom-4 left-1/4 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur-md p-2 rounded-full shadow-lg border border-gray-200/50 z-50"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('**', '**')}
                            title="Bold"
                            className="hover:bg-gray-100 hover:shadow-sm transition-all h-8 w-8"
                          >
                            <Bold className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('*', '*')}
                            title="Italic"
                            className="hover:bg-gray-100 hover:shadow-sm transition-all h-8 w-8"
                          >
                            <Italic className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('\n- [ ] ')}
                            title="Task List"
                            className="hover:bg-gray-100 hover:shadow-sm transition-all h-8 w-8"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('\n- ')}
                            title="Unordered List"
                            className="hover:bg-gray-100 hover:shadow-sm transition-all h-8 w-8"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('\n1. ')}
                            title="Ordered List"
                            className="hover:bg-gray-100 hover:shadow-sm transition-all h-8 w-8"
                          >
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('\n> ')}
                            title="Quote"
                            className="hover:bg-gray-100 hover:shadow-sm transition-all h-8 w-8"
                          >
                            <Quote className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('`', '`')}
                            title="Code"
                            className="hover:bg-gray-100 hover:shadow-sm transition-all h-8 w-8"
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSpellCheck}
                            title="Spell Check"
                            className="hover:bg-gray-100 hover:shadow-sm transition-all h-8 w-8 group"
                            disabled={isSpellChecking}
                          >
                            {isSpellChecking ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4 group-hover:text-yellow-500 transition-colors" />
                            )}
                          </Button>
                        </motion.div>
                      </>
                    )}
                  </div>

                  <div className="relative">
                    {renderContent()}
                    <div className="absolute bottom-4 right-4 text-xs text-gray-400">
                      {content.length} characters
                    </div>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setUseGrammarlyHighlight(prev => !prev)}
          >
            {useGrammarlyHighlight ? "Disable Grammarly-like" : "Enable Grammarly-like"}
          </Button>
        </motion.div>
      </div>

      {/* Animated sidebar for diffs */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: sidebarOpen ? 0 : '100%' }}
        transition={{ duration: 0.3 }}
        className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-lg border-l z-50"
      >
        <SpellCheckDiffView
          diffs={spellCheckResults}
          onAccept={handleAcceptSpellCheck}
          onReject={handleRejectSpellCheck}
          onAcceptAll={handleAcceptAllSpellCheck}
          activeId={hoveredDiffId ?? undefined}
          onHover={setHoveredDiffId}
        />
      </motion.div>
    </motion.div>
  );
};

export default Editor;
