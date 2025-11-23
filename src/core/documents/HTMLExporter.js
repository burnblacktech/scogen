/**
 * HTML Exporter
 * 
 * Fallback export when PDF generation fails
 * Exports HTML files that can be downloaded and viewed/printed
 */

const fs = require('fs').promises;
const path = require('path');
const HTMLTemplates = require('./HTMLTemplates');

class HTMLExporter {
  constructor(logger, secureDownload = null) {
    this.logger = logger || console;
    this.templates = new HTMLTemplates();
    this.outputDir = path.join(process.cwd(), 'generated');
    this.secureDownload = secureDownload; // Optional secure download middleware
  }

  /**
   * Export HTML file for a specific document type and level
   * @param {string} type - Document type: 'cost', 'business', 'technical'
   * @param {string} level - Level: 'L1', 'L2', 'L3', 'L4', 'L5'
   * @param {Object} data - Project data
   * @returns {Promise<Object>} HTML export result with file path
   */
  async exportAsHTML(type, level, data) {
    try {
      this.logger.info('Exporting HTML fallback', { type, level });

      // Get HTML template based on type
      let templateMethod;
      if (type === 'cost') {
        templateMethod = `costProposal${level}`;
      } else if (type === 'business') {
        templateMethod = `businessDocument${level}`;
      } else if (type === 'technical') {
        templateMethod = `technicalBlueprint${level}`;
      } else {
        throw new Error(`Unknown document type: ${type}`);
      }
      
      if (!this.templates[templateMethod]) {
        throw new Error(`Template method not found: ${templateMethod}`);
      }

      const html = this.templates[templateMethod](data);

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate HTML file
      const fileName = `${type}_${level}_${Date.now()}.html`;
      const filePath = path.join(this.outputDir, fileName);

      // Write HTML to file
      await fs.writeFile(filePath, html, 'utf8');

      this.logger.info('HTML exported successfully', { filePath });

      const fileSize = (await fs.stat(filePath)).size;

      // Generate secure URL if secureDownload middleware is available
      let secureUrl = `/downloads/${fileName}`;
      let expiresAt = null;

      if (this.secureDownload) {
        try {
          // Extract userId from context if available
          const userId = data.userId || null;
          const secureUrlData = this.secureDownload.generateSecureUrl(fileName, userId);
          secureUrl = secureUrlData.secureUrl;
          expiresAt = secureUrlData.expiresAt;
        } catch (error) {
          this.logger.warn('Failed to generate secure URL for HTML, using plain URL', {
            error: error.message,
            fileName
          });
          // Fallback to plain URL
        }
      }

      return {
        fileName,
        filePath,
        url: `/downloads/${fileName}`, // Keep for backward compatibility
        secureUrl, // New secure URL
        expiresAt, // Expiry timestamp
        size: fileSize,
        format: 'html'
      };

    } catch (error) {
      this.logger.error('HTML export failed', {
        type,
        level,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = HTMLExporter;

