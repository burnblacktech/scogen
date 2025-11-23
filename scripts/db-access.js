// scripts/db-access.js
// Database access utility - Query and inspect database

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

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

console.log('========================================');
console.log('SCOGEN DATABASE ACCESS');
console.log('========================================');
console.log(`Database: ${dbPath}`);
console.log(`Size: ${(fs.statSync(dbPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log('========================================\n');

// Command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'db> '
});

console.log('Available commands:');
console.log('  .tables          - List all tables');
console.log('  .schema [table] - Show table schema');
console.log('  .count [table]  - Count rows in table');
console.log('  .users          - List all users');
console.log('  .projects       - List all projects');
console.log('  .features       - List all features');
console.log('  .templates      - List industry templates');
console.log('  .indexes        - List all indexes');
console.log('  .help           - Show this help');
console.log('  .exit           - Exit');
console.log('\nOr enter SQL query directly\n');

rl.prompt();

rl.on('line', (line) => {
  const input = line.trim();
  
  if (!input) {
    rl.prompt();
    return;
  }
  
  if (input === '.exit' || input === '.quit') {
    db.close();
    rl.close();
    return;
  }
  
  if (input === '.help') {
    console.log('\nAvailable commands:');
    console.log('  .tables          - List all tables');
    console.log('  .schema [table]  - Show table schema');
    console.log('  .count [table]   - Count rows in table');
    console.log('  .users           - List all users');
    console.log('  .projects        - List all projects');
    console.log('  .features        - List all features');
    console.log('  .templates       - List industry templates');
    console.log('  .indexes         - List all indexes');
    console.log('  .help            - Show this help');
    console.log('  .exit            - Exit');
    console.log('\nOr enter SQL query directly\n');
    rl.prompt();
    return;
  }
  
  if (input === '.tables') {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    console.log('\nTables:');
    tables.forEach(t => console.log(`  - ${t.name}`));
    console.log('');
    rl.prompt();
    return;
  }
  
  if (input.startsWith('.schema ')) {
    const tableName = input.substring(8).trim();
    if (!tableName) {
      console.log('Usage: .schema <table_name>');
      rl.prompt();
      return;
    }
    try {
      const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
      console.log(`\nSchema for ${tableName}:`);
      schema.forEach(col => {
        console.log(`  ${col.name.padEnd(25)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      });
      console.log('');
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    rl.prompt();
    return;
  }
  
  if (input.startsWith('.count ')) {
    const tableName = input.substring(7).trim();
    if (!tableName) {
      console.log('Usage: .count <table_name>');
      rl.prompt();
      return;
    }
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
      console.log(`\n${tableName}: ${count.count} rows\n`);
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    rl.prompt();
    return;
  }
  
  if (input === '.users') {
    const users = db.prepare('SELECT id, email, name, role, created_at FROM users').all();
    console.log('\nUsers:');
    console.table(users);
    console.log('');
    rl.prompt();
    return;
  }
  
  if (input === '.projects') {
    const projects = db.prepare('SELECT id, project_code, project_name, status, created_at FROM projects LIMIT 20').all();
    console.log('\nProjects (first 20):');
    console.table(projects);
    console.log('');
    rl.prompt();
    return;
  }
  
  if (input === '.features') {
    const features = db.prepare('SELECT id, feature_name, feature_category, overall_complexity FROM features LIMIT 20').all();
    console.log('\nFeatures (first 20):');
    console.table(features);
    console.log('');
    rl.prompt();
    return;
  }
  
  if (input === '.templates') {
    const templates = db.prepare('SELECT id, industry_name, template_name, times_used FROM industry_templates').all();
    console.log('\nIndustry Templates:');
    console.table(templates);
    console.log('');
    rl.prompt();
    return;
  }
  
  if (input === '.indexes') {
    const indexes = db.prepare(`
      SELECT name, tbl_name FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `).all();
    console.log('\nIndexes:');
    indexes.forEach(idx => console.log(`  ${idx.tbl_name.padEnd(25)} ${idx.name}`));
    console.log('');
    rl.prompt();
    return;
  }
  
  // Execute SQL query
  try {
    const stmt = db.prepare(input);
    if (input.toUpperCase().trim().startsWith('SELECT')) {
      const results = stmt.all();
      if (results.length === 0) {
        console.log('\n(0 rows)\n');
      } else {
        console.log('');
        console.table(results);
        console.log(`\n(${results.length} row(s))\n`);
      }
    } else {
      const result = stmt.run();
      console.log(`\nQuery executed. Rows affected: ${result.changes}\n`);
    }
  } catch (error) {
    console.log(`\nError: ${error.message}\n`);
  }
  
  rl.prompt();
});

rl.on('close', () => {
  db.close();
  console.log('\nDatabase connection closed. Goodbye!');
  process.exit(0);
});

