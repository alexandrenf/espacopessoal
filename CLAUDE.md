Subject: Next.js Development Partnership Guide - Espaço Pessoal Edition

# Next.js Development Partnership - Espaço Pessoal

This document provides tailored guidance for our collaborative development efforts on Espaço Pessoal. Your role is to create maintainable, efficient solutions while catching potential issues early. We are building production-quality code for a synchronized, collaborative document editing application using Next.js 15.

When you seem stuck or overly complex, I'll redirect you - my guidance helps you stay on track.

## Project Overview

Espaço Pessoal is a Portuguese smart notepad application that provides synchronized, collaborative document editing across devices. It's built with Next.js 15 and features real-time collaboration, PWA support, and a rich text editor.

## Development Commands

### Build and Development
- `bun run dev` - Start development server with Turbo and experimental HTTPS
- `bun run build` - Build the application (includes Prisma migration deployment)
- `bun run start` - Start production server
- `bun run preview` - Build and start production server

### Database Operations
- `bun run db:generate` - Generate Prisma migrations for development
- `bun run db:migrate` - Deploy Prisma migrations to production
- `bun run db:push` - Push database schema changes
- `bun run db:studio` - Open Prisma Studio for database management

### Code Quality
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Run ESLint with automatic fixes
- `bun run typecheck` - Run TypeScript type checking
- `bun run check` - Run both linting and type checking
- `bun run format:check` - Check code formatting with Prettier
- `bun run format:write` - Format code with Prettier

## Architecture Overview

### Dual Database System
The application uses a hybrid approach with two databases:
- **Prisma + PostgreSQL**: Traditional data (users, settings, notifications, tasks, boards)
- **Convex**: Real-time document collaboration and storage

### Key Technology Stack
-   **Frontend**: Next.js 15 with App Router, React 18, TailwindCSS
-   **Authentication**: NextAuth.js with Google, Discord, and Email providers
-   **Real-time Collaboration**: Yjs + HocusPocus for document synchronization
-   **Database**: PostgreSQL via Prisma + Convex for real-time features
-   **Editor**: TipTap with collaborative extensions
-   **State Management**: Zustand for client-side state
-   **API Layer**: tRPC for type-safe API calls
-   **PWA**: Next-PWA for offline functionality

### Directory Structure
-   `src/app/` - Next.js App Router pages and API routes
-   `src/components/` - Legacy React components
-   `src/components_new/` - New document editor components (migration in progress)
-   `src/server/` - tRPC API routers and server-side logic
-   `convex/` - Convex database functions and schema
-   `prisma/` - Prisma schema and migrations
-   `deno/` - Deno server for notifications and spell check
-   `server/` - Additional server configuration

### Authentication Flow
NextAuth.js handles authentication with session management. User data is stored in Prisma, with session tokens managed by NextAuth. The system supports multiple OAuth providers and email authentication.

### Document Management
-   Documents are stored in Convex for real-time collaboration
-   Hierarchical folder structure with parent-child relationships
-   Real-time synchronization via Yjs and HocusPocus
-   IndexedDB persistence for offline access
-   Shared documents via unique URLs

### Real-time Features
-   Live collaborative editing using Yjs operational transforms
-   Real-time cursor positions and user awareness
-   Conflict resolution and offline synchronization
-   WebSocket connections via HocusPocus provider

### Notable Patterns
-   Dual provider pattern: Components wrapped in both TRPCReactProvider and ConvexClientProvider
-   Migration in progress: `components/` (legacy) and `components_new/` (new document system)
-   PWA integration with service worker and manifest
-   Spell check integration with custom dictionary management
-   Task management system with boards and reminders

## Specific Development Memories

### TypeScript Best Practices
- **Never set type as `any`** - Always use specific, well-defined types to maintain type safety and catch potential errors early in the development process.

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
-   Re-read this `NEXTJS_GUIDE.md` file.
-   Summarize progress in a `PROGRESS.md` file.
-   Document current state before major changes.

