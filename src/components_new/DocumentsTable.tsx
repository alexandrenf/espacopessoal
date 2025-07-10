"use client";

import { useState } from "react";
import Link from "next/link";
import { type PaginationStatus } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatDate } from "../lib/utils";
import { Button } from "../components_new/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components_new/ui/table";
import { Loader } from "lucide-react";
import { DocumentActionsMenu } from "./DocumentActionsMenu";
import { RenameDialog } from "./RenameDialog";
import { type Document } from "../types/document";

// Configurable pagination size
const DEFAULT_PAGE_SIZE = 5;

interface DocumentsTableProps {
  documents: Document[] | undefined;
  loadMore: (numItems: number) => void;
  status: PaginationStatus;
  pageSize?: number;
}

// Component to fetch and display owner name
function OwnerCell({ ownerId }: { ownerId: string }) {
  const owner = useQuery(
    api.users.getByNextAuthId,
    ownerId && ownerId !== "demo-user" ? { nextAuthId: ownerId } : "skip",
  );

  if (ownerId === "demo-user") {
    return <span className="text-xs text-muted-foreground">Demo User</span>;
  }

  if (owner === undefined) {
    return <Loader className="h-3 w-3 animate-spin text-muted-foreground" />;
  }

  return (
    <span className="text-xs text-muted-foreground">
      {owner?.name ?? "Unknown owner"}
    </span>
  );
}

export function DocumentsTable({
  documents,
  loadMore,
  status,
  pageSize = DEFAULT_PAGE_SIZE,
}: DocumentsTableProps) {
  const [renameDocument, setRenameDocument] = useState<Document | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  const handleRename = (document: Document) => {
    setRenameDocument(document);
    setIsRenameDialogOpen(true);
  };

  const handleCloseRenameDialog = () => {
    setIsRenameDialogOpen(false);
    setRenameDocument(null);
  };

  return (
    <>
      <div className="mx-auto flex max-w-screen-xl flex-col gap-5 px-16 py-6">
        {documents === undefined ? (
          <div className="flex h-24 items-center justify-center">
            <Loader className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-none hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="w-12">&nbsp;</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            {documents.length === 0 ? (
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No documents found.
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {documents.map((doc) => (
                  <TableRow
                    key={doc._id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium md:w-[45%]">
                      <Link
                        href={`/documents/${doc._id}`}
                        className="block hover:underline"
                      >
                        {doc.title}
                      </Link>
                    </TableCell>
                    <TableCell className="w-12">
                      <DocumentActionsMenu
                        document={doc}
                        onRename={handleRename}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <OwnerCell ownerId={doc.ownerId} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {formatDate(doc.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadMore(pageSize)}
            disabled={status !== "CanLoadMore"}
          >
            {status === "CanLoadMore" ? "Load more" : "No more documents."}
          </Button>
        </div>
      </div>

      <RenameDialog
        document={renameDocument}
        open={isRenameDialogOpen}
        onOpenChange={handleCloseRenameDialog}
      />
    </>
  );
}
