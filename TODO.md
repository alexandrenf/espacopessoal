⏺ Update Todos

  ⎿  ☒ Implement graceful 'Notebook Not Found' error handling   
     ☒ Fix private notebook error handling (unauthorized access)
     ☒ Fix inaccurate document count on /notas page - truly fixed
     ☒ Fix mobile sidebar UI/UX overlap with document title
     ☒ Implement case-insensitive notebook URLs
     ☐ Fix PDF export functionality
     ☐ Investigate and fix Deno deployment failures
     ☐ Allow spaces in document titles when editing
     ☐ Make header visible on document pages (/notas/url/id)
     ☐ Implement persistent sidebar state across navigation
     ☐ Move PDF export button from toolbar to menubar
     ☐ Add Markdown export feature
     ☐ Implement new user onboarding flow
     ☐ Optimize saving with diff-based logic
     ☐ Remove save info display on document page
     ☐ Add conditional logging in DocumentEditor.tsx
     ☐ Add conditional logging in notebook page

# Project Improvement Plan

This document outlines the plan to address known issues and implement new features.

---

## High Priority

### 1. Graceful "Notebook Not Found" Error

*   **Priority:** High
*   **Issue:** Accessing a non-existent notebook results in an unhandled server error on the frontend.
*   **Plan:**
    *   Modify the `notebooks:getMetadataByUrl` query in Convex to return `null` instead of throwing an error when a notebook is not found.
    *   In the frontend component that calls this query (likely under `src/app/notas/`), check for a `null` response.
    *   Render a dedicated, user-friendly "Notebook Not Found" page or component when the result is `null`.

---

### 2. Notebook Privado (não o protegido) Error Handling

*   **Priority:** High
*   **Issue:** Attempting to access a private notebook without permission results in an unhandled server error.
*   **Plan:**
    *   Modify the `notebooks:getByUrlWithSession` query to perform an explicit ownership/permission check.
    *   Instead of throwing a generic error, have the query return a specific status (e.g., `{ error: "unauthorized" }`).
    *   The frontend should handle this response and display a clear, friendly message like "This notebook is private" or "You do not have permission to view this notebook."

---

### 3. Deno Deployment Failures

*   **Priority:** High
*   **Issue:** The Deno service is failing to deploy correctly.
*   **Plan:**
    *   **Investigate:** Analyze the Deno Deploy logs to diagnose the root cause of the deployment errors.
    *   **Evaluate Cloudflare:** As suggested, evaluate migrating the service to Cloudflare Workers. This includes assessing the effort, compatibility, and potential benefits.
    *   **Migration (If Approved):** Create a new Cloudflare Worker, adapt the Deno code for the new environment, and configure deployment via the Wrangler CLI.

---

### 4. Inaccurate Document Count

*   **Priority:** High
*   **Issue:** The number of documents displayed on the `/notas` page is incorrect.
*   **Plan:**
    *   Investigate the Convex query that fetches the document count for the `/notas` page.
    *   Debug the query's filtering logic. It may be incorrectly including archived/deleted items or miscalculating user-owned documents.
    *   Correct the query to ensure it returns an accurate count.

---

### 5. Mobile Sidebar UI/UX

*   **Priority:** High
*   **Issue:** The hamburger menu for the mobile sidebar overlaps with the document title, creating a poor user experience.
*   **Plan:**
    *   Inspect the CSS for the header and sidebar components on mobile screens.
    *   Adjust the layout properties (e.g., using Flexbox `gap`, `margin`, or `padding`) to ensure the menu button and the title have adequate spacing and do not overlap.

---

## Medium Priority

### 6. Case-Insensitive Notebook URLs

*   **Priority:** Medium
*   **Issue:** Notebook URLs are only checked for lowercase characters, leading to missed matches if the URL has uppercase characters.
*   **Plan:**
    *   Locate the Convex queries responsible for fetching notebooks by URL (e.g., `getMetadataByUrl`, `getByUrlWithSession`) in `convex/notebooks.ts`.
    *   In these queries, normalize both the input URL and the stored URL to lowercase before comparison to ensure case-insensitive matching.

---

### 7. PDF Export Improvements

*   **Priority:** Medium
*   **Issue:** The "Export as PDF" feature is not working as expected.
*   **Plan:**
    *   **Investigate:** Conduct a thorough review of the current PDF export implementation to identify the specific problems.
    *   **Gather Requirements:** Clarify the expected output and functionality for the PDF export.
    *   **Implement Fixes:** Address the identified issues, which might involve fixing styling, handling complex content, or replacing the underlying library.

---

### 8. Allow Spaces in Document Titles

