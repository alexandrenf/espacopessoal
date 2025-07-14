# Next.js Development Partnership Guide - Espaço Pessoal Edition

This document provides tailored guidance for our collaborative development efforts on Espaço Pessoal. Your role is to create maintainable, efficient solutions while catching potential issues early. We are building production-quality code for a synchronized, collaborative document editing application using Next.js 15.

When you seem stuck or overly complex, I'll redirect you - my guidance helps you stay on track.

## Project Overview

Espaço Pessoal is a Portuguese smart notepad application that provides synchronized, collaborative document editing across devices. It's built with Next.js 15 and features real-time collaboration, PWA support, and a rich text editor. **All UI elements are in Portuguese (Brazilian) for the target audience.**

---

## 1. Current System Architecture

-   **Frontend:** Next.js, React, TypeScript, Tailwind CSS with Portuguese (BR) UI.
-   **Backend & Database:** Convex (primary database and API layer).
-   **Real-time Collaboration:** TipTap editor with Y.js, connected to a HocusPocus WebSocket server for CRDT-based collaborative editing.
-   **Authentication:** NextAuth.js integrated with Convex via a custom adapter. User sessions are managed through a secure, server-side token system.
-   **Deployment:** Vercel for the frontend, with the HocusPocus server running separately.

---

## 2. Major Migrations Completed

Three critical migrations have modernized the application's stack, improving performance, scalability, and developer experience.

### 2.1. Backend: tRPC + Prisma to Convex

-   **Status:** COMPLETE.
-   **Summary:** The entire backend was migrated from a tRPC and Prisma stack to Convex. This provides real-time capabilities, automatic subscriptions, full TypeScript type safety, and a cleaner API.
-   **Impact:** All core systems, including Document Management, Task Boards, Dictionary, and Notifications, now run on Convex. **Prisma is no longer used in production.** Legacy tRPC routers remain for backward compatibility only. The authentication architecture was refactored to bridge NextAuth with Convex's user system securely.

### 2.2. Editor: Legacy Editor to Collaborative DocumentEditor

-   **Status:** COMPLETE.
-   **Summary:** The legacy React-based editor was replaced with a modern, collaborative editor powered by TipTap, Y.js, and HocusPocus.
-   **Features:** Real-time multi-user editing, spell checking (via Deno API), dictionary-based text replacement, comprehensive mobile responsiveness, and a unified sidebar.

### 2.3. Routing: `/documents` to `/notas` (Notebooks)

-   **Status:** COMPLETE.
-   **Summary:** The routing structure was migrated from a flat `/documents/[documentId]` system to a hierarchical `/notas/[url]/[documentId]` structure, introducing the concept of "Notebooks".
-   **Enhancements:**
    -   Documents are now organized within notebooks with custom URLs.
    -   Notebooks support password protection for privacy.
    -   A data migration script was created to move all existing documents into a default notebook for each user.
    -   Legacy URLs automatically redirect to the new format for backward compatibility.

---

## 3. Security Hardening (January 2025 Audit)

A comprehensive security audit revealed and remediated several critical vulnerabilities, fundamentally strengthening the application's security posture. The overall risk level was reduced from **CRITICAL (CVSS 9.0+)** to **LOW (CVSS < 2.0)**.

### 3.1. Critical Vulnerabilities Remediated:

1.  **Client-Side Authentication Bypass:** Removed client-controlled flags, enforcing server-side session validation for all private content access.
2.  **Plaintext Password Storage:** Implemented SHA-256 hashing (with a migration path to bcrypt) for all notebook passwords, eliminating plaintext storage.
3.  **Real-time Collaboration Bypass:** Secured the HocusPocus WebSocket server with a session-token-based authentication system, validating access on connection and for every operation.
4.  **Browser Password Storage:** Eliminated the storage of passwords in `localStorage`, replacing it with a secure, server-validated session token system.

### 3.2. Architectural Security Improvements:

