/**
 * Extract real client IP address from request headers
 * Handles various proxy configurations and load balancers
 */

import { type NextRequest } from "next/server";

/**
 * Get the real client IP address from the request
 * Checks various headers in order of priority
 */
export function getClientIP(request: NextRequest): string {
  // Check headers in order of reliability
  const headers = [
    'cf-connecting-ip',      // Cloudflare
    'x-real-ip',             // Nginx proxy
    'x-forwarded-for',       // Standard forwarded header
    'x-client-ip',           // Apache mod_remoteip
    'x-cluster-client-ip',   // Cluster
    'x-forwarded',           // General forwarded
    'forwarded-for',         // Alternative
    'forwarded'              // RFC 7239
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0]?.trim();
      if (ip && isValidIP(ip)) {
        return ip;
      }
    }
  }
  
  // Fallback to connection remote address (if available)
  // Note: request.ip is not available in all environments
  const remoteAddress = (request as { ip?: string }).ip;
  if (remoteAddress && isValidIP(remoteAddress)) {
    return remoteAddress;
  }
  
  // Final fallback - should not happen in normal scenarios
  return 'unknown';
}

/**
 * Basic IP address validation
 */
function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (ipv4Regex.test(ip)) {
    // Check if each octet is valid (0-255)
    const octets = ip.split('.');
    return octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  if (ipv6Regex.test(ip)) {
    return true;
  }
  
  // Check for IPv6 shorthand
  if (ip.includes('::')) {
    return /^([0-9a-fA-F]{0,4}:)*::([0-9a-fA-F]{0,4}:)*[0-9a-fA-F]{0,4}$/.test(ip);
  }
  
  return false;
}

/**
 * Check if IP is from localhost/private networks
 */
export function isLocalIP(ip: string): boolean {
  if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
    return true;
  }
  
  // Private IPv4 ranges
  const privateRanges = [
    /^10\./,           // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12
    /^192\.168\./,     // 192.168.0.0/16
    /^169\.254\./      // 169.254.0.0/16 (link-local)
  ];
  
  return privateRanges.some(range => range.test(ip));
}