// src/middleware/auth.js
// Authentication middleware for API routes

const Database = require('better-sqlite3');
const path = require('path');

class AuthMiddleware {
  constructor(dbPath = null) {
    // Use same database path as DatabaseManagerV2
    this.dbPath = dbPath || 
                  process.env.DB_V2_PATH || 
                  path.join(process.cwd(), 'scogen-v2.db');
    this.db = null;
  }

  /**
   * Get database connection
   */
  getDb() {
    if (!this.db) {
      this.db = new Database(this.dbPath);
    }
    return this.db;
  }

  /**
   * Authentication middleware
   * Verifies token and attaches user to request
   */
  authenticate(req, res, next) {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ 
          error: 'No authorization header provided',
          code: 'NO_TOKEN'
        });
      }

      // Support both "Bearer <token>" and just "<token>"
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ 
          error: 'Invalid token format',
          code: 'INVALID_TOKEN'
        });
      }

      // Verify token in database
      const db = this.getDb();
      const user = db.prepare(`
        SELECT id, email, name, role, company_name 
        FROM users 
        WHERE token = ? AND (last_login IS NULL OR last_login > datetime('now', '-30 days'))
      `).get(token);

      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      }

      // Update last login
      try {
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
      } catch (error) {
        // Non-critical, continue
        console.warn('Failed to update last_login:', error.message);
      }

      // Attach user to request
      req.user = user;
      req.token = token;
      
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Authentication error',
        code: 'AUTH_ERROR'
      });
    }
  }

  /**
   * Optional authentication - doesn't fail if no token
   */
  optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader) {
        const token = authHeader.startsWith('Bearer ') 
          ? authHeader.substring(7) 
          : authHeader;

        if (token && token !== 'null' && token !== 'undefined') {
          const db = this.getDb();
          const user = db.prepare(`
            SELECT id, email, name, role, company_name 
            FROM users 
            WHERE token = ?
          `).get(token);

          if (user) {
            req.user = user;
            req.token = token;
          }
        }
      }
      
      next();
    } catch (error) {
      // Non-critical, continue without auth
      next();
    }
  }

  /**
   * Role-based authorization
   */
  requireRole(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          code: 'FORBIDDEN'
        });
      }

      next();
    };
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

// Export middleware function
module.exports = authMiddleware.authenticate.bind(authMiddleware);

// Export class and other methods
module.exports.middleware = authMiddleware.authenticate.bind(authMiddleware);
module.exports.optional = authMiddleware.optionalAuth.bind(authMiddleware);
module.exports.requireRole = authMiddleware.requireRole.bind(authMiddleware);
module.exports.AuthMiddleware = AuthMiddleware;

