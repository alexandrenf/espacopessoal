"use client";

import React, { useCallback } from "react";
import ReactMde from "react-mde";
import { Converter } from "showdown";
import DOMPurify from "dompurify";
import type { Config } from "dompurify";
import "react-mde/lib/styles/css/react-mde-all.css";
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

const Editor: React.FC<EditorProps> = ({ currentNote, updateNote, isSaving, isLoading }) => {
  const [selectedTab, setSelectedTab] = React.useState<"write" | "preview">("write");

  const l18n = {
    write: "Escrever",
    preview: "Visualizar",
    uploadingImage: "Enviando imagem...",
    pasteDropSelect: "Clique para colar uma imagem, ou arraste e solte",
    untitledNote: "Nota sem título"
  };

  // Memoize the title extraction function
  const getTitleFromContent = useCallback((content: string): string => {
    const firstLine = content.split("\n")[0];
    return firstLine?.trim() ?? l18n.untitledNote;
  }, [l18n.untitledNote]);

  const [title, setTitle] = React.useState(getTitleFromContent(currentNote.content));

  const converter = new Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
  });

  // Memoize the content extraction function with improved handling
  const getContentWithoutTitle = useCallback((content: string) => {
    const lines = content.split("\n");
    return lines.slice(1).join("\n");  // Remove .trim() to preserve spacing
  }, []);

  // Memoize the content combination function with improved spacing
  const combineContent = useCallback((newTitle: string, content: string): string => {
    const trimmedTitle = newTitle.trim();
    const processedContent = content.startsWith("\n") ? content : "\n" + content;
    return `${trimmedTitle}${processedContent}`;
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Delay the update slightly to ensure proper state handling
    setTimeout(() => {
      const contentWithoutTitle = getContentWithoutTitle(currentNote.content);
      updateNote(combineContent(newTitle, contentWithoutTitle));
    }, 0);
  }, [currentNote.content, getContentWithoutTitle, combineContent, updateNote]);

  const handleContentChange = useCallback((newContent: string) => {
    updateNote(combineContent(title, newContent));
  }, [title, combineContent, updateNote]);

  React.useEffect(() => {
    setTitle(getTitleFromContent(currentNote.content));
  }, [currentNote.id, getTitleFromContent, currentNote.content]);

  return (
    <div className="w-full h-screen bg-white">
      <div className="flex items-center justify-between p-4 border-t border-gray-100 border-b border-gray-200">
        <div className="flex-1 flex items-center gap-2">
          <div className="w-10 md:hidden"></div>
          <input
            id="note-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="flex-1 text-xl font-semibold text-gray-800 bg-transparent focus:outline-none"
            placeholder={l18n.untitledNote}
            aria-label="Note title"
          />
          {isSaving && (
            <span className="text-sm text-gray-500">Salvando...</span>
          )}
          {isLoading && (
            <span className="text-sm text-gray-500 ml-2">Carregando...</span>
          )}
        </div>
      </div>
      <div className="p-4">
        <ReactMde
          value={getContentWithoutTitle(currentNote.content)}
          onChange={handleContentChange}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          l18n={l18n}
          generateMarkdownPreview={(markdown: string): Promise<React.ReactNode> => {
            const html = converter.makeHtml(markdown);
            const purify = DOMPurify as {
              sanitize: (dirty: string, config?: Config) => string;
            };
            const sanitizedHtml = purify.sanitize(html, {
              ALLOWED_TAGS: [
                'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li',
                'a', 'strong', 'em',
                'code', 'pre', 'blockquote'
              ],
              ALLOWED_ATTR: [
                'href', 'target', 'rel', 'title',
                'aria-label', 'class'
              ],
              ALLOW_DATA_ATTR: false,
              ADD_ATTR: ['target'],
              FORBID_TAGS: ['style', 'script', 'iframe'],
              FORBID_ATTR: ['style', 'onerror', 'onload'],
              FORCE_BODY: true,
              SANITIZE_DOM: true,
              KEEP_CONTENT: true,
              RETURN_DOM_FRAGMENT: false,
              RETURN_DOM: false,
              ALLOW_UNKNOWN_PROTOCOLS: false
            });
            return Promise.resolve(
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
              </div>
            );
          }}
          minEditorHeight={75}
          heightUnits="vh"
          classes={{
            reactMde: "border-none shadow-none",
            toolbar: "border-none bg-gray-50 rounded-t-lg",
            preview: "prose max-w-none p-4 bg-gray-50 rounded-lg",
            textArea: "bg-gray-50 rounded-lg p-4 focus:outline-none"
          }}
        />
      </div>
      <style jsx global>{`
        .mde-header {
          border: none !important;
          background: none !important;
          padding: 0.5rem !important;
        }
        .mde-header .mde-tabs button {
          padding: 0.5rem 1rem !important;
          margin-right: 0.5rem !important;
          border-radius: 0.375rem !important;
          color: #4B5563 !important;
        }
        .mde-header .mde-tabs button.selected {
          background: #EFF6FF !important;
          color: #1D4ED8 !important;
          border: 1px solid #BFDBFE !important;
        }
        .mde-text {
          border: none !important;
        }
        .mde-preview {
          border: none !important;
          margin-top: 1rem !important;
        }
        .mde-header .svg-icon {
          width: 1rem !important;
          height: 1rem !important;
          margin: 0 0.25rem !important;
        }
        .mde-header .mde-header-group {
          margin-left: 0.5rem !important;
        }
        .mde-header .mde-header-group button {
          color: #4B5563 !important;
          padding: 0.25rem 0.5rem !important;
          border-radius: 0.375rem !important;
        }
        .mde-header .mde-header-group button:hover {
          background: #EFF6FF !important;
          color: #1D4ED8 !important;
        }
      `}</style>
    </div>
  );
};

export default Editor;
