/**
 * Error Handler Utility - Backward Compatibility Shim
 * 
 * DEPRECATED: This file is kept for backward compatibility.
 * New code should use: require('../core/errors/ErrorHandler')
 * 
 * This file re-exports from the unified ErrorHandler
 */

const unifiedHandler = require('../core/errors/ErrorHandler');

// Re-export all functions for backward compatibility
module.exports = {
  ErrorTypes: unifiedHandler.ErrorTypes,
  createError: unifiedHandler.createError,
  wrapError: unifiedHandler.wrapError,
  handleError: unifiedHandler.handleError,
  validateRequired: (params, required) => {
    const handler = new unifiedHandler.ErrorHandler();
    return handler.validateRequired(params, required);
  },
  validateTypes: (params, schema) => {
    const handler = new unifiedHandler.ErrorHandler();
    return handler.validateTypes(params, schema);
  },
  safeExecute: unifiedHandler.safeExecute,
  retryWithBackoff: unifiedHandler.retryWithBackoff
};
