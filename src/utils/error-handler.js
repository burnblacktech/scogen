/**
 * Error Handler Utility
 * Centralized error handling patterns for consistent error management
 */

const logger = require('./logger');

/**
 * Standard error types
 */
const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE: 'DATABASE_ERROR',
  NETWORK: 'NETWORK_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  INTERNAL: 'INTERNAL_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  CONFIGURATION: 'CONFIGURATION_ERROR'
};

/**
 * Create standardized error object
 * @param {string} type - Error type from ErrorTypes
 * @param {string} message - Error message
 * @param {Object} context - Additional context
 * @param {Error} originalError - Original error if wrapping
 * @returns {Error} - Standardized error object
 */
function createError(type, message, context = {}, originalError = null) {
  const error = new Error(message);
  error.type = type;
  error.code = type;
  error.context = context;
  error.timestamp = new Date().toISOString();
  
  if (originalError) {
    error.originalError = originalError;
    error.stack = originalError.stack || error.stack;
  }
  
  return error;
}

/**
 * Wrap and standardize an error
 * @param {Error} error - Original error
 * @param {string} type - Error type
 * @param {string} message - Override message (optional)
 * @param {Object} context - Additional context
 * @returns {Error} - Standardized error
 */
function wrapError(error, type = ErrorTypes.INTERNAL, message = null, context = {}) {
  if (error.type) {
    // Already standardized
    return error;
  }
  
  return createError(
    type,
    message || error.message || 'An error occurred',
    { ...context, originalMessage: error.message },
    error
  );
}

/**
 * Handle error with logging and context preservation
 * @param {Error} error - Error to handle
 * @param {Object} loggerInstance - Logger instance (optional, uses default if not provided)
 * @param {Object} context - Additional context
 * @returns {Error} - Standardized error
 */
function handleError(error, loggerInstance = null, context = {}) {
  const log = loggerInstance || logger;
  const standardized = error.type ? error : wrapError(error, ErrorTypes.INTERNAL, null, context);
  
  // Log error with context
  log.error('Error occurred', {
    type: standardized.type,
    message: standardized.message,
    context: { ...standardized.context, ...context },
    stack: standardized.stack
  });
  
  return standardized;
}

/**
 * Validate required parameters
 * @param {Object} params - Parameters object
 * @param {Array<string>} required - Required parameter names
 * @throws {Error} - Validation error if missing
 */
function validateRequired(params, required) {
  const missing = required.filter(param => params[param] === undefined || params[param] === null);
  
  if (missing.length > 0) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Missing required parameters: ${missing.join(', ')}`,
      { missing, provided: Object.keys(params) }
    );
  }
}

/**
 * Validate parameter types
 * @param {Object} params - Parameters object
 * @param {Object} schema - Schema mapping param names to expected types
 * @throws {Error} - Validation error if type mismatch
 */
function validateTypes(params, schema) {
  const mismatches = [];
  
  for (const [param, expectedType] of Object.entries(schema)) {
    if (params[param] !== undefined && params[param] !== null) {
      const actualType = Array.isArray(params[param]) ? 'array' : typeof params[param];
      const normalizedExpected = expectedType === 'array' ? 'array' : expectedType;
      
      if (actualType !== normalizedExpected) {
        mismatches.push({
          param,
          expected: normalizedExpected,
          actual: actualType
        });
      }
    }
  }
  
  if (mismatches.length > 0) {
    throw createError(
      ErrorTypes.VALIDATION,
      `Type mismatches: ${mismatches.map(m => `${m.param} (expected ${m.expected}, got ${m.actual})`).join(', ')}`,
      { mismatches }
    );
  }
}

/**
 * Safe async execution with error handling
 * @param {Function} fn - Async function to execute
 * @param {Object} context - Context for error handling
 * @returns {Promise<{success: boolean, result: *, error: Error}>}
 */
async function safeExecute(fn, context = {}) {
  try {
    const result = await fn();
    return { success: true, result, error: null };
  } catch (error) {
    const handled = handleError(error, context.logger, context);
    return { success: false, result: null, error: handled };
  }
}

/**
 * Retry with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<*>}
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    logger: log = logger
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);
        log.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: error.message,
          attempt: attempt + 1
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw wrapError(lastError, ErrorTypes.INTERNAL, 'Max retries exceeded');
}

module.exports = {
  ErrorTypes,
  createError,
  wrapError,
  handleError,
  validateRequired,
  validateTypes,
  safeExecute,
  retryWithBackoff
};

