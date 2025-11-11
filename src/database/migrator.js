/**
 * Database Migrator
 * 
 * Manages database migrations with up/down support
 */

const DatabaseManagerV2 = require('./db-manager-v2');
const fs = require('fs');
const path = require('path');

class DatabaseMigrator {
  constructor(dbPath = null) {
    this.db = new DatabaseManagerV2(dbPath);
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  /**
   * Initialize migrator and migrations table
   */
  async initialize() {
    this.db.initialize();
    
    // Create migrations table if it doesn't exist
    const createMigrationsTable = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    try {
      this.db.db.exec(createMigrationsTable);
    } catch (error) {
      // Table might already exist, that's okay
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  /**
   * Run pending migrations
   */
  async migrate() {
    await this.initialize();
    
    // Get executed migrations
    const executed = this.db.db.prepare('SELECT filename FROM migrations').all();
    const executedFiles = new Set(executed.map(m => m.filename));
    
    // Get migration files
    if (!fs.existsSync(this.migrationsPath)) {
      console.log('⚠️ Migrations directory not found, creating...');
      fs.mkdirSync(this.migrationsPath, { recursive: true });
      return;
    }
    
    const files = fs.readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.sql') && !f.endsWith('.rollback.sql'))
      .sort();
    
    if (files.length === 0) {
      console.log('✅ No migration files found');
      return;
    }
    
    // Execute pending migrations
    let executedCount = 0;
    for (const file of files) {
      if (!executedFiles.has(file)) {
        console.log(`Running migration: ${file}`);
        await this.executeMigration(file);
        executedCount++;
      } else {
        console.log(`Skipping already executed: ${file}`);
      }
    }
    
    if (executedCount === 0) {
      console.log('✅ All migrations already executed');
    } else {
      console.log(`✅ Executed ${executedCount} migration(s)`);
    }
    
    this.db.close();
  }

  /**
   * Execute a single migration
   */
  async executeMigration(filename) {
    const filepath = path.join(this.migrationsPath, filename);
    
    if (!fs.existsSync(filepath)) {
      throw new Error(`Migration file not found: ${filename}`);
    }
    
    const sql = fs.readFileSync(filepath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    try {
      // Execute in transaction
      this.db.transaction(() => {
        for (const statement of statements) {
          this.db.db.exec(statement + ';');
        }
        
        // Record migration
        this.db.db.prepare(
          'INSERT INTO migrations (filename) VALUES (?)'
        ).run(filename);
      });
      
      console.log(`  ✅ ${filename} executed successfully`);
    } catch (error) {
      console.error(`  ❌ ${filename} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Rollback last migration
   */
  async rollback() {
    await this.initialize();
    
    // Get last migration
    const last = this.db.db.prepare(
      'SELECT filename FROM migrations ORDER BY id DESC LIMIT 1'
    ).get();
    
    if (!last) {
      console.log('No migrations to rollback');
      this.db.close();
      return;
    }
    
    // Check if rollback file exists
    const rollbackFile = last.filename.replace('.sql', '.rollback.sql');
    const rollbackPath = path.join(this.migrationsPath, rollbackFile);
    
    if (fs.existsSync(rollbackPath)) {
      const sql = fs.readFileSync(rollbackPath, 'utf8');
      
      try {
        this.db.transaction(() => {
          // Execute rollback SQL
          const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
          
          for (const statement of statements) {
            this.db.db.exec(statement + ';');
          }
          
          // Remove migration record
          this.db.db.prepare('DELETE FROM migrations WHERE filename = ?').run(last.filename);
        });
        
        console.log(`✅ Rolled back: ${last.filename}`);
      } catch (error) {
        console.error(`❌ Rollback failed:`, error.message);
        throw error;
      }
    } else {
      console.log(`⚠️ No rollback file for ${last.filename}`);
    }
    
    this.db.close();
  }

  /**
   * List migration status
   */
  async status() {
    await this.initialize();
    
    const executed = this.db.db.prepare('SELECT filename, executed_at FROM migrations ORDER BY id').all();
    const executedFiles = new Set(executed.map(m => m.filename));
    
    if (!fs.existsSync(this.migrationsPath)) {
      console.log('No migrations directory');
      this.db.close();
      return;
    }
    
    const files = fs.readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.sql') && !f.endsWith('.rollback.sql'))
      .sort();
    
    console.log('\nMigration Status:');
    console.log('==================\n');
    
    for (const file of files) {
      const executed = executedFiles.has(file);
      const execInfo = executed ? 
        executed.find(e => e.filename === file) : null;
      
      const status = executed ? '✅ Executed' : '⏳ Pending';
      const date = execInfo ? ` (${execInfo.executed_at})` : '';
      
      console.log(`${status}: ${file}${date}`);
    }
    
    this.db.close();
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2] || 'status';
  const migrator = new DatabaseMigrator(process.env.NEW_DB_PATH || null);
  
  switch(command) {
    case 'up':
      migrator.migrate().catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
      break;
      
    case 'down':
      migrator.rollback().catch(error => {
        console.error('Rollback failed:', error);
        process.exit(1);
      });
      break;
      
    case 'status':
      migrator.status().catch(error => {
        console.error('Status check failed:', error);
        process.exit(1);
      });
      break;
      
    default:
      console.log('Usage: node migrator.js [up|down|status]');
      process.exit(1);
  }
}

module.exports = DatabaseMigrator;

