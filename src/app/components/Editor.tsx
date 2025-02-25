"use client";

import React, { useCallback } from "react";
import ReactMde from "react-mde";
import { Converter } from "showdown";
import DOMPurify from "dompurify";
import type { Config } from "dompurify";
import "react-mde/lib/styles/css/react-mde-all.css";
import type { Note } from "../notas/[url]/page";

interface EditorProps {
  currentNote: Note | { id: number | null; content: string };
  updateNote: (text: string) => void;
}

const Editor: React.FC<EditorProps> = ({ currentNote, updateNote }) => {
  const [selectedTab, setSelectedTab] = React.useState<"write" | "preview">("write");

  const l18n = {
    write: "Escrever",
    preview: "Visualizar",
    uploadingImage: "Uploading image...",
    pasteDropSelect: "Click to paste an image, or drag and drop",
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

  // Memoize the content extraction function
  const getContentWithoutTitle = useCallback((content: string) => {
    const lines = content.split("\n");
    return lines.slice(1).join("\n").trim();
  }, []);

  // Memoize the content combination function
  const combineContent = useCallback((newTitle: string, content: string): string => {
    return `${newTitle}\n${content}`;
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    const contentWithoutTitle = getContentWithoutTitle(currentNote.content);
    updateNote(combineContent(newTitle, contentWithoutTitle));
  }, [currentNote.content, getContentWithoutTitle, combineContent, updateNote]);

  const handleContentChange = useCallback((newContent: string) => {
    updateNote(combineContent(title, newContent));
  }, [title, combineContent, updateNote]);

  React.useEffect(() => {
    setTitle(getTitleFromContent(currentNote.content));
  }, [currentNote.id, getTitleFromContent, currentNote.content]);

  return (
    <div className="w-full h-screen bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          {/* Smaller space for the mobile toggle button */}
          <div className="w-10 md:hidden"></div>
          <label htmlFor="note-title" className="sr-only">Note Title</label>
          <input
            id="note-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="flex-1 text-xl font-semibold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded pl-0 py-1"
            placeholder={l18n.untitledNote}
            aria-label="Note title"
          />
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