*   **Priority:** Medium
*   **Issue:** Users cannot add spaces to document titles when editing them in the sidebar.
*   **Plan:**
    *   **Debug Input:** Investigate the event handlers (`onChange`, `onKeyDown`, etc.) for the title input field in the sidebar/rename component.
    *   **Identify Cause:** The issue is likely caused by incorrect event handling (e.g., `preventDefault()` on spacebar) or a validation/sanitization step that strips spaces.
    *   **Fix:** Correct the handling to allow spaces while ensuring the title is updated correctly via its Convex mutation.

---

### 9. Header Visibility on Document Pages

*   **Priority:** Medium
*   **Issue:** The main application header is not visible on the `/notas/url/id` pages.
*   **Plan:**
    *   Review the page layout structure for the document view (`/notas/[...slug]`).
    *   Identify why the header component is not being rendered. It might be excluded from the layout or hidden with CSS.
    *   Ensure the main header component is included and visible on this page for consistent navigation.

---

### 10. Persistent Sidebar State

*   **Priority:** Medium
*   **Issue:** The sidebar's open/closed state is not preserved when navigating between documents.
*   **Plan:**
    *   **State Management:** Move the sidebar's state from a component-level `useState` to a persistent state solution.
    *   **Implementation:** Use `localStorage` or a global state manager (e.g., Zustand, if available in the project) to store and retrieve the sidebar's state, ensuring it persists across navigation.

---

### 11. Relocate PDF Export Button

*   **Priority:** Medium
*   **Issue:** The "Export to PDF" button is currently in the toolbar.
*   **Plan:**
    *   Move the "Export to PDF" button from the toolbar to the menubar.
    *   It should be located under the "Arquivo" -> "Exportar" menu in the `DocumentEditor` component.

---

## Low Priority

### 12. Markdown Export Feature

*   **Priority:** Low
*   **Issue:** The application lacks a feature to export documents as Markdown.
*   **Plan:**
    *   **Add UI Element:** Add an "Export as Markdown" option to the document actions menu.
    *   **Implement Conversion:**
        *   Use a library like `turndown` to convert the document's HTML or rich-text format into Markdown.
        *   Implement a client-side function that takes the editor's content, performs the conversion, and triggers a file download.

---

### 13. New User Onboarding

*   **Priority:** Low
*   **Issue:** New users are not introduced to the application's features.
*   **Plan:**
    *   **Design Flow:** Design a simple and engaging onboarding experience (e.g., a welcome modal with a feature overview or a guided tour).
    *   **Implement:**
        *   Create the onboarding UI components.
        *   Add a flag like `hasCompletedOnboarding` to the user model in `convex/schema.ts`.
        *   Trigger the onboarding flow for any user for whom the flag is not `true`.

---

### 14. Optimize Saving (Save on Diff)

*   **Priority:** Low
*   **Issue:** The server saves a new version of a document on every update, even if no content has changed.
*   **Plan:**
    *   **Client-Side Check:** Implement a client-side check before triggering a save.
    *   **Logic:**
        *   Store the last-saved version of the document content in a state or ref.
        *   Before calling the Convex mutation to save, compare the current editor content with the last-saved content.
        *   Only execute the save mutation if there is a difference (a "diff").

---

### 15. Remove Save Info on Document Page

*   **Priority:** Low
*   **Issue:** The save status information (e.g., "Saved") on the `/notas/url/id` page is considered redundant.
*   **Plan:**
    *   **Locate Component:** Find the UI element responsible for displaying the save status on the document page.
    *   **Remove:** Delete the JSX or code that renders this information.

---

### 16. Conditional Logging in DocumentEditor

*   **Priority:** Low
*   **Issue:** `console.log` statements are present in the production build, which can expose internal debugging information and add unnecessary noise to the browser console.
*   **Plan:**
    *   Go through `src/components_new/DocumentEditor.tsx`.
    *   Wrap all `console.log`, `console.warn`, and `console.error` statements in a condition to ensure they only execute in development mode.
    *   **Example:** `if (process.env.NODE_ENV === 'development') { console.log('Your log message'); }`

---

### 17. Conditional Logging in Notebook Page

*   **Priority:** Low
*   **Issue:** `console.log` statements are present in the production build in the notebook page, which can expose internal debugging information and add unnecessary noise to the browser console.
*   **Plan:**
    *   Go through `src/app/notas/[url]/page.tsx`.
    *   Wrap all `console.log`, `console.warn`, and `console.error` statements in a condition to ensure they only execute in development mode.
    *   **Example:** `if (process.env.NODE_ENV === 'development') { console.log('Your log message'); }`
