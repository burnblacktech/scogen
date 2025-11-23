// scripts/verify-db-sync.js
// Verify database schema synchronization

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Find database file
// Check for scogen-v2.db first (new database), then fall back to database.db
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

if (!fs.existsSync(dbPath)) {
  console.error(`[ERROR] Database file not found: ${dbPath}`);
  console.log('Please run migrations first: npm run db:migrate');
  process.exit(1);
}

const db = new Database(dbPath);

console.log('🔍 Verifying database sync...\n');
console.log(`Database: ${dbPath}\n`);

// Required tables
const requiredTables = [
  'users',
  'projects',
  'features',
  'functions',
  'project_actuals',
  'estimation_patterns',
  'components',
  'component_usage',
  'industry_templates',
  'feature_dependencies',
  'sprint_plans',
  'cost_estimates',
  'project_state_logs',
  'learning_metrics',
  'user_sessions'
];

// Get existing tables
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`).all();

const existingTables = tables.map(t => t.name);

console.log(`✅ Existing tables: ${existingTables.length}`);
console.log(`📋 Required tables: ${requiredTables.length}\n`);

// Check for missing tables
const missing = requiredTables.filter(t => !existingTables.includes(t));
if (missing.length > 0) {
  console.log('❌ Missing tables:');
  missing.forEach(t => console.log(`   - ${t}`));
} else {
  console.log('✅ All required tables exist!\n');
}

// Check for extra tables (not required but okay)
const extra = existingTables.filter(t => !requiredTables.includes(t) && !t.startsWith('sqlite_'));
if (extra.length > 0) {
  console.log(`ℹ️  Additional tables found: ${extra.length}`);
  extra.forEach(t => console.log(`   - ${t}`));
  console.log('');
}

// Check indexes
const indexes = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='index' AND name NOT LIKE 'sqlite_%'
`).all();

console.log(`✅ Indexes created: ${indexes.length}`);

// Check critical indexes
const criticalIndexes = [
  'idx_users_email',
  'idx_projects_status',
  'idx_features_project',
  'idx_project_actuals_project',
  'idx_project_state_logs_project'
];

const existingIndexNames = indexes.map(i => i.name);
const missingIndexes = criticalIndexes.filter(idx => !existingIndexNames.includes(idx));

if (missingIndexes.length > 0) {
  console.log(`⚠️  Missing critical indexes: ${missingIndexes.length}`);
  missingIndexes.forEach(idx => console.log(`   - ${idx}`));
} else {
  console.log('✅ All critical indexes exist!\n');
}

// Check default data
console.log('📊 Checking default data...\n');

const adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@scogen.io');
if (adminUser) {
  console.log('✅ Default admin user found');
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Name: ${adminUser.name || 'N/A'}`);
  console.log(`   Role: ${adminUser.role || 'N/A'}`);
  console.log(`   ID: ${adminUser.id}`);
} else {
  console.log('⚠️  Default admin user not found');
  console.log('   Run: node scripts/create-admin-user.js');
}

const templates = db.prepare('SELECT COUNT(*) as count FROM industry_templates').get();
console.log(`✅ Industry templates: ${templates.count}`);

if (templates.count > 0) {
  const templateList = db.prepare('SELECT industry_name, template_name FROM industry_templates').all();
  templateList.forEach(t => {
    console.log(`   - ${t.industry_name}: ${t.template_name}`);
  });
}

// Check projects table columns
console.log('\n📋 Checking projects table structure...');
const projectsColumns = db.prepare('PRAGMA table_info(projects)').all();
const projectsColumnNames = projectsColumns.map(c => c.name);

const requiredProjectsColumns = [
  'id',
  'project_code',
  'project_name',
  'status',
  'created_at'
];

const optionalProjectsColumns = [
  'created_by',
  'last_updated_by',
  'company_name',
  'project_status'
];

const missingRequired = requiredProjectsColumns.filter(c => !projectsColumnNames.includes(c));
const missingOptional = optionalProjectsColumns.filter(c => !projectsColumnNames.includes(c));

if (missingRequired.length > 0) {
  console.log(`❌ Missing required columns: ${missingRequired.join(', ')}`);
} else {
  console.log('✅ All required projects columns exist');
}

if (missingOptional.length > 0) {
  console.log(`⚠️  Missing optional columns: ${missingOptional.join(', ')}`);
} else {
  console.log('✅ All optional projects columns exist');
}

// Check features table structure
if (existingTables.includes('features')) {
  console.log('\n📋 Checking features table structure...');
  const featuresColumns = db.prepare('PRAGMA table_info(features)').all();
  const featuresColumnNames = featuresColumns.map(c => c.name);
  
  const intelligenceColumns = [
    'functional_complexity',
    'technical_complexity',
    'integration_complexity',
    'overall_complexity',
    'confidence_score'
  ];
  
  const missingIntelligence = intelligenceColumns.filter(c => !featuresColumnNames.includes(c));
  
  if (missingIntelligence.length > 0) {
    console.log(`⚠️  Missing intelligence columns: ${missingIntelligence.join(', ')}`);
  } else {
    console.log('✅ All intelligence columns exist in features table');
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(50));

const allTablesExist = missing.length === 0;
const allIndexesExist = missingIndexes.length === 0;
const allColumnsExist = missingRequired.length === 0;

if (allTablesExist && allIndexesExist && allColumnsExist) {
  console.log('✅ Database is fully synchronized!');
  console.log('✅ All tables, indexes, and columns are in place');
  process.exit(0);
} else {
  console.log('⚠️  Database sync incomplete');
  if (!allTablesExist) {
    console.log(`   Missing ${missing.length} table(s)`);
  }
  if (!allIndexesExist) {
    console.log(`   Missing ${missingIndexes.length} index(es)`);
  }
  if (!allColumnsExist) {
    console.log(`   Missing ${missingRequired.length} column(s)`);
  }
  console.log('\n💡 Run migrations to fix: npm run db:migrate');
  process.exit(1);
}

