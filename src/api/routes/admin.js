/**
 * Admin API Routes
 * 
 * Administrative endpoints for system management
 */

const express = require('express');
const router = express.Router();

/**
 * Create admin routes
 * @param {Object} cleanupService - CleanupService instance
 * @param {Object} logger - Logger instance
 * @returns {Router} Express router
 */
function createAdminRoutes(cleanupService, logger) {
  /**
   * GET /api/v3/admin/storage-stats
   * Get storage statistics for generated PDFs
   */
  router.get('/storage-stats', async (req, res, next) => {
    try {
      if (!cleanupService) {
        return res.status(503).json({
          success: false,
          error: 'Cleanup service not available',
          code: 'SERVICE_NOT_AVAILABLE'
        });
      }

      const stats = await cleanupService.getStorageStats();

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      logger.error('Failed to get storage stats', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get storage statistics',
        code: 'STATS_ERROR'
      });
    }
  });

  /**
   * POST /api/v3/admin/cleanup
   * Manually trigger cleanup of old PDF files
   * Query params: maxAgeHours (optional, defaults to configured retention hours)
   */
  router.post('/cleanup', async (req, res, next) => {
    try {
      if (!cleanupService) {
        return res.status(503).json({
          success: false,
          error: 'Cleanup service not available',
          code: 'SERVICE_NOT_AVAILABLE'
        });
      }

      const maxAgeHours = req.query.maxAgeHours 
        ? parseInt(req.query.maxAgeHours, 10)
        : null;

      if (maxAgeHours !== null && (isNaN(maxAgeHours) || maxAgeHours < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid maxAgeHours parameter',
          code: 'INVALID_PARAMETER'
        });
      }

      logger.info('Manual cleanup triggered', {
        maxAgeHours: maxAgeHours || 'default'
      });

      // Run cleanup
      const result = await cleanupService.cleanOldFiles(maxAgeHours);

      // Get remaining stats
      const remainingStats = await cleanupService.getStorageStats();

      res.json({
        success: true,
        deleted: {
          fileCount: result.deletedCount,
          totalSize: result.deletedSize,
          totalSizeMB: result.deletedSizeMB,
          files: result.deletedFiles
        },
        remaining: {
          fileCount: remainingStats.totalFiles,
          totalSize: remainingStats.totalSize,
          totalSizeMB: remainingStats.totalSizeMB
        }
      });

    } catch (error) {
      logger.error('Manual cleanup failed', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to run cleanup',
        code: 'CLEANUP_ERROR'
      });
    }
  });

  return router;
}

module.exports = createAdminRoutes;