-   **Access Control Middleware:** A new `withAccessControl` middleware centralizes and enforces permissions for resources (notebooks, documents), making the application more secure and maintainable.
-   **Secure Session Management:** The session management system has been upgraded to use secure, server-side validation. The new `notebookSessions` table and associated functions provide a more robust and secure way to handle user sessions for private notebooks.
-   **Advanced Security Features:** The codebase now includes rate limiting to prevent brute-force attacks and a comprehensive audit logging system to track security-related events.
-   **Secure Password Handling:** The system now uses the Web Crypto API for password hashing, a more secure and modern approach. A migration path for legacy password formats is also in place.
-   **Type Safety and Refinements:** The code has been refactored to improve type safety, especially in the access control middleware, and to provide better error handling and logging.
-   **Strict Security Headers & CSP:** Implemented strict security headers (CSP, HSTS, etc.) to mitigate XSS and other client-side attacks.

---

## 4. Performance & Optimization Strategy

An analysis identified key areas for optimization to reduce Convex bandwidth usage by an estimated **75-85%**.

### 4.1. Key Issues Identified:

-   **Document Tree Loading:** `getAllForTreeLegacy` loaded up to 100 documents at once.
-   **Auto-save Frequency:** Frequent 15-second auto-saves caused excessive writes.
-   **Authentication Queries:** Double queries were being made for authentication checks.
-   **Search Inefficiency:** Search queries were not debounced.
-   **N+1 Queries:** Board lists fetched all tasks for every board.

### 4.2. Phased Implementation Roadmap:

-   **Phase 1 (Notebooks Priority):**
    -   Implement paginated/progressive loading for the document tree.
    -   Increase auto-save delay to 45 seconds and add content diffing.
    -   Add debouncing (300ms) to search inputs.
    -   Cache authentication results.
-   **Phase 2 (Secondary Optimizations):**
    -   Add pagination to notification queries.
    -   Optimize board queries to separate metadata from task data.
    -   Cache access control checks.
-   **Phase 3 (Advanced):**
    -   Implement document content chunking for very large documents.
    -   Compress Y.js state before storage.

---

## 5. Feature Enhancements & Fixes

### 5.1. Notebook Creation and Editing Experience

-   **Unified Dialog:** The `NotebookSettingsDialog` has been replaced by a new, unified `NotebookDialog` that handles both creating and editing notebooks.
-   **Improved UX:** The new dialog features real-time URL availability checking, a simplified and more intuitive interface for setting access levels (Public, Private, Password Protected), and a modern, polished design.
-   **Streamlined Code:** The component is more concise and maintainable, utilizing `trpc/react`'s `useMutation` hook for cleaner state management.

### 5.2. Unified & Public-Aware Sidebar:

-   The `PublicDocumentSidebar` was merged into the main `DocumentSidebar`.
-   The unified component now handles both private and public notebooks, conditionally applying permissions and showing UI indicators (e.g., "Public Notebook (Manageable)" vs. "Private Notebook").
-   It uses the appropriate Convex mutations based on whether the notebook is public or private, allowing anonymous users to manage documents in public notebooks.

### 5.3. Public Notebook Management:

-   Full document management (create, edit, delete, reorganize) is now enabled for public notebooks for all users (anonymous or logged-in).
-   Document ownership is assigned to the notebook owner, but management is open. Notebook deletion remains restricted to the owner.

### 5.4. Bug Fixes:

-   **Undo/Redo:** Fixed inconsistent undo/redo behavior by unifying all actions (menu bar, toolbar, keyboard shortcuts) to use the Y.js UndoManager instead of TipTap's disabled history.
-   **Convex User ID:** Resolved a `ConvexError` in `documents:getAllForTreeLegacy` by removing an unnecessary and problematic string conversion of the `convexUserId`.
-   **Document Title Updates:** Fixed a bug where renaming documents in private notebooks failed because it was incorrectly using the public update function. The logic now correctly uses the standard `updateDocument` for all authenticated users.

---

## Development Commands

### Build and Development

-   `bun run dev` - Start development server with Turbo and experimental HTTPS
-   `bun run build` - Build the application (includes Convex deployment)
-   `bun run start` - Start production server
-   `bun run preview` - Build and start production server

### Database Operations

-   **Convex (Primary and Only)**:
    -   Convex functions auto-deploy on save during development
    -   Use Convex dashboard for database management and monitoring
    -   All new features use Convex queries and mutations
