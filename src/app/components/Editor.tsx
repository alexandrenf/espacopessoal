"use client";

import React, { useCallback, useEffect, useState } from "react";
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
      console.log(results);
      setSpellCheckResults(results.diffs);
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

  const handleAcceptSpellCheck = (diff: SpellCheckDiff) => {
    // Debug the values before correction
    const originalSegment = content.substring(diff.start, diff.end + 1);
    console.log('Before fix:', {
      original: originalSegment,
      suggestion: diff.suggestion,
      start: diff.start,
      end: diff.end
    });
    
    // Check carefully for spaces before and after
    const hasSpaceBefore = diff.start > 0 && content[diff.start - 1] === ' ';
    const hasSpaceAfter = diff.end < content.length - 1 && content[diff.end + 1] === ' ';
    const endsWithSpace = originalSegment.endsWith(' ');
    const startsWithSpace = originalSegment.startsWith(' ');
    
    // Create a new string with the suggestion replacing the original text
    const beforeText = content.slice(0, diff.start);
    const afterText = content.slice(diff.end + 1);
    
    // Make sure we preserve spaces correctly
    let effectiveSuggestion = diff.suggestion;
    
    // If the original had a space at the end but suggestion doesn't, add it
    if (endsWithSpace && !effectiveSuggestion.endsWith(' ')) {
      effectiveSuggestion += ' ';
    }
    
    // If the original had a space at the start but suggestion doesn't, add it
    if (startsWithSpace && !effectiveSuggestion.startsWith(' ')) {
      effectiveSuggestion = ' ' + effectiveSuggestion;
    }
    
    console.log('Replacing:', 
      JSON.stringify(originalSegment), 
      'with', 
      JSON.stringify(effectiveSuggestion)
    );
    
    const newContent = beforeText + effectiveSuggestion + afterText;
    
    handleContentChange(newContent);
    
    // Calculate the difference in length
    const lengthDifference = effectiveSuggestion.length - originalSegment.length;
    
    // Update the positions of all remaining diffs
    setSpellCheckResults(prev => 
      prev.filter(d => d !== diff).map(d => {
        // Only adjust positions for diffs that come after the current one
        if (d.start > diff.end) {
          return {
            ...d,
            start: d.start + lengthDifference,
            end: d.end + lengthDifference
          };
        }
        return d;
      })
    );
  };

  const handleRejectSpellCheck = (diff: SpellCheckDiff) => {
    setSpellCheckResults(prev => prev.filter(d => d !== diff));
  };

  const handleAcceptAllSpellCheck = () => {
    // Apply corrections from end to beginning to avoid position issues
    const sortedDiffs = [...spellCheckResults].sort((a, b) => b.start - a.start);
    
    let newContent = content;
    
    for (const diff of sortedDiffs) {
      const originalSegment = newContent.substring(diff.start, diff.end + 1);
      
      // Check for spaces carefully
      const endsWithSpace = originalSegment.endsWith(' ');
      const startsWithSpace = originalSegment.startsWith(' ');
      
      // Make sure we preserve spaces correctly
      let effectiveSuggestion = diff.suggestion;
      
      // If the original had a space at the end but suggestion doesn't, add it
      if (endsWithSpace && !effectiveSuggestion.endsWith(' ')) {
        effectiveSuggestion += ' ';
      }
      
      // If the original had a space at the start but suggestion doesn't, add it
      if (startsWithSpace && !effectiveSuggestion.startsWith(' ')) {
        effectiveSuggestion = ' ' + effectiveSuggestion;
      }
      
      const beforeText = newContent.slice(0, diff.start);
      const afterText = newContent.slice(diff.end + 1);
      
      console.log('Accept all - replacing:', 
        JSON.stringify(originalSegment), 
        'with', 
        JSON.stringify(effectiveSuggestion),
        'at position', diff.start
      );
      
      newContent = beforeText + effectiveSuggestion + afterText;
    }
    
    handleContentChange(newContent);
    setSpellCheckResults([]);
  };

  const renderContent = () => {
    if (selectedTab === "preview") {
      const html = converter.makeHtml(content);
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
    }

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

  return (
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
      {spellCheckResults.length > 0 && (
        <SpellCheckDiffView
          diffs={spellCheckResults}
          onAccept={handleAcceptSpellCheck}
          onReject={handleRejectSpellCheck}
          onAcceptAll={handleAcceptAllSpellCheck}
        />
      )}
    </motion.div>
  );
};

export default Editor;
