/**
 * Unified API Routes
 * 
 * Single entry point for simplified SCOGEN flow
 * Processes any input and generates complete scope with all documents
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const UnifiedProcessor = require('../../core/unified/UnifiedProcessor');
const { getProjectService } = require('../../services/project-service');
const SecureDownloadMiddleware = require('../../middleware/secureDownload');
const FileParser = require('../../core/extraction/FileParser');

/**
 * Create unified routes
 * @param {Object} library - Library instance
 * @param {Object} logger - Logger instance
 * @param {Object} db - Database instance
 * @param {Object} io - Socket.IO instance
 * @returns {Router} Express router
 */
function createUnifiedRoutes(library, logger, db, io = null) {
  // Initialize unified processor
  const processor = new UnifiedProcessor(library, logger, db);
  
  // Initialize secure download middleware
  const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const secureDownload = new SecureDownloadMiddleware(logger, jwtSecret);
  
  // Initialize generation queue (singleton)
  let generationQueue = null;
  if (io) {
    const GenerationQueue = require('../../core/generation/GenerationQueue');
    generationQueue = new GenerationQueue(io, logger, library, db, secureDownload);
  }

  // Initialize file parser
  const fileParser = new FileParser(logger);

  // Configure multer for file uploads
  const uploadDir = path.join(__dirname, '../../../uploads');
  // Ensure upload directory exists
  fs.mkdir(uploadDir, { recursive: true }).catch(err => {
    logger.warn('Failed to create upload directory', { error: err.message });
  });

  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      if (allowedTypes.includes(file.mimetype) || 
          ['.pdf', '.xlsx', '.xls', '.docx', '.doc'].includes(path.extname(file.originalname).toLowerCase())) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, Excel, and Word documents are allowed.'));
      }
    }
  });

  /**
   * GET /api/v3/unified/health
   * Health check endpoint
   */
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Unified API is working',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * POST /api/v3/unified/expand
   * Expands scope from input (NO PDF generation)
   * Returns expanded scope for review
   */
  router.post('/expand', async (req, res, next) => {
    try {
      const { input } = req.body;

      if (!input || typeof input !== 'string' || input.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Input is required',
          code: 'MISSING_INPUT'
        });
      }

      logger.info('Scope expansion request', {
        inputLength: input.length
      });

      // Expand scope (no PDF generation)
      const result = await processor.expandScope(input);

      // Return result for review
      res.json({
        success: true,
        scopeId: result.scopeId,
        scope: result.scope,
        technical: result.technical,
        cost: result.cost,
        editable: result.editable,
        features: result.features,
        estimatedCost: result.estimatedCost,
        estimatedTimeline: result.estimatedTimeline,
        metadata: result.metadata
      });

    } catch (error) {
      logger.error('Scope expansion failed', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to expand scope',
        code: 'EXPANSION_ERROR'
      });
    }
  });

  /**
   * POST /api/v3/unified/upload-and-expand
   * Upload a file (PDF, Excel, Word) and expand scope from its content
   */
  router.post('/upload-and-expand', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          code: 'MISSING_FILE'
        });
      }

      logger.info('File upload request', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Parse file and extract text
      const parseResult = await fileParser.parseFile(req.file.path, req.file.mimetype);
      
      // Clean extracted text
      const cleanedText = fileParser.cleanText(parseResult.text);

      if (!cleanedText || cleanedText.trim().length === 0) {
        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(() => {});
        
        return res.status(400).json({
          success: false,
          error: 'Could not extract text from file. File may be empty or corrupted.',
          code: 'NO_TEXT_EXTRACTED'
        });
      }

      logger.info('Text extracted from file', {
        filename: req.file.originalname,
        textLength: cleanedText.length,
        pages: parseResult.metadata.pages,
        sheets: parseResult.metadata.sheets?.length
      });

      // Expand scope from extracted text
      const result = await processor.expandScope(cleanedText);

      // Clean up uploaded file after processing
      await fs.unlink(req.file.path).catch(err => {
        logger.warn('Failed to delete uploaded file', { error: err.message });
      });

      // Return result for review
      res.json({
        success: true,
        scopeId: result.scopeId,
        scope: result.scope,
        technical: result.technical,
        cost: result.cost,
        editable: result.editable,
        features: result.features,
        estimatedCost: result.estimatedCost,
        estimatedTimeline: result.estimatedTimeline,
        metadata: {
          ...result.metadata,
          source: 'file',
          fileName: req.file.originalname,
          fileType: parseResult.metadata.type,
          extractedMetadata: parseResult.metadata
        }
      });

    } catch (error) {
      logger.error('File upload and expansion failed', {
        error: error.message,
        stack: error.stack
      });

      // Clean up uploaded file on error
      if (req.file && req.file.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process file',
        code: 'FILE_PROCESSING_ERROR'
      });
    }
  });

  /**
   * POST /api/v3/unified/generate-selected
   * Generate only selected documents
   */
  router.post('/generate-selected', async (req, res, next) => {
    try {
      const { scopeId, selections, includeAMC = false, formats = ['pdf'] } = req.body;

      if (!scopeId) {
        return res.status(400).json({
          success: false,
          error: 'scopeId is required',
          code: 'MISSING_SCOPE_ID'
        });
      }

      if (!selections || !Array.isArray(selections) || selections.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'selections array is required',
          code: 'MISSING_SELECTIONS'
        });
      }

      // Validate selections format
      for (const selection of selections) {
        if (!selection.type || !selection.level) {
          return res.status(400).json({
            success: false,
            error: 'Each selection must have type and level',
            code: 'INVALID_SELECTION'
          });
        }
        if (!['cost', 'business', 'technical'].includes(selection.type)) {
          return res.status(400).json({
            success: false,
            error: `Invalid document type: ${selection.type}`,
            code: 'INVALID_TYPE'
          });
        }
        if (!['L1', 'L2', 'L3', 'L4', 'L5'].includes(selection.level)) {
          return res.status(400).json({
            success: false,
            error: `Invalid level: ${selection.level}`,
            code: 'INVALID_LEVEL'
          });
        }
      }

      logger.info('Selected document generation request', {
        scopeId,
        selectionCount: selections.length,
        includeAMC
      });

      // Use queue if available, otherwise fall back to synchronous generation
      if (generationQueue) {
        // Add job to queue (async, returns immediately)
        const userId = req.user?.id || null;
        const jobId = generationQueue.addJob(scopeId, selections, userId, {
          includeAMC,
          formats: formats || ['pdf']
        });

        logger.info('Job added to queue', { jobId, scopeId });

        // Return jobId immediately
        res.json({
          success: true,
          jobId: jobId,
          status: 'queued',
          message: 'Document generation started. Subscribe to job updates for progress.'
        });
      } else {
        // Fallback to synchronous generation (no Socket.IO)
        logger.warn('GenerationQueue not available, using synchronous generation');

        // Get stored scope to get project_id if available
        const storedData = processor.getScope(scopeId);
        const projectId = storedData?.scope?.id || scopeId;

        // Insert document generation records before generation
        const generationIds = {};
        
        if (db) {
          const insertStmt = db.prepare(`
            INSERT INTO document_generations 
              (id, project_id, document_type, level, include_amc, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'generating', CURRENT_TIMESTAMP)
          `);

          for (const selection of selections) {
            const genId = uuidv4();
            generationIds[`${selection.type}_${selection.level}`] = genId;
            
            try {
              insertStmt.run(
                genId,
                projectId,
                selection.type,
                selection.level,
                includeAMC ? 1 : 0
              );
            } catch (dbError) {
              logger.warn('Failed to insert document generation record', {
                error: dbError.message,
                selection
              });
            }
          }
        }

        // Generate selected documents (synchronous)
        const result = await processor.generateSelected(scopeId, selections, {
          includeAMC,
          formats: formats || ['pdf']
        });

        // Update document generation records after generation
        if (db && Object.keys(generationIds).length > 0) {
          const updateStmt = db.prepare(`
            UPDATE document_generations 
            SET status = ?, pdf_path = ?, file_size = ?, generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `);

          const updateFailedStmt = db.prepare(`
            UPDATE document_generations 
            SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `);

          for (const [type, levels] of Object.entries(result.documents || {})) {
            for (const [level, doc] of Object.entries(levels)) {
              const genId = generationIds[`${type}_${level}`];
              if (!genId) continue;

              try {
                if (doc.error || doc.status === 'failed') {
                  updateFailedStmt.run(doc.error || 'Generation failed', genId);
                } else if (doc.fileName && doc.filePath) {
                  const fs = require('fs').promises;
                  let fileSize = 0;
                  try {
                    const stats = await fs.stat(doc.filePath);
                    fileSize = stats.size;
                  } catch (statError) {
                    logger.warn('Failed to get file size', { error: statError.message });
                  }
                  updateStmt.run('completed', doc.filePath, fileSize, genId);
                }
              } catch (updateError) {
                logger.warn('Failed to update document generation record', {
                  error: updateError.message,
                  genId
                });
              }
            }
          }
        }

        res.json({
          success: true,
          scopeId: result.scopeId,
          documents: result.documents,
          generatedAt: result.generatedAt
        });
      }

    } catch (error) {
      logger.error('Selected document generation failed', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate selected documents',
        code: 'GENERATION_ERROR'
      });
    }
  });

  /**
   * POST /api/v3/unified/update-scope
   * Update scope with user changes and recalculate costs
   */
  router.post('/update-scope', async (req, res, next) => {
    try {
      const { scopeId, changes } = req.body;

      if (!scopeId) {
        return res.status(400).json({
          success: false,
          error: 'scopeId is required',
          code: 'MISSING_SCOPE_ID'
        });
      }

      if (!changes || typeof changes !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'changes object is required',
          code: 'MISSING_CHANGES'
        });
      }

      logger.info('Scope update request', {
        scopeId,
        changesCount: changes.features?.length || 0
      });

      // Update scope
      const result = await processor.updateScope(scopeId, changes);

      res.json({
        success: result.success,
        scopeId: result.scopeId,
        updatedScope: result.updatedScope,
        newCost: result.newCost,
        newTimeline: result.newTimeline,
        updatedAt: result.updatedAt
      });

    } catch (error) {
      logger.error('Scope update failed', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update scope',
        code: 'UPDATE_ERROR'
      });
    }
  });

  /**
   * GET /api/v3/unified/scope/:scopeId
   * Get current scope state for review page
   */
  router.get('/scope/:scopeId', async (req, res, next) => {
    try {
      const { scopeId } = req.params;

      logger.info('Scope retrieval request', { scopeId });

      // Get scope from storage
      const storedData = processor.getScope(scopeId);
      if (!storedData) {
        return res.status(404).json({
          success: false,
          error: 'Scope not found',
          code: 'SCOPE_NOT_FOUND'
        });
      }

      // Format for review
      const ScopeReviewer = require('../../core/unified/ScopeReviewer');
      const DynamicCostCalculator = require('../../core/estimation/DynamicCostCalculator');
      const scopeReviewer = new ScopeReviewer(logger, new DynamicCostCalculator(db, logger));
      const reviewData = scopeReviewer.formatForReview(storedData.scope);

      // Use actual cost calculation if available, otherwise fall back to simple calculation
      // Ensure cost is never null or undefined
      let estimatedCost = storedData.cost?.totalCost;
      if (!estimatedCost || estimatedCost === null || estimatedCost === undefined || isNaN(estimatedCost)) {
        estimatedCost = reviewData.estimatedCost || 0;
      }
      // If still 0, calculate from features
      if (estimatedCost === 0 && reviewData.features && reviewData.features.length > 0) {
        const includedFeatures = reviewData.features.filter(f => f.included !== false);
        let calculatedCost = 0;
        for (const feature of includedFeatures) {
          const hours = feature.hours || 25;
          const complexityMultiplier = feature.complexity || 2;
          calculatedCost += hours * 2000 * (complexityMultiplier / 2);
        }
        estimatedCost = Math.round(calculatedCost * 1.2) || 50000;
      }
      
      const estimatedTimeline = storedData.cost?.breakdown?.timeline || 
                                storedData.technical?.totalEffort || 
                                reviewData.estimatedTimeline || 0;

      res.json({
        success: true,
        scopeId: scopeId,
        scope: storedData.scope,
        technical: storedData.technical,
        cost: storedData.cost,
        editable: true,
        features: reviewData.features,
        estimatedCost: estimatedCost,
        estimatedTimeline: estimatedTimeline,
        metadata: storedData.metadata
      });

    } catch (error) {
      logger.error('Scope retrieval failed', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve scope',
        code: 'RETRIEVAL_ERROR'
      });
    }
  });

  /**
   * GET /api/v3/unified/comparison/:scopeId
   * Get comparison between original and current scope
   */
  router.get('/comparison/:scopeId', async (req, res, next) => {
    try {
      const { scopeId } = req.params;

      logger.info('Scope comparison request', { scopeId });

      // Get comparison from processor
      const comparison = processor.getComparison(scopeId);

      if (!comparison) {
        return res.status(404).json({
          success: false,
          error: 'Comparison not available',
          code: 'COMPARISON_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        comparison: comparison
      });

    } catch (error) {
      logger.error('Failed to get comparison', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get comparison',
        code: 'COMPARISON_ERROR'
      });
    }
  });

  /**
   * GET /api/v3/unified/suggestions/:scopeId
   * Get feature suggestions for a scope
   */
  router.get('/suggestions/:scopeId', async (req, res, next) => {
    try {
      const { scopeId } = req.params;

      logger.info('Feature suggestions request', { scopeId });

      // Get suggestions from processor
      const suggestions = await processor.getSuggestions(scopeId);

      res.json({
        success: true,
        suggestions: suggestions,
        count: suggestions.length
      });

    } catch (error) {
      logger.error('Failed to get suggestions', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get suggestions',
        code: 'SUGGESTIONS_ERROR'
      });
    }
  });

  /**
   * GET /api/v3/unified/status/:projectId
   * Get status of a project
   */
  router.get('/status/:projectId', async (req, res, next) => {
    try {
      const { projectId } = req.params;

      const projectService = getProjectService();
      if (!projectService) {
        return res.status(503).json({
          success: false,
          error: 'Project service not available'
        });
      }

      const project = projectService.getProject(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      res.json({
        success: true,
        project: project
      });

    } catch (error) {
      logger.error('Status check failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v3/unified/job-status/:jobId
   * Get current job status
   */
  router.get('/job-status/:jobId', async (req, res, next) => {
    try {
      const { jobId } = req.params;

      if (!generationQueue) {
        return res.status(503).json({
          success: false,
          error: 'Generation queue not available',
          code: 'QUEUE_NOT_AVAILABLE'
        });
      }

      const job = generationQueue.getJobStatus(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
          code: 'JOB_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        job: {
          id: job.id,
          scopeId: job.scopeId,
          status: job.status,
          progress: job.progress,
          currentDocument: job.currentDocument,
          documents: job.documents,
          error: job.error,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt
        }
      });

    } catch (error) {
      logger.error('Job status check failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get job status',
        code: 'STATUS_ERROR'
      });
    }
  });

  /**
   * GET /api/v3/unified/secure-download/:token
   * Download a generated PDF using JWT token
   */
  router.get('/secure-download/:token', secureDownload.verifyDownload.bind(secureDownload));

  /**
   * GET /api/v3/unified/download/:fileName
   * Download a generated PDF (DEPRECATED - use /secure-download/:token instead)
   * @deprecated This route is deprecated. Use /secure-download/:token with JWT token instead.
   */
  router.get('/download/:fileName', async (req, res, next) => {
    logger.warn('Deprecated download route used', {
      fileName: req.params.fileName,
      ip: req.ip || req.connection.remoteAddress
    });

    try {
      const { fileName } = req.params;
      const path = require('path');
      const fs = require('fs').promises;
      
      const filePath = path.join(process.cwd(), 'generated', fileName);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      // Send file with deprecation warning header
      res.setHeader('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /secure-download/:token instead.');
      res.sendFile(filePath, (err) => {
        if (err) {
          logger.error('File download failed', { error: err.message });
          res.status(500).json({
            success: false,
            error: 'Failed to download file'
          });
        }
      });

    } catch (error) {
      logger.error('Download failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

module.exports = createUnifiedRoutes;

