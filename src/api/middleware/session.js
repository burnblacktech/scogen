/**
 * Session Middleware
 * Validates session tokens and attaches user to request
 */

function createSessionMiddleware(simpleAuth) {
  /**
   * Session validation middleware
   * Extracts session token from headers or cookies and validates it
   */
  return (req, res, next) => {
    // Extract session token from headers or cookies
    const token = req.headers['x-session-token'] || 
                  req.headers['authorization']?.replace('Bearer ', '') ||
                  req.cookies?.session ||
                  req.query?.token;

    if (!token) {
      // No token provided - continue without user (for optional auth endpoints)
      req.user = null;
      return next();
    }

    // Validate session
    const session = simpleAuth.getSession(token);

    if (!session) {
      // Invalid or expired session
      // For optional auth, continue without user
      // For required auth, return 401
      req.user = null;
      
      // Check if this endpoint requires authentication
      // For now, we'll let endpoints decide (they can check req.user)
      return next();
    }

    // Attach user to request
    req.user = {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role
    };
    req.sessionId = token;

    next();
  };
}

/**
 * Require authentication middleware
 * Use this for endpoints that require a logged-in user
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
}

/**
 * Require specific role middleware
 * @param {string|string[]} allowedRoles - Role(s) allowed to access
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
}

module.exports = {
  createSessionMiddleware,
  requireAuth,
  requireRole
};