-   **Legacy Commands (Not Used in Production)**:
    -   `bun run db:generate` - Generate Prisma migrations (legacy support only)
    -   `bun run db:migrate` - Deploy Prisma migrations (legacy support only)
    -   `bun run db:push` - Push database schema changes (legacy support only)
    -   `bun run db:studio` - Open Prisma Studio (legacy support only)

### Migration Commands (Historical)

-   `bun run migrate:dry-run` - Test migration from Prisma to Convex (historical, migration complete)
-   `bun run migrate:to-convex` - Full migration from Prisma to Convex (historical, migration complete)
-   `bun run migrate:users-only` - Migrate only users, accounts, and settings (historical, migration complete)

### Code Quality

-   `bun run lint` - Run ESLint
-   `bun run lint:fix` - Run ESLint with automatic fixes
-   `bun run typecheck` - Run TypeScript type checking
-   `bun run check` - Run both linting and type checking
-   `bun run format:check` - Check code formatting with Prettier
-   `bun run format:write` - Format code with Prettier

## Architecture Overview

### Database Architecture

The application has **fully migrated to a Convex-only architecture**:

-   **Convex**: Primary and only database for all data (users, documents, notebooks, authentication, settings)
-   **Prisma + PostgreSQL**: No longer used in production (legacy code maintained for historical reference only)

### Key Technology Stack

-   **Frontend**: Next.js 15 with App Router, React 18, TailwindCSS, **Portuguese (BR) UI**
-   **Authentication**: NextAuth.js with Convex Adapter for Google, Discord, and Email providers
-   **Real-time Collaboration**: Yjs + HocusPocus for document synchronization
-   **Database**: Convex (single source of truth)
-   **Editor**: TipTap with collaborative extensions
-   **State Management**: Zustand for client-side state
-   **API Layer**: Convex queries/mutations (primary) + tRPC for legacy compatibility only
-   **Security**: bcrypt password hashing, secure session management, Web Crypto API
-   **PWA**: Next-PWA for offline functionality

### Directory Structure

-   `src/app/` - Next.js App Router pages and API routes
-   `src/components/` - Legacy React components (being phased out)
-   `src/components_new/` - Modern document editor components with Portuguese UI (primary, focus here)
-   `src/server/` - tRPC API routers (legacy compatibility only)
-   `convex/` - Convex database functions and schema (primary and only database)
-   `prisma/` - Prisma schema and migrations (historical, not used in production)
-   `deno/` - Deno server for notifications and spell check
-   `server/` - Additional server configuration

### Authentication Flow

NextAuth.js handles authentication with a custom Convex Adapter for session management. User data is stored in Convex, with session tokens managed by NextAuth through the ConvexAdapter. The system supports multiple OAuth providers and email authentication with secure password hashing for protected notebooks using SHA-256 and bcrypt.

### Document Management

-   Documents are stored in Convex for real-time collaboration.
-   Hierarchical folder structure (Notebooks) with parent-child relationships (`/notas/[url]/[documentId]`).
-   Real-time synchronization via Yjs and HocusPocus.
-   IndexedDB persistence for offline access.
-   Shared documents via unique URLs, with secure access control middleware.

### Real-time Features

-   Live collaborative editing using Yjs operational transforms.
-   Real-time cursor positions and user awareness.
-   Conflict resolution and offline synchronization.
-   WebSocket connections via HocusPocus provider.

### Notable Patterns

-   **Convex-first architecture:** Components primarily use `ConvexClientProvider` with `TRPCReactProvider` for legacy compatibility.
-   **Migration completed:** New document system in `components_new/` is now primary (legacy `components/` being phased out).
-   PWA integration with service worker and manifest.
-   Spell check integration with custom dictionary management.
-   Task management system with boards and reminders.
-   Secure password handling with SHA-256 and bcrypt hashing, and robust session token generation.
-   Migration scripts available for Prisma-to-Convex data transfer.
-   Access control middleware for centralized permission enforcement.

## Specific Development Memories

### TypeScript Best Practices

-   **Never set type as `any`** - Always use specific, well-defined types to maintain type safety and catch potential errors early in the development process.
-   **Use proper Convex types** - Use `QueryCtx` from `./_generated/server` instead of `any` for Convex context parameters.
-   **Security-first typing** - Ensure authentication and authorization types are properly defined and validated.

### Document Synchronization Fixes (2025-01-09) - Critical Context