### Maintain `TODO.md`:
```
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
-   **Early returns** for guard clauses in components and tRPC API routes.
-   **Concrete types/interfaces** for props, state, Convex queries, Prisma models, and tRPC responses.
-   **Simple error handling**: Return clear error messages from tRPC/API routes, use `try/catch` in client components, and leverage Next.js error boundaries.
-   **Component-specific tests** (Jest, React Testing Library) and end-to-end tests (e.g., Playwright if introduced).
-   **Leverage Next.js features appropriately**: Server Components, Client Components (`use client`), `getServerSideProps` (if still using Pages Router), `getStaticProps`, `generateStaticParams`, App Router route handlers.
-   **Use `use client` directive correctly** for client-side interactivity, particularly within `src/components_new/` and editor components.
-   **Dual provider pattern**: Ensure components needing real-time data are correctly wrapped in both `TRPCReactProvider` and `ConvexClientProvider`.

## Implementation Standards

### Our Next.js code is complete when:
-   ? All linters (`bun run lint`) pass with zero issues.
-   ? All TypeScript checks (`bun run typecheck`) pass.
-   ? All Jest tests (`bun run test`) pass.
-   ? Feature works end-to-end in development and production builds.
-   ? Old code, especially from `src/components/`, is deleted if replaced.
-   ? TypeScript types are correctly defined and used throughout.
-   ? Comments explain complex logic or non-obvious choices, particularly for Y.js integration or Convex interactions.
-   ? Godoc (or equivalent JSDoc) on all exported symbols in tRPC routers and utility functions.

### Testing Strategy
-   Complex business logic/API routes (tRPC, Convex functions) ? Write tests first.
-   Simple UI components/CRUD ? Write tests after.
-   Hot paths/performance critical areas (e.g., editor interactions, document switching) ? Consider `console.time` for quick checks, browser DevTools, and performance monitoring.
-   End-to-end user flows (e.g., full document creation, sharing, collaboration) ? Consider Playwright/Cypress if we implement E2E testing.
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
src/server/       # tRPC API routers and server-side logic
convex/           # Convex database functions and schema
prisma/           # Prisma schema and migrations
deno/             # Deno server for notifications and spell check
server/           # Additional server configuration
```

## Common Development Workflows (Espaço Pessoal Specific)

### Working with Documents
-   Document components are primarily in `src/components_new/`.
-   Real-time collaboration logic is centered in `DocumentEditor.tsx`.
-   Convex functions for document operations are in `convex/documents.ts`.
-   For document switching, refer to the "Document Synchronization Fixes" section for critical logic.

### Adding New Features (API/Data)
-   Add tRPC router in `src/server/api/routers/`.
-   Register router in `src/server/api/root.ts`.
-   Use tRPC hooks in components via `api.routerName.procedureName.useMutation()` or `api.routerName.procedureName.useQuery()`.
-   For real-time data related to documents, consider Convex functions (`convex/`).

### Database Changes
-   **Prisma changes**: Modify `prisma/schema.prisma`, run `bun run db:generate`, and remember `bun run db:migrate` for production deployment.
-   **Convex changes**: Modify `convex/schema.ts` and relevant functions in `convex/` directory. Changes auto-deploy.

### Testing
-   Jest configuration in `jest.config.ts`.
-   Test setup in `jest.setup.js`.
-   Component tests should be placed next to components with `.test.tsx` extension.

## Development Notes (Espaço Pessoal Specific)

### SSL/HTTPS
The development server runs with experimental HTTPS support. SSL certificates are stored in `certificates/` directory.

### Environment Setup
-   Multiple environment files: `.env.local` for Next.js, Convex uses its own config.
-   Database migrations must be run (`bun run db:migrate`) before building or deploying a new production version.
-   PostInstall hook runs `prisma generate` automatically.

### Performance Considerations
-   The app uses Turbo for faster development builds.
-   React Compiler is enabled for optimized production builds.
-   IndexedDB provides offline document access and persistence for Y.js.
-   Real-time features use efficient Y.js operational transforms.

### Migration Status
The codebase is in active migration from legacy components to a new document system. **Prefer working with files in `components_new/` for document-related features and new development.**

## Document Synchronization Fixes (2025-01-09) - CRITICAL CONTEXT

### Issue: Document Desync During Switching
The application experienced synchronization issues when switching between documents in the sidebar, where content would not update properly until multiple attempts.

### Root Causes Identified:
1.  **Race Conditions**: Multiple async operations during document switching without proper synchronization.
2.  **Y.js Instance Management**: Improper cleanup and recreation of Y.js document instances.
3.  **WebSocket Connection Overlap**: Multiple HocusPocus providers existing simultaneously.
4.  **IndexedDB Persistence Timing**: Race conditions between persistence readiness and content setting.
5.  **Redis Cache Inconsistency**: Inconsistent save timing (30s vs 2s) and cache invalidation.

### Fixes Applied:
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
4.  **Redis Cache Improvements**:
    -   Fixed save timing inconsistency (standardized to 2 seconds).
    -   Added cache invalidation on first document connection.
    -   Enhanced cache hit/miss logging.
