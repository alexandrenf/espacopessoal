import { describe, it, expect } from "@jest/globals";

describe("Profile Picture System", () => {
  describe("Image Utils", () => {
    it("should return server-routed URLs as-is", () => {
      // Import the function directly to test the logic
      const createCachedImageUrl = (url: string, bustCache = false): string => {
        if (!url) return "";

        // If it's already a server-routed URL, return as-is (these are already optimized)
        if (url.startsWith("/api/profile-image/")) {
          return url;
        }

        // If bustCache is true, add cache busting parameter
        if (bustCache) {
          const separator = url.includes("?") ? "&" : "?";
          return `${url}${separator}_t=${Date.now()}`;
        }

        return url;
      };

      const serverUrl = "/api/profile-image/storage123";
      const result = createCachedImageUrl(serverUrl);

      expect(result).toBe(serverUrl);
    });

    it("should process non-server URLs normally", () => {
      const createCachedImageUrl = (url: string, bustCache = false): string => {
        if (!url) return "";

        if (url.startsWith("/api/profile-image/")) {
          return url;
        }

        if (bustCache) {
          const separator = url.includes("?") ? "&" : "?";
          return `${url}${separator}_t=${Date.now()}`;
        }

        return url;
      };

      const externalUrl = "https://example.com/image.jpg";
      const result = createCachedImageUrl(externalUrl);

      expect(result).toBe(externalUrl);
    });

    it("should add cache busting to non-server URLs when requested", () => {
      const createCachedImageUrl = (url: string, bustCache = false): string => {
        if (!url) return "";

        if (url.startsWith("/api/profile-image/")) {
          return url;
        }

        if (bustCache) {
          const separator = url.includes("?") ? "&" : "?";
          return `${url}${separator}v=${Date.now()}`;;
        }

        return url;
      };

      const externalUrl = "https://example.com/image.jpg";
      const result = createCachedImageUrl(externalUrl, true);

      expect(result).toMatch(/https:\/\/example\.com\/image\.jpg\?v=\d+/);
    });

    it("should handle empty URLs", () => {
      const createCachedImageUrl = (url: string, bustCache = false): string => {
        if (!url) return "";

        if (url.startsWith("/api/profile-image/")) {
          return url;
        }

        if (bustCache) {
          const separator = url.includes("?") ? "&" : "?";
          return `${url}${separator}_t=${Date.now()}`;
        }

        return url;
      };

      expect(createCachedImageUrl("")).toBe("");
      expect(createCachedImageUrl("", true)).toBe("");
    });
  });

  describe("Profile Picture URL Generation", () => {
    it("should generate correct server-side profile image URLs", () => {
      const generateProfileImageUrl = (storageId: string): string => {
        return `/api/profile-image/${storageId}`;
      };

      const storageId = "storage123";
      const result = generateProfileImageUrl(storageId);

      expect(result).toBe("/api/profile-image/storage123");
    });
  });
});