**Issue: Document Desync During Switching**
The application experienced synchronization issues when switching between documents in the sidebar, where content would not update properly until multiple attempts.

**Root Causes Identified:**

1.  **Race Conditions**: Multiple async operations during document switching without proper synchronization.
2.  **Y.js Instance Management**: Improper cleanup and recreation of Y.js document instances.
3.  **WebSocket Connection Overlap**: Multiple HocusPocus providers existing simultaneously.
4.  **IndexedDB Persistence Timing**: Race conditions between persistence readiness and content setting.

**Fixes Applied:**

1.  **Enhanced Document Switching Logic**:
    -   Added proper sequential cleanup of editor content, provider connections, and Y.js instances.
    -   Implemented debounced switching with queue management for rapid switches.
    -   Added comprehensive logging for debugging document switching flow.
2.  **Y.js Document Instance Management**:
    -   Improved cleanup sequence to prevent memory leaks.
    -   Added proper provider destruction before creating new instances.
    -   Enhanced persistence state management with document-specific checks.
3.  **Content Setting Synchronization**:
    -   Added proper content clearing before setting new content.
    -   Implemented exponential backoff for content setting retries.
    -   Added document-specific logging for content operations.
5.  **Sidebar Selection Prevention**:
    -   Added duplicate selection prevention in `DocumentSidebar`.
    -   Improved selection logging for debugging.

**Testing:**

-   Created comprehensive unit tests for `DocumentEditor` component.
-   Added test cases for document switching scenarios.
-   Verified error handling for WebSocket connection failures.

**Performance Improvements:**

-   Reduced document switching time from ~2-3 seconds to ~500ms.
-   Eliminated content flickering during switches.
-   Improved memory management with proper cleanup.
-   Enhanced caching efficiency with proper invalidation.

### Document Sidebar UX Improvements (2025-01-09)

**Issue: Poor Sidebar UX on Mobile and Desktop**
The document sidebar had several UX issues including poor mobile responsiveness, lack of visual feedback, and suboptimal document switching experience.

**Improvements Made:**

1.  **Enhanced Visual Design**:
    -   Added gradient header background (blue-50 to white).
    -   Improved document item styling with icon backgrounds and better spacing.
    -   Added subtle animations and hover effects.
    -   Enhanced loading states with proper spinners and messages.
2.  **Mobile Responsiveness**:
    -   Fixed mobile sidebar overlay positioning (full screen coverage).
    -   Added slide-in animation for mobile sidebar.
    -   Improved touch interactions with larger hit areas.
    -   Added smooth transition delay for mobile document selection.
3.  **Document Switching Experience**:
    -   Added loading overlay during document switching.
    -   Implemented visual feedback with animated spinner.
    -   Added document title display in loading state.
    -   Enhanced transition animations between documents.
4.  **Interactive Elements**:
    -   Improved button hover states with scale effects.
    -   Added focus states for better accessibility.
    -   Enhanced dropdown menu styling.
    -   Better visual hierarchy with proper spacing.
5.  **Performance Optimizations**:
    -   Added CSS transitions for smooth animations.
    -   Implemented proper z-index layering.
    -   Added custom scrollbar styling.
    -   Memory leak prevention with proper cleanup.

**Files Modified:**

-   `src/components_new/DocumentSidebar.tsx` - Main sidebar component.
-   `src/components_new/DocumentItem.tsx` - Individual document items.
-   `src/components_new/DocumentEditor.tsx` - Document switching logic.
-   `src/components_new/DocumentSidebar.css` - Custom styling and animations.

**Key Features Added:**

-   Smooth fade-in animations for mobile sidebar.
-   Document switching loading overlay.
-   Enhanced visual feedback for all interactions.
-   Improved accessibility with proper focus states.
-   Better error handling and user feedback.

### Document Loading and Deletion Fixes (2025-01-09)

**Issues Fixed:**

1.  **Blank Screen During Document Loading**: Users experienced a blank screen before the loading indicator appeared when switching documents.
2.  **Convex Errors on Document Deletion**: When deleting the currently open document, users would see Convex errors instead of a graceful experience.

**Improvements Made:**

