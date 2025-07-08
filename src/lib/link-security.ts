/**
 * URL Security utilities for TipTap Link extension
 * Prevents XSS attacks from malicious javascript: URLs and other dangerous protocols
 */

// Safe protocols that are allowed in links
const SAFE_PROTOCOLS = [
  'http:',
  'https:',
  'mailto:',
  'tel:',
  'ftp:',
  'ftps:',
  'news:',
  'irc:',
  'gopher:',
  'nntp:',
  'feed:',
  'data:', // Only for images and specific safe content
];

/**
 * Sanitizes a URL to prevent XSS attacks
 * @param url - The URL to sanitize
 * @returns A safe URL or null if the URL is dangerous
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Trim whitespace and decode basic HTML entities
  const trimmedUrl = url.trim();
  
  // Empty or just whitespace
  if (!trimmedUrl) {
    return null;
  }

  try {
    // Handle relative URLs (assume they're safe)
    if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
      return trimmedUrl;
    }

    // Handle anchor links
    if (trimmedUrl.startsWith('#')) {
      return trimmedUrl;
    }

    // Handle URLs without protocol (assume https)
    if (!trimmedUrl.includes('://') && !trimmedUrl.startsWith('mailto:') && !trimmedUrl.startsWith('tel:')) {
      return `https://${trimmedUrl}`;
    }

    // Parse the URL to check the protocol
    const parsedUrl = new URL(trimmedUrl);
    
    // Check if protocol is in the safe list
    if (!SAFE_PROTOCOLS.includes(parsedUrl.protocol.toLowerCase())) {
      console.warn(`Blocked potentially dangerous URL protocol: ${parsedUrl.protocol}`);
      return null;
    }

    // Additional security checks for data URLs
    if (parsedUrl.protocol.toLowerCase() === 'data:') {
      // Only allow image data URLs and basic text
      const dataType = parsedUrl.pathname.split(';')[0];
      const allowedDataTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'text/plain'];
      
      if (!dataType || !allowedDataTypes.some(type => dataType.startsWith(type))) {
        console.warn(`Blocked data URL with disallowed type: ${dataType ?? 'unknown'}`);
        return null;
      }
    }

    return parsedUrl.toString();
  } catch (error) {
    // Invalid URL
    console.warn('Invalid URL provided:', trimmedUrl, error);
    return null;
  }
}

/**
 * Validates if a URL is safe for use in links
 * @param url - The URL to validate
 * @returns boolean indicating if the URL is safe
 */
export function isUrlSafe(url: string): boolean {
  return sanitizeUrl(url) !== null;
}

/**
 * Creates a safe href attribute value with additional security measures
 * @param url - The URL to make safe
 * @returns A safe href value or a placeholder for dangerous URLs
 */
export function createSafeHref(url: string): string {
  const sanitized = sanitizeUrl(url);
  
  if (sanitized === null) {
    // Return a safe placeholder for dangerous URLs
    return '#blocked-unsafe-url';
  }
  
  return sanitized;
}

/**
 * Hook for TipTap Link extension to validate URLs during editing
 * @param url - The URL being set
 * @returns The sanitized URL or false to reject the link
 */
export function validateLinkUrl(url: string): string | false {
  const sanitized = sanitizeUrl(url);
  return sanitized ?? false;
} 