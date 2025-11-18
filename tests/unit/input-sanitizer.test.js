/**
 * Unit Tests for Input Sanitizer
 */

const InputSanitizer = require('../../src/utils/input-sanitizer');

describe('InputSanitizer', () => {
  describe('sanitizeString', () => {
    test('should remove null bytes', () => {
      const input = 'test\0string\0';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toBe('teststring');
    });

    test('should remove control characters', () => {
      const input = 'test\x01\x02\x03string';
      const result = InputSanitizer.sanitizeString(input, { allowNewlines: false });
      expect(result).toBe('teststring');
    });

    test('should enforce max length', () => {
      const input = 'a'.repeat(1000);
      const result = InputSanitizer.sanitizeString(input, { maxLength: 100 });
      expect(result.length).toBe(100);
    });

    test('should handle null/undefined', () => {
      expect(InputSanitizer.sanitizeString(null)).toBe('');
      expect(InputSanitizer.sanitizeString(undefined)).toBe('');
    });
  });

  describe('sanitizeFilename', () => {
    test('should remove path traversal attempts', () => {
      const input = '../../../etc/passwd';
      const result = InputSanitizer.sanitizeFilename(input);
      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
    });

    test('should remove dangerous characters', () => {
      const input = 'file<>:"|?*name.txt';
      const result = InputSanitizer.sanitizeFilename(input);
      expect(result).not.toMatch(/[<>:"|?*]/);
    });

    test('should handle empty filename', () => {
      const result = InputSanitizer.sanitizeFilename('');
      expect(result).toBe('unnamed');
    });
  });

  describe('sanitizeEmail', () => {
    test('should validate correct email', () => {
      const result = InputSanitizer.sanitizeEmail('test@example.com');
      expect(result).toBe('test@example.com');
    });

    test('should reject invalid email', () => {
      const result = InputSanitizer.sanitizeEmail('invalid-email');
      expect(result).toBeNull();
    });

    test('should handle null/undefined', () => {
      expect(InputSanitizer.sanitizeEmail(null)).toBeNull();
      expect(InputSanitizer.sanitizeEmail(undefined)).toBeNull();
    });
  });

  describe('validateProjectDetails', () => {
    test('should validate correct project details', () => {
      const details = {
        projectScale: 'startup',
        marketRegion: 'India',
        maxBudget: 100000
      };
      const result = InputSanitizer.validateProjectDetails(details);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should reject invalid projectScale', () => {
      const details = {
        projectScale: 'invalid'
      };
      const result = InputSanitizer.validateProjectDetails(details);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject non-object', () => {
      const result = InputSanitizer.validateProjectDetails('not an object');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSchema', () => {
    test('should validate object against schema', () => {
      const schema = {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 3 },
          age: { type: 'number', minimum: 0 }
        }
      };
      const obj = { name: 'John', age: 30 };
      const result = InputSanitizer.validateSchema(obj, schema);
      expect(result.valid).toBe(true);
    });

    test('should reject missing required fields', () => {
      const schema = {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' }
        }
      };
      const obj = { age: 30 };
      const result = InputSanitizer.validateSchema(obj, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });
  });
});