1.  **Immediate Loading States**:
    -   Combined user authentication and document loading into a single state check.
    -   Loading screen appears immediately when switching documents.
    -   Clear user feedback with specific messages ("Authenticating...", "Loading document...").
    -   Prevents blank screen flash during document transitions.
2.  **Graceful Document Deletion Handling**:
    -   Added proper error handling when current document is deleted.
    -   Shows "Document was deleted, redirecting..." message before redirect.
    -   Automatic redirection to home page when document no longer exists.
    -   Prevention of Convex errors by checking document existence.
3.  **Enhanced Document Not Found Page**:
    -   Beautiful card-based design with clear messaging.
    -   "Create New Document" button with loading state.
    -   "Go to Home" fallback option.
    -   Proper error handling with user-friendly interface.
4.  **Improved Drag and Drop Error Handling**:
    -   Fixed runtime error: "Cannot read properties of undefined (reading 'key')".
    -   Added proper validation for drag and drop operations.
    -   Enhanced error handling in `allowDrop` and `handleDrop` functions.
    -   Better type safety for tree component interactions.

**Technical Improvements:**

-   **Loading State Management**: Consolidated multiple loading states into efficient single checks.
-   **Error Boundaries**: Proper error handling prevents crashes and provides user feedback.
-   **Type Safety**: Enhanced TypeScript support for drag and drop operations.
-   **Performance**: Reduced unnecessary re-renders during document switching.

**Files Modified:**

-   `src/app/documents/[documentId]/page.tsx` - Enhanced loading and error handling.
-   `src/components_new/DocumentEditor.tsx` - Added deletion handling and redirect logic.
-   `src/components_new/DocumentSidebar.tsx` - Fixed drag and drop errors and improved deletion flow.

**User Experience Improvements:**

-   No more blank screens during document loading.
-   Graceful handling of document deletion without errors.
-   Clear visual feedback for all loading states.
-   Intuitive create document flow when documents don't exist.
-   Robust drag and drop functionality without runtime errors.

## 🚨 AUTOMATED CHECKS ARE MANDATORY

**ALL hook issues are BLOCKING - EVERYTHING must be ✅ GREEN!**
No errors. No formatting issues. No linting problems. Zero tolerance.
These are not suggestions. Fix ALL issues before continuing.

## CRITICAL WORKFLOW - ALWAYS FOLLOW THIS!

### Research → Plan → Implement

**NEVER JUMP STRAIGHT TO CODING!** Always follow this sequence:

1.  **Research**: Explore the codebase, understand existing Next.js patterns, data fetching strategies, and component structures, especially focusing on `src/app/`, `src/components_new/`, `src/server/`, `convex/`, and `prisma/`.
2.  **Plan**: Create a detailed implementation plan, including component breakdown, API routes (tRPC or App Router), state management (Zustand, Y.js), and data flow (Prisma, Convex). Verify it with me.
3.  **Implement**: Execute the plan with validation checkpoints.

When asked to implement any feature, you'll first say: "Let me research the codebase and create a plan before implementing."

For complex architectural decisions or challenging problems (e.g., integrating a new real-time feature, optimizing Convex queries), use **"ultrathink"** to engage maximum reasoning capacity. Say: "Let me ultrathink about this Next.js architecture before proposing a solution."

### USE MULTIPLE AGENTS!

*Leverage subagents aggressively* for better results:

*   Spawn agents to explore different parts of the Espaço Pessoal codebase (e.g., API routes, UI components, data fetching logic, Convex functions, Prisma schema) in parallel.
*   Use one agent to write Playwright/Jest tests while another implements features.
*   Delegate research tasks: "I'll have an agent investigate the Convex schema while I analyze the tRPC API structure."
*   For complex refactors: One agent identifies changes, another implements them.

Say: "I'll spawn agents to tackle different aspects of this problem" whenever a task has multiple independent parts.

### Reality Checkpoints

**Stop and validate** at these moments:

-   After implementing a complete feature (e.g., a new page, a major component, an API endpoint).
-   Before starting a new major component (e.g., integrating a new library, building a complex form).
-   When something feels wrong or performance seems off (e.g., document desync, slow loading).
-   Before declaring "done".
-   **WHEN HOOKS FAIL WITH ERRORS** ❌

Run: `bun run format:write && bun run lint && bun run typecheck`.

> Why: You can lose track of what's actually working. These checkpoints prevent cascading failures.

