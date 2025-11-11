function requestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('API request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`
      });
    });

    next();
  };
}

function errorHandler(logger) {
  return (err, req, res, next) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Log full error details server-side
    logger.error('API error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      statusCode: err.status || 500,
      errorCode: err.code || 'INTERNAL_ERROR'
    });

    // Sanitize error messages for client in production
    let clientError = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    
    if (isDevelopment) {
      // In development, show actual error
      clientError = err.message || 'Internal server error';
      errorCode = err.code || 'INTERNAL_ERROR';
    } else {
      // In production, use generic messages for 500 errors
      if (err.status && err.status < 500) {
        // 4xx errors can show user-friendly messages
        clientError = err.message || 'Bad request';
        errorCode = err.code || `HTTP_${err.status}`;
      } else {
        // 5xx errors get generic message
        clientError = 'An internal error occurred. Please try again later.';
        errorCode = 'INTERNAL_ERROR';
        // Log additional context for debugging
        logger.error('Internal error details (not sent to client)', {
          originalError: err.message,
          path: req.path,
          method: req.method
        });
      }
    }

    const response = {
      success: false,
      error: clientError,
      code: errorCode
    };

    // Only include stack trace in development
    if (isDevelopment && err.stack) {
      response.stack = err.stack;
    }

    res.status(err.status || 500).json(response);
  };
}

module.exports = {
  requestLogger,
  errorHandler
};

