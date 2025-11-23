/**
 * Validation Utilities
 * Centralized input validation functions for consistent validation across modules
 */

const { createError, ErrorTypes } = require('../core/errors/ErrorHandler');

/**
 * Validate that value is not null or undefined
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @throws {Error} - Validation error if null/undefined
 */
function validateRequired(value, paramName) {
  if (value === null || value === undefined) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Required parameter '${paramName}' is missing`,
      { paramName, value }
    );
  }
}

/**
 * Validate that value is an array
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {boolean} allowEmpty - Whether empty array is allowed (default: true)
 * @returns {Array} - Validated array
 * @throws {Error} - Validation error if not an array
 */
function validateArray(value, paramName, allowEmpty = true) {
  if (!Array.isArray(value)) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be an array`,
      { paramName, value, type: typeof value }
    );
  }
  
  if (!allowEmpty && value.length === 0) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be a non-empty array`,
      { paramName, value }
    );
  }
  
  return value;
}

/**
 * Validate that value is a number
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {Object} options - Validation options (min, max)
 * @returns {number} - Validated number
 * @throws {Error} - Validation error if not a number
 */
function validateNumber(value, paramName, options = {}) {
  const { min, max, allowFloat = true } = options;
  
  if (typeof value !== 'number' || isNaN(value)) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be a number`,
      { paramName, value, type: typeof value }
    );
  }
  
  if (!allowFloat && !Number.isInteger(value)) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be an integer`,
      { paramName, value }
    );
  }
  
  if (min !== undefined && value < min) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be >= ${min}`,
      { paramName, value, min }
    );
  }
  
  if (max !== undefined && value > max) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be <= ${max}`,
      { paramName, value, max }
    );
  }
  
  return value;
}

/**
 * Validate that value is a string
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {Object} options - Validation options (minLength, maxLength, pattern)
 * @returns {string} - Validated string
 * @throws {Error} - Validation error if not a string
 */
function validateString(value, paramName, options = {}) {
  const { minLength, maxLength, pattern, allowEmpty = true } = options;
  
  if (typeof value !== 'string') {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be a string`,
      { paramName, value, type: typeof value }
    );
  }
  
  if (!allowEmpty && value.trim().length === 0) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be a non-empty string`,
      { paramName, value }
    );
  }
  
  if (minLength !== undefined && value.length < minLength) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be at least ${minLength} characters`,
      { paramName, value, minLength }
    );
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be at most ${maxLength} characters`,
      { paramName, value, maxLength }
    );
  }
  
  if (pattern && !pattern.test(value)) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' does not match required pattern`,
      { paramName, value, pattern: pattern.toString() }
    );
  }
  
  return value;
}

/**
 * Validate that value is an object
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {Array<string>} requiredKeys - Required keys in object
 * @returns {Object} - Validated object
 * @throws {Error} - Validation error if not an object
 */
function validateObject(value, paramName, requiredKeys = []) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be an object`,
      { paramName, value, type: typeof value }
    );
  }
  
  if (requiredKeys.length > 0) {
    const missing = requiredKeys.filter(key => !(key in value));
    if (missing.length > 0) {
      throw createError(
        ErrorTypes.VALIDATION,
        `Parameter '${paramName}' is missing required keys: ${missing.join(', ')}`,
        { paramName, missing, required: requiredKeys }
      );
    }
  }
  
  return value;
}

/**
 * Validate that value is one of allowed values
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Allowed values
 * @param {string} paramName - Parameter name for error message
 * @returns {*} - Validated value
 * @throws {Error} - Validation error if not in allowed values
 */
function validateEnum(value, allowedValues, paramName) {
  if (!allowedValues.includes(value)) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}' must be one of: ${allowedValues.join(', ')}`,
      { paramName, value, allowedValues }
    );
  }
  
  return value;
}

/**
 * Validate module object structure
 * @param {Object} module - Module object to validate
 * @param {string} paramName - Parameter name for error message
 * @returns {Object} - Validated module
 * @throws {Error} - Validation error if invalid structure
 */
function validateModule(module, paramName = 'module') {
  validateObject(module, paramName, ['name']);
  
  if (module.complexity) {
    validateEnum(module.complexity, ['low', 'med', 'medium', 'high'], `${paramName}.complexity`);
  }
  
  if (module.deps && !Array.isArray(module.deps)) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Parameter '${paramName}.deps' must be an array`,
      { paramName, deps: module.deps }
    );
  }
  
  return module;
}

/**
 * Validate modules array
 * @param {Array} modules - Modules array to validate
 * @param {string} paramName - Parameter name for error message
 * @returns {Array} - Validated modules array
 * @throws {Error} - Validation error if invalid
 */
function validateModulesArray(modules, paramName = 'modules') {
  const validated = validateArray(modules, paramName, true);
  
  validated.forEach((module, index) => {
    try {
      validateModule(module, `${paramName}[${index}]`);
    } catch (error) {
      throw createError(
        ErrorTypes.VALIDATION,
        `Invalid module at index ${index}: ${error.message}`,
        { paramName, index, error: error.message }
      );
    }
  });
  
  return validated;
}

module.exports = {
  validateRequired,
  validateArray,
  validateNumber,
  validateString,
  validateObject,
  validateEnum,
  validateModule,
  validateModulesArray
};

