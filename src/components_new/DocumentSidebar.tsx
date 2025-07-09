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
import { DocumentWithTreeProps } from "../types/document";

// Extend DataNode to include level
interface CustomDataNode {
  key: string;
  title: React.ReactNode;
  children?: CustomDataNode[];
  isLeaf?: boolean;
  level?: number;
}

interface DocumentSidebarProps {
  currentDocument?: DocumentWithTreeProps;
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
  const userIdString = convexUserId ? String(convexUserId) : null;
  
  // Convex queries and mutations
  const documents = useQuery(
    api.documents.getAllForTree, 
    !isUserLoading && userIdString ? { userId: userIdString } : "skip"
  ) ?? [];
  const createDocument = useMutation(api.documents.create);
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
    
    if (!userIdString) {
      toast.error("User authentication required to delete documents");
      return;
    }
    
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
    const makeTreeNode = (document: DocumentWithTreeProps, level = 0): CustomDataNode => ({
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
            .filter((d: DocumentWithTreeProps) => d.parentId === document._id)
            .sort((a: DocumentWithTreeProps, b: DocumentWithTreeProps) => a.order - b.order)
            .map((d: DocumentWithTreeProps) => makeTreeNode(d, level + 1))
        : undefined,
      isLeaf: !document.isFolder,
      level,
    });