5.  **Sidebar Selection Prevention**:
    -   Added duplicate selection prevention in DocumentSidebar.
    -   Improved selection logging for debugging.

### Testing:
-   Created comprehensive unit tests for DocumentEditor component.
-   Added test cases for document switching scenarios.
-   Verified error handling for WebSocket connection failures.

### Performance Improvements:
-   Reduced document switching time from ~2-3 seconds to ~500ms.
-   Eliminated content flickering during switches.
-   Improved memory management with proper cleanup.
-   Enhanced caching efficiency with proper invalidation.

## Document Sidebar UX Improvements (2025-01-09)

### Issue: Poor Sidebar UX on Mobile and Desktop
The document sidebar had several UX issues including poor mobile responsiveness, lack of visual feedback, and suboptimal document switching experience.

### Improvements Made:

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

### Files Modified:
-   `src/components_new/DocumentSidebar.tsx` - Main sidebar component.
-   `src/components_new/DocumentItem.tsx` - Individual document items.
-   `src/components_new/DocumentEditor.tsx` - Document switching logic.
-   `src/components_new/DocumentSidebar.css` - Custom styling and animations.

### Key Features Added:
-   Smooth fade-in animations for mobile sidebar.
-   Document switching loading overlay.
-   Enhanced visual feedback for all interactions.
-   Improved accessibility with proper focus states.
-   Better error handling and user feedback.

## Document Loading and Deletion Fixes (2025-01-09)

### Issues Fixed:
1.  **Blank Screen During Document Loading**: Users experienced a blank screen before the loading indicator appeared when switching documents.
2.  **Convex Errors on Document Deletion**: When deleting the currently open document, users would see Convex errors instead of a graceful experience.

### Improvements Made:

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
    -   Enhanced error handling in allowDrop and handleDrop functions.
    -   Better type safety for tree component interactions.

### Technical Improvements:
-   **Loading State Management**: Consolidated multiple loading states into efficient single checks.
-   **Error Boundaries**: Proper error handling prevents crashes and provides user feedback.
-   **Type Safety**: Enhanced TypeScript support for drag and drop operations.
-   **Performance**: Reduced unnecessary re-renders during document switching.

### Files Modified:
-   `src/app/documents/[documentId]/page.tsx` - Enhanced loading and error handling.
-   `src/components_new/DocumentEditor.tsx` - Added deletion handling and redirect logic.
-   `src/components_new/DocumentSidebar.tsx` - Fixed drag and drop errors and improved deletion flow.

### User Experience Improvements:
-   No more blank screens during document loading.
-   Graceful handling of document deletion without errors.
-   Clear visual feedback for all loading states.
-   Intuitive create document flow when documents don't exist.
-   Robust drag and drop functionality without runtime errors.

## Troubleshooting Document Sync Issues

### If documents don't switch properly:
1.  Check browser console for Y.js connection logs and HocusPocus provider status.
2.  Verify `NEXT_PUBLIC_WS_URL` is correctly set in `.env.local`.
3.  Ensure Redis is running if using caching for HocusPocus.
4.  Check for memory leaks in Y.js document instances (use browser memory profiler).
5.  Review recent fixes in "Document Synchronization Fixes" for relevant logic.

### Performance Monitoring:
-   Document switching should complete within 500ms.
-   WebSocket connection should establish within 2 seconds.
-   Content should not flicker during switches.

### Debug Commands:
-   Enable detailed logging: Set `LOG_LEVEL=development` in your server environment (Deno server, etc.).
-   Monitor Redis cache: `redis-cli monitor` (if using Redis locally).
-   Check Y.js document states in browser DevTools (look for `Y.Doc` objects).
-   Use `bun run test:watch` for rapid feedback on component and logic changes.

## Development Tools

### Package Management
-   **Always use `bun`** for package management, i.e., `bun install`, `bun add`, `bun remove`. Use `bunx` instead of `npx`.

## Problem-Solving Together

When you're stuck or confused with Next.js specific challenges, especially within Espaço Pessoal's dual database and real-time setup:
1.  **Stop** - Don't spiral into complex solutions.
2.  **Delegate** - Consider spawning agents for parallel investigation (e.g., one researches a specific Convex query, another explores a Y.js integration pattern).
3.  **Ultrathink** - For complex problems (e.g., state management across Server Components, Client Components, Convex, and Zustand; optimizing real-time sync performance), say "I need to ultrathink through this Next.js challenge" to engage deeper reasoning.
4.  **Step back** - Re-read the Next.js documentation, Convex documentation, and the Espaço Pessoal `CLAUDE.md` (`NEXTJS_GUIDE.md`) file.
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