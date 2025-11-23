// src/api/routes/auth.js
// Authentication routes (login, register, logout)

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Get database path
const dbPath = process.env.DB_V2_PATH || 
               path.join(process.cwd(), 'scogen-v2.db');

/**
 * Generate a secure token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash password using SHA256
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { email, password, name, company_name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      db.close();
      return res.status(409).json({ 
        error: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    // Create user
    const passwordHash = hashPassword(password);
    const token = generateToken();

    // Find next available ID
    const maxId = db.prepare('SELECT MAX(id) as max_id FROM users').get();
    const userId = (maxId.max_id || 0) + 1;

    const result = db.prepare(`
      INSERT INTO users (id, email, name, password_hash, token, company_name, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      email,
      name || email.split('@')[0],
      passwordHash,
      token,
      company_name || null,
      'user'
    );

    db.close();

    res.status(201).json({
      success: true,
      user: {
        id: result.lastInsertRowid,
        email,
        name: name || email.split('@')[0],
        role: 'user'
      },
      token
    });
  } catch (error) {
    db.close();
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user and return token
 */
router.post('/login', async (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      db.close();
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
      db.close();
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) {
      db.close();
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate new token
    const token = generateToken();
    
    // Update user token and last login
    db.prepare(`
      UPDATE users 
      SET token = ?, last_login = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(token, user.id);

    db.close();

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_name: user.company_name
      },
      token
    });
  } catch (error) {
    db.close();
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate token)
 */
router.post('/logout', async (req, res) => {
  // Get auth middleware dynamically to avoid circular dependency
  const authMiddleware = require('../middleware/auth');
  
  // Apply auth middleware
  authMiddleware(req, res, () => {
    // Continue with logout logic
    const db = new Database(dbPath);
    
    try {
      // Invalidate token
      db.prepare('UPDATE users SET token = NULL WHERE id = ?').run(req.user.id);
      db.close();

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      db.close();
      console.error('Logout error:', error);
      res.status(500).json({ 
        error: 'Logout failed',
        code: 'LOGOUT_ERROR'
      });
    }
  });
});

/**
 * POST /api/auth/logout (alternative implementation)
 */
router.post('/logout-alt', async (req, res) => {
  const db = new Database(dbPath);
  
  try {
    // Invalidate token
    db.prepare('UPDATE users SET token = NULL WHERE id = ?').run(req.user.id);
    db.close();

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    db.close();
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req, res) => {
  // Get auth middleware dynamically
  const authMiddleware = require('../middleware/auth');
  
  // Apply auth middleware
  authMiddleware(req, res, () => {
    res.json({
      success: true,
      user: req.user
    });
  });
});

module.exports = router;

