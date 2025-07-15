"use client";

import { useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Optimized Convex hooks following best practices from Context7 documentation
 * Reduces redundant queries and improves reactivity patterns
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Smart query conditions to prevent unnecessary network requests
 * - Memoized arguments to prevent React re-renders
 * - Efficient fallback patterns for offline scenarios
 * - Batch operations for multiple document updates
 */

// Optimized document query with proper memoization and conditions
export function useOptimizedDocument(
  documentId: Id<"documents"> | null,
  userId: Id<"users"> | null,
  isUserLoading: boolean,
) {
  // Memoize query arguments to prevent unnecessary re-renders
  const queryArgs = useMemo(() => {
    // Skip query if essential data is missing or still loading
    if (!documentId || isUserLoading || !userId) {
      return "skip" as const;
    }

    return {
      id: documentId,
      userId,
    };
  }, [documentId, userId, isUserLoading]);

  // Use Convex's built-in reactivity - query only runs when args change
  return useQuery(api.documents.getById, queryArgs);
}

// Optimized documents tree query with smart conditions and enhanced caching
export function useOptimizedDocumentsTree(
  notebookId: Id<"notebooks"> | null,
  userId: Id<"users"> | null,
  isUserLoading: boolean,
  isPublicNotebook: boolean,
  hasValidPassword?: boolean,
) {
  // OPTIMIZATION: Enhanced memoization with dependency tracking
  const queryArgs = useMemo(() => {
    if (!notebookId) {
      return "skip" as const;
    }

    // For public notebooks, don't require userId
    if (isPublicNotebook) {
      return {
        notebookId,
        limit: 100, // OPTIMIZATION: Reduced from 200 to 100 for better performance
      };
    }

    // For private notebooks, require userId unless user has valid password
    if (!isUserLoading && userId) {
      return {
        limit: 100, // OPTIMIZATION: Reduced from 200 to 100 for better performance
        notebookId,
        userId,
      };
    }

    // For users with valid password but no userId
    if (hasValidPassword) {
      return {
        limit: 100, // OPTIMIZATION: Reduced from 200 to 100 for better performance
        notebookId,
        hasValidPassword: true,
      };
    }

    return "skip" as const;
  }, [notebookId, userId, isUserLoading, isPublicNotebook, hasValidPassword]);

  const documentsQuery = useQuery(api.documents.getAllForTreeLegacy, queryArgs);

  // OPTIMIZATION: Enhanced memoization with null safety and performance tracking
  return useMemo(() => {
    if (process.env.NODE_ENV === "development" && documentsQuery) {
      console.log(
        `📊 Documents tree loaded: ${documentsQuery.length} items for notebook ${notebookId}`,
      );
    }
    return documentsQuery ?? [];
  }, [documentsQuery, notebookId]);
}

// Optimized dictionary query with smart caching
export function useOptimizedDictionary(userId: Id<"users"> | null) {
  // Memoize query arguments
  const queryArgs = useMemo(() => {
    return userId ? { userId } : ("skip" as const);
  }, [userId]);

  const dictionaryQuery = useQuery(api.dictionary.getDictionary, queryArgs);

  // Memoize entries extraction
  return useMemo(() => dictionaryQuery?.entries ?? [], [dictionaryQuery]);
}

// Consolidated document mutations hook
export function useOptimizedDocumentMutations() {
  // Declare all mutations at the top level - hooks cannot be inside useMemo
  const create = useMutation(api.documents.create);
  const update = useMutation(api.documents.updateById);
  const deleteDoc = useMutation(api.documents.removeById);
  const updateStructure = useMutation(api.documents.updateStructure);

  const createInPublic = useMutation(api.documents.createInPublicNotebook);
  const updateInPublic = useMutation(api.documents.updateInPublicNotebook);
  const deleteInPublic = useMutation(api.documents.deleteInPublicNotebook);
  const updateStructureInPublic = useMutation(
    api.documents.updateStructureInPublicNotebook,
  );

  // Return memoized object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      // Private notebook mutations
      create,
      update,
      delete: deleteDoc,
      updateStructure,

      // Public notebook mutations
      createInPublic,
      updateInPublic,
      deleteInPublic,
      updateStructureInPublic,
    }),
    [
      create,
      update,
      deleteDoc,
      updateStructure,
      createInPublic,
      updateInPublic,
      deleteInPublic,
      updateStructureInPublic,
    ],
  );
}

// Smart wrapper for conditional mutations based on notebook type
export function useSmartDocumentActions(isPublicNotebook: boolean) {
  const mutations = useOptimizedDocumentMutations();

  // Return the appropriate mutation set based on notebook type
  return useMemo(() => {
    if (isPublicNotebook) {
      return {
        create: mutations.createInPublic,
        update: mutations.updateInPublic,
        delete: mutations.deleteInPublic,
        updateStructure: mutations.updateStructureInPublic,
      };
    }

    return {
      create: mutations.create,
      update: mutations.update,
      delete: mutations.delete,
      updateStructure: mutations.updateStructure,
    };
  }, [isPublicNotebook, mutations]);
}

