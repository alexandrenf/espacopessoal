import { Id } from "../../convex/_generated/dataModel";

export type Document = {
  _id: Id<"documents">;
  title: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  organizationId?: string;
  initialContent?: string;
  roomId?: string;
};

// UI-specific extension for tree components that need additional fields
export type DocumentWithTreeProps = Document & {
  parentId?: Id<"documents">;
  order: number;
  isFolder: boolean;
}; 