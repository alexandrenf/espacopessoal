/**
 * Rate limiter implementation using in-memory cache
 * Tracks requests by IP address and email to prevent abuse
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

class RateLimiter {
  private ipCache = new Map<string, RateLimitEntry>();
  private emailCache = new Map<string, RateLimitEntry>();
  
  // Rate limit: 5 requests per 15 minutes per IP
  private readonly IP_LIMIT = 5;
  private readonly IP_WINDOW = 15 * 60 * 1000; // 15 minutes
  
  // Rate limit: 3 requests per 10 minutes per email
  private readonly EMAIL_LIMIT = 3;
  private readonly EMAIL_WINDOW = 10 * 60 * 1000; // 10 minutes
  
  // Minimum time between requests from same email (30 seconds)
  private readonly EMAIL_COOLDOWN = 30 * 1000;

  /**
   * Check if IP address is rate limited
   */
  checkIpLimit(ip: string): { allowed: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const entry = this.ipCache.get(ip);
    
    if (!entry || now >= entry.resetTime) {
      // Reset or create new entry
      this.ipCache.set(ip, {
        count: 1,
        resetTime: now + this.IP_WINDOW,
        lastRequest: now
      });
      return { allowed: true, remaining: this.IP_LIMIT - 1 };
    }
    
    if (entry.count >= this.IP_LIMIT) {
      return { 
        allowed: false, 
        resetTime: entry.resetTime,
        remaining: 0
      };
    }
    
    // Increment count
    entry.count++;
    entry.lastRequest = now;
    this.ipCache.set(ip, entry);
    
    return { 
      allowed: true, 
      remaining: this.IP_LIMIT - entry.count 
    };
  }
  
  /**
   * Check if email is rate limited
   */
  checkEmailLimit(email: string): { allowed: boolean; resetTime?: number; cooldownTime?: number } {
    const now = Date.now();
    const entry = this.emailCache.get(email);
    
    if (!entry || now >= entry.resetTime) {
      // Reset or create new entry
      this.emailCache.set(email, {
        count: 1,
        resetTime: now + this.EMAIL_WINDOW,
        lastRequest: now
      });
      return { allowed: true };
    }
    
    // Check cooldown period
    if (now - entry.lastRequest < this.EMAIL_COOLDOWN) {
      return {
        allowed: false,
        cooldownTime: entry.lastRequest + this.EMAIL_COOLDOWN
      };
    }
    
    if (entry.count >= this.EMAIL_LIMIT) {
      return { 
        allowed: false, 
        resetTime: entry.resetTime 
      };
    }
    
    // Increment count
    entry.count++;
    entry.lastRequest = now;
    this.emailCache.set(email, entry);
    
    return { allowed: true };
  }
  
  /**
   * Get remaining time until rate limit resets
   */
  getTimeUntilReset(timestamp: number): number {
    return Math.max(0, timestamp - Date.now());
  }
  
  /**
   * Clean up expired entries (called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean IP cache
    for (const [ip, entry] of this.ipCache.entries()) {
      if (now >= entry.resetTime) {
        this.ipCache.delete(ip);
      }
    }
    
    // Clean email cache
    for (const [email, entry] of this.emailCache.entries()) {
      if (now >= entry.resetTime) {
        this.emailCache.delete(email);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);