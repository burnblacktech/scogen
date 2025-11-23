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
  // Use unified ErrorHandler
  const { ErrorHandler } = require('../core/errors/ErrorHandler');
  const handler = new ErrorHandler(logger);
  return handler.middleware();
}

module.exports = {
  requestLogger,
  errorHandler
};

