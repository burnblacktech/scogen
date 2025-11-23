/**
 * PDF Generator
 * 
 * Generates professional PDFs from HTML using Puppeteer
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const HTMLTemplates = require('./HTMLTemplates');

class PDFGenerator {
  constructor(logger, secureDownload = null, db = null) {
    this.logger = logger || console;
    this.templates = new HTMLTemplates();
    this.outputDir = path.join(process.cwd(), 'generated');
    this.secureDownload = secureDownload; // Optional secure download middleware
    this.db = db; // Optional database for error tracking
    
    // Configuration from environment variables
    this.timeout = parseInt(process.env.PDF_GENERATION_TIMEOUT || '30000', 10); // 30 seconds default
    this.retryCount = parseInt(process.env.PDF_RETRY_COUNT || '3', 10); // 3 retries default
    this.retryBaseDelay = parseInt(process.env.PDF_RETRY_BASE_DELAY_MS || '1000', 10); // 1 second default
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Categorize error type for tracking
   * @param {Error} error - Error object
   * @returns {string} Error type category
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();
    const stack = error.stack ? error.stack.toLowerCase() : '';

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    if (message.includes('out of memory') || message.includes('memory')) {
      return 'out_of_memory';
    }
    if (message.includes('puppeteer') || message.includes('browser') || message.includes('chrome')) {
      return 'puppeteer_crash';
    }
    if (message.includes('template') || message.includes('html')) {
      return 'template_error';
    }
    if (message.includes('permission') || message.includes('access denied')) {
      return 'permission_error';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'network_error';
    }
    return 'unknown_error';
  }

  /**
   * Track error to database
   * @param {Error} error - Error object
   * @param {string} type - Document type
   * @param {string} level - Document level
   * @param {number} attempt - Retry attempt number
   * @param {string|null} documentGenerationId - Document generation ID for linking
   */
  async trackError(error, type, level, attempt, documentGenerationId = null) {
    if (!this.db) {
      return; // No database available, skip tracking
    }

    try {
      const { v4: uuidv4 } = require('uuid');
      const errorType = this.categorizeError(error);
      
      const stmt = this.db.prepare(`
        INSERT INTO pdf_generation_errors
          (id, document_generation_id, error_type, error_message, stack_trace, retry_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        uuidv4(),
        documentGenerationId,
        errorType,
        error.message || 'Unknown error',
        error.stack || '',
        attempt
      );

      this.logger.debug('Error tracked to database', {
        errorType,
        type,
        level,
        attempt,
        documentGenerationId
      });
    } catch (dbError) {
      this.logger.warn('Failed to track error to database', {
        error: dbError.message,
        originalError: error.message
      });
    }
  }

  /**
   * Generate PDF with timeout protection
   * @param {string} type - Document type
   * @param {string} level - Document level
   * @param {Object} data - Project data
   * @returns {Promise<Object>} PDF generation result
   */
  async generateWithTimeout(type, level, data) {
    let browser = null;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`PDF generation timeout after ${this.timeout}ms`));
      }, this.timeout);
    });

    const generatePromise = (async () => {
      try {
        this.logger.info('Generating PDF', { type, level });

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

        // Generate PDF using Puppeteer
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Set content
        await page.setContent(html, {
          waitUntil: 'networkidle0'
        });

        // Generate PDF
        const fileName = `${type}_${level}_${Date.now()}.pdf`;
        const filePath = path.join(this.outputDir, fileName);

        await page.pdf({
          path: filePath,
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            bottom: '20mm',
            left: '20mm',
            right: '20mm'
          }
        });

        await browser.close();
        browser = null;

        this.logger.info('PDF generated successfully', { filePath });

        const fileSize = (await fs.stat(filePath)).size;

        // Generate secure URL if secureDownload middleware is available
        let secureUrl = `/downloads/${fileName}`;
        let expiresAt = null;

        if (this.secureDownload) {
          try {
            // Extract userId from context if available (passed via generate method)
            const userId = data.userId || null;
            const secureUrlData = this.secureDownload.generateSecureUrl(fileName, userId);
            secureUrl = secureUrlData.secureUrl;
            expiresAt = secureUrlData.expiresAt;
          } catch (error) {
            this.logger.warn('Failed to generate secure URL, using plain URL', {
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
          format: 'pdf'
        };
      } catch (error) {
        // Ensure browser is closed on error
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            this.logger.warn('Failed to close browser on error', { error: closeError.message });
          }
        }
        throw error;
      }
    })();

    // Race between generation and timeout
    return Promise.race([generatePromise, timeoutPromise]);
  }

  /**
   * Generate PDF with retry logic
   * @param {string} type - Document type
   * @param {string} level - Document level
   * @param {Object} data - Project data
   * @param {number} attempt - Current attempt number (default: 1)
   * @param {string|null} documentGenerationId - Document generation ID for error tracking
   * @returns {Promise<Object>} PDF generation result or error object
   */
  async generateWithRetry(type, level, data, attempt = 1, documentGenerationId = null) {
    try {
      return await this.generateWithTimeout(type, level, data);
    } catch (error) {
      const errorType = this.categorizeError(error);
      
      this.logger.warn(`PDF generation attempt ${attempt} failed`, {
        type,
        level,
        errorType,
        error: error.message,
        attempt,
        maxRetries: this.retryCount
      });

      // Track error to database
      await this.trackError(error, type, level, attempt, documentGenerationId);

      // Check if we should retry
      if (attempt < this.retryCount) {
        // Calculate exponential backoff delay
        const delay = Math.pow(2, attempt - 1) * this.retryBaseDelay;
        this.logger.info(`Retrying PDF generation in ${delay}ms`, {
          type,
          level,
          attempt: attempt + 1,
          delay
        });
        
        await this.sleep(delay);
        return this.generateWithRetry(type, level, data, attempt + 1, documentGenerationId);
      }

      // All retries exhausted - return error object instead of throwing
      this.logger.error('PDF generation failed after all retries', {
        type,
        level,
        errorType,
        error: error.message,
        retryCount: this.retryCount,
        stack: error.stack
      });

      return {
        error: error.message,
        errorType,
        status: 'failed',
        retryCount: this.retryCount,
        type,
        level
      };
    }
  }

  /**
   * Generate PDF for a specific document type and level
   * @param {string} type - Document type: 'cost', 'business', 'technical'
   * @param {string} level - Level: 'L1', 'L2', 'L3', 'L4', 'L5'
   * @param {Object} data - Project data
   * @param {string|null} documentGenerationId - Document generation ID for error tracking
   * @returns {Promise<Object>} PDF generation result with file path or error object
   */
  async generate(type, level, data, documentGenerationId = null) {
    return await this.generateWithRetry(type, level, data, 1, documentGenerationId);
  }

  /**
   * Generate all PDFs for a project (3 types × 5 levels)
   * @param {Object} data - Project data
   * @returns {Promise<Object>} All generated PDFs
   */
  async generateAll(data) {
    const types = ['cost', 'business', 'technical'];
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
    const results = {};

    for (const type of types) {
      results[type] = {};
      for (const level of levels) {
        // generate() now returns error object instead of throwing
        results[type][level] = await this.generate(type, level, data);
      }
    }

    return results;
  }
}

module.exports = PDFGenerator;

