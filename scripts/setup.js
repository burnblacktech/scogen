#!/usr/bin/env node

/**
 * SCOGEN Local Setup Script
 * Sets up the environment for local testing
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('🚀 Setting up SCOGEN for testing...\n');

// Check Node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 14) {
  console.error('❌ Node.js version 14 or higher is required');
  console.error(`   Current version: ${nodeVersion}`);
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Check if .env exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  const envTemplate = `# SCOGEN Environment Configuration
NODE_ENV=development
PORT=3000
API_PORT=3001

# Database
USE_NEW_DB=true
RUN_MIGRATIONS=true

# Feature Flags
ENABLE_FULL_CHAIN=true
ENABLE_TRUST_SCORING=true
ENABLE_SMART_ROUTING=true
ENABLE_REQUIREMENTS_ENRICHMENT=true
ENABLE_TECHNICAL_DECOMPOSITION=true
ENABLE_RISK_ASSESSMENT=true
ENABLE_SCENARIO_GENERATION=true
ENABLE_AI_ENRICHMENT=false
ENABLE_REQUEST_QUEUE=false

# CORS
CORS_ORIGINS=http://localhost:3000

# Memory Monitoring
ENABLE_MEMORY_MONITORING=true
MEMORY_WARNING_THRESHOLD=512
MEMORY_CRITICAL_THRESHOLD=1024

# Progressive Output System
TRAINING_MODE=true
SHOW_ALL_LEVELS=true
`;
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ .env file created');
} else {
  console.log('ℹ️  .env file already exists');
}

// Initialize database
const dbPath = path.join(process.cwd(), 'scogen-v2.db');
let db = null;

try {
  console.log('\n📦 Initializing database...');
  
  db = new Database(dbPath);
  
  // Initialize full schema first (if not already done)
  const schemaPath = path.join(process.cwd(), 'src', 'database', 'schema-v2.sql');
  if (fs.existsSync(schemaPath)) {
    console.log('📝 Initializing database schema...');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema (split by semicolons)
    const statements = schema.split(';').filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));
    statements.forEach(statement => {
      try {
        const trimmed = statement.trim();
        if (trimmed.length > 0) {
          db.exec(trimmed + ';');
        }
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists') && 
            !error.message.includes('duplicate column') &&
            !error.message.includes('no such table')) {
          // Only warn for non-expected errors
          if (!error.message.includes('PRAGMA')) {
            // PRAGMA errors are expected if already set
          }
        }
      }
    });
    console.log('✅ Database schema initialized');
  }
  
  // Run progressive output migration
  const progressiveOutputMigration = path.join(process.cwd(), 'src', 'database', 'add-progressive-output.sql');
  if (fs.existsSync(progressiveOutputMigration)) {
    console.log('📝 Running progressive output migration...');
    const migration = fs.readFileSync(progressiveOutputMigration, 'utf8');
    const statements = migration.split(';').filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));
    statements.forEach(statement => {
      try {
        const trimmed = statement.trim();
        if (trimmed.length > 0) {
          db.exec(trimmed + ';');
        }
      } catch (error) {
        if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
          console.warn('⚠️  Progressive output migration warning:', error.message);
        }
      }
    });
    console.log('✅ Progressive output migration completed');
  }
  
  // Run user tables migration
  const migrationPath = path.join(process.cwd(), 'src', 'database', 'add-users.sql');
  if (fs.existsSync(migrationPath)) {
    console.log('📝 Running user tables migration...');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration (split by semicolons for multiple statements)
    const statements = migration.split(';').filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));
    
    // Separate CREATE TABLE and CREATE INDEX statements
    const createTableStatements = [];
    const createIndexStatements = [];
    
    statements.forEach(statement => {
      const trimmed = statement.trim();
      if (trimmed.toUpperCase().startsWith('CREATE INDEX')) {
        createIndexStatements.push(trimmed);
      } else if (trimmed.length > 0) {
        createTableStatements.push(trimmed);
      }
    });
    
    // Execute CREATE TABLE statements first
    createTableStatements.forEach(statement => {
      try {
        db.exec(statement + ';');
      } catch (error) {
        // Ignore "table already exists" errors
        if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
          console.warn('⚠️  Migration warning:', error.message);
        }
      }
    });
    
    // Then execute CREATE INDEX statements
    createIndexStatements.forEach(statement => {
      try {
        db.exec(statement + ';');
      } catch (error) {
        // Ignore "index already exists" and "no such table" errors (table might not exist yet)
        if (!error.message.includes('already exists') && 
            !error.message.includes('no such table')) {
          console.warn('⚠️  Index creation warning:', error.message);
        }
      }
    });
    
    console.log('✅ User tables migration completed');
  } else {
    console.log('⚠️  Migration file not found, skipping user tables');
  }
  
  // Check if users table exists and add columns to projects if needed
  try {
    const usersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!usersTable) {
      // Create users table manually if migration didn't run
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'tester',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Users table created');
    }
  } catch (error) {
    console.warn('⚠️  Error checking users table:', error.message);
  }
  
  // Try to add columns to projects table (ignore if already exist)
  try {
    db.exec('ALTER TABLE projects ADD COLUMN user_id INTEGER');
  } catch (error) {
    // Column might already exist, ignore
  }
  
  try {
    db.exec('ALTER TABLE projects ADD COLUMN test_number INTEGER');
  } catch (error) {
    // Column might already exist, ignore
  }
  
  try {
    db.exec('ALTER TABLE projects ADD COLUMN test_category TEXT');
  } catch (error) {
    // Column might already exist, ignore
  }
  
  try {
    db.exec('ALTER TABLE projects ADD COLUMN output_version TEXT DEFAULT "v1"');
  } catch (error) {
    // Column might already exist, ignore
  }
  
  try {
    db.exec('ALTER TABLE projects ADD COLUMN output_quality_score INTEGER');
  } catch (error) {
    // Column might already exist, ignore
  }
  
  // Create test_metrics table if it doesn't exist
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER REFERENCES projects(id),
        processing_time_ms INTEGER,
        would_pay_for_this BOOLEAN,
        needs_improvement TEXT,
        output_quality_score INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Test metrics table ready');
  } catch (error) {
    console.warn('⚠️  Error creating test_metrics table:', error.message);
  }
  
  // Create test user
  console.log('\n👤 Creating test user...');
  const SimpleAuth = require('../src/modules/simple-auth');
  const auth = new SimpleAuth(db);
  
  try {
    const user = auth.createUser('test@scogen.ai', 'Test User', 'test123');
    console.log('✅ Test user created:');
    console.log('   Email: test@scogen.ai');
    console.log('   Password: test123');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Test user already exists');
    } else {
      console.warn('⚠️  Failed to create test user:', error.message);
    }
  }
  
  console.log('\n✅ Database setup complete!');
  
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
} finally {
  if (db) {
    db.close();
  }
}

// Check dependencies
console.log('\n📦 Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const dependencies = Object.keys(packageJson.dependencies || {});
  console.log(`✅ Found ${dependencies.length} dependencies`);
} catch (error) {
  console.warn('⚠️  Could not check dependencies:', error.message);
}

console.log('\n✅ Setup complete!');
console.log('\n📋 Next steps:');
console.log('   1. Run: npm start');
console.log('   2. Open: http://localhost:3000');
console.log('   3. Login with: test@scogen.ai / test123');
console.log('   4. Start testing projects!\n');

