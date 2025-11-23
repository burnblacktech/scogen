const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(process.cwd(), 'scogen-v2.db');
  const db = new Database(dbPath);

  // Delete migration 005 record
  const deleteStmt = db.prepare('DELETE FROM migrations WHERE filename = ?');
  const result = deleteStmt.run('005_add_unified_flow.sql');

  console.log(`Migration 005 reset. Rows deleted: ${result.changes}`);

  db.close();
} catch (error) {
  console.error('Failed to reset migration:', error.message);
  process.exit(1);
}
