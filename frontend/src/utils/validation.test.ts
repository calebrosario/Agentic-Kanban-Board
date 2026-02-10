import { describe, it, expect } from 'vitest';
import { validateUsername, validatePassword, validateEmail } from './validation';

const mockT = (key: string): string => {
  const translations: Record<string, string> = {
    'auth:errors.usernameRequired': 'Username is required',
    'auth:errors.usernameMinLength': 'Username must be at least 3 characters',
    'auth:errors.usernameMaxLength': 'Username must be at most 20 characters',
    'auth:errors.passwordRequired': 'Password is required',
    'auth:errors.passwordMinLength': 'Password must be at least 6 characters',
    'auth:errors.emailRequired': 'Email is required',
    'auth:errors.emailInvalid': 'Email is invalid'
  };
  return translations[key] || key;
};

describe('validateUsername', () => {
  it('should return valid for username with 3-20 characters', () => {
    const result = validateUsername('john', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should return valid for username with exactly 3 characters (boundary)', () => {
    const result = validateUsername('abc', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should return valid for username with exactly 20 characters (boundary)', () => {
    const result = validateUsername('a'.repeat(20), mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should return invalid for empty username', () => {
    const result = validateUsername('', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username is required');
  });

  it('should return invalid for username with less than 3 characters', () => {
    const result = validateUsername('ab', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username must be at least 3 characters');
  });

  it('should return invalid for username with 2 characters (boundary)', () => {
    const result = validateUsername('ab', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username must be at least 3 characters');
  });

  it('should return invalid for username with more than 20 characters', () => {
    const result = validateUsername('a'.repeat(21), mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username must be at most 20 characters');
  });

  it('should return invalid for username with 21 characters (boundary)', () => {
    const result = validateUsername('a'.repeat(21), mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username must be at most 20 characters');
  });

  it('should handle username with special characters', () => {
    const result = validateUsername('user@123!', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should handle username with spaces', () => {
    const result = validateUsername('john doe', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should handle username with unicode characters', () => {
    const result = validateUsername('用户名', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });
});

describe('validatePassword', () => {
  it('should return valid for password with 6+ characters', () => {
    const result = validatePassword('password123', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should return valid for password with exactly 6 characters (boundary)', () => {
    const result = validatePassword('123456', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should return invalid for empty password', () => {
    const result = validatePassword('', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password is required');
  });

  it('should return invalid for password with less than 6 characters', () => {
    const result = validatePassword('12345', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password must be at least 6 characters');
  });

  it('should return invalid for password with 5 characters (boundary)', () => {
    const result = validatePassword('12345', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password must be at least 6 characters');
  });

  it('should handle password with special characters', () => {
    const result = validatePassword('pass@123!', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should handle password with spaces', () => {
    const result = validatePassword('pass word', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should handle very long password', () => {
    const result = validatePassword('a'.repeat(100), mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });
});

describe('validateEmail', () => {
  it('should return valid for valid email', () => {
    const result = validateEmail('test@example.com', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should return valid for email with subdomain', () => {
    const result = validateEmail('test@mail.example.com', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should return valid for email with plus sign', () => {
    const result = validateEmail('test+tag@example.com', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should return invalid for empty email', () => {
    const result = validateEmail('', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Email is required');
  });

  it('should return invalid for email without @', () => {
    const result = validateEmail('testexample.com', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Email is invalid');
  });

  it('should return invalid for email without domain', () => {
    const result = validateEmail('test@', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Email is invalid');
  });

  it('should return invalid for email without username', () => {
    const result = validateEmail('@example.com', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Email is invalid');
  });

  it('should return invalid for email with spaces', () => {
    const result = validateEmail('test @example.com', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Email is invalid');
  });
});
