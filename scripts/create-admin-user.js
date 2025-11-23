// scripts/create-admin-user.js
// Create default admin user if it doesn't exist

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Find database file
const possiblePaths = [
  process.env.DATABASE_PATH,
  process.env.NEW_DB_PATH,
  path.join(__dirname, '../scogen-v2.db'),
  path.join(process.cwd(), 'scogen-v2.db'),
  path.join(__dirname, '../database.db'),
  path.join(process.cwd(), 'database.db')
].filter(Boolean);

let dbPath = null;
for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    dbPath = possiblePath;
    break;
  }
}

if (!dbPath) {
  console.error('[ERROR] Database file not found');
  console.log('Please run migrations first: npm run db:migrate');
  process.exit(1);
}

const db = new Database(dbPath);

console.log('Creating default admin user...\n');
console.log(`Database: ${dbPath}\n`);

// Check if admin user already exists
const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@scogen.io');

if (existingAdmin) {
  console.log('✅ Admin user already exists:');
  console.log(`   Email: ${existingAdmin.email}`);
  console.log(`   Name: ${existingAdmin.name || 'N/A'}`);
  console.log(`   Role: ${existingAdmin.role || 'N/A'}`);
  console.log(`   ID: ${existingAdmin.id}`);
  db.close();
  process.exit(0);
}

// Check if ID 1 is already taken
const id1User = db.prepare('SELECT * FROM users WHERE id = ?').get(1);
let adminId = 1;
if (id1User) {
  // Find next available ID
  const maxId = db.prepare('SELECT MAX(id) as max_id FROM users').get();
  adminId = (maxId.max_id || 0) + 1;
  console.log(`⚠️  ID 1 is taken, using ID ${adminId} instead`);
}

// Create password hash (sha256 of 'admin123')
const password = 'admin123';
const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

try {
  // Insert admin user
  const result = db.prepare(`
    INSERT INTO users (id, email, name, password_hash, role, token)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    adminId,
    'admin@scogen.io',
    'Admin User',
    passwordHash,
    'admin',
    'default-admin-token-change-this-in-production'
  );

  console.log('✅ Admin user created successfully!');
  console.log(`   User ID: ${result.lastInsertRowid}`);
  console.log(`   Email: admin@scogen.io`);
  console.log(`   Password: admin123`);
  console.log(`   Role: admin`);
  console.log('\n⚠️  IMPORTANT: Change the default password and token in production!');
  
  // Verify it was created
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@scogen.io');
  if (admin) {
    console.log('\n✅ Verification: Admin user found in database');
    console.log(`   Verified ID: ${admin.id}`);
  } else {
    console.log('\n⚠️  Warning: Admin user not found after creation');
  }
} catch (error) {
  if (error.message.includes('UNIQUE constraint failed')) {
    console.log('⚠️  Admin user already exists (UNIQUE constraint)');
    // Try to find it
    const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@scogen.io');
    if (admin) {
      console.log('✅ Found existing admin user:');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Email: ${admin.email}`);
    }
  } else {
    console.error(`[ERROR] Failed to create admin user: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

db.close();

