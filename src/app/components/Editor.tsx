"use client";

import React from "react";
import ReactMde from "react-mde";
import { Converter } from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";
import type { Note } from "../notas/[url]/page";

interface EditorProps {
  currentNote: Note | { id: number | null; content: string };
  updateNote: (text: string) => void;
}

const Editor: React.FC<EditorProps> = ({ currentNote, updateNote }) => {
  const [selectedTab, setSelectedTab] = React.useState<"write" | "preview">("write");

  const converter = new Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
  });

  return (
    <div className="w-full h-screen">
      <ReactMde
        value={currentNote.content}
        onChange={updateNote}
        selectedTab={selectedTab}
        onTabChange={(tab: "write" | "preview") => setSelectedTab(tab)}
        generateMarkdownPreview={(markdown: string): Promise<React.ReactNode> => {
          const html = converter.makeHtml(markdown);
          return Promise.resolve(<div dangerouslySetInnerHTML={{ __html: html }} />);
        }}
        minEditorHeight={80}
        heightUnits="vh"
      />
    </div>
  );
};

export default Editor;