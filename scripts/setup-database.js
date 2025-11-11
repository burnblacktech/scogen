#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * Sets up the enhanced database V2:
 * 1. Creates necessary directories
 * 2. Initializes database connection
 * 3. Runs migrations
 * 4. Seeds initial data (optional)
 */

const DatabaseManagerV2 = require('../src/database/db-manager-v2');
const DatabaseMigrator = require('../src/database/migrator');
const seedDatabase = require('../src/database/seeds/seed');
const path = require('path');
const fs = require('fs');

async function setupDatabase() {
  console.log('🔧 Setting up Enhanced Database V2...\n');
  
  try {
    // Step 1: Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('✅ Created data directory:', dataDir);
    } else {
      console.log('✅ Data directory exists:', dataDir);
    }
    
    // Step 2: Initialize database
    console.log('\n📊 Initializing database...');
    const db = new DatabaseManagerV2();
    db.initialize();
    console.log('✅ Database initialized');
    
    // Step 3: Run migrations
    console.log('\n🔄 Running migrations...');
    const migrator = new DatabaseMigrator();
    await migrator.migrate();
    console.log('✅ Migrations completed');
    
    // Step 4: Seed data (optional, based on flag)
    if (process.argv.includes('--seed') || process.env.SEED_DATABASE === 'true') {
      console.log('\n🌱 Seeding database...');
      await seedDatabase();
      console.log('✅ Database seeded');
    } else {
      console.log('\n💡 Tip: Run with --seed flag to populate test data');
    }
    
    // Step 5: Verify setup
    console.log('\n🔍 Verifying setup...');
    const tables = db.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`   - ${table.name}`);
    });
    
    // Close connection
    db.close();
    
    console.log('\n✅ Database setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Set USE_NEW_DB=true in .env to enable new database');
    console.log('   2. Restart the server');
    console.log('   3. Database will be used automatically when enabled');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run setup
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;

