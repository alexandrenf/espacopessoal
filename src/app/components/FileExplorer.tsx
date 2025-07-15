"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  MoreVertical,
  Edit3,
  Trash2,
  Star,
  Calendar,
  User,
  Eye,
  Grid3X3,
  List,
  Search,
  SortAsc,
  SortDesc,
  Clock,
  Type,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Document {
  _id: string;
  title: string;
  isFolder: boolean;
  isHome?: boolean;
  createdAt: number;
  updatedAt: number;
  userId?: string;
  initialContent?: string;
  children?: Document[];
  parentId?: string;
}

interface FileExplorerProps {
  documents: Document[];
  onDocumentClick: (documentId: string, isFolder: boolean) => void;
  onCreateDocument?: () => void;
  onCreateFolder?: () => void;
  onDeleteDocument?: (documentId: string) => void;
  onRenameDocument?: (documentId: string, newTitle: string) => void;
  isAuthenticated: boolean;
  currentUserId?: string;
  isLoading?: boolean;
}

type ViewMode = "grid" | "list";
type SortBy = "name" | "date" | "type";
type SortOrder = "asc" | "desc";

// Hook for detecting mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

// Mobile-optimized motion component
const MobileOptimizedMotion = ({
  children,
  isMobile,
  ...motionProps
}: {
  children: React.ReactNode;
  isMobile: boolean;
} & React.ComponentProps<typeof motion.div>) => {
  if (isMobile) {
    // On mobile, render as regular div to improve performance
    return <div className={motionProps.className}>{children}</div>;
  }
  return <motion.div {...motionProps}>{children}</motion.div>;
};

const FileIcon = ({
  isFolder,
  isOpen,
  isHome,
}: {
  isFolder: boolean;
  isOpen?: boolean;
  isHome?: boolean;
}) => {
  if (isHome) {
    return <Star className="h-5 w-5 text-yellow-500" />;
  }
  if (isFolder) {
    return isOpen ? (
      <FolderOpen className="h-5 w-5 text-blue-500" />
    ) : (
      <Folder className="h-5 w-5 text-blue-500" />
    );
  }
  return <FileText className="h-5 w-5 text-gray-600" />;
};

