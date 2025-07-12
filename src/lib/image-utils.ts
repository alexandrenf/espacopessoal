/**
 * Utility functions for image processing and conversion
 */

// Convert image to WebP format with compression
export async function convertToWebP(file: File, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      const maxSize = 400; // Max width/height for profile pictures
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and convert to WebP
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert image to WebP"));
          }
        },
        "image/webp",
        quality,
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

// Validate image file
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Please select a valid image file (JPEG, PNG, GIF, or WebP)",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Image file must be smaller than 10MB",
    };
  }

  return { valid: true };
}

// Generate a unique filename
export function generateUniqueFilename(_originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = "webp"; // Always use WebP
  return `profile-${timestamp}-${random}.${extension}`;
}

// Create cached image URL with smart browser caching
export function createCachedImageUrl(url: string, bustCache = false): string {
  if (!url) return "";

  // If it's already a server-routed URL, return as-is (these are already optimized)
  if (url.startsWith("/api/profile-image/")) {
    return url;
  }

  // If bustCache is true, add cache busting parameter
  if (bustCache) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${Date.now()}`;
  }

  // Otherwise, return URL as-is to enable proper browser caching
  return url;
}

// Preload image for caching
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to preload image"));
    img.src = url;
  });
}

// Cache management for profile images
const profileImageCache = new Map<string, string>();

export function getCachedProfileImage(userId: string): string | null {
  return profileImageCache.get(userId) ?? null;
}

export function setCachedProfileImage(userId: string, imageUrl: string): void {
  profileImageCache.set(userId, imageUrl);

  // Preload the image for better performance
  preloadImage(imageUrl).catch(() => {
    // If preloading fails, remove from cache
    profileImageCache.delete(userId);
  });
}

export function clearProfileImageCache(userId?: string): void {
  if (userId) {
    profileImageCache.delete(userId);
  } else {
    profileImageCache.clear();
  }
}
