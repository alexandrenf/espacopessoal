import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple date formatting utility
export function formatDate(timestamp: number) {
  // Validate input
  if (
    typeof timestamp !== "number" ||
    isNaN(timestamp) ||
    !isFinite(timestamp)
  ) {
    throw new Error("Invalid timestamp: must be a valid finite number");
  }

  // Additional validation for reasonable date range
  if (timestamp < 0 || timestamp > 8640000000000000) {
    // Max safe timestamp
    throw new Error("Timestamp out of valid range");
  }

  try {
    const date = new Date(timestamp);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date created from timestamp");
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    throw new Error(
      `Failed to format date: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Simple search param hook utility
export function getSearchParam(key: string): string {
  if (typeof window === "undefined") return "";
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key) ?? "";
}

export function setSearchParam(key: string, value: string) {
  if (typeof window === "undefined") return;
  if (!key || typeof key !== "string") return;
  if (typeof value !== "string") return;

  try {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    window.history.replaceState({}, "", url.toString());
  } catch (error) {
    console.error("Error setting search param:", error);
  }
}
