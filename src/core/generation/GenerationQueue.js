/**
 * Generation Queue
 * 
 * Manages asynchronous PDF generation jobs with real-time progress updates
 * Uses Socket.IO for real-time notifications
 */

const { v4: uuidv4 } = require('uuid');
const UnifiedProcessor = require('../unified/UnifiedProcessor');
const DocumentFactory = require('../documents/DocumentFactory');

class GenerationQueue {
  constructor(io, logger, library, db, secureDownload = null) {
    this.io = io;
    this.logger = logger || console;
    this.library = library;
    this.db = db;
    this.secureDownload = secureDownload;
    
    // Job storage
    this.jobs = new Map(); // jobId -> job object
    this.queue = []; // Array of jobIds waiting to be processed
    this.processing = false;
    
    // Initialize processor and document factory
    this.processor = new UnifiedProcessor(library, logger, db);
    this.documentFactory = new DocumentFactory(logger, secureDownload, db);
  }

  /**
   * Add job to queue
   * @param {string} scopeId - Scope ID
   * @param {Array} selections - Array of {type, level} objects
   * @param {string|null} userId - User ID (optional)
   * @param {Object} options - Options including includeAMC
   * @returns {string} Job ID
   */
  addJob(scopeId, selections, userId = null, options = {}) {
    const jobId = uuidv4();
    
    const job = {
      id: jobId,
      scopeId: scopeId,
      selections: selections,
      userId: userId,
      status: 'queued',
      progress: 0,
      currentDocument: null,
      documents: {},
      error: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      options: options
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);

    this.logger.info('Job added to queue', {
      jobId,
      scopeId,
      selectionCount: selections.length
    });

    // Start processing if not already processing
    if (!this.processing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Process queue (sequential processing)
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const jobId = this.queue.shift();
      const job = this.jobs.get(jobId);

      if (!job) {
        this.logger.warn('Job not found in queue', { jobId });
        continue;
      }

      try {
        await this.processJob(job);
      } catch (error) {
        this.logger.error('Job processing failed', {
          jobId,
          error: error.message,
          stack: error.stack
        });
        this.markJobFailed(jobId, error.message);
      }
    }

    this.processing = false;
  }

