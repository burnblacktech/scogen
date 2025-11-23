/**
 * Apply Precision Pivot Migration
 * 
 * Applies the precision pivot database migration
 */

const DatabaseManagerV2 = require('../src/database/db-manager-v2');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
    try {
        console.log('🔄 Applying Precision Pivot migration...');
        
        // Initialize database
        const dbm = new DatabaseManagerV2();
        dbm.initialize();
        
        // Read migration file
        const migrationPath = path.join(__dirname, '../src/database/add-precision-pivot-tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration - use exec for multi-statement SQL
        try {
            dbm.db.exec(migrationSQL);
        } catch (error) {
            // If error is about existing table/column, that's okay
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate column')) {
                console.log(`⏭️  Some tables/columns already exist, continuing...`);
            } else {
                throw error;
            }
        }
        
        // Add precision columns to projects table (SQLite-safe)
        const addPrecisionColumns = require('../src/database/add-precision-columns');
        addPrecisionColumns(dbm.db);
        
        console.log('✅ Migration applied successfully!');
        
        // Verify tables were created
        const tables = dbm.db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('features', 'functions', 'components', 'cost_estimates', 'sprint_plans')
        `).all();
        
        console.log(`✅ Created ${tables.length} new tables:`);
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });
        
        dbm.close();
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    applyMigration();
}

module.exports = applyMigration;

