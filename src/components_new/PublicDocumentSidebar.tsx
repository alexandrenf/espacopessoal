"use client";

import React, { useMemo, useState, useEffect, memo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import { Button } from "../components_new/ui/button";
import { ArrowLeft, X, FileText, Eye } from "lucide-react";
import Tree from "rc-tree";
import DocumentItem from "./DocumentItem";
import FolderItem from "./FolderItem";
import type { EventDataNode } from "rc-tree/lib/interface";
import { type DocumentWithTreeProps } from "../types/document";
import "./DocumentSidebar.css";

// Extend DataNode to include level
interface CustomDataNode {
  key: string;
  title: React.ReactNode;
  children?: CustomDataNode[];
  isLeaf?: boolean;
  level?: number;
}

interface PublicDocumentSidebarProps {
  currentDocument?: DocumentWithTreeProps;
  onDocumentSelect: (id: Id<"documents">) => void;
  onToggleSidebar?: () => void;
  showSidebar?: boolean;
  isMobile?: boolean;
  notebookId: Id<"notebooks">;
  notebookTitle?: string;
  notebookUrl?: string;
}

const PublicDocumentSidebar = memo(
  ({
    currentDocument,
    onDocumentSelect,
    onToggleSidebar,
    showSidebar = true,
    isMobile = false,
    notebookId,
    notebookTitle,
  }: PublicDocumentSidebarProps) => {
    // Fetch documents for public notebook (no userId required)
    const documentsQuery = useQuery(api.documents.getAllForTreeLegacy, {
      notebookId,
      limit: 200,
    });
    const documents = useMemo(() => documentsQuery ?? [], [documentsQuery]);

    // Local state for UI
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

    // Add effect to expand parent folder when a document is selected
    useEffect(() => {
      if (currentDocument?.parentId) {
        const parentId = currentDocument.parentId;
        setExpandedKeys((prevKeys) => {
          const parentKey = parentId.toString();
          if (!prevKeys.includes(parentKey)) {
            // Also expand all ancestor folders
            const ancestors: string[] = [parentKey];
            let currentParent = documents.find((d) => d._id === parentId);
            while (currentParent?.parentId) {
              ancestors.push(currentParent.parentId.toString());
              currentParent = documents.find(
                (d) => d._id === currentParent?.parentId,
              );
            }
            return [...prevKeys, ...ancestors];
          }
          return prevKeys;
        });
      }
    }, [currentDocument?.parentId, documents]);

    const handleExpand = useCallback(
      (e: React.MouseEvent, node: EventDataNode<unknown>) => {
        const key = node.key as string;
        setExpandedKeys((prevKeys) => {
          const index = prevKeys.indexOf(key);
          if (index > -1) {
            // Remove key if it exists (collapse)
            return prevKeys.filter((k) => k !== key);
          } else {
            // Add key if it doesn't exist (expand)
            return [...prevKeys, key];
          }
        });
      },
      [],
    );

    // Optimized tree data conversion with better performance
    const treeData = useMemo(() => {
      if (!documents.length) return [];

      // Pre-build maps for O(1) lookups instead of O(n) filters
      const documentMap = new Map<string, DocumentWithTreeProps>();
      const childrenMap = new Map<string, DocumentWithTreeProps[]>();
      const rootDocuments: DocumentWithTreeProps[] = [];

      // First pass: build maps
      documents.forEach((doc: DocumentWithTreeProps) => {
        documentMap.set(doc._id, doc);

        if (doc.parentId) {
          const parentId = doc.parentId.toString();
          if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
          }
          childrenMap.get(parentId)!.push(doc);
        } else {
          rootDocuments.push(doc);
        }
      });

      // Sort children once for each parent
      childrenMap.forEach((children) => {
        children.sort((a, b) => a.order - b.order);
      });

      // Sort root documents
      rootDocuments.sort((a, b) => a.order - b.order);

      const makeTreeNode = (
        document: DocumentWithTreeProps,
        level = 0,
      ): CustomDataNode => {
        const children = childrenMap.get(document._id) ?? [];

        return {
          key: document._id.toString(),
          title: document.isFolder ? (
            <FolderItem
              folder={document}
              isActive={currentDocument?._id === document._id}
              onDelete={() => {
                // No delete functionality for public view
              }}
              onClick={() =>
                !document.isFolder && onDocumentSelect(document._id)
              }
              expanded={expandedKeys.includes(document._id.toString())}
              onExpand={handleExpand}
              eventKey={document._id.toString()}
              isPublicView={true} // Add public view flag
            />
          ) : (
            <DocumentItem
              document={document}
              currentDocumentId={currentDocument?._id}
              onDelete={() => {
                // No delete functionality for public view
              }}
              isDeletingId={undefined}
              onSelect={() => onDocumentSelect(document._id)}
              selected={currentDocument?._id === document._id}
              isNested={level > 0}
              isPublicView={true} // Add public view flag
            />
          ),
          children: document.isFolder
            ? children.map((d: DocumentWithTreeProps) =>
                makeTreeNode(d, level + 1),
              )
            : undefined,
          isLeaf: !document.isFolder,
          level,
        };
      };

      return rootDocuments.map((document: DocumentWithTreeProps) =>
        makeTreeNode(document, 0),
      );
    }, [
      documents,
      currentDocument?._id,
      expandedKeys,
      onDocumentSelect,
      handleExpand,
    ]);

    const isLoading = documentsQuery === undefined;

    return (
      <section
        className={`flex h-full w-full flex-col border-r border-gray-200 bg-white md:h-screen ${isMobile ? "sidebar-fade-in fixed bottom-0 left-0 right-0 top-0 z-50 shadow-xl" : ""}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white p-4">
          <div className="flex items-center gap-3">
            {onToggleSidebar && showSidebar && (
              <Button
                onClick={onToggleSidebar}
                variant="ghost"
                size="icon"
                className="transition-colors hover:bg-blue-100 md:hidden"
              >
                {isMobile ? (
                  <X className="h-5 w-5 text-gray-600" />
                ) : (
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                )}
              </Button>
            )}
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                <FileText className="h-5 w-5 text-blue-600" />
                {notebookTitle ?? "Public Notebook"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Eye className="h-3 w-3" />
                <span>Public View (Read-only)</span>
              </div>
            </div>
          </div>

          {/* Desktop collapse button */}
          {onToggleSidebar && (
            <Button
              onClick={onToggleSidebar}
              variant="ghost"
              size="icon"
              className="hidden transition-colors hover:bg-blue-100 md:flex"
              title="Collapse sidebar"
            >
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </Button>
          )}
        </div>

        <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-500">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="font-medium text-gray-600">No documents found</p>
              <p className="mt-2 text-sm text-gray-500">
                This public notebook doesn&apos;t contain any documents yet
              </p>
            </div>
          ) : (
            <Tree
              treeData={treeData}
              // Disable drag and drop for public view
              draggable={false}
              onSelect={([selectedKey]) => {
                if (selectedKey) {
                  const selectedDoc = documents.find(
                    (d) => d._id.toString() === selectedKey,
                  );
                  if (selectedDoc && !selectedDoc.isFolder) {
                    onDocumentSelect(selectedDoc._id);
                    // Add smooth transition for mobile
                    if (isMobile && onToggleSidebar) {
                      setTimeout(() => {
                        onToggleSidebar();
                      }, 150); // Small delay for visual feedback
                    }
                  }
                }
              }}
              selectedKeys={
                currentDocument && !currentDocument.isFolder
                  ? [currentDocument._id.toString()]
                  : []
              }
              expandedKeys={expandedKeys}
              onExpand={(expanded) => setExpandedKeys(expanded as string[])}
              motion={false}
              prefixCls="custom-tree"
              className={`custom-tree-container ${isMobile ? "px-2" : "px-3"}`}
              defaultExpandAll={false}
              defaultExpandedKeys={[]}
              // Selection props
              multiple={false}
              autoExpandParent={true}
              showIcon={false}
              showLine={false}
            />
          )}
        </div>
      </section>
    );
  },
);

PublicDocumentSidebar.displayName = "PublicDocumentSidebar";

export default PublicDocumentSidebar;