### 🚨 CRITICAL: Hook Failures Are BLOCKING

**When hooks report ANY issues (exit code 2), you MUST:**

1.  **STOP IMMEDIATELY** - Do not continue with other tasks.
2.  **FIX ALL ISSUES** - Address every ❌ issue until everything is ✅ GREEN.
3.  **VERIFY THE FIX** - Re-run the failed command to confirm it's fixed.
4.  **CONTINUE ORIGINAL TASK** - Return to what you were doing before the interrupt.
5.  **NEVER IGNORE** - There are NO warnings, only requirements.

This includes:

-   Formatting issues (`prettier`, etc.)
-   Linting violations (`eslint`, Next.js-specific linting rules, TypeScript errors, etc.)
-   Forbidden patterns (e.g., `any`, excessive inline styles without good reason).
-   ALL other checks.

Your code must be 100% clean. No exceptions.

**Recovery Protocol:**

-   When interrupted by a hook failure, maintain awareness of your original task.
-   After fixing all issues and verifying the fix, continue where you left off.
-   Use the todo list to track both the fix and your original task.

## Working Memory Management

### When context gets long:

-   Re-read this `claude.md` file.
-   Summarize progress in a `PROGRESS.md` file.
-   Document current state before major changes.

### Maintain `TODO.md`:

```markdown
## Current Task
- [ ] What we're doing RIGHT NOW (e.g., Implementing real-time cursor positions in DocumentEditor.tsx)

## Completed  
- [x] What's actually done and tested (e.g., Created tRPC mutation for document sharing, Added basic document deletion flow)

## Next Steps
- [ ] What comes next (e.g., Implement drag-and-drop for document reordering, Optimize Convex queries for document list)
```

## Next.js-Specific Rules (Espaço Pessoal Context)

### FORBIDDEN - NEVER DO THESE:

-   **NO `any` type** - use specific types or interfaces!
-   **NO `setTimeout`/`setInterval` for core logic** in real-time features without proper Y.js/HocusPocus patterns or server-side alternatives.
-   **NO** keeping old and new code together, especially when migrating from `components/` to `components_new/`. Refactor/delete cleanly.
-   **NO** migration functions or compatibility layers (unless explicitly for Prisma data migration).
-   **NO** versioned component/function names (e.g., `LoginPageV2`, `handleFormSubmitNew`).
-   **NO** excessive prop drilling - use Context API (e.g., NextAuth session, Convex), Zustand for client-side state, or Server Components where appropriate.
-   **NO** TODOs in final code.

> **AUTOMATED ENFORCEMENT**: The pre-commit hook will BLOCK commits that violate these rules.
> When you see `❌ FORBIDDEN PATTERN`, you MUST fix it immediately!

### Required Standards:

-   **Delete** old code when replacing it, particularly from `src/components/`.
-   **Meaningful names**: `userProfile`, `blogPostId`, `documentContent` not `data`, `id`.
-   **Early returns** for guard clauses in components and Convex functions.
-   **Concrete types/interfaces** for props, state, Convex queries, and responses. Use `QueryCtx` from `./_generated/server` instead of `any`.
-   **Simple error handling**: Return clear error messages from Convex functions, use `try/catch` in client components, and leverage Next.js error boundaries.
-   **Component-specific tests** (Jest, React Testing Library) and end-to-end tests (e.g., Playwright if introduced).
-   **Leverage Next.js features appropriately**: Server Components, Client Components (`use client`), App Router route handlers.
-   **Use `use client` directive correctly** for client-side interactivity, particularly within `src/components_new/` and editor components.
-   **Convex-first pattern**: Ensure components use `ConvexClientProvider` for real-time data, with `TRPCReactProvider` for legacy compatibility only.
-   **Security-first approach**: Always use bcrypt and SHA-256 for password hashing, server-side authentication validation, and proper session management.

## Implementation Standards

### Our Next.js code is complete when:

-   ✅ All linters (`bun run lint`) pass with zero issues.
-   ✅ All TypeScript checks (`bun run typecheck`) pass.
-   ✅ All Jest tests (`bun run test`) pass.
-   ✅ Feature works end-to-end in development and production builds.
-   ✅ Old code, especially from `src/components/`, is deleted if replaced.
-   ✅ TypeScript types are correctly defined and used throughout.
-   ✅ Comments explain complex logic or non-obvious choices, particularly for Y.js integration or Convex interactions.
-   ✅ Godoc (or equivalent JSDoc) on all exported symbols in tRPC routers and utility functions.

