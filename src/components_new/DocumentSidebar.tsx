"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  memo,
  useRef,
  useCallback,
} from "react";
import { type Id } from "../../convex/_generated/dataModel";
import { Button } from "../components_new/ui/button";
import {
  ArrowLeft,
  FolderPlus,
  FilePlus,
  X,
  FileText,
  Eye,
  Lock,
} from "lucide-react";
import { ImSpinner8 } from "react-icons/im";
import Tree from "rc-tree";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components_new/ui/dropdown-menu";
import DocumentItem from "./DocumentItem";
import FolderItem from "./FolderItem";
// import {
//   useSmartDocumentActions,
// } from "~/hooks/useOptimizedConvex";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { EventDataNode, Key } from "rc-tree/lib/interface";
import { toast } from "sonner";
import { useConvexUser } from "../hooks/use-convex-user";
import { type DocumentWithTreeProps } from "../types/document";
import "./DocumentSidebar.css";

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
  notebookId?: Id<"notebooks">;
  notebookTitle?: string;
  isPublicNotebook?: boolean;
  hasValidPassword?: boolean; // Whether user has provided valid password for private notebook
  sessionToken?: string | null; // Session token for private notebook access
}

interface TreeDropInfo {
  node?: EventDataNode<CustomDataNode>;
  dropNode?: EventDataNode<CustomDataNode>;
  dragNode: EventDataNode<CustomDataNode>;
  dragNodesKeys: Key[];
  dropPosition: number;
  dropToGap: boolean;
}

