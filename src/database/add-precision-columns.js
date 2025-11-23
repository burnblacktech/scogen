/**
 * Add Precision Columns to Projects Table
 * 
 * SQLite-safe way to add columns (checks if they exist first)
 */

function addPrecisionColumns(db) {
    const columns = [
        { name: 'requires_gst_billing', type: 'INTEGER', default: '1' },
        { name: 'requires_compliance_check', type: 'INTEGER', default: '0' },
        { name: 'payment_terms', type: 'TEXT', default: null },
        { name: 'currency', type: 'TEXT', default: "'INR'" },
        { name: 'scope_version', type: 'INTEGER', default: '1' },
        { name: 'locked_at', type: 'DATETIME', default: null },
        { name: 'chain_result', type: 'TEXT', default: null },
        { name: 'chain_result_hash', type: 'TEXT', default: null },
        { name: 'chain_result_cached_at', type: 'DATETIME', default: null }
    ];
    
    // Get existing columns
    const tableInfo = db.prepare("PRAGMA table_info(projects)").all();
    const existingColumns = new Set(tableInfo.map(col => col.name));
    
    // Add missing columns
    columns.forEach(col => {
        if (!existingColumns.has(col.name)) {
            try {
                const defaultClause = col.default ? `DEFAULT ${col.default}` : '';
                const sql = `ALTER TABLE projects ADD COLUMN ${col.name} ${col.type} ${defaultClause}`;
                db.exec(sql);
                console.log(`✅ Added column: ${col.name}`);
            } catch (error) {
                console.warn(`⚠️ Could not add column ${col.name}:`, error.message);
            }
        } else {
            console.log(`⏭️  Column already exists: ${col.name}`);
        }
    });
}

module.exports = addPrecisionColumns;

