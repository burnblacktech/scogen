const ConfigManager = require('./utils/config-manager');
const Logger = require('./utils/logger');
const Database = require('./modules/database');
const Library = require('./modules/library');
const BackupService = require('./modules/backup-service');

/**
 * Initialize all modules in correct dependency order
 * CRITICAL: This order must be maintained
 */
function initializeSystem() {
  const chalk = require('chalk');
  
  console.log(chalk.blue('🚀 Initializing Scogen...\n'));

  // 1. Config (no dependencies)
  console.log('Loading configuration...');
  const config = new ConfigManager();
  const validation = config.validate();
  
  if (!validation.valid) {
    console.error(chalk.red('Configuration errors:'));
    validation.errors.forEach(err => console.error(chalk.red(`  - ${err}`)));
    process.exit(1);
  }

  // 2. Logger (depends: Config)
  console.log('Starting logger...');
  const logger = new Logger(config);
  logger.info('Scogen starting', { version: require('../package.json').version });

  // 3. Database (depends: Logger)
  console.log('Initializing database...');
  const dbPath = config.get('database.path');
  const db = new Database(dbPath, logger);

  // 4. Backup Service (depends: Database path, Logger)
  console.log('Starting backup service...');
  const backup = new BackupService(dbPath, logger);
  
  // Auto-backup on startup
  backup.backup();

  // 5. Library (depends: Database, Logger, Config)
  console.log('Loading domain library...');
  const library = new Library(db, logger, config);

  console.log(chalk.green('✓ Core system initialized\n'));

  return {
    config,
    logger,
    db,
    backup,
    library
  };
}

module.exports = { initializeSystem };

