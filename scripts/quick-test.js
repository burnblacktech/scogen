const ConfigManager = require('../src/utils/config-manager');
const Logger = require('../src/utils/logger');
const Database = require('../src/modules/database');
const Library = require('../src/modules/library');
const BackupService = require('../src/modules/backup-service');

console.log('Testing system initialization...\n');

try {
  // 1. Config
  console.log('Loading configuration...');
  const config = new ConfigManager();
  const validation = config.validate();
  
  if (!validation.valid) {
    console.error('❌ Configuration errors:');
    validation.errors.forEach(err => console.error(`   - ${err}`));
    process.exit(1);
  }
  console.log('✓ Config loaded');

  // 2. Logger
  console.log('Starting logger...');
  const logger = new Logger(config);
  logger.info('Scogen starting', { version: '1.0.0' });
  console.log('✓ Logger initialized');

  // 3. Database
  console.log('Initializing database...');
  const dbPath = config.get('database.path');
  const db = new Database(dbPath, logger);
  console.log('✓ Database initialized');

  // 4. Backup Service
  console.log('Starting backup service...');
  const backup = new BackupService(dbPath, logger);
  backup.backup();
  console.log('✓ Backup service initialized');

  // 5. Library
  console.log('Loading domain library...');
  const library = new Library(db, logger, config);
  console.log('✓ Library loaded');

  console.log('\n✓ All Day 1 modules working!');
  
  // Cleanup
  db.close();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