  /**
   * Process a single job
   * @param {Object} job - Job object
   */
  async processJob(job) {
    job.status = 'processing';
    job.startedAt = new Date();
    
    this.logger.info('Processing job', {
      jobId: job.id,
      scopeId: job.scopeId,
      selectionCount: job.selections.length
    });

    // Calculate total documents (selections × formats)
    const formats = job.options.formats || ['pdf'];
    const totalDocuments = job.selections.length * formats.length;
    
    // Notify start
    this.notifyProgress(job.id, {
      completed: 0,
      total: totalDocuments,
      current: 'Starting...',
      percentage: 0
    });

    try {
      // Get stored scope data
      const storedData = this.processor.getScope(job.scopeId);
      if (!storedData) {
        throw new Error(`Scope not found: ${job.scopeId}`);
      }

      const { scope, technical, cost } = storedData;

      // Prepare data for document generation
      // Include userId from job for secure URL generation
      const documentData = {
        projectName: scope.projectName || 'Project',
        scope: scope,
        technical: technical,
        cost: cost,
        userId: job.userId || null // Pass userId for secure URL generation
      };

      // Insert document generation records before generation (if db available)
      const generationIds = {};
      const projectId = storedData.scope?.id || job.scopeId;
      
      if (this.db) {
        const { v4: uuidv4 } = require('uuid');
        const insertStmt = this.db.prepare(`
          INSERT INTO document_generations 
            (id, project_id, document_type, level, include_amc, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'generating', CURRENT_TIMESTAMP)
        `);

        for (const selection of job.selections) {
          const genId = uuidv4();
          generationIds[`${selection.type}_${selection.level}`] = genId;
          
          try {
            insertStmt.run(
              genId,
              projectId,
              selection.type,
              selection.level,
              job.options.includeAMC ? 1 : 0
            );
          } catch (dbError) {
            this.logger.warn('Failed to insert document generation record', {
              error: dbError.message,
              selection
            });
          }
        }
      }

      // Generate documents with progress callback
      // Pass documentGenerationIds for error tracking
      const documents = await this.documentFactory.generateSelected(
        documentData,
        job.selections,
        {
          ...job.options,
          documentGenerationIds: generationIds
        },
        (progress) => {
          // Progress callback
          this.notifyProgress(job.id, {
            completed: progress.completed,
            total: progress.total,
            current: progress.current,
            percentage: Math.round((progress.completed / progress.total) * 100),
            document: progress.document,
            error: progress.error,
            retryCount: progress.retryCount,
            fallback: progress.fallback
          });
        }
      );

      // Parse results - extract successful and failed arrays
      const successful = documents.successful || [];
      const failed = documents.failed || [];
      const totalExpected = totalDocuments; // Total expected documents (selections × formats)
      const succeeded = successful.length;

      // Calculate job status
      let jobStatus;
      if (succeeded === totalExpected) {
        jobStatus = 'completed';
      } else if (succeeded > 0) {
        jobStatus = 'partial';
      } else {
        jobStatus = 'failed';
      }

      // Update document generation records after generation
      if (this.db && Object.keys(generationIds).length > 0) {
        // Check if format column exists (may not exist in older databases)
        let formatColumnExists = false;
        try {
          const tableInfo = this.db.prepare("PRAGMA table_info(document_generations)").all();
          formatColumnExists = tableInfo.some(col => col.name === 'format');
        } catch (error) {
          this.logger.warn('Failed to check format column', { error: error.message });
        }

        const updateStmt = formatColumnExists
          ? this.db.prepare(`
              UPDATE document_generations 
              SET status = ?, pdf_path = ?, file_size = ?, format = ?, generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `)
          : this.db.prepare(`
              UPDATE document_generations 
              SET status = ?, pdf_path = ?, file_size = ?, generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `);

        const updateFailedStmt = formatColumnExists
          ? this.db.prepare(`
              UPDATE document_generations 
              SET status = 'failed', error_message = ?, format = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `)
          : this.db.prepare(`
              UPDATE document_generations 
              SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `);

        const fs = require('fs').promises;

        // Update successful documents
        for (const doc of successful) {
          const genId = generationIds[`${doc.type}_${doc.level}`];
          if (!genId) continue;

          // Find the full document object
          const fullDoc = documents[doc.type]?.[doc.level];
          if (fullDoc && fullDoc.fileName && fullDoc.filePath) {
            try {
              let fileSize = 0;
              try {
                const stats = await fs.stat(fullDoc.filePath);
                fileSize = stats.size;
              } catch (statError) {
                this.logger.warn('Failed to get file size', { error: statError.message });
              }
              if (formatColumnExists) {
                const format = fullDoc.format || 'pdf';
                updateStmt.run('completed', fullDoc.filePath, fileSize, format, genId);
              } else {
                updateStmt.run('completed', fullDoc.filePath, fileSize, genId);
              }
            } catch (updateError) {
              this.logger.warn('Failed to update document generation record', {
                error: updateError.message,
                genId
              });
            }
          }
        }

        // Update failed documents
        for (const doc of failed) {
          const genId = generationIds[`${doc.type}_${doc.level}`];
          if (!genId) continue;

          try {
            const errorMessage = doc.error || 'Generation failed';
            if (formatColumnExists) {
              const format = doc.fallbackFormat || 'pdf';
              updateFailedStmt.run(errorMessage, format, genId);
            } else {
              updateFailedStmt.run(errorMessage, genId);
            }
          } catch (updateError) {
            this.logger.warn('Failed to update failed document generation record', {
              error: updateError.message,
              genId
            });
          }
        }
      }

      // Update job status and documents
      job.status = jobStatus;
      job.progress = 100;
      job.documents = {
        successful,
        failed,
        // Keep backward compatibility structure
        cost: documents.cost,
        business: documents.business,
        technical: documents.technical,
        amc: documents.amc
      };
      job.completedAt = new Date();

      this.logger.info('Job completed', {
        jobId: job.id,
        status: jobStatus,
        totalExpected: totalDocuments,
        succeeded,
        failed: failed.length
      });

      // Notify completion or partial success
      if (jobStatus === 'partial') {
        // Emit partial success event
        this.io.to(job.id).emit('partial-success', {
          jobId: job.id,
          successful,
          failed,
          total: totalDocuments,
          succeeded,
          documents: job.documents,
          generatedAt: job.completedAt.toISOString()
        });
      }

      // Always emit completed event (for backward compatibility)
      this.io.to(job.id).emit('completed', {
        jobId: job.id,
        status: jobStatus,
        successful,
        failed,
        total,
        succeeded,
        documents: job.documents,
        generatedAt: job.completedAt.toISOString()
      });

    } catch (error) {
      this.logger.error('Job processing error', {
        jobId: job.id,
        error: error.message,
        stack: error.stack
      });
      
      // Mark job as failed
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      
      // Notify error to client
      this.io.to(job.id).emit('error', {
        jobId: job.id,
        message: error.message,
        error: error.message
      });
      
      // Also emit completed event with error status
      this.io.to(job.id).emit('completed', {
        jobId: job.id,
        status: 'failed',
        error: error.message,
        documents: {}
      });
      
      // Don't re-throw - let queue continue processing
    }
  }

  /**
   * Mark job as failed
   * @param {string} jobId - Job ID
   * @param {string} errorMessage - Error message
   */
  markJobFailed(jobId, errorMessage) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = errorMessage;
    job.completedAt = new Date();

    // Notify error
    this.io.to(jobId).emit('error', {
      jobId: jobId,
      message: errorMessage
    });
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job object or null if not found
   */
  getJobStatus(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Notify progress via Socket.IO
   * @param {string} jobId - Job ID
   * @param {Object} progress - Progress data
   */
  notifyProgress(jobId, progress) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Update job progress
    job.progress = progress.percentage;
    job.currentDocument = progress.current;

    // Emit to Socket.IO room
    this.io.to(jobId).emit('progress', {
      jobId: jobId,
      ...progress
    });

    this.logger.debug('Progress notification sent', {
      jobId,
      progress: progress.percentage,
      current: progress.current
    });
  }

  /**
   * Cleanup old jobs (older than 24 hours)
   */
  cleanupOldJobs() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    let cleaned = 0;
    for (const [jobId, job] of this.jobs.entries()) {
      if (now - job.createdAt.getTime() > maxAge) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.info('Cleaned up old jobs', { cleaned });
    }
  }
}

module.exports = GenerationQueue;

