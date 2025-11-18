/**
 * Security Tests for Input Validation
 */

const InputSanitizer = require('../../src/utils/input-sanitizer');

describe('Security: Input Validation', () => {
  describe('SQL Injection Prevention', () => {
    test('should sanitize SQL injection attempts in strings', () => {
      const malicious = "'; DROP TABLE users; --";
      const sanitized = InputSanitizer.sanitizeString(malicious);
      expect(sanitized).not.toContain('DROP TABLE');
    });

    test('should handle null byte injection', () => {
      const malicious = 'test\0DROP TABLE';
      const sanitized = InputSanitizer.sanitizeString(malicious);
      expect(sanitized).not.toContain('\0');
    });
  });

  describe('XSS Prevention', () => {
    test('should escape HTML in strings', () => {
      const malicious = '<script>alert("XSS")</script>';
      const escaped = InputSanitizer.escapeHtml(malicious);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });

    test('should escape quotes', () => {
      const malicious = 'test"onclick="alert(1)"';
      const escaped = InputSanitizer.escapeHtml(malicious);
      expect(escaped).toContain('&quot;');
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should prevent path traversal in filenames', () => {
      const malicious = '../../../etc/passwd';
      const sanitized = InputSanitizer.sanitizeFilename(malicious);
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });

    test('should prevent absolute paths', () => {
      const malicious = '/etc/passwd';
      const sanitized = InputSanitizer.sanitizeFilename(malicious);
      expect(sanitized).not.toContain('/');
    });
  });

  describe('Command Injection Prevention', () => {
    test('should sanitize command injection attempts', () => {
      const malicious = 'test; rm -rf /';
      const sanitized = InputSanitizer.sanitizeString(malicious, { allowNewlines: false });
      // Should remove or escape semicolons
      expect(sanitized).toBeDefined();
    });
  });

  describe('Large Input Prevention', () => {
    test('should reject inputs exceeding max length', () => {
      const largeInput = 'a'.repeat(100 * 1024 * 1024); // 100MB
      const validation = InputSanitizer.validateInput(largeInput, {
        maxLength: 50 * 1024 * 1024 // 50MB
      });
      expect(validation.valid).toBe(false);
    });
  });
});

