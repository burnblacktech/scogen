/**
 * Cleanup Service
 * 
 * Automatically removes old PDF files from the /generated directory
 * Updates database records and provides storage statistics
 */

const fs = require('fs').promises;
const path = require('path');

class CleanupService {
  constructor(logger, db, options = {}) {
    this.logger = logger || console;
    this.db = db;
    this.generatedDir = options.generatedDir || path.join(process.cwd(), 'generated');
    this.retentionHours = options.retentionHours || 24;
    this.cleanupIntervalHours = options.cleanupIntervalHours || 1;
    this.cleanupInterval = null;
  }

  /**
   * Clean old files from generated directory
   * @param {number} maxAgeHours - Maximum age in hours (default: from config)
   * @returns {Promise<Object>} Cleanup statistics
   */
  async cleanOldFiles(maxAgeHours = null) {
    const maxAge = (maxAgeHours || this.retentionHours) * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();
    
    let deletedCount = 0;
    let deletedSize = 0;
    const deletedFiles = [];
    
    try {
      // Ensure directory exists
      try {
        await fs.access(this.generatedDir);
      } catch (error) {
        // Directory doesn't exist, create it
        await fs.mkdir(this.generatedDir, { recursive: true });
        this.logger.info('Created generated directory', { path: this.generatedDir });
        return { deletedCount: 0, deletedSize: 0, deletedFiles: [] };
      }

      // Read directory
      const files = await fs.readdir(this.generatedDir);
      
      this.logger.debug('Scanning generated directory', {
        fileCount: files.length,
        maxAgeHours: maxAgeHours || this.retentionHours
      });

      for (const file of files) {
        // Only process PDF files
        if (!file.endsWith('.pdf')) {
          continue;
        }

        const filePath = path.join(this.generatedDir, file);
        
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;
          
          if (age > maxAge) {
            try {
              // Delete file
              await fs.unlink(filePath);
              deletedCount++;
              deletedSize += stats.size;
              deletedFiles.push(file);
              
              // Update database record
              this.updateDatabaseRecord(file);
              
              this.logger.debug('Deleted old file', {
                file,
                ageHours: (age / (60 * 60 * 1000)).toFixed(2),
                sizeMB: (stats.size / 1024 / 1024).toFixed(2)
              });
            } catch (deleteError) {
              this.logger.warn('Failed to delete file', {
                file,
                error: deleteError.message
              });
            }
          }
        } catch (statError) {
          this.logger.warn('Failed to stat file', {
            file,
            error: statError.message
          });
        }
      }
      
      if (deletedCount > 0) {
        this.logger.info('Cleanup completed', {
          deletedCount,
          deletedSizeMB: (deletedSize / 1024 / 1024).toFixed(2),
          retentionHours: maxAgeHours || this.retentionHours
        });
      } else {
        this.logger.debug('No files to clean up', {
          scannedFiles: files.filter(f => f.endsWith('.pdf')).length
        });
      }
      
      return {
        deletedCount,
        deletedSize,
        deletedSizeMB: (deletedSize / 1024 / 1024).toFixed(2),
        deletedFiles
      };
    } catch (error) {
      this.logger.error('Cleanup failed', {
        error: error.message,
        stack: error.stack
      });
      // Don't throw - cleanup failures shouldn't crash the server
      return {
        deletedCount: 0,
        deletedSize: 0,
        deletedFiles: [],
        error: error.message
      };
    }
  }

  /**
   * Update database record for deleted file
   * @param {string} fileName - Name of the deleted file
   * @returns {boolean} Success status
   */
  updateDatabaseRecord(fileName) {
    if (!this.db) {
      this.logger.debug('Database not available, skipping record update', { fileName });
      return false;
    }

    try {
      // Update document_generations table
      // Match by filename in pdf_path
      const stmt = this.db.prepare(`
        UPDATE document_generations 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE pdf_path LIKE ? AND deleted_at IS NULL
      `);
      
      const result = stmt.run(`%${fileName}`);
      
      if (result.changes > 0) {
        this.logger.debug('Updated database record', {
          fileName,
          updatedRows: result.changes
        });
      }
      
      return result.changes > 0;
    } catch (error) {
      this.logger.warn('Failed to update database record', {
        fileName,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Schedule periodic cleanup
   * @param {number} intervalHours - Interval in hours (default: from config)
   */
  scheduleCleanup(intervalHours = null) {
    const interval = (intervalHours || this.cleanupIntervalHours) * 60 * 60 * 1000; // Convert to milliseconds
    
    // Stop existing interval if any
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup immediately on schedule start
    this.cleanOldFiles().catch(error => {
      this.logger.error('Initial cleanup failed', { error: error.message });
    });

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanOldFiles().catch(error => {
        this.logger.error('Scheduled cleanup failed', { error: error.message });
      });
    }, interval);

    this.logger.info('Cleanup scheduled', {
      intervalHours: intervalHours || this.cleanupIntervalHours,
      retentionHours: this.retentionHours
    });
  }

  /**
   * Stop scheduled cleanup
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.info('Cleanup service stopped');
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    try {
      // Ensure directory exists
      try {
        await fs.access(this.generatedDir);
      } catch (error) {
        return {
          totalFiles: 0,
          totalSize: 0,
          totalSizeMB: 0,
          filesByAge: {
            '0-1h': 0,
            '1-6h': 0,
            '6-24h': 0,
            '>24h': 0
          },
          oldestFile: null,
          newestFile: null
        };
      }

      const files = await fs.readdir(this.generatedDir);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));
      
      let totalSize = 0;
      const filesByAge = {
        '0-1h': 0,
        '1-6h': 0,
        '6-24h': 0,
        '>24h': 0
      };
      
      let oldestFile = null;
      let newestFile = null;
      const now = Date.now();
      
      for (const file of pdfFiles) {
        const filePath = path.join(this.generatedDir, file);
        
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;
          const ageHours = age / (60 * 60 * 1000);
          
          totalSize += stats.size;
          
          // Categorize by age
          if (ageHours < 1) {
            filesByAge['0-1h']++;
          } else if (ageHours < 6) {
            filesByAge['1-6h']++;
          } else if (ageHours < 24) {
            filesByAge['6-24h']++;
          } else {
            filesByAge['>24h']++;
          }
          
          // Track oldest and newest
          const mtime = stats.mtimeMs;
          if (!oldestFile || mtime < oldestFile.mtime) {
            oldestFile = { file, mtime };
          }
          if (!newestFile || mtime > newestFile.mtime) {
            newestFile = { file, mtime };
          }
        } catch (statError) {
          this.logger.warn('Failed to stat file for stats', {
            file,
            error: statError.message
          });
        }
      }
      
      return {
        totalFiles: pdfFiles.length,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        filesByAge,
        oldestFile: oldestFile ? new Date(oldestFile.mtime).toISOString() : null,
        newestFile: newestFile ? new Date(newestFile.mtime).toISOString() : null
      };
    } catch (error) {
      this.logger.error('Failed to get storage stats', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = CleanupService;

