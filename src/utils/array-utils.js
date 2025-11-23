/**
 * Array Utilities
 * Centralized array validation and manipulation utilities
 */

/**
 * Ensure value is an array
 * @param {*} value - Value to check
 * @param {Array} defaultValue - Default value if not an array
 * @returns {Array} - Array value or default
 */
function ensureArray(value, defaultValue = []) {
  if (Array.isArray(value)) return value;
  return defaultValue;
}

/**
 * Ensure value is an array, parsing JSON string if needed
 * @param {*} value - Value to check (can be array, JSON string, or other)
 * @param {Array} defaultValue - Default value if parsing fails
 * @returns {Array} - Array value
 */
function ensureArrayOrParse(value, defaultValue = []) {
  if (Array.isArray(value)) return value;
  
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Not valid JSON, continue
    }
  }
  
  return defaultValue;
}

/**
 * Validate array before operations
 * @param {*} value - Value to validate
 * @param {string} name - Name for error messages
 * @param {number} minLength - Minimum length (optional)
 * @param {number} maxLength - Maximum length (optional)
 * @returns {Array} - Validated array
 * @throws {Error} - If validation fails
 */
function validateArray(value, name = 'array', minLength = null, maxLength = null) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array, got ${typeof value}`);
  }
  
  if (minLength !== null && value.length < minLength) {
    throw new Error(`${name} must have at least ${minLength} items, got ${value.length}`);
  }
  
  if (maxLength !== null && value.length > maxLength) {
    throw new Error(`${name} must have at most ${maxLength} items, got ${value.length}`);
  }
  
  return value;
}

/**
 * Safe array access with default
 * @param {*} value - Value to check
 * @param {Array} defaultValue - Default if not array or empty
 * @returns {Array} - Array value
 */
function safeArray(value, defaultValue = []) {
  if (!Array.isArray(value) || value.length === 0) {
    return defaultValue;
  }
  return value;
}

/**
 * Filter null/undefined from array
 * @param {Array} arr - Array to filter
 * @returns {Array} - Filtered array
 */
function filterNulls(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(Boolean);
}

module.exports = {
  ensureArray,
  ensureArrayOrParse,
  validateArray,
  safeArray,
  filterNulls
};

