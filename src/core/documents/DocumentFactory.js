/**
 * Document Factory
 * 
 * Orchestrates generation of all document types and levels
 */

const PDFGenerator = require('./PDFGenerator');
const HTMLExporter = require('./HTMLExporter');
const ExcelExporter = require('./ExcelExporter');
const WordExporter = require('./WordExporter');
const AMCGenerator = require('../amc/AMCGenerator');

class DocumentFactory {
  constructor(logger, secureDownload = null, db = null) {
    this.logger = logger || console;
    this.pdfGenerator = new PDFGenerator(logger, secureDownload, db);
    this.htmlExporter = new HTMLExporter(logger, secureDownload);
    this.excelExporter = new ExcelExporter(logger);
    this.wordExporter = new WordExporter(logger);
    this.amcGenerator = null; // Will be initialized if AMC needed
  }

  /**
   * Generate selected documents only
   * @param {Object} data - Project data with scope, technical, cost
   * @param {Array} selections - Array of {type, level} objects
   * @param {Object} options - Options: { includeAMC: boolean, formats: ['pdf', 'xlsx', 'docx'] }
   * @param {Function|null} progressCallback - Callback function for progress updates
   * @returns {Promise<Object>} Generated documents (only selected ones)
   */
  async generateSelected(data, selections, options = {}, progressCallback = null) {
    const formats = options.formats || ['pdf']; // Default to PDF only
    try {
      this.logger.info('Generating selected documents', {
        selectionCount: selections.length,
        includeAMC: options.includeAMC || false
      });

      // Generate AMC packages if requested
      let amcPackages = null;
      if (options.includeAMC) {
        if (!this.amcGenerator) {
          this.amcGenerator = new AMCGenerator(this.logger);
        }
        amcPackages = this.amcGenerator.generatePackages({
          totalCost: data.cost?.totalCost || 0,
          complexity: data.technical?.complexity || 'medium',
          teamSize: data.technical?.teamSize || 5,
          modules: data.scope?.modules || []
        });
        
        // Add AMC data to document data
        data.amcPackages = amcPackages;
      }

      // Generate selected documents in all requested formats
      const documents = {};
      const documentTypes = ['cost', 'business', 'technical'];
      
      // Initialize structure
      documentTypes.forEach(type => {
        documents[type] = {};
      });

      // Track successful and failed documents separately
      const successful = [];
      const failed = [];
      
      // Map to store documentGenerationId for error tracking
      const documentGenerationIds = options.documentGenerationIds || {};

      // Calculate total documents to generate (selections × formats)
      let completed = 0;
      const total = selections.length * formats.length;

      for (let i = 0; i < selections.length; i++) {
        const selection = selections[i];
        const { type, level } = selection;
        
        if (!documentTypes.includes(type)) {
          this.logger.warn(`Invalid document type: ${type}`, { selection });
          continue;
        }

        if (!['L1', 'L2', 'L3', 'L4', 'L5'].includes(level)) {
          this.logger.warn(`Invalid level: ${level}`, { selection });
          continue;
        }

        const documentKey = `${type}_${level}`;
        const documentGenerationId = documentGenerationIds[documentKey] || null;

        // Initialize document structure for this selection
        if (!documents[type][level]) {
          documents[type][level] = {};
        }

        // Generate in all requested formats
        for (const format of formats) {
          // Notify progress before generation
          if (progressCallback) {
            progressCallback({
              completed: completed,
              total: total,
              current: `${documentKey} (${format.toUpperCase()})`,
              document: null
            });
          }

          let result = null;
          try {
            // Generate based on format
            if (format === 'pdf') {
              result = await this.pdfGenerator.generate(type, level, data, documentGenerationId);
              
              // Handle PDF failure with HTML fallback
              if (result.error || result.status === 'failed') {
                this.logger.warn(`PDF generation failed for ${type} ${level}, attempting HTML fallback`, {
                  error: result.error,
                  errorType: result.errorType
                });

                try {
                  result = await this.htmlExporter.exportAsHTML(type, level, data);
                  this.logger.info(`HTML fallback generated for ${type} ${level}`);
                } catch (htmlError) {
                  this.logger.error(`HTML fallback also failed for ${type} ${level}`, {
                    error: htmlError.message
                  });
                  throw new Error(result.error || 'PDF and HTML generation failed');
                }
              }
            } else if (format === 'xlsx') {
              result = await this.excelExporter.exportScope(data, type, level);
            } else if (format === 'docx') {
              result = await this.wordExporter.exportScope(data, type, level);
            } else {
              this.logger.warn(`Unknown format: ${format}`, { selection });
              continue;
            }

            // Generation succeeded
            documents[type][level][format] = result;
            successful.push({
              type,
              level,
              format: format,
              url: result.secureUrl || result.url,
              fileName: result.fileName,
              size: result.size,
              expiresAt: result.expiresAt || null
            });
            completed++;

            // Notify progress after successful generation
            if (progressCallback) {
              progressCallback({
                completed: completed,
                total: total,
                current: `${documentKey} (${format.toUpperCase()})`,
                document: {
                  type,
                  level,
                  format,
                  ...result
                }
              });
            }

          } catch (error) {
            this.logger.error(`Failed to generate ${format} for ${type} ${level}`, {
              error: error.message,
              stack: error.stack
            });

            const failedDoc = {
              type,
              level,
              format,
              error: error.message,
              errorType: 'GENERATION_ERROR',
              status: 'failed',
              documentGenerationId
            };

            failed.push(failedDoc);
            completed++;

            if (progressCallback) {
              progressCallback({
                completed: completed,
                total: total,
                current: `${documentKey} (${format.toUpperCase()})`,
                document: failedDoc,
                error: error.message
              });
            }
          }
        }
      }

      this.logger.info('Selected documents generated', {
        total: selections.length,
        successful: successful.length,
        failed: failed.length
      });

      return {
        // Structured results
        successful,
        failed,
        // Backward compatibility - keep existing structure
        cost: documents.cost,
        business: documents.business,
        technical: documents.technical,
        amc: amcPackages,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Selected document generation failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate all documents (3 types × 5 levels)
   * @private Use generateSelected for selective generation
   * @param {Object} data - Project data with scope, technical, cost
   * @param {Object} options - Options: { includeAMC: boolean }
   * @returns {Promise<Object>} All generated documents
   */
  async _generateAll(data, options = {}) {
    try {
      this.logger.info('Generating all documents', {
        includeAMC: options.includeAMC || false
      });

      // Generate AMC packages if requested
      let amcPackages = null;
      if (options.includeAMC) {
        if (!this.amcGenerator) {
          this.amcGenerator = new AMCGenerator(this.logger);
        }
        amcPackages = this.amcGenerator.generatePackages({
          totalCost: data.cost?.totalCost || 0,
          complexity: data.technical?.complexity || 'medium',
          teamSize: data.technical?.teamSize || 5,
          modules: data.scope?.modules || []
        });
        
        // Add AMC data to document data
        data.amcPackages = amcPackages;
      }

      // Generate all PDFs
      const documents = await this.pdfGenerator.generateAll(data);

      this.logger.info('All documents generated', {
        cost: Object.keys(documents.cost || {}).length,
        business: Object.keys(documents.business || {}).length,
        technical: Object.keys(documents.technical || {}).length
      });

      return {
        cost: documents.cost,
        business: documents.business,
        technical: documents.technical,
        amc: amcPackages,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Document generation failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate all documents (3 types × 5 levels)
   * @param {Object} data - Project data with scope, technical, cost
   * @param {Object} options - Options: { includeAMC: boolean }
   * @returns {Promise<Object>} All generated documents
   */
  async generateAll(data, options = {}) {
    // Generate all selections
    const allSelections = [];
    const types = ['cost', 'business', 'technical'];
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
    
    for (const type of types) {
      for (const level of levels) {
        allSelections.push({ type, level });
      }
    }

    return await this.generateSelected(data, allSelections, options);
  }

  /**
   * Generate a single document
   * @param {string} type - Document type
   * @param {string} level - Level
   * @param {Object} data - Project data
   * @returns {Promise<Object>} Generated PDF
   */
  async generateSingle(type, level, data) {
    return await this.pdfGenerator.generate(type, level, data);
  }
}

module.exports = DocumentFactory;

