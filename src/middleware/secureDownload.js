/**
 * Secure Download Middleware
 * 
 * Generates and verifies JWT-signed download URLs for PDF files
 * Provides time-limited, authenticated access to generated documents
 */

const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

class SecureDownloadMiddleware {
  constructor(logger, jwtSecret) {
    this.logger = logger || console;
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.outputDir = path.join(process.cwd(), 'generated');
    
    // Warn if using default secret
    if (!process.env.JWT_SECRET && jwtSecret === 'default-secret-change-in-production') {
      this.logger.warn('Using default JWT_SECRET. Set JWT_SECRET environment variable for production.');
    }
  }

  /**
   * Generate secure download URL with JWT token
   * @param {string} fileName - Name of the file to download
   * @param {string|null} userId - User ID (optional, can be null for public downloads)
   * @param {number} expiresIn - Expiry time in milliseconds (default: 1 hour)
   * @returns {Object} Object with secureUrl and expiresAt
   */
  generateSecureUrl(fileName, userId = null, expiresIn = 3600000) {
    try {
      // Validate fileName to prevent directory traversal
      const sanitizedFileName = path.basename(fileName);
      if (sanitizedFileName !== fileName) {
        throw new Error('Invalid file name: contains path separators');
      }

      // Create token payload
      const payload = {
        fileName: sanitizedFileName,
        userId: userId,
        iat: Math.floor(Date.now() / 1000) // Issued at
      };

      // Calculate expiry timestamp
      const expiresAt = new Date(Date.now() + expiresIn);
      const exp = Math.floor(expiresAt.getTime() / 1000);

      // Sign token
      const token = jwt.sign(
        { ...payload, exp },
        this.jwtSecret,
        { expiresIn: Math.floor(expiresIn / 1000) } // JWT expects seconds
      );

      // Generate secure URL
      const secureUrl = `/api/v3/unified/secure-download/${token}`;

      this.logger.debug('Generated secure download URL', {
        fileName: sanitizedFileName,
        userId,
        expiresAt: expiresAt.toISOString()
      });

      return {
        secureUrl,
        expiresAt,
        token // Include token for testing/debugging if needed
      };

    } catch (error) {
      this.logger.error('Failed to generate secure URL', {
        error: error.message,
        fileName,
        userId
      });
      throw error;
    }
  }

  /**
   * Express middleware to verify download token and serve file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async verifyDownload(req, res, next) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Download token is required',
          code: 'MISSING_TOKEN'
        });
      }

      // Verify and decode JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, this.jwtSecret);
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Download link has expired',
            code: 'TOKEN_EXPIRED'
          });
        } else if (jwtError.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            error: 'Invalid download token',
            code: 'INVALID_TOKEN'
          });
        } else {
          throw jwtError;
        }
      }

      // Extract fileName from token
      const { fileName, userId } = decoded;

      if (!fileName) {
        return res.status(400).json({
          success: false,
          error: 'Invalid token: missing file name',
          code: 'INVALID_TOKEN_PAYLOAD'
        });
      }

      // Sanitize fileName to prevent directory traversal
      const sanitizedFileName = path.basename(fileName);
      const filePath = path.join(this.outputDir, sanitizedFileName);

      // Verify file path is within output directory (prevent directory traversal)
      const resolvedPath = path.resolve(filePath);
      const resolvedOutputDir = path.resolve(this.outputDir);
      
      if (!resolvedPath.startsWith(resolvedOutputDir)) {
        this.logger.warn('Attempted directory traversal detected', {
          fileName: sanitizedFileName,
          userId,
          requestedPath: resolvedPath
        });
        return res.status(403).json({
          success: false,
          error: 'Invalid file path',
          code: 'INVALID_PATH'
        });
      }

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (accessError) {
        this.logger.warn('File not found for download', {
          fileName: sanitizedFileName,
          userId,
          filePath
        });
        return res.status(404).json({
          success: false,
          error: 'File not found',
          code: 'FILE_NOT_FOUND'
        });
      }

      // Log download (optional, for analytics)
      this.logger.info('Secure download requested', {
        fileName: sanitizedFileName,
        userId,
        ip: req.ip || req.connection.remoteAddress
      });

      // Serve file
      res.download(filePath, sanitizedFileName, (err) => {
        if (err) {
          // Error occurred during file download
          if (!res.headersSent) {
            this.logger.error('File download failed', {
              error: err.message,
              fileName: sanitizedFileName,
              userId
            });
            res.status(500).json({
              success: false,
              error: 'Failed to download file',
              code: 'DOWNLOAD_ERROR'
            });
          }
        }
      });

    } catch (error) {
      this.logger.error('Download verification error', {
        error: error.message,
        stack: error.stack
      });

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Download verification failed',
          code: 'VERIFICATION_ERROR'
        });
      }
    }
  }
}

module.exports = SecureDownloadMiddleware;

