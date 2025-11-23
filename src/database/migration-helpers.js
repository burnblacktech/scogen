// src/database/migration-helpers.js
// Helper functions for safe database migrations in SQLite

/**
 * Check if a column exists in a table
 * @param {Object} db - Database instance
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @returns {boolean} True if column exists
 */
function columnExists(db, tableName, columnName) {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return tableInfo.some(col => col.name === columnName);
  } catch (error) {
    // Table doesn't exist
    return false;
  }
}

/**
 * Check if a table exists
 * @param {Object} db - Database instance
 * @param {string} tableName - Table name
 * @returns {boolean} True if table exists
 */
function tableExists(db, tableName) {
  try {
    const result = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).get(tableName);
    return !!result;
  } catch (error) {
    return false;
  }
}

/**
 * Safely add a column to a table if it doesn't exist
 * @param {Object} db - Database instance
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @param {string} columnDefinition - Column definition (e.g., "TEXT", "INTEGER DEFAULT 0")
 * @param {Object} logger - Logger instance
 * @returns {boolean} True if column was added, false if it already existed
 */
function addColumnIfNotExists(db, tableName, columnName, columnDefinition, logger) {
  if (columnExists(db, tableName, columnName)) {
    if (logger) {
      logger.debug(`[MIGRATION] Column ${tableName}.${columnName} already exists, skipping`);
    }
    return false;
  }

  try {
    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;
    db.exec(sql);
    if (logger) {
      logger.info(`[MIGRATION] Added column ${tableName}.${columnName}`);
    }
    return true;
  } catch (error) {
    if (logger) {
      logger.error(`[ERROR] Failed to add column ${tableName}.${columnName}`, error);
    }
    throw error;
  }
}

/**
 * Add multiple columns to projects table safely
 * @param {Object} db - Database instance
 * @param {Object} logger - Logger instance
 */
function addProjectsColumns(db, logger) {
  const columns = [
    { name: 'created_by', definition: 'INTEGER REFERENCES users(id)' },
    { name: 'last_updated_by', definition: 'INTEGER REFERENCES users(id)' },
    { name: 'company_name', definition: 'TEXT' },
    { name: 'project_status', definition: 'TEXT DEFAULT "scoping"' }
  ];

  let added = 0;
  for (const col of columns) {
    if (addColumnIfNotExists(db, 'projects', col.name, col.definition, logger)) {
      added++;
    }
  }

  // Map existing 'status' column to 'project_status' if needed
  if (columnExists(db, 'projects', 'status') && !columnExists(db, 'projects', 'project_status')) {
    try {
      // Copy status values to project_status
      db.exec(`
        UPDATE projects 
        SET project_status = status 
        WHERE project_status IS NULL
      `);
      if (logger) {
        logger.info('[MIGRATION] Mapped status column to project_status');
      }
    } catch (error) {
      if (logger) {
        logger.warn('[WARN] Could not map status to project_status', error);
      }
    }
  }

  if (logger && added > 0) {
    logger.info(`[MIGRATION] Added ${added} column(s) to projects table`);
  }
}

/**
 * Add intelligence columns to features table safely
 * @param {Object} db - Database instance
 * @param {Object} logger - Logger instance
 */
function addFeaturesIntelligenceColumns(db, logger) {
  if (!tableExists(db, 'features')) {
    // Table doesn't exist yet, will be created by migration
    return;
  }

  const columns = [
    { name: 'functional_complexity', definition: 'REAL DEFAULT 3.0' },
    { name: 'technical_complexity', definition: 'REAL DEFAULT 3.0' },
    { name: 'integration_complexity', definition: 'REAL DEFAULT 3.0' },
    { name: 'data_complexity', definition: 'REAL DEFAULT 3.0' },
    { name: 'business_complexity', definition: 'REAL DEFAULT 3.0' },
    { name: 'overall_complexity', definition: 'REAL DEFAULT 3.0' },
    { name: 'calculated_hours', definition: 'REAL' },
    { name: 'confidence_score', definition: 'REAL' },
    { name: 'complexity_factors', definition: 'TEXT' }
  ];

  let added = 0;
  for (const col of columns) {
    if (addColumnIfNotExists(db, 'features', col.name, col.definition, logger)) {
      added++;
    }
  }

  if (logger && added > 0) {
    logger.info(`[MIGRATION] Added ${added} intelligence column(s) to features table`);
  }
}

