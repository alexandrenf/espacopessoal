"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { DocumentEditor } from "../../../components_new/DocumentEditor";
import { Loader } from "lucide-react";

export default function DocumentPage() {
  const { documentId } = useParams();
  
  const document = useQuery(
    api.documents.getById, 
    { id: documentId as Id<"documents"> }
  );

  if (document === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Document Not Found</h1>
          <p className="text-muted-foreground">The document you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  return <DocumentEditor document={document} />;
} 