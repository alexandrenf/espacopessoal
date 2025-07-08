import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class name values into a single merged string, resolving Tailwind CSS class conflicts.
 *
 * @returns The merged class name string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a timestamp as a date string in 'en-US' locale with year, short month, and day.
 *
 * @param timestamp - The numeric timestamp to format
 * @returns The formatted date string
 */
export function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Retrieves the value of a URL search parameter by key from the current browser location.
 *
 * Returns an empty string if the parameter is not present or if executed outside a browser environment.
 *
 * @param key - The name of the search parameter to retrieve
 * @returns The value of the specified search parameter, or an empty string if not found
 */
export function getSearchParam(key: string): string {
  if (typeof window === 'undefined') return '';
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key) ?? '';
}

/**
 * Updates or removes a query parameter in the current browser URL without reloading the page.
 *
 * If `value` is non-empty, the parameter is set or updated; if `value` is empty, the parameter is removed. Has no effect outside a browser environment.
 *
 * @param key - The name of the query parameter to set or remove
 * @param value - The value to assign to the parameter, or an empty string to remove it
 */
export function setSearchParam(key: string, value: string) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
  window.history.replaceState({}, '', url.toString());
} 