/**
 * Standardized Error Codes
 * Centralized error code definitions for consistent error handling across modules
 */

const ERROR_CODES = {
  // Input Validation Errors (4xx)
  MISSING_INPUT: 'MISSING_INPUT',
  INPUT_TOO_SHORT: 'INPUT_TOO_SHORT',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  INVALID_PROJECT_DETAILS: 'INVALID_PROJECT_DETAILS',
  INVALID_PROJECT_SCALE: 'INVALID_PROJECT_SCALE',
  INVALID_BUDGET: 'INVALID_BUDGET',
  INVALID_DEADLINE: 'INVALID_DEADLINE',
  INPUT_VALIDATION_ERROR: 'INPUT_VALIDATION_ERROR',
  
  // File Upload Errors (4xx)
  NO_FILE_UPLOADED: 'NO_FILE_UPLOADED',
  INVALID_PDF_FILE: 'INVALID_PDF_FILE',
  INVALID_EXCEL_FILE: 'INVALID_EXCEL_FILE',
  INVALID_TEMPLATE_TYPE: 'INVALID_TEMPLATE_TYPE',
  INVALID_TEMPLATE_PATH: 'INVALID_TEMPLATE_PATH',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  
  // API Errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SCOPE_GENERATION_FAILED: 'SCOPE_GENERATION_FAILED',
  PDF_EXTRACTION_ERROR: 'PDF_EXTRACTION_ERROR',
  EXCEL_EXTRACTION_ERROR: 'EXCEL_EXTRACTION_ERROR',
  TEMPLATE_DOWNLOAD_ERROR: 'TEMPLATE_DOWNLOAD_ERROR',
  
  // Database Errors (5xx)
  DB_INIT_FAILED: 'DB_INIT_FAILED',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  
  // LLM/API Errors (5xx)
  LLM_API_KEY_MISSING: 'LLM_API_KEY_MISSING',
  LLM_API_TIMEOUT: 'LLM_API_TIMEOUT',
  LLM_API_ERROR: 'LLM_API_ERROR',
  LLM_RATE_LIMIT: 'LLM_RATE_LIMIT',
  
  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Domain Knowledge Errors
  DOMAIN_KNOWLEDGE_LIST_ERROR: 'DOMAIN_KNOWLEDGE_LIST_ERROR',
  DOMAIN_KNOWLEDGE_GET_ERROR: 'DOMAIN_KNOWLEDGE_GET_ERROR',
  DOMAIN_KNOWLEDGE_SAVE_ERROR: 'DOMAIN_KNOWLEDGE_SAVE_ERROR',
  PATTERN_UPDATE_ERROR: 'PATTERN_UPDATE_ERROR',
  PATTERN_DELETE_ERROR: 'PATTERN_DELETE_ERROR',
  
  // Chain Execution Errors
  CHAIN_EXECUTION_FAILED: 'CHAIN_EXECUTION_FAILED',
  STEP_EXECUTION_FAILED: 'STEP_EXECUTION_FAILED',
  PARSING_FAILED: 'PARSING_FAILED',
  ENRICHMENT_FAILED: 'ENRICHMENT_FAILED',
  DECOMPOSITION_FAILED: 'DECOMPOSITION_FAILED',
  RISK_ASSESSMENT_FAILED: 'RISK_ASSESSMENT_FAILED',
  SCENARIO_GENERATION_FAILED: 'SCENARIO_GENERATION_FAILED'
};

/**
 * Create standardized error object
 * @param {string} code - Error code from ERROR_CODES
 * @param {string} message - Error message
 * @param {number} status - HTTP status code (default: 500)
 * @param {Object} context - Additional context
 * @returns {Error} - Error object with standardized properties
 */
function createError(code, message, status = 500, context = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.context = context;
  error.timestamp = new Date().toISOString();
  return error;
}

/**
 * Log error with consistent format
 * @param {Object} logger - Logger instance
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
function logError(logger, error, context = {}) {
  if (!logger) {
    console.error('Error (no logger):', error.message, error.stack);
    return;
  }

  const logData = {
    error: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    status: error.status || 500,
    stack: error.stack,
    ...context,
    ...(error.context || {})
  };

  // Use appropriate log level based on status code
  if (error.status && error.status < 500) {
    logger.warn('Client error', logData);
  } else {
    logger.error('Server error', logData);
  }
}

/**
 * Handle error with consistent pattern
 * @param {Object} logger - Logger instance
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 * @param {boolean} throwError - Whether to re-throw error (default: false)
 * @returns {Object} - Error response object
 */
function handleError(logger, error, context = {}, throwError = false) {
  // Ensure error has code
  if (!error.code) {
    error.code = ERROR_CODES.INTERNAL_ERROR;
  }

  // Log error
  logError(logger, error, context);

  // Create response object
  const response = {
    success: false,
    error: error.message || 'An error occurred',
    code: error.code,
    ...(error.context || {})
  };

  // Re-throw if requested
  if (throwError) {
    throw error;
  }

  return response;
}

module.exports = {
  ERROR_CODES,
  createError,
  logError,
  handleError
};

