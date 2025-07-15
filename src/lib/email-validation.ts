/**
 * Email validation utilities
 * Comprehensive email format validation and security checks
 */

// RFC 5322 compliant email regex (simplified but robust)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Common disposable email domains to block (security measure)
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'tempmail.org',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'throwaway.email',
  'getnada.com',
  'maildrop.cc',
  'sharklasers.com',
  'guerrillamailblock.com'
]);

// Maximum email length (RFC standard is 320 characters)
const MAX_EMAIL_LENGTH = 320;

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  normalizedEmail?: string;
}

/**
 * Validate email format and security
 */
export function validateEmail(email: string): EmailValidationResult {
  // Basic type and length checks
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email é obrigatório'
    };
  }
  
  if (email.length > MAX_EMAIL_LENGTH) {
    return {
      isValid: false,
      error: 'Email muito longo'
    };
  }
  
  // Normalize email (trim and lowercase)
  const normalizedEmail = email.trim().toLowerCase();
  
  if (normalizedEmail.length === 0) {
    return {
      isValid: false,
      error: 'Email não pode estar vazio'
    };
  }
  
  // Format validation
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return {
      isValid: false,
      error: 'Formato de email inválido'
    };
  }
  
  // Extract domain
  const domain = normalizedEmail.split('@')[1];
  
  if (!domain) {
    return {
      isValid: false,
      error: 'Domínio do email inválido'
    };
  }
  
  // Check for disposable email domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: 'Emails temporários não são permitidos'
    };
  }
  
  // Additional security checks
  if (normalizedEmail.includes('..')) {
    return {
      isValid: false,
      error: 'Email contém pontos consecutivos inválidos'
    };
  }
  
  if (normalizedEmail.startsWith('.') || normalizedEmail.endsWith('.')) {
    return {
      isValid: false,
      error: 'Email não pode começar ou terminar com ponto'
    };
  }
  
  return {
    isValid: true,
    normalizedEmail
  };
}

/**
 * Check if email domain appears legitimate
 */
export function isDomainSuspicious(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) return true;
  
  // Very short domains are suspicious
  if (domain.length < 4) return true;
  
  // Domains with only numbers are suspicious
  if (/^\d+$/.test(domain.replace('.', ''))) return true;
  
  // Domains with excessive hyphens
  if ((domain.match(/-/g) ?? []).length > 3) return true;
  
  return false;
}