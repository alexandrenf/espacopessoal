import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SharedNotePageClient from "./ClientPage";
import { db } from "~/server/db";
import { z } from "zod";

interface PageProps {
  params: {
    url: string;
  };
}

const urlSchema = z.string()
  .min(3, "URL must be at least 3 characters long")
  .max(50, "URL must not exceed 50 characters")
  .regex(/^[a-zA-Z0-9-_]+$/, "URL can only contain letters, numbers, hyphens and underscores");

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const urlResult = urlSchema.safeParse(params.url);
  
  if (!urlResult.success) {
    return {
      title: "Invalid URL",
      description: "The provided URL format is invalid.",
    };
  }

  const url = urlResult.data;
  const note = await db.sharedNote.findUnique({
    where: { url },
    include: {
      note: {
        include: {
          createdBy: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!note) {
    return {
      title: "Note not found",
      description: "This shared note might have been deleted or never existed.",
    };
  }

  const content = note.note.content ?? "";
  const lines = content.split('\n');
  const title = lines[0]?.trim() ?? "Untitled Note";
  const description = lines[1]?.trim() ?? "No description available";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      authors: [note.note.createdBy?.name ?? "Unknown"],
      modifiedTime: note.note.updatedAt.toISOString(),
    },
  };
}

export default async function SharedNotePage({ params }: PageProps) {
  const { url } = params;
  const sharedNote = await db.sharedNote.findUnique({
    where: { url },
    include: {
      note: {
        include: {
          createdBy: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  if (!sharedNote) {
    notFound();
  }

  // If the note is private and requires password, we'll handle auth on the client

  return (
    <SharedNotePageClient 
      url={url}
      initialNotes={sharedNote.note ? [sharedNote.note] : undefined}
    />
  );
}
