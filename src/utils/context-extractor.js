/**
 * Context Extractor Utility
 * 
 * Extracts contextual information from Express request object
 * Supports auto-extraction from headers and manual override
 */

class ContextExtractor {
  /**
   * Extract context from Express request
   * @param {Object} req - Express request object
   * @param {Object} options - Manual override options
   * @returns {Object} Context object
   */
  static extract(req, options = {}) {
    // Auto-extract from request
    const autoContext = {
      source: this.extractSource(req),
      referrer: this.extractReferrer(req),
      deviceType: this.extractDeviceType(req),
      sessionId: this.extractSessionId(req),
      isRepeatClient: this.extractRepeatClient(req),
      timestamp: Date.now()
    };
    
    // Merge with manual override
    return {
      ...autoContext,
      ...options.context
    };
  }

  /**
   * Extract source from request
   * @param {Object} req - Express request
   * @returns {string} Source (direct, ads, referral, etc.)
   */
  static extractSource(req) {
    // Check for manual override first
    if (req.body?.context?.source) {
      return req.body.context.source;
    }
    
    // Check referrer
    const referrer = req.get('referer') || req.get('referrer') || '';
    
    if (referrer.includes('googleads') || referrer.includes('facebook') || referrer.includes('ads')) {
      return 'ads';
    }
    
    if (referrer.includes('trusted') || referrer.includes('partner')) {
      return 'referral';
    }
    
    if (!referrer || referrer === '') {
      return 'direct';
    }
    
    return 'organic';
  }

  /**
   * Extract referrer from request
   * @param {Object} req - Express request
   * @returns {string|null} Referrer URL
   */
  static extractReferrer(req) {
    return req.get('referer') || req.get('referrer') || null;
  }

  /**
   * Extract device type from request
   * @param {Object} req - Express request
   * @returns {string} Device type (desktop, mobile, tablet)
   */
  static extractDeviceType(req) {
    const userAgent = req.get('user-agent') || '';
    const ua = userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipad/.test(ua)) {
      if (/tablet|ipad/.test(ua)) {
        return 'tablet';
      }
      return 'mobile';
    }
    
    return 'desktop';
  }

  /**
   * Extract session ID from request
   * @param {Object} req - Express request
   * @returns {string|null} Session ID
   */
  static extractSessionId(req) {
    // Check cookies first
    if (req.cookies && req.cookies.sessionId) {
      return req.cookies.sessionId;
    }
    
    // Check headers
    if (req.get('x-session-id')) {
      return req.get('x-session-id');
    }
    
    // Check body
    if (req.body?.sessionId) {
      return req.body.sessionId;
    }
    
    return null;
  }

  /**
   * Extract repeat client status
   * @param {Object} req - Express request
   * @returns {boolean} Whether client is repeat
   */
  static extractRepeatClient(req) {
    // Check for client ID in body or headers
    if (req.body?.clientId || req.get('x-client-id')) {
      return true; // If client ID exists, assume repeat
    }
    
    // Check cookies
    if (req.cookies && req.cookies.clientId) {
      return true;
    }
    
    return false;
  }
}

module.exports = ContextExtractor;

