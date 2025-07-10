"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FileText, Calendar, User as UserIcon } from "lucide-react";
import { Converter } from "showdown";
import DOMPurify from "dompurify";
import type { Config } from "dompurify";
import Header from "~/app/components/Header";
import { useEffect, useState, useMemo } from "react";

// Define the type for the note data returned from the API
type NoteWithUser = {
  id: number;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
  parentId: number | null;
  isFolder: boolean;
  order: number;
  createdById: string;
  createdBy: {
    name: string | null;
  } | null;
};

interface SharedNotePageProps {
  url: string;
  initialNotes?: NoteWithUser[];
}

export default function SharedNotePageClient({
  initialNotes,
}: Omit<SharedNotePageProps, "url">) {
  const [sanitizedHtml, setSanitizedHtml] = useState<string>("");

  // Use the initialNotes passed from the server-side component
  const notes = initialNotes ?? [];
  const note = notes[0];

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

  useEffect(() => {
    if (!note?.content || typeof window === "undefined") return;

    const lines = note.content.split("\n");
    const content = lines.slice(1).join("\n");
    const html = converter.makeHtml(content);

    const purify = DOMPurify as {
      sanitize: (dirty: string, config?: Config) => string;
    };

    const sanitized = purify.sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "a",
        "strong",
        "em",
        "code",
        "pre",
        "blockquote",
        "input",
      ],
      ALLOWED_ATTR: [
        "href",
        "target",
        "rel",
        "title",
        "aria-label",
        "class",
        "type",
        "checked",
      ],
      SAFE_FOR_TEMPLATES: true,
    });

    setSanitizedHtml(sanitized);
  }, [note?.content, converter]);

  if (!note) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-2xl font-bold">Nota não encontrada</h2>
          <p className="text-muted-foreground">
            A nota compartilhada não existe ou foi removida.
          </p>
        </div>
      </div>
    );
  }

  const lines = (note.content ?? "").split("\n");
  const title = lines[0]?.trim() ?? "Untitled Note";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-background"
      >
        <Header />

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Title and Metadata */}
          <div className="mb-8 space-y-4">
            <div className="flex items-start gap-4">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="rounded-lg bg-primary/10 p-2 dark:bg-primary/20"
              >
                <FileText className="h-5 w-5 text-primary" />
              </motion.div>
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                <span>Por {note.createdBy?.name ?? "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div
              className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-blockquote:text-muted-foreground prose-strong:text-foreground prose-code:text-muted-foreground prose-pre:bg-muted prose-li:text-muted-foreground [&_input[type=checkbox]]:accent-primary"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
