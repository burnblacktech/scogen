// src/core/errors/ErrorHandler.js
// Unified Centralized Error Handling System
// Consolidates: utils/error-handler.js, middleware/error-handler.js, api/middleware/error-handler.js

const logger = require('../../utils/logger');

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
  CONFIGURATION: 'CONFIGURATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  CONFLICT: 'CONFLICT_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE_ERROR'
};

/**
 * Centralized Error Handler Class
 * Combines utility functions, Express middleware, and error type management
 */
class ErrorHandler {
  constructor(loggerInstance = null) {
    this.logger = loggerInstance || logger;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Error type mappings with status codes and user messages
    this.errorTypes = {
      ValidationError: { statusCode: 400, userMessage: 'Please check your input and try again', code: 'VALIDATION_ERROR' },
      AuthenticationError: { statusCode: 401, userMessage: 'Please login to continue', code: 'AUTHENTICATION_ERROR' },
      AuthorizationError: { statusCode: 403, userMessage: 'You don\'t have permission to perform this action', code: 'AUTHORIZATION_ERROR' },
      NotFoundError: { statusCode: 404, userMessage: 'The requested resource was not found', code: 'NOT_FOUND' },
      ConflictError: { statusCode: 409, userMessage: 'This action conflicts with existing data', code: 'CONFLICT_ERROR' },
      RateLimitError: { statusCode: 429, userMessage: 'Too many requests. Please try again later', code: 'RATE_LIMIT_ERROR' },
      DatabaseError: { statusCode: 500, userMessage: 'A database error occurred', code: 'DATABASE_ERROR' },
      ExternalServiceError: { statusCode: 502, userMessage: 'External service unavailable', code: 'EXTERNAL_SERVICE_ERROR' }
    };
  }
  
