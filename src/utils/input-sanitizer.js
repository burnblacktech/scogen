/**
 * Input Sanitization and Validation Utilities
 * Provides comprehensive sanitization for user inputs to prevent security vulnerabilities
 */

class InputSanitizer {
  /**
   * Sanitize string input - remove/nullify dangerous characters
   * @param {string} input - Raw input string
   * @param {Object} options - Sanitization options
   * @returns {string} - Sanitized string
   */
  static sanitizeString(input, options = {}) {
    if (input === null || input === undefined) {
      return '';
    }

    if (typeof input !== 'string') {
      input = String(input);
    }

    const {
      allowNewlines = true,
      allowSpecialChars = true,
      maxLength = null,
      trim = true
    } = options;

    // Remove null bytes (common in injection attacks)
    let sanitized = input.replace(/\0/g, '');

    // Remove control characters except newlines/tabs if allowed
    if (allowNewlines) {
      sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    } else {
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    }

    // Trim if requested
    if (trim) {
      sanitized = sanitized.trim();
    }

    // Enforce max length
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitize filename - prevent path traversal and dangerous characters
   * @param {string} filename - Original filename
   * @returns {string} - Sanitized filename
   */
  static sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return 'unnamed';
    }

    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[\/\\]/g, '_');

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, '');

    // Remove leading/trailing dots and spaces (Windows issue)
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

    // Ensure not empty
    if (!sanitized) {
      sanitized = 'unnamed';
    }

    // Limit length
    if (sanitized.length > 255) {
      const ext = this.getFileExtension(sanitized);
      const nameWithoutExt = sanitized.substring(0, sanitized.length - ext.length);
      sanitized = nameWithoutExt.substring(0, 255 - ext.length) + ext;
    }

    return sanitized;
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string} - Extension including dot
   */
  static getFileExtension(filename) {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0] : '';
  }

  /**
   * Validate and sanitize email address
   * @param {string} email - Email address
   * @returns {string|null} - Sanitized email or null if invalid
   */
  static sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
      return null;
    }

    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(sanitized)) {
      return null;
    }

    // Additional length check
    if (sanitized.length > 254) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate and sanitize URL
   * @param {string} url - URL string
   * @returns {string|null} - Sanitized URL or null if invalid
   */
  static sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const sanitized = url.trim();

    // Basic URL validation
    try {
      const urlObj = new URL(sanitized);
      // Only allow http and https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }
      return sanitized;
    } catch {
      return null;
    }
  }

  /**
   * Sanitize object recursively - sanitize all string values
   * @param {any} obj - Object to sanitize
   * @param {Object} options - Sanitization options
   * @returns {any} - Sanitized object
   */
  static sanitizeObject(obj, options = {}) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj, options);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, options));
    }

    if (typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key as well
        const sanitizedKey = this.sanitizeString(key, { allowNewlines: false, maxLength: 100 });
        sanitized[sanitizedKey] = this.sanitizeObject(value, options);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Validate project details structure
   * @param {any} projectDetails - Project details object
   * @returns {{valid: boolean, errors: string[]}} - Validation result
   */
  static validateProjectDetails(projectDetails) {
    const errors = [];

    if (!projectDetails || typeof projectDetails !== 'object' || Array.isArray(projectDetails)) {
      return { valid: false, errors: ['projectDetails must be an object'] };
    }

    // Helper function to check if a value is effectively empty (undefined, null, or empty string)
    const isEmpty = (value) => {
      return value === undefined || value === null || 
             (typeof value === 'string' && value.trim() === '');
    };

    // Validate projectScale (skip if empty)
    if (!isEmpty(projectDetails.projectScale)) {
      const validScales = ['startup', 'sme', 'enterprise', 'enterprise-plus'];
      if (!validScales.includes(projectDetails.projectScale)) {
        errors.push(`Invalid projectScale: "${projectDetails.projectScale}". Must be one of: ${validScales.join(', ')}`);
      }
    }

    // Validate marketRegion (if provided, should be string)
    if (!isEmpty(projectDetails.marketRegion) && typeof projectDetails.marketRegion !== 'string') {
      errors.push('marketRegion must be a string');
    }

    // Validate businessModel (if provided, should be string)
    if (!isEmpty(projectDetails.businessModel) && typeof projectDetails.businessModel !== 'string') {
      errors.push('businessModel must be a string');
    }

    // Validate maxBudget (if provided, should be positive number)
    // Note: Budget can be a string like "₹5L" which will be parsed later, so we check for non-empty only
    if (!isEmpty(projectDetails.maxBudget)) {
      // For numeric strings like "50000", try to parse
      // For formatted strings like "₹5L", they will be parsed later, so just check it's not empty
      if (typeof projectDetails.maxBudget === 'string') {
        // If it's a numeric string, validate it's a positive number
        const numValue = parseFloat(projectDetails.maxBudget.trim());
        if (!isNaN(numValue) && numValue < 0) {
          errors.push('maxBudget must be a positive number');
        }
        // If it's not numeric (e.g., "₹5L"), it will be parsed later - accept it for now
      } else if (typeof projectDetails.maxBudget === 'number') {
        // Direct number validation
        if (isNaN(projectDetails.maxBudget) || projectDetails.maxBudget < 0) {
          errors.push('maxBudget must be a positive number');
        }
      }
    }

    // Validate targetDeadline (if provided, should be positive number)
    // Note: Deadline can be a string like "3 months" which will be parsed later, so we check for non-empty only
    if (!isEmpty(projectDetails.targetDeadline)) {
      // For numeric strings, try to parse
      // For formatted strings like "3 months", they will be parsed later, so just check it's not empty
      if (typeof projectDetails.targetDeadline === 'string') {
        // If it's a numeric string, validate it's a positive number
        const numValue = parseFloat(projectDetails.targetDeadline.trim());
        if (!isNaN(numValue) && numValue < 0) {
          errors.push('targetDeadline must be a positive number');
        }
        // If it's not numeric (e.g., "3 months"), it will be parsed later - accept it for now
      } else if (typeof projectDetails.targetDeadline === 'number') {
        // Direct number validation
        if (isNaN(projectDetails.targetDeadline) || projectDetails.targetDeadline < 0) {
          errors.push('targetDeadline must be a positive number');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate input length and content
   * @param {string} input - Input string
   * @param {Object} options - Validation options
   * @returns {{valid: boolean, errors: string[]}} - Validation result
   */
  static validateInput(input, options = {}) {
    const {
      minLength = 10,
      maxLength = 50 * 1024 * 1024, // 50MB default
      required = true
    } = options;

    const errors = [];

    if (required && (!input || input.trim().length === 0)) {
      errors.push('Input is required');
      return { valid: false, errors };
    }

    if (input && typeof input !== 'string') {
      errors.push('Input must be a string');
      return { valid: false, errors };
    }

    if (input) {
      if (input.length < minLength) {
        errors.push(`Input too short: ${input.length} characters. Minimum length is ${minLength} characters`);
      }

      if (input.length > maxLength) {
        errors.push(`Input too large: ${(input.length / 1024 / 1024).toFixed(2)}MB. Maximum size is ${(maxLength / 1024 / 1024)}MB`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} - Escaped string
   */
  static escapeHtml(str) {
    if (typeof str !== 'string') {
      return String(str);
    }

    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return str.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Sanitize JSON string to prevent injection
   * @param {string} jsonString - JSON string
   * @returns {string} - Sanitized JSON string
   */
  static sanitizeJsonString(jsonString) {
    if (typeof jsonString !== 'string') {
      return '';
    }

    // Remove null bytes
    let sanitized = jsonString.replace(/\0/g, '');

    // Validate it's valid JSON
    try {
      JSON.parse(sanitized);
      return sanitized;
    } catch {
      // If not valid JSON, escape it
      return JSON.stringify(sanitized);
    }
  }

  /**
   * Validate object against schema
   * @param {any} obj - Object to validate
   * @param {Object} schema - Schema definition
   * @returns {{valid: boolean, errors: string[]}} - Validation result
   */
  static validateSchema(obj, schema) {
    const errors = [];

    if (!schema || typeof schema !== 'object') {
      return { valid: false, errors: ['Invalid schema definition'] };
    }

    // Required fields
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach(field => {
        if (obj[field] === undefined || obj[field] === null) {
          errors.push(`Missing required field: ${field}`);
        }
      });
    }

    // Type validation
    if (schema.properties && typeof schema.properties === 'object') {
      Object.keys(schema.properties).forEach(field => {
        const fieldSchema = schema.properties[field];
        const value = obj[field];

        // Skip if field is optional and not provided
        if (value === undefined && !schema.required?.includes(field)) {
          return;
        }

        // Type check
        if (fieldSchema.type) {
          const expectedType = fieldSchema.type;
          const actualType = Array.isArray(value) ? 'array' : typeof value;

          if (expectedType === 'array' && !Array.isArray(value)) {
            errors.push(`Field ${field} must be an array`);
          } else if (expectedType !== 'array' && actualType !== expectedType) {
            errors.push(`Field ${field} must be of type ${expectedType}, got ${actualType}`);
          }
        }

        // Enum validation
        if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
          errors.push(`Field ${field} must be one of: ${fieldSchema.enum.join(', ')}`);
        }

        // Min/Max validation for numbers
        if (fieldSchema.type === 'number' && typeof value === 'number') {
          if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
            errors.push(`Field ${field} must be at least ${fieldSchema.minimum}`);
          }
          if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
            errors.push(`Field ${field} must be at most ${fieldSchema.maximum}`);
          }
        }

        // Min/Max length validation for strings
        if (fieldSchema.type === 'string' && typeof value === 'string') {
          if (fieldSchema.minLength !== undefined && value.length < fieldSchema.minLength) {
            errors.push(`Field ${field} must be at least ${fieldSchema.minLength} characters`);
          }
          if (fieldSchema.maxLength !== undefined && value.length > fieldSchema.maxLength) {
            errors.push(`Field ${field} must be at most ${fieldSchema.maxLength} characters`);
          }
        }

        // Pattern validation for strings
        if (fieldSchema.pattern && typeof value === 'string') {
          const regex = new RegExp(fieldSchema.pattern);
          if (!regex.test(value)) {
            errors.push(`Field ${field} does not match required pattern`);
          }
        }

        // Nested object validation
        if (fieldSchema.type === 'object' && fieldSchema.properties && typeof value === 'object' && !Array.isArray(value)) {
          const nestedResult = this.validateSchema(value, fieldSchema);
          if (!nestedResult.valid) {
            errors.push(...nestedResult.errors.map(e => `${field}.${e}`));
          }
        }

        // Array validation
        if (fieldSchema.type === 'array' && Array.isArray(value) && fieldSchema.items) {
          value.forEach((item, index) => {
            if (fieldSchema.items.type === 'object' && fieldSchema.items.properties) {
              const itemResult = this.validateSchema(item, fieldSchema.items);
              if (!itemResult.valid) {
                errors.push(...itemResult.errors.map(e => `${field}[${index}].${e}`));
              }
            } else if (fieldSchema.items.type) {
              const itemType = Array.isArray(item) ? 'array' : typeof item;
              if (itemType !== fieldSchema.items.type) {
                errors.push(`Field ${field}[${index}] must be of type ${fieldSchema.items.type}`);
              }
            }
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate project details against schema
   * @param {any} projectDetails - Project details object
   * @returns {{valid: boolean, errors: string[]}} - Validation result
   */
  static validateProjectDetailsSchema(projectDetails) {
    const schema = {
      type: 'object',
      properties: {
        projectScale: {
          type: 'string',
          enum: ['startup', 'sme', 'enterprise', 'enterprise-plus']
        },
        marketRegion: {
          type: 'string',
          maxLength: 100
        },
        businessModel: {
          type: 'string',
          maxLength: 50
        },
        maxBudget: {
          type: 'number',
          minimum: 0
        },
        targetDeadline: {
          type: 'number',
          minimum: 0
        }
      }
    };

    return this.validateSchema(projectDetails, schema);
  }
}

module.exports = InputSanitizer;

