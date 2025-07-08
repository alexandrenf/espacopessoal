"use client";

import React, { useMemo, useState, useEffect, memo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "../components_new/ui/button";  
import { ArrowLeft, FolderPlus, FilePlus, X } from "lucide-react";
import { ImSpinner8 } from "react-icons/im";
import Tree from 'rc-tree';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components_new/ui/dropdown-menu";
import DocumentItem from "./DocumentItem";
import FolderItem from "./FolderItem";
import type { EventDataNode, Key } from "rc-tree/lib/interface";
import { toast } from "sonner";
import { useConvexUser } from "../hooks/use-convex-user";

// Document interface
export interface Document {
  _id: Id<"documents">;
  title: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  organizationId?: string;
  initialContent?: string;
  roomId?: string;
  parentId?: Id<"documents">;
  order: number;
  isFolder: boolean;
}

// Extend DataNode to include level
interface CustomDataNode {
  key: string;
  title: React.ReactNode;
  children?: CustomDataNode[];
  isLeaf?: boolean;
  level?: number;
}

interface DocumentSidebarProps {
  currentDocument?: Document;
  setCurrentDocumentId: (id: Id<"documents">) => void;
  onToggleSidebar?: () => void;
  showSidebar?: boolean;
  isMobile?: boolean;
  onNavigateToHome?: () => void;
}

interface TreeDropInfo {
  node: EventDataNode<CustomDataNode>;
  dragNode: EventDataNode<CustomDataNode>;
  dragNodesKeys: Key[];
  dropPosition: number;
  dropToGap: boolean;
}

const DocumentSidebar = memo(({
  currentDocument,
  setCurrentDocumentId,
  onToggleSidebar,
  showSidebar = true,
  isMobile = false,
  onNavigateToHome,
}: DocumentSidebarProps) => {
  // Get authenticated user
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const userIdString = convexUserId ? String(convexUserId) : "demo-user";
  
  // Convex queries and mutations
  const documents = useQuery(
    api.documents.getAllForTree, 
    !isUserLoading && userIdString ? { userId: userIdString } : "skip"
  ) ?? [];
  const createDocument = useMutation(api.documents.create);
  const createFolder = useMutation(api.documents.createFolder);
  const deleteDocument = useMutation(api.documents.removeById);
  const updateStructure = useMutation(api.documents.updateStructure);

  // Local state
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<Id<"documents">>();

  // Add effect to expand parent folder when a document is selected
  useEffect(() => {
    if (currentDocument?.parentId) {
      const parentId = currentDocument.parentId;
      setExpandedKeys(prevKeys => {
        const parentKey = parentId.toString();
        if (!prevKeys.includes(parentKey)) {
          return [...prevKeys, parentKey];
        }
        return prevKeys;
      });
    }
  }, [currentDocument?.parentId]);

    const handleExpand = (e: React.MouseEvent, node: EventDataNode<unknown>) => {
    const key = node.key as string;
    setExpandedKeys(prevKeys => {
      const index = prevKeys.indexOf(key);
      if (index > -1) {
        // Remove key if it exists (collapse)
        return prevKeys.filter(k => k !== key);
      } else {
        // Add key if it doesn't exist (expand)
        return [...prevKeys, key];
      }
    });
  };

  const handleDeleteDocument = async (e: React.MouseEvent<Element>, id: Id<"documents">) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDeletingId(id);
    try {
      await deleteDocument({ id, userId: userIdString });
      toast.success("Item deleted!");
      
      // If we deleted the current document, navigate to home
      if (id === currentDocument?._id && onNavigateToHome) {
        onNavigateToHome();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete item";
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsDeletingId(undefined);
    }
  };

  // Convert documents to rc-tree format
  const treeData = useMemo(() => {
    const makeTreeNode = (document: Document, level = 0): CustomDataNode => ({
      key: document._id.toString(),
      title: document.isFolder ? (
        <FolderItem
          folder={document}
          isActive={currentDocument?._id === document._id}
          onDelete={handleDeleteDocument}
          onClick={() => !document.isFolder && setCurrentDocumentId(document._id)}
          expanded={expandedKeys.includes(document._id.toString())}
          onExpand={handleExpand}
          eventKey={document._id.toString()}
        />
      ) : (
        <DocumentItem
          document={document}
          currentDocumentId={currentDocument?._id}
          onDelete={handleDeleteDocument}
          isDeletingId={isDeletingId}
          onSelect={() => setCurrentDocumentId(document._id)}
          selected={currentDocument?._id === document._id}
          isNested={level > 0}
        />
      ),
      children: document.isFolder
        ? documents
            .filter((d: Document) => d.parentId === document._id)
            .sort((a: Document, b: Document) => a.order - b.order)
            .map((d: Document) => makeTreeNode(d, level + 1))
        : undefined,
      isLeaf: !document.isFolder,
      level,
    });

    return documents
      .filter((document: Document) => document.parentId === undefined)
      .sort((a: Document, b: Document) => a.order - b.order)
      .map((document: Document) => makeTreeNode(document, 0));
  }, [documents, currentDocument?._id, isDeletingId, expandedKeys]);

  const handleNewDocument = async () => {
    setIsCreating(true);
    try {
      console.log('Creating document with userId:', userIdString);
      const documentId = await createDocument({
        title: "Untitled Document",
        userId: userIdString,
      });
      console.log('Document created with ID:', documentId);
      toast.success("Document created!");
      setCurrentDocumentId(documentId);
    } catch (error) {
      toast.error("Failed to create document");
      console.error('Document creation error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewFolder = async () => {
    setIsCreating(true);
    try {
      await createFolder({
        title: "New Folder",
        userId: userIdString,
      });
      toast.success("Folder created!");
    } catch (error) {
      toast.error("Failed to create folder");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDrop = (info: TreeDropInfo) => {
    const dropKey = String(info.node.key);
    const dragKey = String(info.dragNode.key);
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const dragDocument = documents.find((d: Document) => d._id.toString() === dragKey);
    const dropDocument = documents.find((d: Document) => d._id.toString() === dropKey);

    if (!dragDocument || !dropDocument) return;

    const updatedDocuments = documents.map((doc: Document) => ({ ...doc }));
    let newParentId: Id<"documents"> | undefined = undefined;

    // Handle dropping into a folder
    if (dropPosition === 0 && dropDocument.isFolder) {
      newParentId = dropDocument._id;
      
      // Get existing documents in the target folder
      const documentsInFolder = updatedDocuments
        .filter((d: Document) => d.parentId === newParentId && d._id !== dragDocument._id)
        .sort((a: Document, b: Document) => a.order - b.order);

      // Update the dragged document
      const dragDocumentIndex = updatedDocuments.findIndex((d: Document) => d._id === dragDocument._id);
      updatedDocuments[dragDocumentIndex] = {
        ...dragDocument,
        parentId: newParentId,
        order: documentsInFolder.length
      };

      // Update orders for all affected documents
      updatedDocuments.forEach((doc: Document) => {
        if (doc.parentId === dragDocument.parentId && doc.order > dragDocument.order) {
          doc.order -= 1;
        }
      });
    } else {
      // Handle dropping between documents
      newParentId = dropDocument.parentId;
      
      // Get all documents at the target level (excluding the dragged document)
      const documentsInLevel = updatedDocuments
        .filter((d: Document) => d.parentId === newParentId && d._id !== dragDocument._id)
        .sort((a: Document, b: Document) => a.order - b.order);

      const dropIndex = documentsInLevel.findIndex((d: Document) => d._id === dropDocument._id);
      const targetIndex = dropPosition < 0 ? dropIndex : dropIndex + 1;

      // Remove document from its current position
      const dragDocumentIndex = updatedDocuments.findIndex((d: Document) => d._id === dragDocument._id);
      const oldParentId = dragDocument.parentId;
      const oldOrder = dragDocument.order;

      // Update orders in the source folder
      updatedDocuments.forEach((doc: Document) => {
        if (doc.parentId === oldParentId && doc.order > oldOrder) {
          doc.order -= 1;
        }
      });

      // Insert at new position
      updatedDocuments[dragDocumentIndex] = {
        ...dragDocument,
        parentId: newParentId,
        order: targetIndex
      };

      // Update orders in the target folder
      updatedDocuments.forEach((doc: Document) => {
        if (doc.parentId === newParentId && doc._id !== dragDocument._id && doc.order >= targetIndex) {
          doc.order += 1;
        }
      });
    }

    // Normalize orders to ensure they are sequential
    const normalizeOrders = (parentId: Id<"documents"> | undefined) => {
      const documentsInLevel = updatedDocuments
        .filter((d: Document) => d.parentId === parentId)
        .sort((a: Document, b: Document) => a.order - b.order);
      
      documentsInLevel.forEach((doc: Document, index: number) => {
        const docIndex = updatedDocuments.findIndex((d: Document) => d._id === doc._id);
        updatedDocuments[docIndex]!.order = index;
      });
    };

    // Normalize orders for both source and target folders
    normalizeOrders(dragDocument.parentId);
    if (dragDocument.parentId !== newParentId) {
      normalizeOrders(newParentId);
    }
    
    // Update the structure in the database immediately
    updateStructure({
      updates: updatedDocuments.map((d: Document) => ({
        id: d._id,
        parentId: d.parentId,
        order: d.order
      })),
      userId: "demo-user"
    }).catch(error => {
      console.error("Failed to update structure:", error);
      toast.error("Failed to update document structure");
    });
  };

  // Debug logging
  console.log('DocumentSidebar render:', {
    isUserLoading,
    userIdString,
    documentsLength: documents.length,
    convexUserId,
    documents: documents.slice(0, 3) // First 3 documents for debugging
  });

  return (
    <section className={`w-full h-full md:h-screen flex flex-col bg-white ${isMobile ? 'fixed top-16 left-0 right-0 bottom-0 z-50' : ''}`}>
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onToggleSidebar && showSidebar && (
            <Button
              onClick={onToggleSidebar}
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-gray-100"
            >
              {isMobile ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </Button>
          )}
          <h1 className="text-xl font-semibold text-gray-800">
            Documents {isUserLoading && <span className="text-sm text-gray-500">(Loading user...)</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isCreating}
                variant="outline"
                size="icon"
                className="bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border-blue-200 hover:border-blue-300 text-blue-700"
              >
                {isCreating ? (
                  <ImSpinner8 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-lg">+</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleNewDocument} className="flex items-center gap-2 py-2">
                <FilePlus className="h-4 w-4" />
                <span>New Document</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNewFolder} className="flex items-center gap-2 py-2">
                <FolderPlus className="h-4 w-4" />
                <span>New Folder</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {isUserLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No documents found</p>
            <p className="text-sm mt-2">Create your first document using the + button above</p>
          </div>
        ) : (
          <Tree
            treeData={treeData}
            draggable={!isMobile}
            onDrop={handleDrop}
            onSelect={([selectedKey]) => {
              if (selectedKey) {
                const selectedDoc = documents.find(d => d._id.toString() === selectedKey);
                if (selectedDoc && !selectedDoc.isFolder) {
                  setCurrentDocumentId(selectedDoc._id);
                  if (isMobile && onToggleSidebar) {
                    onToggleSidebar();
                  }
                }
              }
            }}
            selectedKeys={currentDocument && !currentDocument.isFolder ? [currentDocument._id.toString()] : []}
            expandedKeys={expandedKeys}
            onExpand={(expanded) => setExpandedKeys(expanded as string[])}
            motion={false}
            prefixCls="custom-tree"
            className={`custom-tree-container ${isMobile ? 'px-2' : ''}`}
            defaultExpandAll={false}
            defaultExpandedKeys={[]}
          />
        )}
      </div>
    </section>
  );
});

DocumentSidebar.displayName = 'DocumentSidebar';

export default DocumentSidebar; 