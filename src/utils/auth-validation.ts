/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordValidationResult extends ValidationResult {
  strength: 'weak' | 'medium' | 'strong';
  meetsLength: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email address is required.' };
  }

  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Email address cannot be empty.' };
  }

  // RFC 5322 compliant regex pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. user@company.com).' };
  }

  return { isValid: true };
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password is required.',
      strength: 'weak',
      meetsLength: false,
      hasNumber: false,
      hasSpecialChar: false,
    };
  }

  const meetsLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);

  let score = 0;
  if (meetsLength) score += 1;
  if (password.length >= 12) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecialChar) score += 1;
  if (hasUpperCase) score += 1;

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) {
    strength = 'strong';
  } else if (score >= 2) {
    strength = 'medium';
  }

  if (!meetsLength) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters in length.',
      strength,
      meetsLength,
      hasNumber,
      hasSpecialChar,
    };
  }

  return {
    isValid: true,
    strength,
    meetsLength,
    hasNumber,
    hasSpecialChar,
  };
}

export function validatePasswordMatch(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password.' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match.' };
  }

  return { isValid: true };
}

export function validateFullName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Full name is required.' };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters.' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'Full name cannot exceed 100 characters.' };
  }

  return { isValid: true };
}
