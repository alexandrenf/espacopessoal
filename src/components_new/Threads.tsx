"use client";

import { Editor } from "@tiptap/react";

interface ThreadsProps {
  editor: Editor | null;
}

/**
 * Renders a placeholder container for future commenting or threads functionality within the editor.
 *
 * Intended to be extended with a commenting system in future development.
 */
export function Threads({ editor }: ThreadsProps) {
  // Placeholder for future commenting/threads functionality
  // This can be extended later with our own commenting system
  return (
    <div className="threads-container">
      {/* Future: Add commenting functionality here */}
      {/* For now, this is just a placeholder */}
    </div>
  );
} 