    return documents
      .filter((document: DocumentWithTreeProps) => document.parentId === undefined)
      .sort((a: DocumentWithTreeProps, b: DocumentWithTreeProps) => a.order - b.order)
      .map((document: DocumentWithTreeProps) => makeTreeNode(document, 0));
  }, [documents, currentDocument?._id, isDeletingId, expandedKeys]);

  const handleNewDocument = async (eventOrRetryCount?: React.MouseEvent | number) => {
    const retryCount = typeof eventOrRetryCount === 'number' ? eventOrRetryCount : 0;
    setIsCreating(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Creating document with userId:', userIdString);
      }
      
      if (!userIdString) {
        throw new Error("User authentication required to create documents");
      }
      
      const documentId = await createDocument({
        title: "Untitled Document",
        userId: userIdString,
      });
      
      if (!documentId) {
        throw new Error("Document creation returned invalid ID");
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Document created with ID:', documentId);
      }
      toast.success("Document created successfully!");
      setCurrentDocumentId(documentId);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Document creation error:', error);
      }
      
      let errorMessage = "Failed to create document";
      let shouldRetry = false;
      
      if (error instanceof Error) {
        if (error.message.includes("authentication") || error.message.includes("User")) {
          errorMessage = "Please sign in to create documents";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
          shouldRetry = retryCount < 2;
        } else if (error.message.includes("rate limit") || error.message.includes("too many")) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
        } else if (error.message.includes("invalid") || error.message.includes("ID")) {
          errorMessage = "Server error occurred. Please try again.";
          shouldRetry = retryCount < 1;
        } else {
          errorMessage = `Creation failed: ${error.message}`;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage + (shouldRetry ? " Retrying..." : ""));
      
      // Retry logic for network errors
      if (shouldRetry) {
        setTimeout(() => {
          void handleNewDocument(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewFolder = async (eventOrRetryCount?: React.MouseEvent | number) => {
    const retryCount = typeof eventOrRetryCount === 'number' ? eventOrRetryCount : 0;
    setIsCreating(true);
    try {
      if (!userIdString) {
        throw new Error("User authentication required to create folders");
      }
      
      const folderId = await createDocument({
        title: "New Folder",
        userId: userIdString,
        isFolder: true,
      });
      
      if (!folderId) {
        throw new Error("Folder creation returned invalid ID");
      }
      
      toast.success("Folder created successfully!");
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Folder creation error:', error);
      }
      
      let errorMessage = "Failed to create folder";
      let shouldRetry = false;
      
      if (error instanceof Error) {
        if (error.message.includes("authentication") || error.message.includes("User")) {
          errorMessage = "Please sign in to create folders";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
          shouldRetry = retryCount < 2;
        } else if (error.message.includes("rate limit") || error.message.includes("too many")) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
        } else if (error.message.includes("invalid") || error.message.includes("ID")) {
          errorMessage = "Server error occurred. Please try again.";
          shouldRetry = retryCount < 1;
        } else {
          errorMessage = `Creation failed: ${error.message}`;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage + (shouldRetry ? " Retrying..." : ""));
      
      // Retry logic for network errors
      if (shouldRetry) {
        setTimeout(() => {
          void handleNewFolder(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Helper function to normalize orders to ensure they are sequential
  const normalizeOrders = (
    documents: DocumentWithTreeProps[], 
    parentId: Id<"documents"> | undefined
  ): DocumentWithTreeProps[] => {
    const documentsInLevel = documents
      .filter((d: DocumentWithTreeProps) => d.parentId === parentId)
      .sort((a: DocumentWithTreeProps, b: DocumentWithTreeProps) => a.order - b.order);
    
    const normalizedDocumentIds = new Set(documentsInLevel.map(doc => doc._id));
    
    return documents.map((doc: DocumentWithTreeProps) => {
      if (normalizedDocumentIds.has(doc._id)) {
        const normalizedIndex = documentsInLevel.findIndex((d: DocumentWithTreeProps) => d._id === doc._id);
        return {
          ...doc,
          order: normalizedIndex
        };
      }
      return doc;
    });
  };

  // Helper function to update orders in source folder after removing a document
  const updateOrdersInSourceFolder = (
    documents: DocumentWithTreeProps[],
    sourceParentId: Id<"documents"> | undefined,
    sourceOrder: number
  ): DocumentWithTreeProps[] => {
    return documents.map((doc: DocumentWithTreeProps) => {
      if (doc.parentId === sourceParentId && doc.order > sourceOrder) {
        return {
          ...doc,
          order: doc.order - 1
        };
      }
      return doc;
    });
  };

  // Helper function to update orders in target folder after insertion
  const updateOrdersInTargetFolder = (
    documents: DocumentWithTreeProps[],
    targetParentId: Id<"documents"> | undefined,
    targetIndex: number,
    dragDocumentId: Id<"documents">
  ): DocumentWithTreeProps[] => {
    return documents.map((doc: DocumentWithTreeProps) => {
      if (doc.parentId === targetParentId && doc._id !== dragDocumentId && doc.order >= targetIndex) {
        return {
          ...doc,
          order: doc.order + 1
        };
      }
      return doc;
    });
  };

  // Helper function to handle dropping into a folder
  const handleDropIntoFolder = (
    documents: DocumentWithTreeProps[],
    dragDocument: DocumentWithTreeProps,
    targetFolderId: Id<"documents">
  ): DocumentWithTreeProps[] => {
    // Get existing documents in the target folder
    const documentsInFolder = documents
      .filter((d: DocumentWithTreeProps) => d.parentId === targetFolderId && d._id !== dragDocument._id)
      .sort((a: DocumentWithTreeProps, b: DocumentWithTreeProps) => a.order - b.order);

    // Update the dragged document
    const updatedDocuments = documents.map((doc: DocumentWithTreeProps) => {
      if (doc._id === dragDocument._id) {
        return {
          ...dragDocument,
          parentId: targetFolderId,
          order: documentsInFolder.length
        };
      }
      return doc;
    });

    // Update orders in source folder
    return updateOrdersInSourceFolder(updatedDocuments, dragDocument.parentId, dragDocument.order);
  };

  // Helper function to handle dropping between documents
  const handleDropBetweenDocuments = (
    documents: DocumentWithTreeProps[],
    dragDocument: DocumentWithTreeProps,
    dropDocument: DocumentWithTreeProps,
    dropPosition: number
  ): { updatedDocuments: DocumentWithTreeProps[], targetParentId: Id<"documents"> | undefined } => {
    const targetParentId = dropDocument.parentId;
    
    // Get all documents at the target level (excluding the dragged document)
    const documentsInLevel = documents
      .filter((d: DocumentWithTreeProps) => d.parentId === targetParentId && d._id !== dragDocument._id)
      .sort((a: DocumentWithTreeProps, b: DocumentWithTreeProps) => a.order - b.order);

    const dropIndex = documentsInLevel.findIndex((d: DocumentWithTreeProps) => d._id === dropDocument._id);
    const targetIndex = dropPosition < 0 ? dropIndex : dropIndex + 1;

    // Update orders in source folder
    let updatedDocuments = updateOrdersInSourceFolder(documents, dragDocument.parentId, dragDocument.order);

    // Insert at new position
    updatedDocuments = updatedDocuments.map((doc: DocumentWithTreeProps) => {
      if (doc._id === dragDocument._id) {
        return {
          ...dragDocument,
          parentId: targetParentId,
          order: targetIndex
        };
      }
      return doc;
    });

    // Update orders in target folder
    updatedDocuments = updateOrdersInTargetFolder(updatedDocuments, targetParentId, targetIndex, dragDocument._id);

    return { updatedDocuments, targetParentId };
  };

  // Helper function to persist changes to database
  const persistDocumentStructure = async (updatedDocuments: DocumentWithTreeProps[]) => {
    if (!userIdString) {
      toast.error("User authentication required to update document structure");
      return;
    }
    
    try {
      await updateStructure({
        updates: updatedDocuments.map((d: DocumentWithTreeProps) => ({
          id: d._id,
          parentId: d.parentId,
          order: d.order
        })),
        userId: userIdString
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to update structure:", error);
      }
      toast.error("Failed to update document structure");
    }
  };

  const handleDrop = (info: TreeDropInfo) => {
    const dropKey = String(info.node.key);
    const dragKey = String(info.dragNode.key);
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const dragDocument = documents.find((d: DocumentWithTreeProps) => d._id.toString() === dragKey);
    const dropDocument = documents.find((d: DocumentWithTreeProps) => d._id.toString() === dropKey);

    if (!dragDocument || !dropDocument) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("Drag or drop document not found", { dragKey, dropKey });
      }
      return;
    }

    const initialDocuments = documents.map((doc: DocumentWithTreeProps) => ({ ...doc }));
    let updatedDocuments: DocumentWithTreeProps[];
    let newParentId: Id<"documents"> | undefined;

    // Handle dropping into a folder vs dropping between documents
    if (dropPosition === 0 && dropDocument.isFolder) {
      newParentId = dropDocument._id;
      updatedDocuments = handleDropIntoFolder(initialDocuments, dragDocument, newParentId);
    } else {
      const result = handleDropBetweenDocuments(initialDocuments, dragDocument, dropDocument, dropPosition);
      updatedDocuments = result.updatedDocuments;
      newParentId = result.targetParentId;
    }

    // Normalize orders for both source and target folders
    updatedDocuments = normalizeOrders(updatedDocuments, dragDocument.parentId);
    if (dragDocument.parentId !== newParentId) {
      updatedDocuments = normalizeOrders(updatedDocuments, newParentId);
    }
    
    // Persist changes to database
    void persistDocumentStructure(updatedDocuments);
  };

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('DocumentSidebar render:', {
      isUserLoading,
      userIdString,
      documentsLength: documents.length,
      convexUserId,
      documents: documents.slice(0, 3) // First 3 documents for debugging
    });
  }

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