const fs = require('fs');
const path = require('path');
const os = require('os');

class BackupService {
  constructor(dbPath, logger) {
    this.dbPath = dbPath;
    this.logger = logger;
    this.backupDir = path.join(os.homedir(), '.scogen', 'backups');
    this.maxBackups = 30; // Keep last 30 backups
    
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  backup() {
    try {
      // Skip backup if database doesn't exist yet
      if (!fs.existsSync(this.dbPath)) {
        this.logger.info('Database not found, skipping backup');
        return { success: true, skipped: true };
      }

      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupPath = path.join(this.backupDir, `scopes-${timestamp}.db`);
      
      // Copy database file
      fs.copyFileSync(this.dbPath, backupPath);
      
      this.logger.info('Database backed up', { backupPath });
      
      // Cleanup old backups
      this.cleanupOldBackups();
      
      return { success: true, path: backupPath };
    } catch (error) {
      this.logger.error('Backup failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('scopes-') && f.endsWith('.db'))
        .map(f => ({
          name: f,
          path: path.join(this.backupDir, f),
          time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Newest first

      // Delete old backups beyond maxBackups
      if (files.length > this.maxBackups) {
        files.slice(this.maxBackups).forEach(file => {
          fs.unlinkSync(file.path);
          this.logger.info('Old backup deleted', { file: file.name });
        });
      }
    } catch (error) {
      this.logger.warn('Backup cleanup failed', { error: error.message });
    }
  }
}

module.exports = BackupService;