/**
 * Add dynamic pricing columns to functions table safely
 * @param {Object} db - Database instance
 * @param {Object} logger - Logger instance
 */
function addFunctionsPricingColumns(db, logger) {
  if (!tableExists(db, 'functions')) {
    // Table doesn't exist yet, will be created by migration
    return;
  }

  const columns = [
    { name: 'complexity_score', definition: 'REAL' },
    { name: 'base_hours', definition: 'REAL' },
    { name: 'adjusted_hours', definition: 'REAL' },
    { name: 'hourly_rate', definition: 'REAL' },
    { name: 'rate_factors', definition: 'TEXT' }
  ];

  let added = 0;
  for (const col of columns) {
    if (addColumnIfNotExists(db, 'functions', col.name, col.definition, logger)) {
      added++;
    }
  }

  if (logger && added > 0) {
    logger.info(`[MIGRATION] Added ${added} pricing column(s) to functions table`);
  }
}

/**
 * Ensure users table has all required columns
 * @param {Object} db - Database instance
 * @param {Object} logger - Logger instance
 */
function ensureUsersTableColumns(db, logger) {
  if (!tableExists(db, 'users')) {
    // Table doesn't exist, will be created by migration
    return;
  }

  const columns = [
    { name: 'company_name', definition: 'TEXT' },
    { name: 'role', definition: 'TEXT DEFAULT "user"' },
    { name: 'token', definition: 'TEXT' },
    { name: 'last_login', definition: 'DATETIME' }
    // Note: updated_at cannot be added with DEFAULT CURRENT_TIMESTAMP via ALTER TABLE in SQLite
    // It will be handled by triggers or application code
  ];

  let added = 0;
  for (const col of columns) {
    if (addColumnIfNotExists(db, 'users', col.name, col.definition, logger)) {
      added++;
    }
  }

  // Try to add updated_at without default (SQLite limitation)
  if (!columnExists(db, 'users', 'updated_at')) {
    try {
      db.exec('ALTER TABLE users ADD COLUMN updated_at DATETIME');
      if (logger) {
        logger.info('[MIGRATION] Added column users.updated_at (without default - SQLite limitation)');
      }
      added++;
    } catch (error) {
      if (logger) {
        logger.warn(`[WARN] Could not add updated_at column: ${error.message}`);
      }
    }
  }

  if (logger && added > 0) {
    logger.info(`[MIGRATION] Added ${added} column(s) to users table`);
  }
}

/**
 * Add missing columns to industry_templates table if needed
 * @param {Object} db - Database instance
 * @param {Object} logger - Logger instance
 */
function ensureIndustryTemplatesColumns(db, logger) {
  if (!tableExists(db, 'industry_templates')) {
    return;
  }

  const columns = [
    { name: 'description', definition: 'TEXT' },
    { name: 'optional_features', definition: 'TEXT' },
    { name: 'compliance_requirements', definition: 'TEXT' },
    { name: 'standard_integrations', definition: 'TEXT' },
    { name: 'typical_team_size', definition: 'INTEGER' },
    { name: 'updated_at', definition: 'DATETIME' }
  ];

  let added = 0;
  for (const col of columns) {
    if (addColumnIfNotExists(db, 'industry_templates', col.name, col.definition, logger)) {
      added++;
    }
  }

  if (logger && added > 0) {
    logger.info(`[MIGRATION] Added ${added} column(s) to industry_templates table`);
  }
}

module.exports = {
  columnExists,
  tableExists,
  addColumnIfNotExists,
  addProjectsColumns,
  addFeaturesIntelligenceColumns,
  addFunctionsPricingColumns,
  ensureUsersTableColumns,
  ensureIndustryTemplatesColumns
};

