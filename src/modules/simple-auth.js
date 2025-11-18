const crypto = require('crypto');

/**
 * Simple Authentication Module
 * For internal testing - uses SHA256 hashing (sufficient for internal use)
 * In production, consider using bcrypt or similar
 */
class SimpleAuth {
  constructor(db) {
    this.db = db;
    this.sessions = new Map(); // In-memory sessions for simplicity
  }

  /**
   * Hash password using SHA256 with salt
   * Note: For production, use bcrypt or similar
   * @param {string} password - Plain text password
   * @returns {string} - Hashed password
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'scogen-salt').digest('hex');
  }

  /**
   * Create a new user
   * @param {string} email - User email (unique)
   * @param {string} name - User name
   * @param {string} password - Plain text password
   * @returns {Object} - User object (without password hash)
   */
  createUser(email, name, password) {
    if (!email || !name || !password) {
      throw new Error('Email, name, and password are required');
    }

    const passwordHash = this.hashPassword(password);

    try {
      const result = this.db.prepare(
        'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
      ).run(email, name, passwordHash);

      return {
        id: result.lastInsertRowid,
        email: email,
        name: name,
        role: 'tester'
      };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed') || error.message.includes('UNIQUE')) {
        throw new Error('User already exists');
      }
      throw error;
    }
  }

  /**
   * Login user and create session
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Object} - Session object with sessionId and user
   */
  login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const passwordHash = this.hashPassword(password);
    const user = this.db.prepare(
      'SELECT * FROM users WHERE email = ? AND password_hash = ?'
    ).get(email, passwordHash);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Create simple session
    const sessionId = crypto.randomBytes(32).toString('hex');
    this.sessions.set(sessionId, {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'tester',
      createdAt: Date.now()
    });

    return {
      sessionId: sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'tester'
      }
    };
  }

  /**
   * Get session by session ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} - Session object or null if not found
   */
  getSession(sessionId) {
    if (!sessionId) {
      return null;
    }

    const session = this.sessions.get(sessionId);
    
    // Optional: Add session expiration (24 hours)
    if (session && Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Logout user (remove session)
   * @param {string} sessionId - Session ID
   */
  logout(sessionId) {
    if (sessionId) {
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Object|null} - User object or null if not found
   */
  getUserById(userId) {
    const user = this.db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(userId);
    return user || null;
  }

  /**
   * Cleanup expired sessions (optional maintenance)
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.createdAt > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

module.exports = SimpleAuth;

