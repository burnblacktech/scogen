/**
 * Error Handler Middleware - Backward Compatibility Shim
 * 
 * DEPRECATED: This file is kept for backward compatibility.
 * New code should use: require('../api/middleware/error-handler')
 * 
 * This file re-exports from the unified ErrorHandler
 */

const { createErrorHandler } = require('../api/middleware/error-handler');

/**
 * Error handling middleware for Express
 * Must be added LAST in the middleware chain
 * 
 * @param {Object} logger - Logger instance
 * @returns {Function} Express error middleware
 */
function errorHandler(logger) {
  return createErrorHandler(logger);
}

/**
 * Async error wrapper - wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  const { asyncHandler: unifiedAsyncHandler } = require('../api/middleware/error-handler');
  return unifiedAsyncHandler(fn);
}

/**
 * Create custom error
 */
function createError(message, statusCode = 500, code = null) {
  const { ErrorHandler } = require('../core/errors/ErrorHandler');
  const handler = new ErrorHandler();
  return handler.createCustomError(message, 'Error', statusCode, code);
}

module.exports = errorHandler;
module.exports.asyncHandler = asyncHandler;
module.exports.createError = createError;
