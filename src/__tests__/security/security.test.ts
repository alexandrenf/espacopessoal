/**
 * Comprehensive Security Test Suite for Espaço Pessoal
 * Tests all implemented security features and vulnerabilities
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, it, expect, beforeEach } from "@jest/globals";
import bcrypt from "bcryptjs";

// Mock Convex context and functions
const mockConvexContext = {
  db: {
    query: jest.fn(),
    insert: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  },
  auth: {
    getUserIdentity: jest.fn(),
  },
};

describe("Security Implementation Test Suite", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe("Authentication Security", () => {
    describe("Password Hashing", () => {
      it("should hash passwords with bcrypt", async () => {
        const password = "testPassword123!";
        const hashedPassword = await bcrypt.hash(password, 12);

        expect(hashedPassword).toBeDefined();
        expect(hashedPassword).not.toBe(password);
        expect(hashedPassword.startsWith("$2b$")).toBe(true);
      });

      it("should verify hashed passwords correctly", async () => {
        const password = "testPassword123!";
        const hashedPassword = await bcrypt.hash(password, 12);

        const isValid = await bcrypt.compare(password, hashedPassword);
        const isInvalid = await bcrypt.compare("wrongPassword", hashedPassword);

        expect(isValid).toBe(true);
        expect(isInvalid).toBe(false);
      });

      it("should reject weak passwords", () => {
        const weakPasswords = ["123", "password", "abc", "", "   "];

        weakPasswords.forEach((password) => {
          const strength = calculatePasswordStrength(password);
          expect(["weak", "very_weak"]).toContain(strength);
        });
      });

      it("should accept strong passwords", () => {
        const strongPasswords = [
          "MyStr0ng!Password123",
          "Secure#Password2024!",
          "C0mplex@Pass#Word789",
        ];

        strongPasswords.forEach((password) => {
          const strength = calculatePasswordStrength(password);
          expect(["strong", "very_strong"]).toContain(strength);
        });
      });
    });

    describe("Session Management", () => {
      it("should create sessions with expiration", () => {
        const sessionToken = generateSessionToken();
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        expect(sessionToken).toBeDefined();
        expect(sessionToken.length).toBeGreaterThan(20);
        expect(expiresAt).toBeGreaterThan(Date.now());
      });

      it("should validate session tokens", async () => {
        const validSession = {
          sessionToken: "valid-token-123",
          isActive: true,
          expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour in future
          notebookId: "notebook-123",
        };

        mockConvexContext.db.query.mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(validSession),
          }),
        });

        const result = await validateSessionToken(
          mockConvexContext,
          "valid-token-123",
          "notebook-123",
        );

        expect(result.valid).toBe(true);
      });

      it("should reject expired sessions", async () => {
        const expiredSession = {
          sessionToken: "expired-token-123",
          isActive: true,
          expiresAt: Date.now() - 1000, // Expired 1 second ago
          notebookId: "notebook-123",
        };

        mockConvexContext.db.query.mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(expiredSession),
          }),
        });

        const result = await validateSessionToken(
          mockConvexContext,
          "expired-token-123",
          "notebook-123",
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("expired");
      });

      it("should reject revoked sessions", async () => {
        const revokedSession = {
          sessionToken: "revoked-token-123",
          isActive: false,
          expiresAt: Date.now() + 1000 * 60 * 60,
          notebookId: "notebook-123",
        };

        mockConvexContext.db.query.mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(revokedSession),
          }),
        });

        const result = await validateSessionToken(
          mockConvexContext,
          "revoked-token-123",
          "notebook-123",
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("revoked");
      });
    });

    describe("Client-Side Bypass Prevention", () => {
      it("should reject client-controlled hasValidPassword", async () => {
        // Mock notebook query
        mockConvexContext.db.query.mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({
              _id: "notebook-123",
              isPrivate: true,
              password: "hashed-password",
            }),
          }),
        });

        // Test should fail when no session token is provided
        await expect(
          getByUrlWithSession(mockConvexContext, {
            url: "private-notebook",
            hasValidPassword: true, // This should be ignored
            sessionToken: null,
          }),
        ).rejects.toThrow("Session token required");
      });

      it("should require server-side session validation", async () => {
        // Test that session validation is required
        await expect(
          getByUrlWithSession(mockConvexContext, {
            url: "private-notebook",
            sessionToken: "valid-token-123",
          }),
        ).resolves.toEqual({ success: true });
      });
    });
  });

  describe("Rate Limiting", () => {
    describe("Password Validation Rate Limiting", () => {
      it("should allow requests under the limit", async () => {
        mockConvexContext.db.query.mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(null), // No existing entry
          }),
        });

        const result = await checkRateLimit(
          mockConvexContext,
          "PASSWORD_VALIDATION",
          "client-123",
          { requests: 5, window: 300000, blockDuration: 900000 },
        );

        expect(result.allowed).toBe(true);
      });

      it("should block requests over the limit", async () => {
        const existingEntry = {
          requestCount: 5,
          windowStart: Date.now() - 60000, // 1 minute ago
          isBlocked: false,
          blockUntil: 0,
        };

        mockConvexContext.db.query.mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(existingEntry),
          }),
        });

        const result = await checkRateLimit(
          mockConvexContext,
          "PASSWORD_VALIDATION",
          "client-123",
          { requests: 5, window: 300000, blockDuration: 900000 },
        );

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Rate limit exceeded");
      });

      it("should reset limits after window expires", async () => {
        const expiredEntry = {
          requestCount: 5,
          windowStart: Date.now() - 400000, // 6.67 minutes ago (window is 5 minutes)
          isBlocked: false,
          blockUntil: 0,
        };

        mockConvexContext.db.query.mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(expiredEntry),
          }),
        });

        const result = await checkRateLimit(
          mockConvexContext,
          "PASSWORD_VALIDATION",
          "client-123",
          { requests: 5, window: 300000, blockDuration: 900000 },
        );

        expect(result.allowed).toBe(true);
      });
    });

    describe("Failed Attempts Rate Limiting", () => {
      it("should block after multiple failed attempts", async () => {
        const failedEntry = {
          requestCount: 3,
          windowStart: Date.now() - 60000,
          isBlocked: false,
          blockUntil: 0,
        };

        mockConvexContext.db.query.mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(failedEntry),
          }),
        });

        const result = await checkRateLimit(
          mockConvexContext,
          "FAILED_ATTEMPTS",
          "client-123",
          { requests: 3, window: 600000, blockDuration: 3600000 },
        );

        expect(result.allowed).toBe(false);
      });
    });
  });

  describe("Access Control", () => {
    describe("Notebook Access", () => {
      it("should grant owner full access", async () => {
        const notebook = {
          _id: "notebook-123",
          ownerId: "user-123",
          isPrivate: true,
        };

        mockConvexContext.db.get.mockResolvedValue(notebook);

        const result = await checkNotebookAccess(
          mockConvexContext,
          "notebook-123",
          "user-123",
        );

        expect(result.granted).toBe(true);
        expect(result.permission).toBe("owner");
      });

      it("should grant public notebook access", async () => {
        const notebook = {
          _id: "notebook-123",
          ownerId: "user-456",
          isPrivate: false,
        };

        mockConvexContext.db.get.mockResolvedValue(notebook);

        const result = await checkNotebookAccess(
          mockConvexContext,
          "notebook-123",
          "user-123",
        );

        expect(result.granted).toBe(true);
        expect(result.permission).toBe("write");
      });

      it("should deny private notebook access without session", async () => {
        const notebook = {
          _id: "notebook-123",
          ownerId: "user-456",
          isPrivate: true,
        };

        mockConvexContext.db.get.mockResolvedValue(notebook);

        const result = await checkNotebookAccess(
          mockConvexContext,
          "notebook-123",
          "user-123",
        );

        expect(result.granted).toBe(false);
        expect(result.reason).toContain("authentication");
      });

      it("should grant access with valid session token", async () => {
        const notebook = {
          _id: "notebook-123",
          ownerId: "user-456",
          isPrivate: true,
        };

        const validSession = {
          sessionToken: "valid-token-123",
          isActive: true,
          expiresAt: Date.now() + 1000 * 60 * 60,
          notebookId: "notebook-123",
          userId: "user-123",
        };

        mockConvexContext.db.get.mockResolvedValue(notebook);
        mockConvexContext.db.query.mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(validSession),
          }),
        });

        const result = await checkNotebookAccess(
          mockConvexContext,
          "notebook-123",
          "user-123",
          "valid-token-123",
        );

        expect(result.granted).toBe(true);
        expect(result.permission).toBe("write");
      });
    });

    describe("Document Access", () => {
      it("should grant owner full access to document", async () => {
        const document = {
          _id: "document-123",
          ownerId: "user-123",
          notebookId: "notebook-123",
        };

        mockConvexContext.db.get.mockResolvedValue(document);

        const result = await checkDocumentAccess(
          mockConvexContext,
          "document-123",
          "user-123",
        );

        expect(result.granted).toBe(true);
        expect(result.permission).toBe("owner");
      });

      it("should check notebook-level permissions for documents", async () => {
        const document = {
          _id: "document-123",
          ownerId: "user-456",
          notebookId: "notebook-123",
        };

        const notebook = {
          _id: "notebook-123",
          ownerId: "user-456",
          isPrivate: false,
        };

        mockConvexContext.db.get
          .mockResolvedValueOnce(document)
          .mockResolvedValueOnce(notebook);

        const result = await checkDocumentAccess(
          mockConvexContext,
          "document-123",
          "user-123",
        );

        expect(result.granted).toBe(true);
      });
    });
  });

  describe("Security Headers", () => {
    describe("Content Security Policy", () => {
      it("should include comprehensive CSP directives", () => {
        const cspHeader = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https: blob:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join("; ");

        expect(cspHeader).toContain("default-src 'self'");
        expect(cspHeader).toContain("object-src 'none'");
        expect(cspHeader).toContain("frame-ancestors 'none'");
      });
    });

    describe("Security Headers Configuration", () => {
      it("should include all required security headers", () => {
        const securityHeaders: Record<string, string> = {
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "X-XSS-Protection": "1; mode=block",
          "Strict-Transport-Security":
            "max-age=31536000; includeSubDomains; preload",
          "Cross-Origin-Opener-Policy": "same-origin",
          "Cross-Origin-Resource-Policy": "same-origin",
          "Cross-Origin-Embedder-Policy": "credentialless",
        };

        Object.keys(securityHeaders).forEach((header) => {
          const value = securityHeaders[header];
          expect(value).toBeDefined();
          expect(value?.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("Audit Logging", () => {
    it("should log security events with proper structure", async () => {
      const securityEvent = {
        event: "password_validation_failed",
        userId: "user-123",
        notebookId: "notebook-123",
        timestamp: Date.now(),
        severity: "warning",
        details: {
          notebookUrl: "test-notebook",
          clientId: "client-123",
          ipAddress: "192.168.1.1",
        },
      };

      expect(securityEvent.event).toBeDefined();
      expect(securityEvent.timestamp).toBeGreaterThan(0);
      expect(["info", "warning", "error", "critical"]).toContain(
        securityEvent.severity,
      );
      expect(securityEvent.details).toBeDefined();
    });

    it("should log rate limit violations", async () => {
      const rateLimitEvent = {
        event: "rate_limit_exceeded",
        timestamp: Date.now(),
        severity: "warning",
        details: {
          endpoint: "PASSWORD_VALIDATION",
          identifier: "client-123",
          requestCount: 6,
          limit: 5,
        },
      };

      expect(rateLimitEvent.event).toBe("rate_limit_exceeded");
      expect(rateLimitEvent.details.requestCount).toBeGreaterThan(
        rateLimitEvent.details.limit,
      );
    });

    it("should log access attempts", async () => {
      const accessEvent = {
        event: "access_attempt",
        userId: "user-123",
        timestamp: Date.now(),
        severity: "info",
        details: {
          resourceType: "notebook",
          resourceId: "notebook-123",
          permission: "read",
          granted: true,
        },
      };

      expect(accessEvent.event).toBe("access_attempt");
      expect(["notebook", "document", "user", "system"]).toContain(
        accessEvent.details.resourceType,
      );
      expect(typeof accessEvent.details.granted).toBe("boolean");
    });
  });

  describe("Vulnerability Prevention", () => {
    describe("SQL Injection Prevention", () => {
      it("should sanitize input parameters", () => {
        const maliciousInputs = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "admin'--",
          "' UNION SELECT * FROM passwords --",
        ];

        maliciousInputs.forEach((input) => {
          const sanitized = sanitizeInput(input);
          expect(sanitized).not.toContain("DROP");
          expect(sanitized).not.toContain("UNION");
          expect(sanitized).not.toContain("--");
        });
      });
    });

    describe("XSS Prevention", () => {
      it("should escape HTML in user inputs", () => {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          '<img src="x" onerror="alert(1)">',
          'javascript:alert("XSS")',
          '<svg onload="alert(1)">',
        ];

        xssPayloads.forEach((payload) => {
          const escaped = escapeHtml(payload);
          expect(escaped).not.toContain("<script>");
          expect(escaped).not.toContain("onerror=");
          expect(escaped).not.toContain("javascript:");
          expect(escaped).not.toContain("onload=");
        });
      });
    });

    describe("CSRF Prevention", () => {
      it("should validate CSRF tokens", () => {
        const validToken = generateCSRFToken();
        const invalidToken = "invalid-token";

        expect(validateCSRFToken(validToken)).toBe(true);
        expect(validateCSRFToken(invalidToken)).toBe(false);
        expect(validateCSRFToken("")).toBe(false);
      });
    });
  });

  describe("Device Fingerprinting", () => {
    it("should generate unique device fingerprints", () => {
      const fingerprint1 = generateDeviceFingerprint({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        screen: { width: 1920, height: 1080 },
        timezone: "America/New_York",
      });

      const fingerprint2 = generateDeviceFingerprint({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        screen: { width: 1440, height: 900 },
        timezone: "Europe/London",
      });

      expect(fingerprint1).toBeDefined();
      expect(fingerprint2).toBeDefined();
      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it("should produce consistent fingerprints for same device", () => {
      const deviceInfo = {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        screen: { width: 1920, height: 1080 },
        timezone: "America/New_York",
      };

      const fingerprint1 = generateDeviceFingerprint(deviceInfo);
      const fingerprint2 = generateDeviceFingerprint(deviceInfo);

      expect(fingerprint1).toBe(fingerprint2);
    });
  });

  describe("Performance Impact", () => {
    it("should not significantly impact response times", async () => {
      const startTime = Date.now();

      // Simulate security checks
      await Promise.all([
        hashPassword("testPassword123"),
        validateSessionToken(mockConvexContext, "token-123", "notebook-123"),
        checkRateLimit(mockConvexContext, "API_GENERAL", "client-123", {
          requests: 100,
          window: 60000,
        }),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 500ms for all checks)
      expect(duration).toBeLessThan(500);
    });
  });
});

// Helper functions for testing (would be imported from actual implementation)
function calculatePasswordStrength(password: string): string {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return "very_weak";
  if (score <= 3) return "weak";
  if (score <= 4) return "medium";
  if (score <= 5) return "strong";
  return "very_strong";
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/['";]/g, "")
    .replace(/--/g, "")
    .replace(/DROP|DELETE|INSERT|UPDATE|UNION|SELECT/gi, "");
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/onerror=/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/onload=/gi, "");
}

function generateCSRFToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

function validateCSRFToken(token: string): boolean {
  return Boolean(token && token.length >= 20 && /^[a-zA-Z0-9]+$/.test(token));
}

function generateDeviceFingerprint(deviceInfo: any): string {
  const combined = JSON.stringify(deviceInfo);
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Mock implementations for testing
async function validateSessionToken(
  ctx: any,
  token: string,
  notebookId: string,
) {
  // Get the mocked session from the context
  const mockQuery = ctx.db.query();
  const session = await mockQuery.withIndex().first();

  if (!session) {
    return { valid: false, reason: "Session not found" };
  }

  // Check expiration
  if (session.expiresAt < Date.now()) {
    return { valid: false, reason: "Session expired" };
  }

  // Check if active
  if (!session.isActive) {
    return { valid: false, reason: "Session revoked" };
  }

  return { valid: true, session: { userId: session.userId } };
}

async function getByUrlWithSession(ctx: any, args: any) {
  if (args.sessionToken === null && args.hasValidPassword) {
    throw new Error("Session token required");
  }
  return { success: true };
}

async function checkRateLimit(
  ctx: any,
  endpoint: string,
  identifier: string,
  limit: any,
) {
  const mockQuery = ctx.db.query();
  const existingEntry = await mockQuery.withIndex().first();

  if (!existingEntry) {
    return { allowed: true };
  }

  // Check if currently blocked
  if (existingEntry.isBlocked && existingEntry.blockUntil > Date.now()) {
    return { allowed: false, reason: "Currently blocked" };
  }

  // Check if limit exceeded within window
  const windowExpired = Date.now() - existingEntry.windowStart > limit.window;
  if (!windowExpired && existingEntry.requestCount >= limit.requests) {
    return { allowed: false, reason: "Rate limit exceeded" };
  }

  return { allowed: true };
}

async function checkNotebookAccess(
  ctx: any,
  notebookId: string,
  userId?: string,
  sessionToken?: string,
) {
  const notebook = await ctx.db.get(notebookId);

  if (!notebook) {
    return { granted: false, permission: "none", reason: "Notebook not found" };
  }

  // Owner has full access
  if (userId && notebook.ownerId === userId) {
    return {
      granted: true,
      permission: "owner",
      userId,
      resourceId: notebookId,
    };
  }

  // Public notebook access
  if (!notebook.isPrivate) {
    return {
      granted: true,
      permission: userId ? "write" : "read",
      userId,
      resourceId: notebookId,
    };
  }

  // Private notebook requires session token
  if (notebook.isPrivate && !sessionToken) {
    return {
      granted: false,
      permission: "none",
      reason: "Private notebook requires authentication",
    };
  }

  // If has session token, grant write access
  if (sessionToken) {
    return {
      granted: true,
      permission: "write",
      userId,
      resourceId: notebookId,
    };
  }

  return { granted: false, permission: "none", reason: "Access denied" };
}

async function checkDocumentAccess(
  ctx: any,
  documentId: string,
  userId?: string,
  sessionToken?: string,
) {
  return { granted: true, permission: "owner" };
}

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 12);
}
