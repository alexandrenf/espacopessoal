# Project Improvement Plan

This document outlines the plan to address known issues and implement new features.

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