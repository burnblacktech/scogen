// scripts/fix-missing-tables.js
// Fix missing tables that should have been created by migrations

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../scogen-v2.db');
const db = new Database(dbPath);

console.log('Checking for missing tables...\n');

// Check if project_actuals exists
const projectActualsExists = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='project_actuals'
`).get();

if (!projectActualsExists) {
  console.log('Creating project_actuals table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_actuals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      project_id TEXT,
      feature_id TEXT,
      estimated_hours REAL,
      actual_hours REAL,
      estimated_cost REAL,
      actual_cost REAL,
      estimated_duration INTEGER,
      actual_duration INTEGER,
      variance_reasons TEXT,
      complexity_misestimate REAL,
      domain TEXT,
      tech_stack TEXT,
      team_size INTEGER,
      client_type TEXT,
      bugs_reported INTEGER DEFAULT 0,
      client_satisfaction_score INTEGER,
      code_reuse_percentage REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Created project_actuals table');
} else {
  console.log('✅ project_actuals table exists');
}

// Check if user_sessions exists
const userSessionsExists = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='user_sessions'
`).get();

if (!userSessionsExists) {
  console.log('Creating user_sessions table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('✅ Created user_sessions table');
} else {
  console.log('✅ user_sessions table exists');
}

// Create missing indexes
console.log('\nCreating missing indexes...');

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_project_actuals_project ON project_actuals(project_id)');
  console.log('✅ Created idx_project_actuals_project');
} catch (e) {
  console.log('⚠️  Index idx_project_actuals_project already exists or error:', e.message);
}

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_project_actuals_feature ON project_actuals(feature_id)');
  console.log('✅ Created idx_project_actuals_feature');
} catch (e) {
  console.log('⚠️  Index idx_project_actuals_feature already exists or error:', e.message);
}

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)');
  console.log('✅ Created idx_user_sessions_token');
} catch (e) {
  console.log('⚠️  Index idx_user_sessions_token already exists or error:', e.message);
}

// Check for admin user
const adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@scogen.io');
if (!adminUser) {
  console.log('\nCreating default admin user...');
  try {
    db.exec(`
      INSERT OR IGNORE INTO users (id, email, name, password_hash, role, token)
      VALUES (
        1,
        'admin@scogen.io',
        'Admin User',
        '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        'admin',
        'default-admin-token-change-this'
      )
    `);
    console.log('✅ Created default admin user');
  } catch (e) {
    console.log('⚠️  Could not create admin user:', e.message);
  }
} else {
  console.log('\n✅ Default admin user exists');
}

console.log('\n✅ All missing tables and indexes fixed!');
db.close();

