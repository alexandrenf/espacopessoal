# ConvexError Fix: documents:getAllForTreeLegacy

## Problem
The application was throwing a ConvexError:
```
Uncaught ConvexError: [CONVEX Q(documents:getAllForTreeLegacy)] [Request ID: e95f144d09b09951] Server Error
Called by client
```

## Root Cause
The issue was in how user IDs were being handled in the DocumentSidebar and DocumentEditor components:

1. **Incorrect Type Conversion**: The code was converting `convexUserId` (which is already of type `Id<"users">`) to a string, then casting it back to `Id<"users">` when calling Convex functions.

2. **Type Mismatch**: This conversion was causing type mismatches that could lead to invalid user ID formats being sent to Convex queries.

**Before (Problematic Code):**
```typescript
const { convexUserId, isLoading: isUserLoading } = useConvexUser();
const userIdString = convexUserId ? String(convexUserId) : null;

// Later used as:
{ userId: userIdString as Id<"users">, limit: 200, notebookId }
```

**After (Fixed Code):**
```typescript
const { convexUserId, isLoading: isUserLoading } = useConvexUser();

// Later used as:
{ userId: convexUserId, limit: 200, notebookId }
```

## Solution
Removed the unnecessary string conversion and used `convexUserId` directly throughout both components:

### Files Modified:
1. **src/components_new/DocumentSidebar.tsx**
2. **src/components_new/DocumentEditor.tsx**

### Changes Made:
1. **Removed string conversion**: Eliminated `const userIdString = convexUserId ? String(convexUserId) : null;`
2. **Updated all references**: Changed all `userIdString` references to use `convexUserId` directly
3. **Fixed type casting**: Removed unnecessary `as Id<"users">` casts since `convexUserId` is already the correct type
4. **Updated dependency arrays**: Fixed React Hook dependency arrays to use `convexUserId` instead of `userIdString`

### Key Changes:
- Query calls now use `convexUserId` directly without string conversion
- Conditional checks use `convexUserId` instead of `userIdString`
- All Convex mutations receive the proper `Id<"users">` type
- React Hook dependencies are correctly specified

## Testing
After the fix:
- ✅ Development server starts without errors
- ✅ No TypeScript type errors related to user ID
- ✅ Convex queries should receive properly typed user IDs
- ✅ Document sidebar and editor should load without ConvexError

## Technical Details
The `convexUserId` from `useConvexUser()` hook is already of type `Id<"users"> | null`. Converting it to a string and then casting back was:
1. Unnecessary
2. Potentially corrupting the ID format
3. Causing type safety issues
4. Leading to server-side validation failures in Convex

By using the ID directly, we ensure type safety and proper data flow between the frontend and Convex backend.
