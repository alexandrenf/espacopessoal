# Project Improvement Plan

This document outlines the plan to address known issues and implement new features.

---

## High Priority

### 5. Mobile Sidebar UI/UX

*   **Priority:** High
*   **Issue:** The hamburger menu for the mobile sidebar overlaps with the document title, creating a poor user experience.
*   **Plan:**
    *   Inspect the CSS for the header and sidebar components on mobile screens.
    *   Adjust the layout properties (e.g., using Flexbox `gap`, `margin`, or `padding`) to ensure the menu button and the title have adequate spacing and do not overlap.

---

## Medium Priority


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
