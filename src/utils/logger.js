const winston = require('winston');
const path = require('path');
const fs = require('fs');

class Logger {
  constructor(config) {
    const logFile = config.get('logging.file') || 'logs/scogen.log';
    const logDir = path.dirname(logFile);
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logLevel = config.get('logging.level') || 'info';

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // File transport (always active)
        new winston.transports.File({
          filename: logFile,
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          tailable: true
        })
      ]
    });

    // Console transport (only if DEBUG=1)
    if (process.env.DEBUG === '1') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(info => {
            const { timestamp, level, message, ...meta } = info;
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
      }));
    }
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Structured logging for events
  logEvent(eventName, data = {}) {
    this.info(eventName, { event: eventName, ...data });
  }

  logModuleExecution(moduleName, duration, success, data = {}) {
    this.info('Module execution', {
      module: moduleName,
      duration,
      success,
      ...data
    });
  }
}

module.exports = Logger;

