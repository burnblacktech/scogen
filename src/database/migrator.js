/**
 * Database Migrator
 * 
 * Manages database migrations with up/down support
 */

const DatabaseManagerV2 = require('./db-manager-v2');
const fs = require('fs');
const path = require('path');
const migrationHelpers = require('./migration-helpers');

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
      console.log('[WARN] Migrations directory not found, creating...');
      fs.mkdirSync(this.migrationsPath, { recursive: true });
      return;
    }
    
    const files = fs.readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.sql') && !f.endsWith('.rollback.sql'))
      .sort();
    
    if (files.length === 0) {
      console.log('[OK] No migration files found');
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
      console.log('[OK] All migrations already executed');
    } else {
      console.log(`[OK] Executed ${executedCount} migration(s)`);
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
    const logger = { 
      info: (msg) => console.log(`  [INFO] ${msg}`),
      warn: (msg) => console.warn(`  [WARN] ${msg}`),
      error: (msg, err) => console.error(`  [ERROR] ${msg}`, err),
      debug: () => {} 
    };
    
    try {
      // Execute in transaction
      this.db.transaction(() => {
        // Handle special migrations that need programmatic column additions
        if (filename === '003_add_lifecycle_and_auth.sql' || filename === '004_complete_sync.sql') {
          // Add columns to projects table safely
          migrationHelpers.addProjectsColumns(this.db.db, logger);
          // Ensure users table has all columns
          migrationHelpers.ensureUsersTableColumns(this.db.db, logger);
        }
        
        if (filename === '002_add_intelligence_fields.sql' || filename === '004_complete_sync.sql') {
          // Add intelligence columns to features table
          migrationHelpers.addFeaturesIntelligenceColumns(this.db.db, logger);
          // Add pricing columns to functions table
          migrationHelpers.addFunctionsPricingColumns(this.db.db, logger);
        }
        
        if (filename === '004_complete_sync.sql') {
          // Ensure industry_templates has all columns
          migrationHelpers.ensureIndustryTemplatesColumns(this.db.db, logger);
        }
        
        if (filename === '006_add_pdf_error_tracking.sql') {
          // Add format column to document_generations table safely
          migrationHelpers.addColumnIfNotExists(
            this.db.db,
            'document_generations',
            'format',
            'TEXT DEFAULT "pdf"',
            logger
          );
        }
        
        // Split by semicolon and execute each statement
        // Use a more robust splitting that handles multi-line statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => {
            // Filter out empty statements and pure comments
            if (s.length === 0) return false;
            // Keep statements that have actual SQL (not just comments)
            const sqlPart = s.split('\n').filter(line => {
              const trimmed = line.trim();
              return trimmed.length > 0 && !trimmed.startsWith('--');
            }).join(' ').trim();
            return sqlPart.length > 0;
          });
        
        for (const statement of statements) {
          // Skip ALTER TABLE statements that are handled programmatically
          if (statement.toUpperCase().includes('ALTER TABLE') && 
              (statement.includes('ADD COLUMN') || statement.includes('IF NOT EXISTS'))) {
            // These are handled by migration helpers
            continue;
          }
          
          try {
            // Execute statement (add semicolon back)
            this.db.db.exec(statement + ';');
          } catch (error) {
            // Ignore "duplicate column" and "already exists" errors
            if (error.message.includes('duplicate column') || 
                error.message.includes('already exists') ||
                error.message.includes('no such column') ||
                error.message.includes('duplicate index name')) {
              logger.warn(`Skipping: ${statement.substring(0, 50)}... (already exists)`);
              continue;
            }
            // For "no such table" errors on CREATE INDEX, log but don't fail
            // (table might be created later in the migration)
            if (error.message.includes('no such table') && statement.toUpperCase().includes('CREATE INDEX')) {
              logger.warn(`Warning: Table not found for index, will retry: ${statement.substring(0, 50)}...`);
              // Don't throw, but log it - the index creation will be retried in migration 004
              continue;
            }
            throw error;
          }
        }
        
        // Record migration
        this.db.db.prepare(
          'INSERT INTO migrations (filename) VALUES (?)'
        ).run(filename);
      });
      
      console.log(`  [OK] ${filename} executed successfully`);
    } catch (error) {
      console.error(`  [ERROR] ${filename} failed:`, error.message);
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
        
        console.log(`[OK] Rolled back: ${last.filename}`);
      } catch (error) {
        console.error(`[ERROR] Rollback failed:`, error.message);
        throw error;
      }
    } else {
      console.log(`[WARN] No rollback file for ${last.filename}`);
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
      
      const status = executed ? '[OK] Executed' : '[PENDING] Pending';
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