const FileItem = ({
  document,
  onDocumentClick,
  onDeleteDocument,
  onRenameDocument,
  isAuthenticated,
  currentUserId,
  viewMode,
  level = 0,
  onFolderClick,
  isMobile,
}: {
  document: Document;
  onDocumentClick: (documentId: string, isFolder: boolean) => void;
  onDeleteDocument?: (documentId: string) => void;
  onRenameDocument?: (documentId: string, newTitle: string) => void;
  isAuthenticated: boolean;
  currentUserId?: string;
  viewMode: ViewMode;
  level?: number;
  onFolderClick?: (folder: Document) => void;
  isMobile: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(document.title);

  const isOwner = currentUserId === document.userId;
  const canEdit = isAuthenticated && (isOwner || !document.userId);

  const handleClick = () => {
    if (document.isFolder) {
      // Open folder modal instead of calling onDocumentClick
      onFolderClick?.(document);
    } else {
      onDocumentClick(document._id, document.isFolder);
    }
  };

  const handleDoubleClick = () => {
    if (document.isFolder) {
      // Open folder modal on double click too
      onFolderClick?.(document);
    }
  };

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== document.title) {
      onRenameDocument?.(document._id, newTitle.trim());
    }
    setIsRenaming(false);
    setNewTitle(document.title);
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const getPreviewContent = () => {
    // Don't show preview content to keep interface clean
    return "";
  };

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="group"
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-3 transition-all duration-200 hover:bg-slate-50",
            "border border-transparent hover:border-slate-200",
            level > 0 && "ml-6 border-l-2 border-slate-200",
          )}
          style={{ paddingLeft: `${12 + level * 24}px` }}
        >
          {/* Expand/Collapse button for folders */}
          {document.isFolder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex-shrink-0 rounded p-1 hover:bg-slate-200"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </button>
          )}
          {!document.isFolder && <div className="w-6" />}

          {/* File Icon */}
          <div className="flex-shrink-0">
            <FileIcon
              isFolder={document.isFolder}
              isOpen={isExpanded}
              isHome={document.isHome}
            />
          </div>

          {/* File Name */}
          <div className="min-w-0 flex-1" onClick={handleClick}>
            {isRenaming ? (
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") {
                    setIsRenaming(false);
                    setNewTitle(document.title);
                  }
                }}
                autoFocus
                className="h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-900">
                    {document.title}
                  </span>
                  {document.isHome && (
                    <Badge variant="secondary" className="text-xs">
                      Home
                    </Badge>
                  )}
                </div>
                {!document.isFolder && getPreviewContent() && (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {getPreviewContent()}...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(document.updatedAt)}</span>
            </div>
            {document.userId && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{isOwner ? "Você" : "Outro usuário"}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    onDocumentClick(document._id, document.isFolder)
                  }
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {document.isFolder ? "Abrir Pasta" : "Abrir Documento"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteDocument?.(document._id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Children (for folders) */}
        <AnimatePresence>
          {document.isFolder && isExpanded && document.children && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {document.children.map((child) => (
                <FileItem
                  key={child._id}
                  document={child}
                  onDocumentClick={onDocumentClick}
                  onDeleteDocument={onDeleteDocument}
                  onRenameDocument={onRenameDocument}
                  isAuthenticated={isAuthenticated}
                  currentUserId={currentUserId}
                  viewMode={viewMode}
                  level={level + 1}
                  isMobile={isMobile}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <div
        className={cn(
          "relative rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200",
          "cursor-pointer hover:border-slate-300 hover:shadow-md",
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* File Icon */}
        <div className="mb-3 flex justify-center">
          <div className="rounded-lg bg-slate-50 p-3">
            <FileIcon
              isFolder={document.isFolder}
              isOpen={false}
              isHome={document.isHome}
            />
          </div>
        </div>

        {/* File Name */}
        <div className="mb-2">
          {isRenaming ? (
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setIsRenaming(false);
                  setNewTitle(document.title);
                }
              }}
              autoFocus
              className="h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="text-center">
              <h3 className="truncate text-sm font-medium text-slate-900">
                {document.title}
              </h3>
              {document.isHome && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  Home
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Preview content for documents */}
        {!document.isFolder && getPreviewContent() && (
          <p className="mb-3 line-clamp-2 text-xs text-slate-500">
            {getPreviewContent()}...
          </p>
        )}

        {/* Metadata */}
        <div className="space-y-1 text-xs text-slate-500">
          <div className="flex items-center justify-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(document.updatedAt), "dd/MM", { locale: ptBR })}
            </span>
          </div>
          {document.userId && (
            <div className="flex items-center justify-center gap-1">
              <User className="h-3 w-3" />
              <span>{isOwner ? "Você" : "Outro"}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="absolute right-2 top-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 bg-white p-0 opacity-0 shadow-sm group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    onDocumentClick(document._id, document.isFolder)
                  }
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {document.isFolder ? "Abrir Pasta" : "Abrir Documento"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRenaming(true);
                  }}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDocument?.(document._id);
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  documents,
  onDocumentClick,
  onCreateDocument,
  onCreateFolder,
  onDeleteDocument,
  onRenameDocument,
  isAuthenticated,
  currentUserId,
  isLoading,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const isMobile = useIsMobile();
  const [selectedFolder, setSelectedFolder] = useState<Document | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);

  // Handle folder click
  const handleFolderClick = (folder: Document) => {
    setSelectedFolder(folder);
    setShowFolderModal(true);
  };

  // Get documents inside a folder
  const getFolderDocuments = (folderId: string) => {
    return documents.filter((doc) => doc.parentId === folderId);
  };

  // Process and filter documents (only show root level documents in main view)
  const processedDocuments = useMemo(() => {
    const filtered = documents
      .filter((doc) => !doc.parentId) // Only root level documents
      .filter((doc) =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    // Sort documents
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.title.localeCompare(b.title);
          break;
        case "date":
          comparison = a.updatedAt - b.updatedAt;
          break;
        case "type":
          // Folders first, then documents
          if (a.isFolder && !b.isFolder) comparison = -1;
          else if (!a.isFolder && b.isFolder) comparison = 1;
          else comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [documents, searchTerm, sortBy, sortOrder]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400" />
            <Input
              placeholder="Buscar arquivos e pastas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-slate-200/70 bg-white/70 pl-10 backdrop-blur-sm focus:border-blue-500 focus:ring-blue-500/20 sm:w-64"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2">
          {/* Sort options */}
          <Select
            value={sortBy}
            onValueChange={(value: SortBy) => setSortBy(value)}
          >
            <SelectTrigger className="w-28 sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Nome
                </div>
              </SelectItem>
              <SelectItem value="date">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Data
                </div>
              </SelectItem>
              <SelectItem value="type">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Tipo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="p-2 sm:px-3"
          >
            {sortOrder === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-slate-200">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none p-2 sm:px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none p-2 sm:px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Create buttons */}
          {isAuthenticated && (
            <div className="flex w-full justify-center gap-1 sm:w-auto sm:justify-start">
              {onCreateFolder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateFolder}
                  className="flex-1 sm:flex-none"
                >
                  <FolderPlus className="mr-1 h-4 w-4" />
                  <span className="xs:inline hidden">Pasta</span>
                </Button>
              )}
              {onCreateDocument && (
                <Button
                  size="sm"
                  onClick={onCreateDocument}
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  <span className="xs:inline hidden">Documento</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {processedDocuments.length}{" "}
          {processedDocuments.length === 1 ? "item" : "itens"}
          {searchTerm &&
            ` encontrado${processedDocuments.length === 1 ? "" : "s"} para "${searchTerm}"`}
        </span>
        <span className="text-xs">
          {processedDocuments.filter((d) => d.isFolder).length} pastas •{" "}
          {processedDocuments.filter((d) => !d.isFolder).length} documentos
        </span>
      </div>

      {/* File list/grid */}
      {processedDocuments.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            {searchTerm
              ? "Nenhum resultado encontrado"
              : "Nenhum arquivo ainda"}
          </h3>
          <p className="mb-6 text-slate-600">
            {searchTerm
              ? "Tente ajustar sua busca ou criar um novo arquivo"
              : "Comece criando seu primeiro documento ou pasta"}
          </p>
          {isAuthenticated && !searchTerm && (
            <div className="flex justify-center gap-2">
              {onCreateFolder && (
                <Button variant="outline" onClick={onCreateFolder}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Nova Pasta
                </Button>
              )}
              {onCreateDocument && (
                <Button onClick={onCreateDocument}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Documento
                </Button>
              )}
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="xs:grid-cols-2 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {processedDocuments.map((document) => (
            <FileItem
              key={document._id}
              document={document}
              onDocumentClick={onDocumentClick}
              onDeleteDocument={onDeleteDocument}
              onRenameDocument={onRenameDocument}
              onFolderClick={handleFolderClick}
              isAuthenticated={isAuthenticated}
              currentUserId={currentUserId}
              isMobile={isMobile}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-2">
          {processedDocuments.map((document) => (
            <FileItem
              key={document._id}
              document={document}
              onDocumentClick={onDocumentClick}
              onDeleteDocument={onDeleteDocument}
              onRenameDocument={onRenameDocument}
              onFolderClick={handleFolderClick}
              isAuthenticated={isAuthenticated}
              currentUserId={currentUserId}
              isMobile={isMobile}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {/* Folder Contents Modal */}
      <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2">
                <FolderOpen className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {selectedFolder?.title}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedFolder && (
            <div className="mt-6">
              {(() => {
                const folderContents = getFolderDocuments(selectedFolder._id);

                if (folderContents.length === 0) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-12 text-center"
                    >
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
                        <Folder className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold text-slate-900">
                        Pasta vazia
                      </h3>
                      <p className="text-slate-600">
                        Esta pasta não contém nenhum documento ainda.
                      </p>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                  >
                    {folderContents.map((document) => (
                      <motion.div
                        key={document._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -2, scale: 1.02 }}
                        className="group cursor-pointer"
                        onClick={() => {
                          if (document.isFolder) {
                            // Handle nested folder
                            setSelectedFolder(document);
                          } else {
                            // Open document and close modal
                            onDocumentClick(document._id, document.isFolder);
                            setShowFolderModal(false);
                          }
                        }}
                      >
                        <div className="rounded-xl border border-slate-200/50 bg-white p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-md">
                          <div className="mb-3 flex justify-center">
                            <div className="rounded-lg bg-slate-50 p-3">
                              <FileIcon
                                isFolder={document.isFolder}
                                isOpen={false}
                                isHome={document.isHome}
                              />
                            </div>
                          </div>
                          <div className="text-center">
                            <h3 className="truncate text-sm font-medium text-slate-900">
                              {document.title}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {format(
                                new Date(document.updatedAt),
                                "dd/MM/yyyy",
                                { locale: ptBR },
                              )}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileExplorer;
