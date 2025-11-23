// src/api/middleware/error-handler.js
// Express Error Handling Middleware
// Wrapper around unified ErrorHandler

const { ErrorHandler } = require('../../core/errors/ErrorHandler');

/**
 * Create error handler middleware
 * @param {Object} logger - Logger instance
 * @returns {Function} Express error middleware
 */
function createErrorHandler(logger) {
  const errorHandler = new ErrorHandler(logger);
  return errorHandler.middleware();
}

/**
 * Create 404 Not Found handler
 * @param {Object} logger - Logger instance
 * @returns {Function} Express middleware
 */
function createNotFoundHandler(logger) {
  const errorHandler = new ErrorHandler(logger);
  return errorHandler.notFoundHandler();
}

/**
 * Async handler wrapper
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
function asyncHandler(fn) {
  const errorHandler = new ErrorHandler();
  return errorHandler.asyncHandler(fn);
}

module.exports = {
  createErrorHandler,
  createNotFoundHandler,
  asyncHandler
};