### Testing Strategy

-   Complex business logic/API routes (tRPC, Convex functions) - Write tests first.
-   Simple UI components/CRUD - Write tests after.
-   Hot paths/performance critical areas (e.g., editor interactions, document switching) - Consider `console.time` for quick checks, browser DevTools, and performance monitoring.
-   End-to-end user flows (e.g., full document creation, sharing, collaboration) - Consider Playwright/Cypress if we implement E2E testing.
-   Skip tests for simple presentational components without complex logic.

### Project Structure

Follow Next.js conventions (`app/`, `public/`) combined with Espaço Pessoal specifics.

```
app/              # Next.js App Router (preferred)
public/           # Static assets
src/components/   # Legacy React components (deprecating)
src/components_new/ # New document editor components (focus here for docs)
src/lib/          # Utility functions, helpers, non-UI logic
src/hooks/        # Custom React hooks
src/types/        # TypeScript type definitions
src/server/       # tRPC API routers and server-side logic (legacy)
convex/           # Convex database functions and schema (primary)
prisma/           # Prisma schema and migrations (legacy)
deno/             # Deno server for notifications and spell check
server/           # Additional server configuration
```

## Common Development Workflows (Espaço Pessoal Specific)

### Working with Documents

-   Document components are primarily in `src/components_new/`.
-   Real-time collaboration logic is centered in `DocumentEditor.tsx`.
-   Convex functions for document operations are in `convex/documents.ts`.
-   Notebook management (public/private) is in `convex/notebooks.ts` with secure password handling.
-   For document switching, refer to the "Document Synchronization Fixes" section for critical logic.

### Adding New Features (API/Data)

-   **Primary and Recommended**: Use Convex queries/mutations in `convex/` directory for all new features
-   **Legacy Compatibility Only**: tRPC routers in `src/server/api/routers/` (do not add new ones unless absolutely necessary)
-   Use Convex hooks: `useQuery(api.moduleName.functionName, args)` or `useMutation(api.moduleName.functionName)`
-   **Avoid**: Creating new tRPC endpoints - use Convex instead

### Database Changes

-   **Convex (Only)**: Modify `convex/schema.ts` and relevant functions in `convex/` directory. Changes auto-deploy during development.
-   **Do Not Use**: Prisma is no longer used for new features or production data.
-   **Historical**: Migration from Prisma to Convex is complete.

## Migration and Data Management (Historical)

### Prisma to Convex Migration - COMPLETED

**Status: MIGRATION COMPLETE** - All production data now runs on Convex.

The project included comprehensive migration scripts for transferring data from Prisma/PostgreSQL to Convex:

1.  **Migration Scripts (Historical)**:
    -   `scripts/migrate-to-convex.ts` - Migration script (migration complete)
    -   `convex/migrations.ts` - Migration functions (migration complete)
    -   `MIGRATION_PROGRESS.md` - Migration tracking (migration complete)

2.  **Migration Commands (Historical)**:
    -   `bun run migrate:dry-run` - (migration complete, no longer needed)
    -   `bun run migrate:to-convex` - (migration complete, no longer needed)
    -   `bun run migrate:users-only` - (migration complete, no longer needed)

**Current State**: All new development uses Convex exclusively. Prisma code remains for historical reference only.

## Development Notes (Espaço Pessoal Specific)

### SSL/HTTPS

The development server runs with experimental HTTPS support. SSL certificates are stored in `certificates/` directory.

### Environment Setup

-   Multiple environment files: `.env.local` for Next.js, Convex uses its own config.
-   **No database migrations needed** - Convex handles schema changes automatically.
-   PostInstall hook runs `prisma generate` for legacy compatibility only.

### Performance Considerations

-   The app uses Turbo for faster development builds.
-   React Compiler is enabled for optimized production builds.
-   IndexedDB provides offline document access and persistence for Y.js.
-   Real-time features use efficient Y.js operational transforms.

### Migration Status

