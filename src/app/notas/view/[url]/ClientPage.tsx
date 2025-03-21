"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FileText, Calendar, User as UserIcon } from "lucide-react";
import { Converter } from "showdown";
import DOMPurify from "dompurify";
import type { Config } from "dompurify";
import Header from "~/app/components/Header";
import { api } from "~/trpc/react";
import type { Notepad, User } from "@prisma/client";
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
  createdBy: {
    name: string | null;
  } | null;
};

interface SharedNotePageProps {
  url: string;
  initialNotes?: NoteWithUser[];
}

export default function SharedNotePageClient({ 
  url, 
  initialNotes,
}: SharedNotePageProps) {
  const [sanitizedHtml, setSanitizedHtml] = useState<string>("");
  
  const { data: notes } = api.notes.fetchNotesPublic.useQuery<NoteWithUser[]>(
    { url },
    {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      initialData: initialNotes,
      enabled: !initialNotes
    }
  );

  const note = notes?.[0];
  
  const converter = useMemo(() => new Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
  }), []);

  useEffect(() => {
    if (!note?.content || typeof window === 'undefined') return;

    const lines = note.content.split('\n');
    const content = lines.slice(1).join('\n');
    const html = converter.makeHtml(content);
    
    const purify = DOMPurify as {
      sanitize: (dirty: string, config?: Config) => string;
    };
    
    const sanitized = purify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'strong', 'em',
        'code', 'pre', 'blockquote', 'input'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'title', 'aria-label', 'class', 'type', 'checked']
    });
    
    setSanitizedHtml(sanitized);
  }, [note?.content, converter]);

  if (!note) {
    return null;
  }

  const lines = (note.content ?? '').split('\n');
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
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Title and Metadata */}
          <div className="mb-8 space-y-4">
            <div className="flex items-start gap-4">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="p-2 bg-primary/10 rounded-lg dark:bg-primary/20"
              >
                <FileText className="h-5 w-5 text-primary" />
              </motion.div>
              <h1 className="text-3xl font-bold text-foreground">
                {title}
              </h1>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                <span>
                  Por {note.createdBy?.name ?? "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div
              className="prose prose-slate dark:prose-invert max-w-none
                prose-headings:text-foreground
                prose-p:text-muted-foreground
                prose-a:text-primary
                prose-strong:text-foreground
                prose-code:text-muted-foreground
                prose-pre:bg-muted
                prose-blockquote:text-muted-foreground
                prose-li:text-muted-foreground
                [&_input[type=checkbox]]:accent-primary"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
