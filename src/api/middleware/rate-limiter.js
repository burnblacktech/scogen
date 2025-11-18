/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting the number of requests per IP address
 */

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
    this.maxRequests = options.maxRequests || 100; // 100 requests per window
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
    
    // Store request counts: { ip: { count: number, resetTime: timestamp } }
    this.requests = new Map();
    
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get rate limit info for an IP
   * @param {string} ip - IP address
   * @returns {{count: number, resetTime: number, remaining: number}}
   */
  getRateLimitInfo(ip) {
    const record = this.requests.get(ip);
    
    if (!record) {
      return {
        count: 0,
        resetTime: Date.now() + this.windowMs,
        remaining: this.maxRequests
      };
    }

    // Check if window has expired
    if (Date.now() > record.resetTime) {
      this.requests.delete(ip);
      return {
        count: 0,
        resetTime: Date.now() + this.windowMs,
        remaining: this.maxRequests
      };
    }

    return {
      count: record.count,
      resetTime: record.resetTime,
      remaining: Math.max(0, this.maxRequests - record.count)
    };
  }

  /**
   * Increment request count for an IP
   * @param {string} ip - IP address
   * @returns {boolean} - true if under limit, false if limit exceeded
   */
  increment(ip) {
    const now = Date.now();
    const record = this.requests.get(ip);

    if (!record || now > record.resetTime) {
      // New window
      this.requests.set(ip, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    // Increment count
    record.count++;
    
    // Check if limit exceeded
    if (record.count > this.maxRequests) {
      return false;
    }

    return true;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [ip, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(ip);
      }
    }
  }

  /**
   * Get client IP from request
   * @param {Object} req - Express request object
   * @returns {string} - IP address
   */
  getClientIp(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
           'unknown';
  }

  /**
   * Express middleware
   */
  middleware() {
    return (req, res, next) => {
      const ip = this.getClientIp(req);
      const info = this.getRateLimitInfo(ip);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', info.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(info.resetTime).toISOString());

      // Check if limit exceeded
      if (info.count >= this.maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((info.resetTime - Date.now()) / 1000)
        });
      }

      // Increment counter immediately (before processing request)
      const limiter = this;
      const shouldIncrement = () => {
        // Only increment on successful requests if configured
        if (limiter.skipSuccessfulRequests && res.statusCode < 400) {
          return false;
        }
        // Only increment on failed requests if configured
        if (limiter.skipFailedRequests && res.statusCode >= 400) {
          return false;
        }
        return true;
      };

      // Increment after response is sent
      res.on('finish', () => {
        if (shouldIncrement()) {
          limiter.increment(ip);
        }
      });

      next();
    };
  }
}

// Create rate limiter instances (will be configured with actual config in routes)
// Default instances for backward compatibility
const defaultRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 requests per 15 minutes
});

const scopeRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20 // 20 requests per hour (more expensive operation)
});

// Factory function to create rate limiters from config
function createRateLimiters(config) {
  const rateLimitConfig = config?.get?.('rateLimiting') || {};
  
  return {
    default: new RateLimiter({
      windowMs: rateLimitConfig.windowMs || 15 * 60 * 1000,
      maxRequests: rateLimitConfig.maxRequests || 100
    }),
    scope: new RateLimiter({
      windowMs: rateLimitConfig.scopeWindowMs || 60 * 60 * 1000,
      maxRequests: rateLimitConfig.scopeMaxRequests || 20
    })
  };
}

module.exports = {
  RateLimiter,
  defaultRateLimiter,
  scopeRateLimiter,
  createRateLimiters
};

