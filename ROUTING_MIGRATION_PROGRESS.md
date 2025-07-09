# Routing Migration Progress: /documents/[documentId] → /notas/[url]/[documentId]

## Overview
This document tracks the progress of migrating from the current `/documents/[documentId]` routing structure to a new notebook-centric structure: `/notas/[url]/[documentId]`.

The new structure introduces a **notebook concept** where:
- `/notas/[url]` = Notebook overview page (lists documents within the notebook)
- `/notas/[url]/[documentId]` = Individual document editor within the notebook context

## ✅ COMPLETED TASKS

### 1. Database Schema Changes
- **✅ Created `notebooks` table** in Convex schema (`convex/schema.ts`)
  - Fields: `url`, `title`, `description`, `ownerId`, `isPrivate`, `password`, `createdAt`, `updatedAt`
  - Indexes: `by_owner_id`, `by_url`, `by_owner_and_url`
  
- **✅ Updated `documents` table** to include `notebookId` foreign key
  - Added: `notebookId: v.optional(v.id("notebooks"))`
  - Added index: `by_notebook_id`
  - Updated search index to include `notebookId` filtering

### 2. Backend Functions & API
- **✅ Created Convex notebook functions** (`convex/notebooks.ts`)
  - `create` - Create new notebook with URL validation
  - `getByUrl` - Get notebook by URL with access control
  - `getByOwner` - Get user's notebooks
  - `update` - Update notebook details
  - `remove` - Delete notebook (with safety checks)
  - `checkUrlAvailability` - Check if URL is available
  - `getOrCreateDefault` - Get or create default notebook
  - `validatePassword` - Validate notebook password

- **✅ Updated document Convex functions** (`convex/documents.ts`)
  - Enhanced `create` with notebook validation and scoping
  - Updated all queries (`get`, `getHierarchical`, `getAllForTree`, etc.) with `notebookId` filtering
  - Enhanced `getById` with notebook access validation
  - Updated `getOrCreateHomeDocument` to work within notebook context
  - Updated `getRecentDocuments` with notebook filtering

- **✅ Created tRPC notebooks router** (`src/server/api/routers/notebooks.ts`)
  - Comprehensive CRUD operations
  - Password validation endpoints
  - URL availability checking
  - Integration with Convex backend

- **✅ Registered notebooks router** in `src/server/api/root.ts`

### 3. Route Structure Implementation
- **✅ Created notebook overview page** (`src/app/notas/[url]/page.tsx`)
  - Beautiful card-based design showing notebook info
  - Document grid with creation, editing, and navigation
  - Private notebook password authentication
  - Document creation and management
  - Mobile-responsive design

- **✅ Created document editor page** (`src/app/notas/[url]/[documentId]/page.tsx`)
  - Validates notebook and document access
  - Integrates with existing DocumentEditor component
  - Proper error handling and loading states
  - Authentication flow
  - Navigation breadcrumbs

### 4. Enhanced Security & Access Control
- **✅ Notebook-scoped document access** - Documents can only be accessed within their notebook context
- **✅ Password protection** for private notebooks
- **✅ Owner validation** for all operations
- **✅ Proper error handling** with user-friendly messages

## ✅ COMPLETED TASKS (CONTINUED)

### 5. Navigation Components Update
- **✅ Update DocumentSidebar** (`src/components_new/DocumentSidebar.tsx`)
  - Made it notebook-aware (show documents only from current notebook)
  - Added notebook context to document tree
  - Updated document creation to use notebook scope
  - Updated document navigation to use new URLs

- **✅ Update DocumentEditor** (`src/components_new/DocumentEditor.tsx`)
  - Accept and use `notebookUrl` prop for navigation
  - Updated document sharing to use notebook context
  - Updated breadcrumb navigation

### 6. Data Migration Scripts
- **✅ Create migration script** to move existing documents to default notebooks
  - Created comprehensive migration system (`convex/migrate-documents-to-notebooks.ts`)
  - For each user, create a default notebook ("main")
  - Assign all existing documents to the default notebook
  - Ensure data integrity during migration
  - Includes dry-run mode, validation, and rollback capabilities

### 7. URL Redirects & Backward Compatibility
- **✅ Setup redirects** from old `/documents/[documentId]` URLs
  - Updated legacy page to detect and redirect old URLs
  - Look up document's notebook
  - Redirect to `/notas/[notebookUrl]/[documentId]`
  - Maintains backward compatibility

### 8. Testing & Validation
- **✅ Create comprehensive test plan** (`MIGRATION_TEST_PLAN.md`)
  - Detailed test scenarios for all migration aspects
  - Pre-migration, migration, and post-migration testing
  - Performance, browser compatibility, and data integrity tests
  - Clear success criteria and rollback procedures

## 🔄 REMAINING TASKS

### 9. Final Validation & Deployment
- **❌ Execute test plan** following `MIGRATION_TEST_PLAN.md`
- **❌ Run migration in test environment** first
- **❌ Validate all functionality** works as expected
- **❌ Deploy to production** with proper monitoring

## 🔧 IMPLEMENTATION NOTES

### Key Files Modified
- `convex/schema.ts` - Added notebooks table and updated documents
- `convex/notebooks.ts` - New notebook management functions
- `convex/documents.ts` - Updated with notebook-scoped queries
- `src/server/api/routers/notebooks.ts` - New tRPC router
- `src/server/api/root.ts` - Registered new router
- `src/app/notas/[url]/page.tsx` - Notebook overview page (REPLACED legacy notepad)
- `src/app/notas/[url]/[documentId]/page.tsx` - Document editor in notebook context

### Current Architecture
```
/notas/[url]                    → Notebook overview (list documents)
/notas/[url]/[documentId]       → Document editor within notebook
/documents/[documentId]         → OLD FORMAT (needs redirect)
```

### Database Relationships
```
notebooks (1) ←→ (N) documents
- A notebook can have many documents
- A document belongs to one notebook (optional for migration)
- Documents without notebookId are "legacy" documents
```

### Next Steps Priority
1. **Update DocumentSidebar** - Critical for user experience
2. **Create migration scripts** - Essential for data integrity
3. **Setup URL redirects** - Maintain backward compatibility
4. **Testing** - Ensure everything works end-to-end

### Known Dependencies
- DocumentSidebar component needs notebook context
- DocumentEditor needs notebookUrl prop
- Migration scripts need to run before full deployment
- URL redirects need to be setup in routing middleware

## 🚨 CRITICAL NOTES
- **The old `/notas/[url]/page.tsx` was REPLACED** with new notebook overview
- **Documents now require notebook context** for proper access control
- **Password authentication** works at notebook level, not document level
- **All document queries** are now notebook-scoped for better security

## 📋 TODO SUMMARY
1. Update DocumentSidebar for notebook-awareness
2. Create data migration scripts
3. Setup URL redirects
4. Comprehensive testing
5. Deploy with proper rollback plan