  /**
   * Create standardized error object
   * @param {string} type - Error type from ErrorTypes
   * @param {string} message - Error message
   * @param {Object} context - Additional context
   * @param {Error} originalError - Original error if wrapping
   * @returns {Error} - Standardized error object
   */
  createError(type, message, context = {}, originalError = null) {
    const error = new Error(message);
    error.type = type;
    error.code = type;
    error.context = context;
    error.timestamp = new Date().toISOString();
    
    // Set status code based on type
    const errorType = this.errorTypes[type] || this.errorTypes[type.replace('Error', '')];
    if (errorType) {
      error.statusCode = errorType.statusCode;
      error.status = errorType.statusCode;
    }
    
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
  wrapError(error, type = ErrorTypes.INTERNAL, message = null, context = {}) {
    if (error.type) {
      // Already standardized
      return error;
    }
    
    return this.createError(
      type,
      message || error.message || 'An error occurred',
      { ...context, originalMessage: error.message },
      error
    );
  }
  
  /**
   * Handle error with logging and context preservation
   * @param {Error} error - Error to handle
   * @param {Object} context - Additional context
   * @returns {Error} - Standardized error
   */
  handleError(error, context = {}) {
    const standardized = error.type ? error : this.wrapError(error, ErrorTypes.INTERNAL, null, context);
    
    // Log error with context
    this.logError(standardized, null);
    
    return standardized;
  }
  
  /**
   * Handle error and send appropriate response (Express)
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  handle(error, req = null, res = null, next = null) {
    // Log error
    this.logError(error, req);
    
    // Send appropriate response
    if (res && !res.headersSent) {
      const statusCode = error.statusCode || error.status || this.getStatusCode(error);
      const message = this.getUserFriendlyMessage(error);
      
      const response = {
        success: false,
        error: message,
        code: error.code || this.getErrorCode(error)
      };
      
      // Add stack trace in development
      if (this.isDevelopment) {
        response.stack = error.stack;
        response.details = {
          message: error.message,
          name: error.name,
          type: error.type
        };
      }
      
      // Add request context in development
      if (this.isDevelopment && req) {
        response.context = {
          url: req.url,
          method: req.method,
          user: req.user?.id || null
        };
      }
      
      res.status(statusCode).json(response);
    }
    
    // Call next if provided
    if (next) {
      next(error);
    }
  }
  
  /**
   * Log error with context
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   */
  logError(error, req = null) {
    const logData = {
      timestamp: new Date().toISOString(),
      message: error.message,
      name: error.name,
      code: error.code || error.type,
      stack: error.stack
    };
    
    if (req) {
      logData.request = {
        url: req.url,
        method: req.method,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent')
      };
      
      if (req.user) {
        logData.user = {
          id: req.user.id,
          email: req.user.email
        };
      }
    }
    
    // Log based on severity
    const statusCode = error.statusCode || error.status || 500;
    if (statusCode >= 500) {
      this.logger.error('[ERROR] Server error', logData);
    } else if (statusCode >= 400) {
      this.logger.warn('[WARN] Client error', logData);
    } else {
      this.logger.info('[INFO] Error handled', logData);
    }
  }
  
  /**
   * Get HTTP status code for error
   * @param {Error} error - Error object
   * @returns {number} HTTP status code
   */
  getStatusCode(error) {
    // Check if error has statusCode
    if (error.statusCode || error.status) {
      return error.statusCode || error.status;
    }
    
    // Check error type mapping
    const errorType = this.errorTypes[error.name];
    if (errorType) {
      return errorType.statusCode;
    }
    
    // Handle specific error types
    if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
      return 400;
    } else if (error.name === 'UnauthorizedError' || error.code === 'AUTH_REQUIRED' || error.code === 'AUTHENTICATION_ERROR') {
      return 401;
    } else if (error.code === 'FORBIDDEN' || error.code === 'AUTHORIZATION_ERROR') {
      return 403;
    } else if (error.name === 'CastError' || error.name === 'TypeError') {
      return 400;
    } else if (error.code === 'SQLITE_ERROR' || error.code === 'DATABASE_ERROR') {
      return 500;
    }
    
    // Default to 500
    return 500;
  }
  
  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} User-friendly message
   */
  getUserFriendlyMessage(error) {
    // Use custom message if provided
    if (error.userMessage) {
      return error.userMessage;
    }
    
    // Check error type mapping
    const errorType = this.errorTypes[error.name];
    if (errorType) {
      return errorType.userMessage;
    }
    
    // Use error message if available
    if (error.message) {
      // In production, sanitize error messages
      if (!this.isDevelopment) {
        // Don't expose internal error details
        if (error.message.includes('SQL') || error.message.includes('database')) {
          return 'A database error occurred';
        }
        if (error.message.includes('ENOENT') || error.message.includes('file')) {
          return 'File operation failed';
        }
        // Generic message for 500 errors
        if ((error.statusCode || error.status) === 500) {
          return 'An internal error occurred';
        }
      }
      return error.message;
    }
    
    // Default message
    return 'An unexpected error occurred';
  }
  
  /**
   * Get error code for client-side handling
   * @param {Error} error - Error object
   * @returns {string} Error code
   */
  getErrorCode(error) {
    if (error.code) {
      return error.code;
    }
    
    // Check error type mapping
    const errorType = this.errorTypes[error.name];
    if (errorType) {
      return errorType.code;
    }
    
    // Generate code from error name
    return error.name
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, '') || 'INTERNAL_ERROR';
  }
  
  /**
   * Express error middleware
   * @returns {Function} Express middleware
   */
  middleware() {
    return (error, req, res, next) => {
      this.handle(error, req, res, next);
    };
  }
  
  /**
   * 404 Not Found handler
   * @returns {Function} Express middleware
   */
  notFoundHandler() {
    return (req, res, next) => {
      const error = new Error(`Route not found: ${req.method} ${req.path}`);
      error.name = 'NotFoundError';
      error.statusCode = 404;
      error.code = 'ROUTE_NOT_FOUND';
      this.handle(error, req, res, next);
    };
  }
  
  /**
   * Async error wrapper - wraps async route handlers to catch errors
   * @param {Function} fn - Async function
   * @returns {Function} Wrapped function
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
  
  /**
   * Validate required parameters
   * @param {Object} params - Parameters object
   * @param {Array<string>} required - Required parameter names
   * @throws {Error} - Validation error if missing
   */
  validateRequired(params, required) {
    const missing = required.filter(param => params[param] === undefined || params[param] === null);
    
    if (missing.length > 0) {
      throw this.createError(
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
  validateTypes(params, schema) {
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
      throw this.createError(
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
  async safeExecute(fn, context = {}) {
    try {
      const result = await fn();
      return { success: true, result, error: null };
    } catch (error) {
      const handled = this.handleError(error, context);
      return { success: false, result: null, error: handled };
    }
  }
  
  /**
   * Retry with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {Object} options - Retry options
   * @returns {Promise<*>}
   */
  async retryWithBackoff(fn, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);
          this.logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
            error: error.message,
            attempt: attempt + 1
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw this.wrapError(lastError, ErrorTypes.INTERNAL, 'Max retries exceeded');
  }
  
  /**
   * Create custom error (convenience method)
   * @param {string} message - Error message
   * @param {string} name - Error name
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code
   * @returns {Error} Custom error object
   */
  createCustomError(message, name = 'Error', statusCode = 500, code = null) {
    const error = new Error(message);
    error.name = name;
    error.statusCode = statusCode;
    error.status = statusCode;
    error.code = code || this.getErrorCode(error);
    return error;
  }
}

// Custom error classes
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.status = 400;
    this.code = 'VALIDATION_ERROR';
    this.type = ErrorTypes.VALIDATION;
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
    this.status = 401;
    this.code = 'AUTHENTICATION_ERROR';
    this.type = ErrorTypes.AUTHENTICATION;
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
    this.status = 403;
    this.code = 'AUTHORIZATION_ERROR';
    this.type = ErrorTypes.AUTHORIZATION;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.status = 404;
    this.code = 'NOT_FOUND';
    this.type = ErrorTypes.NOT_FOUND;
  }
}

class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
    this.status = 409;
    this.code = 'CONFLICT_ERROR';
    this.type = ErrorTypes.CONFLICT;
  }
}

// Export unified interface
module.exports = {
  ErrorHandler,
  ErrorTypes,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  
  // Convenience functions for backward compatibility
  createError: (type, message, context, originalError) => {
    const handler = new ErrorHandler();
    return handler.createError(type, message, context, originalError);
  },
  wrapError: (error, type, message, context) => {
    const handler = new ErrorHandler();
    return handler.wrapError(error, type, message, context);
  },
  handleError: (error, context) => {
    const handler = new ErrorHandler();
    return handler.handleError(error, context);
  },
  validateRequired: (params, required) => {
    const handler = new ErrorHandler();
    return handler.validateRequired(params, required);
  },
  validateTypes: (params, schema) => {
    const handler = new ErrorHandler();
    return handler.validateTypes(params, schema);
  },
  safeExecute: async (fn, context) => {
    const handler = new ErrorHandler();
    return handler.safeExecute(fn, context);
  },
  retryWithBackoff: async (fn, options) => {
    const handler = new ErrorHandler();
    return handler.retryWithBackoff(fn, options);
  }
};
