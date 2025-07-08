"use client";

import { useState } from "react";
import Link from "next/link";
import { PaginationStatus } from "convex/react";
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
import { Document } from "../types/document";

interface DocumentsTableProps {
  documents: Document[] | undefined;
  loadMore: (numItems: number) => void;
  status: PaginationStatus;
}

export function DocumentsTable({
  documents,
  loadMore,
  status,
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
      <div className="max-w-screen-xl mx-auto px-16 py-6 flex flex-col gap-5">
        {documents === undefined ? (
          <div className="flex justify-center items-center h-24">
            <Loader className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-none">
                <TableHead>Name</TableHead>
                <TableHead className="w-12">&nbsp;</TableHead>
                <TableHead className="hidden md:table-cell">
                  Owner
                </TableHead>
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
                  <TableRow key={doc._id} className="cursor-pointer hover:bg-muted/50">
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
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {doc.ownerId}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
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
            onClick={() => loadMore(5)}
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