const DocumentSidebar = memo(
  ({
    currentDocument,
    setCurrentDocumentId,
    onToggleSidebar,
    showSidebar = true,
    isMobile = false,
    notebookId,
    notebookTitle,
    isPublicNotebook = false,
    hasValidPassword = false,
    sessionToken = null,
  }: DocumentSidebarProps) => {
    // Get authenticated user
    const { convexUserId, isLoading: isUserLoading } = useConvexUser();
    if (process.env.NODE_ENV === "development") {
      console.log(convexUserId);
    }

    // Track if we've shown the authentication error to prevent spamming
    const hasShownAuthErrorRef = useRef(false);

    // Show authentication error only once when user is not authenticated after loading (only for private notebooks)
    useEffect(() => {
      if (
        !isPublicNotebook &&
        !isUserLoading &&
        !convexUserId &&
        !hasShownAuthErrorRef.current
      ) {
        hasShownAuthErrorRef.current = true;
        toast.error("Please sign in to manage documents");
      } else if (convexUserId) {
        hasShownAuthErrorRef.current = false; // Reset when user signs in
      }
    }, [isUserLoading, convexUserId, isPublicNotebook]);

    // Use direct Convex query with session token support for private notebooks
    const documentsQuery = useQuery(
      api.documents.getAllForTreeLegacy,
      notebookId &&
        // For private notebooks, ensure we have session token when needed
        (isPublicNotebook || convexUserId || (hasValidPassword && sessionToken))
        ? {
            notebookId,
            userId: convexUserId ?? undefined,
            limit: 200,
            // Pass session token for private notebooks when user is not owner
            sessionToken:
              !isPublicNotebook &&
              !convexUserId &&
              hasValidPassword &&
              sessionToken
                ? sessionToken
                : undefined,
          }
        : "skip",
    );

    // Memoize documents to prevent hook dependency warnings
    const documents = useMemo(() => documentsQuery ?? [], [documentsQuery]);

    // OPTIMIZED: Use smart document actions that automatically choose the right mutations
    // const documentActions = useSmartDocumentActions(isPublicNotebook);

    // TODO: Gradually replace these with documentActions above for better performance
    // Legacy mutations - keeping for compatibility during transition
    const createDocument = useMutation(api.documents.create);
    const deleteDocument = useMutation(api.documents.removeById);
    const updateStructure = useMutation(api.documents.updateStructure);
    const createDocumentInPublic = useMutation(
      api.documents.createInPublicNotebook,
    );
    const deleteDocumentInPublic = useMutation(
      api.documents.deleteInPublicNotebook,
    );
    const updateStructureInPublic = useMutation(
      api.documents.updateStructureInPublicNotebook,
    );

    // Local state
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<
      Id<"documents"> | undefined
    >(undefined);

    // Add state to track the last selected document to prevent duplicate selections
    const lastSelectedIdRef = useRef<Id<"documents"> | undefined>(
      currentDocument?._id,
    );

    // Update last selected when current document changes
    useEffect(() => {
      if (currentDocument?._id) {
        lastSelectedIdRef.current = currentDocument._id;
      }
    }, [currentDocument?._id]);

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
      (_e: React.MouseEvent, node: EventDataNode<unknown>) => {
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

    const handleDeleteDocument = useCallback(
      async (e: React.MouseEvent<Element>, id: Id<"documents">) => {
        e.preventDefault();
        e.stopPropagation();

        // For public notebooks, allow deletion without authentication
        if (!isPublicNotebook && !convexUserId) {
          toast.error("User authentication required to delete documents");
          return;
        }

        // For public notebooks, require notebookId
        if (isPublicNotebook && !notebookId) {
          toast.error("Notebook ID is required to delete documents");
          return;
        }

        setIsDeletingId(id);
        try {
          if (isPublicNotebook) {
            await deleteDocumentInPublic({ id, notebookId: notebookId! });
          } else {
            await deleteDocument({ id, userId: convexUserId! });
          }
          toast.success("Item deleted!");

          // If we deleted the current document, navigate to home
          if (id === currentDocument?._id) {
            // Fallback navigation to home
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to delete item";
          toast.error(errorMessage);
          console.error(error);
        } finally {
          setIsDeletingId(undefined);
        }
      },
      [
        convexUserId,
        deleteDocument,
        deleteDocumentInPublic,
        isPublicNotebook,
        notebookId,
        currentDocument?._id,
      ],
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
              onDelete={handleDeleteDocument}
              onClick={() =>
                !document.isFolder && setCurrentDocumentId(document._id)
              }
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
      isDeletingId,
      expandedKeys,
      handleDeleteDocument,
      setCurrentDocumentId,
      handleExpand,
    ]);

    const handleNewDocument = async (
      eventOrRetryCount?: React.MouseEvent | number,
    ) => {
      const retryCount =
        typeof eventOrRetryCount === "number" ? eventOrRetryCount : 0;

      // Check authentication state for private notebooks
      if (!isPublicNotebook) {
        if (isUserLoading) {
          toast.info("Please wait for authentication to complete...");
          return;
        }

        if (!convexUserId) {
          toast.error("Please sign in to create documents");
          return;
        }
      }

      // For public notebooks, require notebookId
      if (isPublicNotebook && !notebookId) {
        toast.error("Notebook ID is required to create documents");
        return;
      }

      // Prevent multiple simultaneous creates
      if (isCreating) {
        return;
      }

      setIsCreating(true);
      try {
        if (process.env.NODE_ENV === "development") {
          console.log("Creating document with userId:", convexUserId);
        }

        let documentId;
        if (isPublicNotebook) {
          documentId = await createDocumentInPublic({
            title: "Untitled Document",
            notebookId: notebookId!,
            userId: convexUserId ?? undefined,
          });
        } else {
          documentId = await createDocument({
            title: "Untitled Document",
            userId: convexUserId!,
            notebookId,
          });
        }

        if (!documentId) {
          throw new Error("Document creation returned invalid ID");
        }

        if (process.env.NODE_ENV === "development") {
          console.log("Document created with ID:", documentId);
        }
        toast.success("Document created successfully!");
        setCurrentDocumentId(documentId);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Document creation error:", error);
        }

        let errorMessage = "Failed to create document";
        let shouldRetry = false;

        if (error instanceof Error) {
          if (
            error.message.includes("authentication") ||
            error.message.includes("User")
          ) {
            errorMessage = "Please sign in to create documents";
          } else if (
            error.message.includes("network") ||
            error.message.includes("fetch")
          ) {
            errorMessage =
              "Network error. Please check your connection and try again.";
            shouldRetry = retryCount < 2;
          } else if (
            error.message.includes("rate limit") ||
            error.message.includes("too many")
          ) {
            errorMessage =
              "Too many requests. Please wait a moment and try again.";
          } else if (
            error.message.includes("invalid") ||
            error.message.includes("ID")
          ) {
            errorMessage = "Server error occurred. Please try again.";
            shouldRetry = retryCount < 1;
          } else {
            errorMessage = `Creation failed: ${error.message}`;
          }
        } else if (typeof error === "string") {
          errorMessage = error;
        }

        toast.error(errorMessage + (shouldRetry ? " Retrying..." : ""));

        // Retry logic for network errors
        if (shouldRetry) {
          setTimeout(
            () => {
              void handleNewDocument(retryCount + 1);
            },
            1000 * (retryCount + 1),
          ); // Exponential backoff
          return;
        }
      } finally {
        setIsCreating(false);
      }
    };

    const handleNewFolder = async (
      eventOrRetryCount?: React.MouseEvent | number,
    ) => {
      const retryCount =
        typeof eventOrRetryCount === "number" ? eventOrRetryCount : 0;

      // Check authentication state for private notebooks
      if (!isPublicNotebook) {
        if (isUserLoading) {
          toast.info("Please wait for authentication to complete...");
          return;
        }

        if (!convexUserId) {
          toast.error("Please sign in to create folders");
          return;
        }
      }

      // For public notebooks, require notebookId
      if (isPublicNotebook && !notebookId) {
        toast.error("Notebook ID is required to create folders");
        return;
      }

      // Prevent multiple simultaneous creates
      if (isCreating) {
        return;
      }

      setIsCreating(true);
      try {
        let folderId;
        if (isPublicNotebook) {
          folderId = await createDocumentInPublic({
            title: "New Folder",
            notebookId: notebookId!,
            isFolder: true,
            userId: convexUserId ?? undefined,
          });
        } else {
          folderId = await createDocument({
            title: "New Folder",
            userId: convexUserId!,
            isFolder: true,
            notebookId,
          });
        }

        if (!folderId) {
          throw new Error("Folder creation returned invalid ID");
        }

        toast.success("Folder created successfully!");
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Folder creation error:", error);
        }

        let errorMessage = "Failed to create folder";
        let shouldRetry = false;

        if (error instanceof Error) {
          if (
            error.message.includes("authentication") ||
            error.message.includes("User")
          ) {
            errorMessage = "Please sign in to create folders";
          } else if (
            error.message.includes("network") ||
            error.message.includes("fetch")
          ) {
            errorMessage =
              "Network error. Please check your connection and try again.";
            shouldRetry = retryCount < 2;
          } else if (
            error.message.includes("rate limit") ||
            error.message.includes("too many")
          ) {
            errorMessage =
              "Too many requests. Please wait a moment and try again.";
          } else if (
            error.message.includes("invalid") ||
            error.message.includes("ID")
          ) {
            errorMessage = "Server error occurred. Please try again.";
            shouldRetry = retryCount < 1;
          } else {
            errorMessage = `Creation failed: ${error.message}`;
          }
        } else if (typeof error === "string") {
          errorMessage = error;
        }

        toast.error(errorMessage + (shouldRetry ? " Retrying..." : ""));

        // Retry logic for network errors
        if (shouldRetry) {
          setTimeout(
            () => {
              void handleNewFolder(retryCount + 1);
            },
            1000 * (retryCount + 1),
          ); // Exponential backoff
          return;
        }
      } finally {
        setIsCreating(false);
      }
    };

    // Helper function to normalize orders to ensure they are sequential
    const normalizeOrders = (
      documents: DocumentWithTreeProps[],
      parentId: Id<"documents"> | undefined,
    ): DocumentWithTreeProps[] => {
      const documentsInLevel = documents
        .filter((d: DocumentWithTreeProps) => d.parentId === parentId)
        .sort(
          (a: DocumentWithTreeProps, b: DocumentWithTreeProps) =>
            a.order - b.order,
        );

      const normalizedDocumentIds = new Set(
        documentsInLevel.map((doc) => doc._id),
      );

      return documents.map((doc: DocumentWithTreeProps) => {
        if (normalizedDocumentIds.has(doc._id)) {
          const normalizedIndex = documentsInLevel.findIndex(
            (d: DocumentWithTreeProps) => d._id === doc._id,
          );
          return {
            ...doc,
            order: normalizedIndex,
          };
        }
        return doc;
      });
    };

    // Optimized helper functions with reduced array iterations
    const updateOrdersInSourceFolder = useCallback(
      (
        documents: DocumentWithTreeProps[],
        sourceParentId: Id<"documents"> | undefined,
        sourceOrder: number,
      ): DocumentWithTreeProps[] => {
        // Use a more efficient approach - only update affected documents
        const updated = new Map<string, DocumentWithTreeProps>();

        documents.forEach((doc: DocumentWithTreeProps) => {
          if (doc.parentId === sourceParentId && doc.order > sourceOrder) {
            updated.set(doc._id, {
              ...doc,
              order: doc.order - 1,
            });
          }
        });

        return documents.map(
          (doc: DocumentWithTreeProps) => updated.get(doc._id) ?? doc,
        );
      },
      [],
    );

    const updateOrdersInTargetFolder = useCallback(
      (
        documents: DocumentWithTreeProps[],
        targetParentId: Id<"documents"> | undefined,
        targetIndex: number,
        dragDocumentId: Id<"documents">,
      ): DocumentWithTreeProps[] => {
        // Use a more efficient approach - only update affected documents
        const updated = new Map<string, DocumentWithTreeProps>();

        documents.forEach((doc: DocumentWithTreeProps) => {
          if (
            doc.parentId === targetParentId &&
            doc._id !== dragDocumentId &&
            doc.order >= targetIndex
          ) {
            updated.set(doc._id, {
              ...doc,
              order: doc.order + 1,
            });
          }
        });

        return documents.map(
          (doc: DocumentWithTreeProps) => updated.get(doc._id) ?? doc,
        );
      },
      [],
    );

    // Helper function to handle dropping into a folder
    const handleDropIntoFolder = (
      documents: DocumentWithTreeProps[],
      dragDocument: DocumentWithTreeProps,
      targetFolderId: Id<"documents">,
    ): DocumentWithTreeProps[] => {
      // Get existing documents in the target folder
      const documentsInFolder = documents
        .filter(
          (d: DocumentWithTreeProps) =>
            d.parentId === targetFolderId && d._id !== dragDocument._id,
        )
        .sort(
          (a: DocumentWithTreeProps, b: DocumentWithTreeProps) =>
            a.order - b.order,
        );

      // Update the dragged document
      const updatedDocuments = documents.map((doc: DocumentWithTreeProps) => {
        if (doc._id === dragDocument._id) {
          return {
            ...dragDocument,
            parentId: targetFolderId,
            order: documentsInFolder.length,
          };
        }
        return doc;
      });

      // Update orders in source folder
      return updateOrdersInSourceFolder(
        updatedDocuments,
        dragDocument.parentId,
        dragDocument.order,
      );
    };

    // Helper function to handle dropping between documents
    const handleDropBetweenDocuments = (
      documents: DocumentWithTreeProps[],
      dragDocument: DocumentWithTreeProps,
      dropDocument: DocumentWithTreeProps,
      dropPosition: number,
    ): {
      updatedDocuments: DocumentWithTreeProps[];
      targetParentId: Id<"documents"> | undefined;
    } => {
      const targetParentId = dropDocument.parentId;

      // Get all documents at the target level (excluding the dragged document)
      const documentsInLevel = documents
        .filter(
          (d: DocumentWithTreeProps) =>
            d.parentId === targetParentId && d._id !== dragDocument._id,
        )
        .sort(
          (a: DocumentWithTreeProps, b: DocumentWithTreeProps) =>
            a.order - b.order,
        );

      const dropIndex = documentsInLevel.findIndex(
        (d: DocumentWithTreeProps) => d._id === dropDocument._id,
      );
      const targetIndex = dropPosition < 0 ? dropIndex : dropIndex + 1;

      // Update orders in source folder
      let updatedDocuments = updateOrdersInSourceFolder(
        documents,
        dragDocument.parentId,
        dragDocument.order,
      );

      // Insert at new position
      updatedDocuments = updatedDocuments.map((doc: DocumentWithTreeProps) => {
        if (doc._id === dragDocument._id) {
          return {
            ...dragDocument,
            parentId: targetParentId,
            order: targetIndex,
          };
        }
        return doc;
      });

      // Update orders in target folder
      updatedDocuments = updateOrdersInTargetFolder(
        updatedDocuments,
        targetParentId,
        targetIndex,
        dragDocument._id,
      );

      return { updatedDocuments, targetParentId };
    };

    // Helper function to persist changes to database
    const persistDocumentStructure = async (
      updatedDocuments: DocumentWithTreeProps[],
    ) => {
      // For public notebooks, allow structure updates without authentication
      if (!isPublicNotebook && !convexUserId) {
        toast.error(
          "User authentication required to update document structure",
        );
        return;
      }

      // For public notebooks, require notebookId
      if (isPublicNotebook && !notebookId) {
        toast.error("Notebook ID is required to update document structure");
        return;
      }

      try {
        if (isPublicNotebook) {
          await updateStructureInPublic({
            updates: updatedDocuments.map((d: DocumentWithTreeProps) => ({
              id: d._id,
              parentId: d.parentId,
              order: d.order,
            })),
            notebookId: notebookId!,
          });
        } else {
          await updateStructure({
            updates: updatedDocuments.map((d: DocumentWithTreeProps) => ({
              id: d._id,
              parentId: d.parentId,
              order: d.order,
            })),
            userId: convexUserId!,
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to update structure:", error);
        }
        toast.error("Failed to update document structure");
      }
    };

    const handleDrop = (info: TreeDropInfo) => {
      if (process.env.NODE_ENV === "development") {
        console.log("🖱️ Drop triggered:", info);
        toast.info("Drop event triggered!"); // Visual feedback
      }

      // Use the actual structure (node for onDrop, but access varies)
      const dropNode = info.node ?? info.dropNode;

      // Validate that required properties exist
      if (!dropNode?.key || !info.dragNode?.key || !dropNode?.pos) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Invalid drop info:", info);
        }
        toast.error("Invalid drop info");
        return;
      }

      const dropKey = String(dropNode.key);
      const dragKey = String(info.dragNode.key);
      const dropPos = dropNode.pos.split("-");
      const dropPosition =
        info.dropPosition - Number(dropPos[dropPos.length - 1]);

      const dragDocument = documents.find(
        (d: DocumentWithTreeProps) => d._id.toString() === dragKey,
      );
      const dropDocument = documents.find(
        (d: DocumentWithTreeProps) => d._id.toString() === dropKey,
      );

      if (!dragDocument || !dropDocument) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Drag or drop document not found", { dragKey, dropKey });
        }
        toast.error("Invalid drag and drop operation");
        return;
      }

      // Prevent dropping onto itself
      if (dragDocument._id === dropDocument._id) {
        if (process.env.NODE_ENV === "development") {
          console.log("📁 Preventing drop onto self");
        }
        return;
      }

      // Prevent dropping folder into its own descendant
      if (dragDocument.isFolder && dropDocument.parentId === dragDocument._id) {
        toast.error("Cannot move folder into its own contents");
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log("📁 Drag and drop operation:", {
          dragDocument: dragDocument.title,
          dropDocument: dropDocument.title,
          dropPosition,
          isFolder: dropDocument.isFolder,
        });
      }

      const initialDocuments = documents.map((doc: DocumentWithTreeProps) => ({
        ...doc,
      }));
      let updatedDocuments: DocumentWithTreeProps[];
      let newParentId: Id<"documents"> | undefined;

      // Handle dropping into a folder vs dropping between documents
      // Only drop into folder if dropPosition is exactly 0 (dropping directly onto folder)
      // and not if it's -1 or 1 (dropping above or below the folder)
      if (dropPosition === 0 && dropDocument.isFolder && !info.dropToGap) {
        if (process.env.NODE_ENV === "development") {
          console.log("🖱️ Dropping into folder:", dropDocument.title);
        }
        newParentId = dropDocument._id;
        updatedDocuments = handleDropIntoFolder(
          initialDocuments,
          dragDocument,
          newParentId,
        );
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log("🖱️ Dropping between documents, position:", dropPosition);
        }
        const result = handleDropBetweenDocuments(
          initialDocuments,
          dragDocument,
          dropDocument,
          dropPosition,
        );
        updatedDocuments = result.updatedDocuments;
        newParentId = result.targetParentId;
      }

      // Normalize orders for both source and target folders
      updatedDocuments = normalizeOrders(
        updatedDocuments,
        dragDocument.parentId,
      );
      if (dragDocument.parentId !== newParentId) {
        updatedDocuments = normalizeOrders(updatedDocuments, newParentId);
      }

      // Persist changes to database
      void persistDocumentStructure(updatedDocuments);

      // Show success feedback
      if (dropPosition === 0 && dropDocument.isFolder) {
        toast.success(
          `Moved "${dragDocument.title}" to "${dropDocument.title}"`,
        );
      } else {
        toast.success(`Reordered "${dragDocument.title}"`);
      }
    };

    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log("DocumentSidebar render:", {
        isUserLoading,
        convexUserId,
        documentsLength: documents.length,
        documents: documents.slice(0, 3), // First 3 documents for debugging
        isMobile,
        draggable:
          !isMobile &&
          typeof window !== "undefined" &&
          window.innerWidth >= 768,
      });
    }

    return (
      <section
        className={`no-export flex h-full w-full flex-col border-r border-gray-200 bg-white md:h-screen ${isMobile ? "sidebar-fade-in fixed bottom-0 left-0 right-0 top-0 z-50 shadow-xl" : ""}`}
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
                {notebookTitle ?? "Documents"}{" "}
                {isUserLoading && (
                  <span className="text-sm text-gray-500">
                    (Loading user...)
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {isPublicNotebook ? (
                  <>
                    <Eye className="h-3 w-3" />
                    <span>Notas Públicas</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    <span>Notas Privada</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={isCreating}
                  variant="outline"
                  size="icon"
                  className="border-blue-200 bg-blue-50 text-blue-700 transition-all duration-200 hover:scale-105 hover:border-blue-300 hover:bg-blue-100 active:bg-blue-200"
                >
                  {isCreating ? (
                    <ImSpinner8 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-lg">+</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleNewDocument}
                  className="flex items-center gap-2 py-2"
                >
                  <FilePlus className="h-4 w-4" />
                  <span>New Document</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleNewFolder}
                  className="flex items-center gap-2 py-2"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span>New Folder</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
        </div>

        <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0 flex-1 overflow-auto">
          {isUserLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-500">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="font-medium text-gray-600">No documents found</p>
              <p className="mt-2 text-sm text-gray-500">
                {isPublicNotebook
                  ? "This public notebook doesn't contain any documents yet. Anyone can create and manage documents here!"
                  : "Create your first document using the + button above"}
              </p>
            </div>
          ) : (
            <Tree
              treeData={treeData}
              draggable={{
                icon: false,
                nodeDraggable: () => true,
              }}
              onDrop={handleDrop}
              allowDrop={(info) => {
                if (process.env.NODE_ENV === "development") {
                  console.log("🖱️ AllowDrop check:", info);
                }

                // Check if required properties exist
                if (!info.dragNode?.key) {
                  if (process.env.NODE_ENV === "development") {
                    console.log("🖱️ AllowDrop: No dragNode key");
                  }
                  return false;
                }

                // Access dropNode key (the structure uses dropNode in allowDrop)
                const nodeKey = info.dropNode?.key;
                if (!nodeKey) {
                  if (process.env.NODE_ENV === "development") {
                    console.log("🖱️ AllowDrop: No dropNode key");
                  }
                  return false;
                }

                const dragDocument = documents.find(
                  (d: DocumentWithTreeProps) =>
                    d._id.toString() === info.dragNode.key,
                );
                const dropDocument = documents.find(
                  (d: DocumentWithTreeProps) => d._id.toString() === nodeKey,
                );

                if (!dragDocument || !dropDocument) {
                  if (process.env.NODE_ENV === "development") {
                    console.log("🖱️ AllowDrop: Document not found", {
                      dragDocument,
                      dropDocument,
                    });
                  }
                  return false;
                }

                // Prevent dropping onto itself
                if (dragDocument._id === dropDocument._id) {
                  if (process.env.NODE_ENV === "development") {
                    console.log("🖱️ AllowDrop: Dropping onto itself");
                  }
                  return false;
                }

                // Prevent dropping folder into its own descendant
                if (
                  dragDocument.isFolder &&
                  dropDocument.parentId === dragDocument._id
                ) {
                  if (process.env.NODE_ENV === "development") {
                    console.log(
                      "🖱️ AllowDrop: Dropping folder into its own descendant",
                    );
                  }
                  return false;
                }

                if (process.env.NODE_ENV === "development") {
                  console.log("🖱️ AllowDrop: Allowed!");
                }
                return true;
              }}
              onDragStart={(info) => {
                if (info.node?.key && process.env.NODE_ENV === "development") {
                  console.log("🖱️ Drag started:", info.node.key);
                }
              }}
              onDragEnd={() => {
                if (process.env.NODE_ENV === "development") {
                  console.log("🖱️ Drag ended");
                }
              }}
              onDragEnter={(info) => {
                if (process.env.NODE_ENV === "development") {
                  console.log("🖱️ Drag enter:", info.node?.key);
                }
              }}
              onDragLeave={(info) => {
                if (process.env.NODE_ENV === "development") {
                  console.log("🖱️ Drag leave:", info.node?.key);
                }
              }}
              onDragOver={(info) => {
                if (process.env.NODE_ENV === "development") {
                  console.log("🖱️ Drag over:", info.node?.key);
                }
              }}
              onSelect={([selectedKey]) => {
                if (selectedKey) {
                  const selectedDoc = documents.find(
                    (d) => d._id.toString() === selectedKey,
                  );
                  if (selectedDoc && !selectedDoc.isFolder) {
                    // Prevent duplicate selections with additional checks
                    if (
                      selectedDoc._id !== lastSelectedIdRef.current &&
                      selectedDoc._id !== currentDocument?._id
                    ) {
                      if (process.env.NODE_ENV === "development") {
                        console.log(
                          "📁 Sidebar selecting document:",
                          selectedDoc._id,
                          "title:",
                          selectedDoc.title,
                        );
                      }
                      lastSelectedIdRef.current = selectedDoc._id;
                      setCurrentDocumentId(selectedDoc._id);
                      // Add smooth transition for mobile
                      if (isMobile && onToggleSidebar) {
                        setTimeout(() => {
                          onToggleSidebar();
                        }, 150); // Small delay for visual feedback
                      }
                    } else {
                      if (process.env.NODE_ENV === "development") {
                        console.log(
                          "📁 Ignoring duplicate selection for document:",
                          selectedDoc._id,
                        );
                      }
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
              // Add these props for better selection behavior
              multiple={false}
              autoExpandParent={true}
              // Enhanced drag and drop props
              dropIndicatorRender={(props) => {
                if (process.env.NODE_ENV === "development") {
                  console.log("🖱️ Drop indicator render:", props);
                }
                const { dropPosition, dropLevelOffset, indent } = props;
                const style: React.CSSProperties = {
                  position: "absolute",
                  right: 0,
                  top: dropPosition === -1 ? -3 : -1,
                  left: -(dropLevelOffset || 0) + (indent || 0),
                  height: 3,
                  backgroundColor: "#3b82f6",
                  zIndex: 1000,
                  pointerEvents: "none",
                  borderRadius: "2px",
                };
                return <div style={style} />;
              }}
              showIcon={false}
              showLine={false}
            />
          )}
        </div>
      </section>
    );
  },
);

DocumentSidebar.displayName = "DocumentSidebar";

export default DocumentSidebar;