The codebase has **completed all major migrations**:
- ✅ Legacy components → Modern document system (`components_new/`)
- ✅ Prisma → Convex (database migration complete)
- ✅ English UI → Portuguese (BR) UI

**Current Development Guidelines**:
- **Use `components_new/` for all features** with Portuguese UI
- **Use Convex exclusively** for all new data operations
- **All UI text must be in Portuguese (BR)**
- Legacy code (Prisma, old components) maintained for reference only

## Troubleshooting Document Sync Issues

### If documents don't switch properly:

1.  Check browser console for Y.js connection logs and HocusPocus provider status.
2.  Verify `NEXT_PUBLIC_WS_URL` is correctly set in `.env.local`.
3.  Check for memory leaks in Y.js document instances (use browser memory profiler).
4.  Review recent fixes in "Document Synchronization Fixes" for relevant logic.

### Performance Monitoring:

-   Document switching should complete within 500ms.
-   WebSocket connection should establish within 2 seconds.
-   Content should not flicker during switches.

### Debug Commands:

-   Enable detailed logging: Set `LOG_LEVEL=development` in your server environment (Deno server, etc.).
-   Check Y.js document states in browser DevTools (look for `Y.Doc` objects).
-   Use `bun run test:watch` for rapid feedback on component and logic changes.
-   Use Convex dashboard for real-time database monitoring and query debugging.

## Development Tools

### Package Management

-   **Always use `bun`** for package management: `bun install`, `bun add`, `bun remove`. Use `bunx` instead of `npx`.
-   **Key Dependencies**:
    -   `convex` - Primary database and real-time backend
    -   `next-auth` - Authentication with custom Convex adapter
    -   `bcryptjs` - Secure password hashing
    -   `@tiptap/react` - Rich text editor with collaboration
    -   `yjs` + `@hocuspocus/provider` - Real-time collaboration
-   **Development Dependencies**: TypeScript, ESLint, Prettier, Jest for testing

## Problem-Solving Together

When you're stuck or confused with Next.js specific challenges, especially within Espaço Pessoal's dual database and real-time setup:

1.  **Stop** - Don't spiral into complex solutions.
2.  **Delegate** - Consider spawning agents for parallel investigation (e.g., one researches a specific Convex query, another explores a Y.js integration pattern).
3.  **Ultrathink** - For complex problems (e.g., state management across Server Components, Client Components, Convex, and Zustand; optimizing real-time sync performance), say "I need to ultrathink through this Next.js challenge" to engage deeper reasoning.
4.  **Step back** - Re-read the Next.js documentation, Convex documentation, and this `claude.md` file.
5.  **Simplify** - The simple Next.js pattern or database query is usually correct.
6.  **Ask** - "I see two Next.js approaches for data fetching: [A - e.g., fetching directly in a Server Component with Prisma] vs [B - e.g., using a Convex query for real-time data]. Which do you prefer for this scenario, considering real-time requirements?"

My insights on better approaches are valued - please ask for them!

## Performance & Security

### **Measure First**:

-   No premature optimization.
-   Use Next.js Analytics, browser DevTools, and Lighthouse for real bottlenecks.
-   Profile React rendering performance.

### **Security Always**:

-   Validate all inputs, especially in tRPC API routes and Convex mutations.
-   Sanitize and escape user-generated content from the editor.
-   Implement proper authentication and authorization for all API routes and Convex functions (e.g., using Convex `auth` context).
-   Be mindful of sensitive data exposure on client-side.

## Communication Protocol

### Progress Updates:

```
✓ Implemented real-time cursor positions in `DocumentEditor.tsx` using Y.js awareness.
✓ Added a new tRPC router for user notifications (all tests passing).
✗ Found issue with document deletion redirect after recent fixes - investigating.
```

### Suggesting Improvements:

"The current document sharing approach works, but I notice [observation, e.g., it doesn't handle permission changes in real-time].
Would you like me to [specific Next.js/Convex improvement, e.g., integrate Convex presence for live sharing updates]?"

## Working Together

-   This is always a feature branch - no backwards compatibility needed on `main` branch.
-   When in doubt, we choose clarity over cleverness in Next.js patterns and real-time implementations.
-   **REMINDER**: If this file hasn't been referenced in 30+ minutes, RE-READ IT!