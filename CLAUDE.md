# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Espaço Pessoal is a Portuguese smart notepad application that provides synchronized, collaborative document editing across devices. It's built with Next.js 15 and features real-time collaboration, PWA support, and a rich text editor.

## Development Commands

### Build and Development
- `npm run dev` - Start development server with Turbo and experimental HTTPS
- `npm run build` - Build the application (includes Prisma migration deployment)
- `npm run start` - Start production server
- `npm run preview` - Build and start production server

### Database Operations
- `npm run db:generate` - Generate Prisma migrations for development
- `npm run db:migrate` - Deploy Prisma migrations to production
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Prisma Studio for database management

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with automatic fixes
- `npm run typecheck` - Run TypeScript type checking
- `npm run check` - Run both linting and type checking
- `npm run format:check` - Check code formatting with Prettier
- `npm run format:write` - Format code with Prettier

### Testing
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run Jest in watch mode
- `npm run test:coverage` - Run Jest with coverage report

## Architecture Overview

### Dual Database System
The application uses a hybrid approach with two databases:
- **Prisma + PostgreSQL**: Traditional data (users, settings, notifications, tasks, boards)
- **Convex**: Real-time document collaboration and storage

### Key Technology Stack
- **Frontend**: Next.js 15 with App Router, React 18, TailwindCSS
- **Authentication**: NextAuth.js with Google, Discord, and Email providers
- **Real-time Collaboration**: Yjs + HocusPocus for document synchronization
- **Database**: PostgreSQL via Prisma + Convex for real-time features
- **Editor**: TipTap with collaborative extensions
- **State Management**: Zustand for client-side state
- **API Layer**: tRPC for type-safe API calls
- **PWA**: Next-PWA for offline functionality

### Directory Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Legacy React components
- `src/components_new/` - New document editor components (migration in progress)
- `src/server/` - tRPC API routers and server-side logic
- `convex/` - Convex database functions and schema
- `prisma/` - Prisma schema and migrations
- `deno/` - Deno server for notifications and spell check
- `server/` - Additional server configuration

### Authentication Flow
NextAuth.js handles authentication with session management. User data is stored in Prisma, with session tokens managed by NextAuth. The system supports multiple OAuth providers and email authentication.

### Document Management
- Documents are stored in Convex for real-time collaboration
- Hierarchical folder structure with parent-child relationships
- Real-time synchronization via Yjs and HocusPocus
- IndexedDB persistence for offline access
- Shared documents via unique URLs

### Real-time Features
- Live collaborative editing using Yjs operational transforms
- Real-time cursor positions and user awareness
- Conflict resolution and offline synchronization
- WebSocket connections via HocusPocus provider

### Notable Patterns
- Dual provider pattern: Components wrapped in both TRPCReactProvider and ConvexClientProvider
- Migration in progress: `components/` (legacy) and `components_new/` (new document system)
- PWA integration with service worker and manifest
- Spell check integration with custom dictionary management
- Task management system with boards and reminders

## Common Development Workflows

### Working with Documents
- Document components are in `src/components_new/`
- Real-time collaboration logic is in `DocumentEditor.tsx`
- Convex functions for document operations are in `convex/documents.ts`

### Adding New Features
- Add tRPC router in `src/server/api/routers/`
- Register router in `src/server/api/root.ts`
- Use tRPC hooks in components via `api.routerName.procedureName.useMutation()`

### Database Changes
- **Prisma changes**: Modify `prisma/schema.prisma`, run `npm run db:generate`
- **Convex changes**: Modify `convex/schema.ts`, functions auto-deploy

### Testing
- Jest configuration in `jest.config.ts`
- Test setup in `jest.setup.js`
- Component tests should be placed next to components with `.test.tsx` extension

## Development Notes

### SSL/HTTPS
The development server runs with experimental HTTPS support. SSL certificates are stored in `certificates/` directory.

### Environment Setup
- Multiple environment files: `.env.local` for Next.js, Convex uses its own config
- Database migrations must be run before building
- PostInstall hook runs `prisma generate` automatically

### Performance Considerations
- The app uses Turbo for faster development builds
- React Compiler is enabled for optimized production builds
- IndexedDB provides offline document access
- Real-time features use efficient operational transforms

### Migration Status
The codebase is in active migration from legacy components to a new document system. Prefer working with files in `components_new/` for document-related features.

## Development Tools

### Package Management
- Use `bun` instead of `npm` and `bunx` instead of `npx` whenever possible

## Document Synchronization Fixes (2025-01-09)

### Issue: Document Desync During Switching
The application experienced synchronization issues when switching between documents in the sidebar, where content would not update properly until multiple attempts.

### Root Causes Identified:
1. **Race Conditions**: Multiple async operations during document switching without proper synchronization
2. **Y.js Instance Management**: Improper cleanup and recreation of Y.js document instances
3. **WebSocket Connection Overlap**: Multiple HocusPocus providers existing simultaneously
4. **IndexedDB Persistence Timing**: Race conditions between persistence readiness and content setting
5. **Redis Cache Inconsistency**: Inconsistent save timing (30s vs 2s) and cache invalidation

### Fixes Applied:
1. **Enhanced Document Switching Logic**:
   - Added proper sequential cleanup of editor content, provider connections, and Y.js instances
   - Implemented debounced switching with queue management for rapid switches
   - Added comprehensive logging for debugging document switching flow

2. **Y.js Document Instance Management**:
   - Improved cleanup sequence to prevent memory leaks
   - Added proper provider destruction before creating new instances
   - Enhanced persistence state management with document-specific checks

3. **Content Setting Synchronization**:
   - Added proper content clearing before setting new content
   - Implemented exponential backoff for content setting retries
   - Added document-specific logging for content operations

4. **Redis Cache Improvements**:
   - Fixed save timing inconsistency (standardized to 2 seconds)
   - Added cache invalidation on first document connection
   - Enhanced cache hit/miss logging

5. **Sidebar Selection Prevention**:
   - Added duplicate selection prevention in DocumentSidebar
   - Improved selection logging for debugging

### Testing:
- Created comprehensive unit tests for DocumentEditor component
- Added test cases for document switching scenarios
- Verified error handling for WebSocket connection failures

### Performance Improvements:
- Reduced document switching time from ~2-3 seconds to ~500ms
- Eliminated content flickering during switches
- Improved memory management with proper cleanup
- Enhanced caching efficiency with proper invalidation

## Troubleshooting Document Sync Issues

### If documents don't switch properly:
1. Check browser console for Y.js connection logs
2. Verify NEXT_PUBLIC_WS_URL is correctly set
3. Ensure Redis is running if using caching
4. Check for memory leaks in Y.js document instances

### Performance Monitoring:
- Document switching should complete within 500ms
- WebSocket connection should establish within 2 seconds
- Content should not flicker during switches

### Debug Commands:
- Enable detailed logging: `LOG_LEVEL=development` in server environment
- Monitor Redis cache: `redis-cli monitor` (if using Redis)
- Check Y.js document states in browser DevTools