// OPTIMIZATION: Enhanced caching helper for preloaded documents
export function useDocumentCache(maxCacheSize = 10) {
  const cacheRef = useRef(new Map<Id<"documents">, unknown>());
  const accessOrderRef = useRef<Id<"documents">[]>([]);

  // Memoize cache management
  const cacheHelpers = useMemo(
    () => ({
      get: (documentId: Id<"documents">) => {
        const doc = cacheRef.current.get(documentId);
        if (doc) {
          // Move to end for LRU
          const index = accessOrderRef.current.indexOf(documentId);
          if (index > -1) {
            accessOrderRef.current.splice(index, 1);
          }
          accessOrderRef.current.push(documentId);
        }
        return doc;
      },

      set: (documentId: Id<"documents">, document: unknown) => {
        cacheRef.current.set(documentId, document);
        accessOrderRef.current.push(documentId);

        // Maintain cache size
        while (cacheRef.current.size > maxCacheSize) {
          const oldest = accessOrderRef.current.shift();
          if (oldest) {
            cacheRef.current.delete(oldest);
          }
        }
      },

      clear: () => {
        cacheRef.current.clear();
        accessOrderRef.current = [];
      },
    }),
    [maxCacheSize],
  );

  return cacheHelpers;
}

// Optimized query condition builders following Convex best practices
export const ConvexOptimizations = {
  // Build efficient query conditions
  buildDocumentQuery: (
    documentId: Id<"documents"> | null,
    userId: Id<"users"> | null,
    isLoading: boolean,
  ) => {
    return !documentId || isLoading || !userId
      ? ("skip" as const)
      : { id: documentId, userId };
  },

  // Build efficient tree query conditions
  buildTreeQuery: (
    notebookId: Id<"notebooks"> | null,
    userId: Id<"users"> | null,
    isUserLoading: boolean,
    isPublicNotebook: boolean,
    hasValidPassword?: boolean,
  ) => {
    if (!notebookId) return "skip" as const;

    if (isPublicNotebook) {
      return { notebookId, limit: 200 };
    }

    if (!isUserLoading && userId) {
      return { limit: 200, notebookId, userId };
    }

    if (hasValidPassword) {
      return { limit: 200, notebookId, hasValidPassword: true };
    }

    return "skip" as const;
  },

  // Memoization helpers
  memoizeQueryResult: <T>(result: T | undefined, fallback: T): T => {
    return result ?? fallback;
  },

  // OPTIMIZATION: Batch query helper for multiple document operations
  batchDocumentQueries: (
    documentIds: Id<"documents">[],
    userId: Id<"users"> | null,
    isUserLoading: boolean,
  ) => {
    if (!userId || isUserLoading) return [];

    return documentIds.map((id) => ({ id, userId }));
  },

  // OPTIMIZATION: Smart debouncing for frequent updates
  createDebouncedQuery: <T>(queryFn: () => T | Promise<T>, delay = 300) => {
    let timeoutId: NodeJS.Timeout;
    let pendingPromises: Array<{
      resolve: (value: T) => void;
      reject: (error: unknown) => void;
    }> = [];

    return (): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        // Add this promise to the pending list
        pendingPromises.push({ resolve, reject });

        // Clear any existing timeout
        clearTimeout(timeoutId);

        // Set new timeout to execute the query after delay
        timeoutId = setTimeout(() => {
          // Use an async IIFE to handle the promise properly
          void (async () => {
            try {
              // Execute the query function
              const result = await queryFn();

              // Resolve all pending promises with the fresh result
              const currentPending = [...pendingPromises];
              pendingPromises = []; // Clear the pending list

              currentPending.forEach(({ resolve }) => resolve(result));
            } catch (error) {
              // Reject all pending promises with the error
              const currentPending = [...pendingPromises];
              pendingPromises = []; // Clear the pending list

              currentPending.forEach(({ reject }) => reject(error));
            }
          })();
        }, delay);
      });
    };
  },

  // OPTIMIZATION: Query result caching with TTL
  createQueryCache: <T>(ttlMs: number = 5 * 60 * 1000) => {
    const cache = new Map<string, { data: T; timestamp: number }>();

    return {
      get: (key: string): T | null => {
        const entry = cache.get(key);
        if (!entry) return null;

        const isExpired = Date.now() - entry.timestamp > ttlMs;
        if (isExpired) {
          cache.delete(key);
          return null;
        }

        return entry.data;
      },

      set: (key: string, data: T): void => {
        cache.set(key, { data, timestamp: Date.now() });
      },

      clear: (): void => {
        cache.clear();
      },

      size: (): number => cache.size,
    };
  },
};
