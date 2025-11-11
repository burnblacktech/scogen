const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const PerformanceMonitor = require('../utils/performance-monitor');
const RequestQueue = require('../utils/request-queue');
const InputSanitizer = require('../utils/input-sanitizer');

// Polyfill DOMMatrix for Node.js (required by pdf-parse)
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    constructor(init) {
      if (typeof init === 'string') {
        // Parse matrix string like "matrix(1, 0, 0, 1, 0, 0)"
        const match = init.match(/matrix\(([^)]+)\)/);
        if (match) {
          const values = match[1].split(',').map(v => parseFloat(v.trim()));
          this.a = values[0] || 1;
          this.b = values[1] || 0;
          this.c = values[2] || 0;
          this.d = values[3] || 1;
          this.e = values[4] || 0;
          this.f = values[5] || 0;
        } else {
          this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
      } else if (Array.isArray(init)) {
        this.a = init[0] || 1;
        this.b = init[1] || 0;
        this.c = init[2] || 0;
        this.d = init[3] || 1;
        this.e = init[4] || 0;
        this.f = init[5] || 0;
      } else {
        this.a = init?.a ?? 1;
        this.b = init?.b ?? 0;
        this.c = init?.c ?? 0;
        this.d = init?.d ?? 1;
        this.e = init?.e ?? 0;
        this.f = init?.f ?? 0;
      }
    }
    multiply(other) {
      return new DOMMatrix({
        a: this.a * other.a + this.c * other.b,
        b: this.b * other.a + this.d * other.b,
        c: this.a * other.c + this.c * other.d,
        d: this.b * other.c + this.d * other.d,
        e: this.a * other.e + this.c * other.f + this.e,
        f: this.b * other.e + this.d * other.f + this.f
      });
    }
    translate(x, y) {
      return new DOMMatrix({
        a: this.a, b: this.b, c: this.c, d: this.d,
        e: this.a * x + this.c * y + this.e,
        f: this.b * x + this.d * y + this.f
      });
    }
    scale(x, y) {
      return new DOMMatrix({
        a: this.a * x, b: this.b * x,
        c: this.c * (y || x), d: this.d * (y || x),
        e: this.e, f: this.f
      });
    }
    rotate(angle) {
      const rad = angle * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return new DOMMatrix({
        a: this.a * cos + this.c * sin,
        b: this.b * cos + this.d * sin,
        c: this.a * -sin + this.c * cos,
        d: this.b * -sin + this.d * cos,
        e: this.e, f: this.f
      });
    }
  };
}

// Now require pdf-parse after polyfill
const pdfParse = require('pdf-parse');

// Configure file upload with security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent path traversal and injection
    const sanitized = InputSanitizer.sanitizeFilename(file.originalname);
    // Add timestamp to prevent overwrites
    const timestamp = Date.now();
    const ext = InputSanitizer.getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, sanitized.length - ext.length);
    cb(null, `${nameWithoutExt}_${timestamp}${ext}`);
  }
});

// File filter for type validation
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/octet-stream': ['.xlsx', '.xls'] // Some browsers send this for Excel
  };

  const allowedExtensions = ['.pdf', '.xlsx', '.xls'];
  
  // Check MIME type
  const mimeType = file.mimetype;
  const ext = InputSanitizer.getFileExtension(file.originalname).toLowerCase();
  
  // Validate extension
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }

  // Validate MIME type (if provided)
  if (mimeType && mimeType !== 'application/octet-stream') {
    const allowedForMime = allowedMimeTypes[mimeType];
    if (!allowedForMime || !allowedForMime.includes(ext)) {
      return cb(new Error(`MIME type ${mimeType} does not match file extension ${ext}`), false);
    }
  }

  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 1 // Only one file at a time
  },
  fileFilter: fileFilter
});

// Create uploads directory if it doesn't exist (will be created by multer storage)

function createRoutes(executor, db, logger) {
  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Template download endpoint
  router.get('/templates/:templateName', (req, res, next) => {
    try {
      // Sanitize template name to prevent path traversal
      const templateName = InputSanitizer.sanitizeFilename(req.params.templateName);
      
      // Security: Only allow .xlsx files
      if (!templateName.endsWith('.xlsx')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid template file type. Only .xlsx files are allowed.',
          code: 'INVALID_TEMPLATE_TYPE'
        });
      }

      // Whitelist allowed template names to prevent arbitrary file access
      const allowedTemplates = [
        'web-app-requirements.xlsx',
        'ecommerce-requirements.xlsx'
      ];
      
      if (!allowedTemplates.includes(templateName)) {
        return res.status(404).json({ 
          success: false, 
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND',
          availableTemplates: allowedTemplates
        });
      }

      const templatesDir = path.join(process.cwd(), 'templates');
      const filePath = path.join(templatesDir, templateName);

      // Additional security: Verify path is within templates directory (prevent path traversal)
      const resolvedPath = path.resolve(filePath);
      const resolvedDir = path.resolve(templatesDir);
      
      if (!resolvedPath.startsWith(resolvedDir)) {
        logger.warn('Path traversal attempt detected', { 
          templateName: req.params.templateName,
          resolvedPath,
          resolvedDir
        });
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid template path',
          code: 'INVALID_TEMPLATE_PATH'
        });
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          success: false, 
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND',
          availableTemplates: allowedTemplates
        });
      }

      // Set headers for Excel download with sanitized filename
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${templateName}"`);

      // Send file
      res.sendFile(filePath);
    } catch (error) {
      logger.error('Template download failed', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'TEMPLATE_DOWNLOAD_ERROR';
      next(error);
    }
  });

  // PDF upload endpoint
  router.post('/upload-pdf', upload.single('file'), async (req, res, next) => {
    let filePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'No file uploaded',
          code: 'NO_FILE_UPLOADED'
        });
      }

      // Additional security: Verify file is actually a PDF by checking magic bytes
      const pdfBuffer = fs.readFileSync(req.file.path);
      filePath = req.file.path;
      
      // Check PDF magic bytes (%PDF)
      const magicBytes = pdfBuffer.slice(0, 4).toString('ascii');
      if (magicBytes !== '%PDF') {
        fs.unlinkSync(filePath);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid PDF file. File does not appear to be a valid PDF.',
          code: 'INVALID_PDF_FILE'
        });
      }

      // Parse PDF
      const pdfData = await pdfParse(pdfBuffer);
      const extractedText = pdfData.text;

      // Sanitize extracted text
      const sanitizedText = InputSanitizer.sanitizeString(extractedText, {
        allowNewlines: true,
        maxLength: 50 * 1024 * 1024
      });

      // Clean up uploaded file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        filePath = null;
      }

      logger.info('PDF text extracted', { 
        filename: InputSanitizer.sanitizeFilename(req.file.originalname), 
        textLength: sanitizedText.length,
        pages: pdfData.numpages
      });

      res.json({ 
        success: true, 
        text: sanitizedText,
        filename: InputSanitizer.sanitizeFilename(req.file.originalname),
        pages: pdfData.numpages
      });

    } catch (error) {
      logger.error('PDF extraction failed', { 
        error: error.message,
        filename: req.file ? InputSanitizer.sanitizeFilename(req.file.originalname) : 'unknown'
      });
      
      // Clean up file if it exists
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          logger.warn('Failed to delete uploaded file', { error: unlinkError.message });
        }
      }
      
      // Don't expose internal error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      error.status = error.status || 500;
      error.code = error.code || 'PDF_EXTRACTION_ERROR';
      
      if (!isDevelopment) {
        error.message = 'PDF extraction failed. Please ensure the file is a valid PDF.';
      }
      
      next(error);
    }
  });

  // Excel upload endpoint
  router.post('/upload-excel', upload.single('file'), async (req, res, next) => {
    let filePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'No file uploaded',
          code: 'NO_FILE_UPLOADED'
        });
      }

      filePath = req.file.path;
      
      // Additional security: Verify file is actually an Excel file by checking magic bytes
      const fileBuffer = fs.readFileSync(filePath);
      
      // Check Excel magic bytes (PK for .xlsx, or D0 CF 11 E0 for .xls)
      const firstBytes = fileBuffer.slice(0, 4);
      const isXlsx = firstBytes[0] === 0x50 && firstBytes[1] === 0x4B; // PK (ZIP signature)
      const isXls = firstBytes[0] === 0xD0 && firstBytes[1] === 0xCF && 
                    firstBytes[2] === 0x11 && firstBytes[3] === 0xE0; // OLE signature
      
      if (!isXlsx && !isXls) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid Excel file. File does not appear to be a valid Excel file.',
          code: 'INVALID_EXCEL_FILE'
        });
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Extract as text
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const extractedText = rows
        .map(row => row.filter(cell => cell).join(' | '))
        .filter(line => line.trim())
        .join('\n');

      // Sanitize extracted text
      const sanitizedText = InputSanitizer.sanitizeString(extractedText, {
        allowNewlines: true,
        maxLength: 50 * 1024 * 1024
      });

      // Also get structured data
      const structured = XLSX.utils.sheet_to_json(sheet);

      // Clean up uploaded file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        filePath = null;
      }

      logger.info('Excel data extracted', { 
        filename: InputSanitizer.sanitizeFilename(req.file.originalname), 
        rows: rows.length 
      });

      res.json({ 
        success: true, 
        text: sanitizedText,
        structured: structured,
        filename: InputSanitizer.sanitizeFilename(req.file.originalname),
        rows: rows.length
      });

    } catch (error) {
      logger.error('Excel extraction failed', { 
        error: error.message,
        filename: req.file ? InputSanitizer.sanitizeFilename(req.file.originalname) : 'unknown'
      });
      
      // Clean up file if it exists
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          logger.warn('Failed to delete uploaded file', { error: unlinkError.message });
        }
      }
      
      // Don't expose internal error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      error.status = error.status || 500;
      error.code = error.code || 'EXCEL_EXTRACTION_ERROR';
      
      if (!isDevelopment) {
        error.message = 'Excel extraction failed. Please ensure the file is a valid Excel file.';
      }
      
      next(error);
    }
  });

  // Initialize performance monitoring and request queue
  const perfMonitor = new PerformanceMonitor(logger);
  const requestQueue = new RequestQueue({
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '3', 10)
  });

  // Execute scoping (with rate limiting)
  router.post('/scope', scopeRateLimiter.middleware(), async (req, res, next) => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // Extract and sanitize request body first (before async callback)
      let { 
        input,
        pdfText,
        excelText,
        platformType, // Legacy: Platform context
        projectDetails, // NEW: Structured project details
        generateSpecs, 
        specLevel,
        includeReview,
        generateCostProposal,
        rateTier
      } = req.body;
      
      // Sanitize string inputs
      if (input) {
        input = InputSanitizer.sanitizeString(input, { 
          allowNewlines: true, 
          maxLength: 50 * 1024 * 1024 
        });
      }
      
      if (pdfText) {
        pdfText = InputSanitizer.sanitizeString(pdfText, { 
          allowNewlines: true, 
          maxLength: 50 * 1024 * 1024 
        });
      }
      
      if (excelText) {
        excelText = InputSanitizer.sanitizeString(excelText, { 
          allowNewlines: true, 
          maxLength: 50 * 1024 * 1024 
        });
      }
      
      if (platformType) {
        platformType = InputSanitizer.sanitizeString(platformType, { 
          allowNewlines: false, 
          maxLength: 100 
        });
      }
      
      // Sanitize and validate projectDetails
      if (projectDetails !== undefined && projectDetails !== null) {
        // Sanitize the object
        projectDetails = InputSanitizer.sanitizeObject(projectDetails, {
          allowNewlines: false,
          maxLength: 1000
        });
        
        // Validate structure
        const validation = InputSanitizer.validateProjectDetails(projectDetails);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: validation.errors.join('; '),
            code: 'INVALID_PROJECT_DETAILS',
            errors: validation.errors
          });
        }
        
        // Normalize scale to projectScale for backward compatibility
        if (projectDetails.scale && !projectDetails.projectScale) {
          projectDetails.projectScale = projectDetails.scale;
        }
        
        // Map old values to new values for backward compatibility
        if (projectDetails.projectScale === 'small' || projectDetails.projectScale === 'medium') {
          projectDetails.projectScale = 'sme';
        }
      }
      
      // Combine all inputs (calculate before async callback)
      const inputParts = [];
      
      if (pdfText) {
        inputParts.push('--- PDF Document Content ---\n' + pdfText);
      }
      
      if (excelText) {
        inputParts.push('--- Excel Data ---\n' + excelText);
      }
      
      if (input) {
        inputParts.push('--- Additional Context ---\n' + input);
      }

      if (inputParts.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No input provided (text, PDF, or Excel required)',
          code: 'MISSING_INPUT'
        });
      }

      const combinedInput = inputParts.join('\n\n');
      
      // Input validation using sanitizer utility
      const MAX_INPUT_SIZE = 50 * 1024 * 1024; // 50MB
      const MIN_INPUT_LENGTH = 10; // Minimum 10 characters
      
      const inputValidation = InputSanitizer.validateInput(combinedInput, {
        minLength: MIN_INPUT_LENGTH,
        maxLength: MAX_INPUT_SIZE,
        required: true
      });
      
      if (!inputValidation.valid) {
        const firstError = inputValidation.errors[0];
        let code = 'INPUT_VALIDATION_ERROR';
        if (firstError.includes('too large')) {
          code = 'INPUT_TOO_LARGE';
        } else if (firstError.includes('too short')) {
          code = 'INPUT_TOO_SHORT';
        }
        
        return res.status(400).json({
          success: false,
          error: firstError,
          code: code,
          errors: inputValidation.errors
        });
      }
      
      // Validate budget if provided (check both top-level and projectDetails)
      const budgetValue = req.body.maxBudget || (projectDetails && projectDetails.maxBudget);
      if (budgetValue !== undefined && budgetValue !== null && budgetValue !== '') {
        // Budget can be a string like "₹5L" or "₹50L" or a number
        // For now, we'll accept any non-empty value as it will be parsed later
        // The actual parsing happens in the scenario generator or estimator
        if (typeof budgetValue === 'string' && budgetValue.trim() === '') {
          // Empty string is fine, will be ignored
        } else if (typeof budgetValue === 'number' && (isNaN(budgetValue) || budgetValue < 0)) {
          return res.status(400).json({
            success: false,
            error: 'maxBudget must be a positive number',
            code: 'INVALID_BUDGET',
            received: budgetValue
          });
        }
        // String values like "₹5L" are acceptable and will be parsed later
      }
      
      // Validate deadline if provided (check both top-level and projectDetails)
      const deadlineValue = req.body.targetDeadline || (projectDetails && projectDetails.targetDeadline);
      if (deadlineValue !== undefined && deadlineValue !== null && deadlineValue !== '') {
        // Deadline can be a string like "3 months" or "Q2 2025" or a number
        // For now, we'll accept any non-empty value as it will be parsed later
        // The actual parsing happens in the scenario generator or estimator
        if (typeof deadlineValue === 'string' && deadlineValue.trim() === '') {
          // Empty string is fine, will be ignored
        } else if (typeof deadlineValue === 'number' && (isNaN(deadlineValue) || deadlineValue < 1)) {
          return res.status(400).json({
            success: false,
            error: 'targetDeadline must be a positive number (days)',
            code: 'INVALID_DEADLINE',
            received: deadlineValue
          });
        }
        // String values like "3 months" are acceptable and will be parsed later
      }

      // Queue the request if needed
      const executeRequest = async () => {
        return await perfMonitor.time('scope-request', async () => {
          const generateSpecsQuery = req.query.generateSpecs === 'true';
          const specLevelQuery = req.query.specLevel || req.query['spec-level'];
          const includeReviewQuery = req.query.includeReview !== 'false'; // Default true
          const generateCostProposalQuery = req.query.generateCostProposal === 'true';
          const rateTierQuery = req.query.rateTier || req.query['rate-tier'];

          // Build options from body or query params
          const options = {};
          
          // Project details (NEW - structured input)
          if (projectDetails) {
            options.projectDetails = projectDetails;
            // Map market region for rate calculations
            if (projectDetails.marketRegion) {
              options.marketRegion = projectDetails.marketRegion;
            }
            // Map optional constraints (for warnings/adjustments, not hard caps)
            if (projectDetails.maxBudget) {
              options.maxBudget = projectDetails.maxBudget;
            }
            if (projectDetails.targetDeadline) {
              options.targetDeadline = projectDetails.targetDeadline;
            }
            // Budget tier is now calculated from scope, but keep for backward compatibility
            // Default to 'moderate' if not specified (no longer from UI)
            options.budgetTier = 'moderate'; // Will be overridden by scope-based calculation
          }
          
          // Legacy: Platform context (fallback)
          if (platformType) {
            options.platformType = platformType;
          }
          
          // Spec generation
          if (generateSpecs || generateSpecsQuery) {
            options.generateSpecs = true;
            options.specLevel = specLevel || specLevelQuery || 'standard';
          }
          
          // Scope review (default: enabled)
          options.includeReview = includeReview !== false && includeReviewQuery !== false;
          
          // Cost proposal
          if (generateCostProposal || generateCostProposalQuery) {
            options.generateCostProposal = true;
            options.rateTier = rateTier || rateTierQuery || 'avg';
          }

          // Add request object to options for context extraction
          options.req = req;

          logger.info('API scope request received', { 
            hasText: !!input,
            hasPdf: !!pdfText,
            hasExcel: !!excelText,
            inputLength: combinedInput.length,
            generateSpecs: options.generateSpecs || false,
            includeReview: options.includeReview,
            generateCostProposal: options.generateCostProposal || false,
            trustScoringEnabled: process.env.ENABLE_TRUST_SCORING === 'true',
            smartRoutingEnabled: process.env.ENABLE_SMART_ROUTING === 'true'
          });

          // Check feature flags for chain selection
          const useFullChain = process.env.ENABLE_FULL_CHAIN === 'true' ||
                          (process.env.ENABLE_REQUIREMENTS_ENRICHMENT === 'true' &&
                           process.env.ENABLE_TECHNICAL_DECOMPOSITION === 'true' &&
                           process.env.ENABLE_RISK_ASSESSMENT === 'true' &&
                           process.env.ENABLE_SCENARIO_GENERATION === 'true');
      
      const useEnhancedChain = process.env.ENABLE_TRUST_SCORING === 'true' || 
                               process.env.ENABLE_SMART_ROUTING === 'true';
      
      let result;
      let executionErrors = [];
      let fallbackUsed = false;
      
      if (useFullChain) {
        // Use full chain executor (Steps 1-5: Trust → Enrichment → Decomposition → Risk → Scenarios)
        try {
          const ChainExecutorStep5 = require('../modules/chain-executor-step5');
          const step5Executor = new ChainExecutorStep5(
            executor.config || require('../utils/config-manager'),
            logger,
            executor.db || require('../modules/database'),
            executor.library || require('../modules/library')
          );
          result = await step5Executor.execute(combinedInput.trim(), options);
          
          // Format response for full chain (includes scenarios, risk assessment, etc.)
          if (result.action && result.action !== 'FULL_ANALYSIS') {
            // Non-proceed path - return structured JSON
            return res.json({
              success: true,
              action: result.action,
              data: result.data || {},
              metadata: result.metadata || {},
              warnings: result.warnings || [],
              message: result.routing?.message || 'Analysis complete'
            });
          }
          // Full analysis path - continue with normal response format (includes scenarios)
        } catch (step5Error) {
          logger.error('Step 5 (Scenario Generation) failed, falling back to Step 4', {
            error: step5Error.message,
            stack: step5Error.stack
          });
          executionErrors.push({
            step: 'Step 5 (Scenario Generation)',
            error: step5Error.message,
            fallback: 'Step 4 (Risk Assessment)'
          });
          
          // Fallback to Step 4 (Risk Assessment)
          try {
            const ChainExecutorStep4 = require('../modules/chain-executor-step4');
            const step4Executor = new ChainExecutorStep4(
              executor.config || require('../utils/config-manager'),
              logger,
              executor.db || require('../modules/database'),
              executor.library || require('../modules/library')
            );
            result = await step4Executor.execute(combinedInput.trim(), options);
            fallbackUsed = true;
            logger.info('Successfully fell back to Step 4');
          } catch (step4Error) {
            logger.error('Step 4 (Risk Assessment) failed, falling back to Step 3', {
              error: step4Error.message,
              stack: step4Error.stack
            });
            executionErrors.push({
              step: 'Step 4 (Risk Assessment)',
              error: step4Error.message,
              fallback: 'Step 3 (Technical Decomposition)'
            });
            
            // Fallback to Step 3 (Technical Decomposition)
            try {
              const ChainExecutorStep3 = require('../modules/chain-executor-step3');
              const step3Executor = new ChainExecutorStep3(
                executor.config || require('../utils/config-manager'),
                logger,
                executor.db || require('../modules/database'),
                executor.library || require('../modules/library')
              );
              result = await step3Executor.execute(combinedInput.trim(), options);
              fallbackUsed = true;
              logger.info('Successfully fell back to Step 3');
            } catch (step3Error) {
              logger.error('Step 3 (Technical Decomposition) failed, using standard executor', {
                error: step3Error.message,
                stack: step3Error.stack
              });
              executionErrors.push({
                step: 'Step 3 (Technical Decomposition)',
                error: step3Error.message,
                fallback: 'Standard Chain Executor'
              });
              
              // Final fallback to standard executor
              result = await executor.execute(combinedInput.trim(), options);
              fallbackUsed = true;
              logger.info('Using standard chain executor as final fallback');
            }
          }
        }
      } else if (useEnhancedChain) {
        // Use enhanced chain executor (Step 1 only: Trust scoring & routing)
        const ChainExecutorEnhanced = require('../modules/chain-executor-enhanced');
        const enhancedExecutor = new ChainExecutorEnhanced(
          executor.config || require('../utils/config-manager'),
          logger,
          executor.db || require('../modules/database'),
          executor.library || require('../modules/library')
        );
        result = await enhancedExecutor.execute(combinedInput.trim(), options);
        
        // Format response for enhanced chain (JSON structure with action/data/metadata)
        if (result.action && result.action !== 'FULL_ANALYSIS') {
          // Non-proceed path - return structured JSON
          return res.json({
            success: true,
            action: result.action,
            data: result.data || {},
            metadata: result.metadata || {},
            warnings: result.warnings || [],
            message: result.routing?.message || 'Analysis complete'
          });
        }
        // Full analysis path - continue with normal response format
      } else {
        // Use standard chain executor (legacy)
        result = await executor.execute(combinedInput.trim(), options);
      }

      // Determine view (internal or client)
      const view = req.query.view || 'client'; // Default to client view
      
      // Consolidate estimates - establish single source of truth
      // Priority: risk-adjusted > resource-based > baseline (from scenarios) > base estimate
      let primaryEstimate = result.technical?.estimate || result.estimate || {};
      let estimateSource = 'base';
      
      if (result.riskAdjustedEstimate?.total) {
        // Use risk-adjusted estimate as primary (most refined)
        primaryEstimate = {
          cost: {
            total: result.riskAdjustedEstimate.total.cost,
            currency: 'INR',
            breakdown: {
              base: result.riskAdjustedEstimate.base.cost,
              risk_buffer: result.riskAdjustedEstimate.buffers.costAmount,
              contingency: result.riskAdjustedEstimate.contingency
            }
          },
          timeline: {
            days: result.riskAdjustedEstimate.total.timeline,
            weeks: Math.round(result.riskAdjustedEstimate.total.timeline / 5),
            withRisk: result.riskAdjustedEstimate.total.timeline,
            recommendedDays: result.riskAdjustedEstimate.base.timeline
          },
          confidence: primaryEstimate.confidence || { overall: 0.8 }
        };
        estimateSource = 'risk-adjusted';
      } else if (result.baselineEstimate?.cost) {
        // Use baseline from scenarios (includes risk assessment)
        primaryEstimate = {
          cost: {
            total: result.baselineEstimate.cost.total || result.baselineEstimate.cost,
            currency: 'INR',
            breakdown: result.baselineEstimate.cost.breakdown || {}
          },
          timeline: {
            days: result.baselineEstimate.timeline.withRisk || result.baselineEstimate.timeline.days,
            weeks: result.baselineEstimate.timeline.weeks || Math.round((result.baselineEstimate.timeline.withRisk || result.baselineEstimate.timeline.days) / 5),
            withRisk: result.baselineEstimate.timeline.withRisk || result.baselineEstimate.timeline.days
          },
          confidence: primaryEstimate.confidence || { overall: 0.8 }
        };
        estimateSource = 'baseline';
      } else if (result.resourceBasedEstimate) {
        // Use resource-based estimate
        primaryEstimate = {
          cost: {
            total: result.resourceBasedEstimate.cost,
            currency: 'INR',
            breakdown: {
              base: result.resourceBasedEstimate.cost
            }
          },
          timeline: {
            days: result.resourceBasedEstimate.timeline?.recommendedDays || 
                  result.resourceBasedEstimate.timeline?.days || 
                  primaryEstimate.timeline?.days || 0,
            weeks: Math.round((result.resourceBasedEstimate.timeline?.recommendedDays || 
                              result.resourceBasedEstimate.timeline?.days || 
                              primaryEstimate.timeline?.days || 0) / 5),
            recommendedDays: result.resourceBasedEstimate.timeline?.recommendedDays || 
                           result.resourceBasedEstimate.timeline?.days
          },
          confidence: primaryEstimate.confidence || { overall: 0.8 }
        };
        estimateSource = 'resource-based';
      }
      
      const response = {
        success: true,
        ...result,
        // Override technical.estimate with primary estimate
        technical: {
          ...(result.technical || {}),
          estimate: primaryEstimate,
          estimateSource: estimateSource, // Label indicating which estimate is primary
          baseEstimate: result.technical?.estimate || result.estimate || primaryEstimate // Keep original for reference
        }
      };
      
      // Include scenarios if available (from Step 5)
      if (result.scenarios) {
        response.scenarios = {
          scenarios: result.scenarios,
          baselineEstimate: result.baselineEstimate,
          recommendation: result.scenarioRecommendation
        };
      }
      
      // Include risk assessment if available (from Step 4)
      if (result.riskAssessment) {
        response.riskAssessment = result.riskAssessment;
        response.riskPresentations = result.riskPresentations;
        response.riskAdjustedEstimate = result.riskAdjustedEstimate;
      }
      
      // Include technical decomposition if available (from Step 3)
      if (result.technicalDecomposition) {
        response.technicalDecomposition = result.technicalDecomposition;
        response.presentations = result.presentations;
        response.resourceBasedEstimate = result.resourceBasedEstimate;
      }
      
      // Include requirements enrichment if available (from Step 2)
      if (result.requirementsEnrichment) {
        response.requirementsEnrichment = result.requirementsEnrichment;
      }
      
      // Include view-specific output if available
      if (result.output && result.output.internal && result.output.client) {
        if (view === 'internal') {
          response.view = 'internal';
          response.markdown = result.output.internal;
        } else {
          response.view = 'client';
          response.markdown = result.output.client;
        }
      }
      
      // Add metadata if from enhanced chain
      if (result.metadata) {
        response.metadata = result.metadata;
      }
      
      // Add execution warnings if fallback was used
      if (fallbackUsed && executionErrors.length > 0) {
        response.warnings = response.warnings || [];
        response.warnings.push({
          type: 'degraded_execution',
          message: 'Some analysis steps failed and were skipped. Results may be incomplete.',
          errors: executionErrors,
          fallbackUsed: true
        });
        logger.warn('Response includes degraded execution warnings', {
          errorCount: executionErrors.length
        });
      }
      
          res.json(response);
          
          // Log performance summary
          const duration = Date.now() - startTime;
          if (duration > 10000) { // Log if > 10 seconds
            logger.warn('Long-running request', {
              requestId,
              duration: `${(duration / 1000).toFixed(2)}s`,
              hasScenarios: !!response.scenarios,
              hasRiskAssessment: !!response.riskAssessment
            });
          }
        }, { requestId, inputLength: combinedInput.length });
      };

      // Use queue if enabled, otherwise execute directly
      if (process.env.ENABLE_REQUEST_QUEUE === 'true') {
        await requestQueue.enqueue(executeRequest, 0);
      } else {
        await executeRequest();
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Request failed', {
        requestId,
        duration: `${(duration / 1000).toFixed(2)}s`,
        error: error.message
      });
      next(error);
    }
  });

  // Recalculate scenarios with new constraints
  router.post('/scenarios/recalculate', async (req, res, next) => {
    try {
      const { baseline, constraints, userPrefs } = req.body;
      
      if (!baseline) {
        return res.status(400).json({
          success: false,
          error: 'Baseline scope required'
        });
      }

      // Use scenario generator to recalculate
      const ScenarioGenerator = require('../modules/scenario-generator');
      const Estimator = require('../modules/estimator');
      const Refiner = require('../modules/refiner');
      const Library = require('../modules/library');
      
      const library = new Library(logger);
      const estimator = new Estimator(library, logger);
      const refiner = new Refiner(library, logger);
      const scenarioGenerator = new ScenarioGenerator(estimator, refiner, logger);
      
      // Create baseline estimate structure
      const baselineEstimate = {
        cost: { total: baseline.cost || 0 },
        timeline: { weeks: baseline.timeline || 0 }
      };
      
      // Generate scenarios with new constraints
      const scenarios = scenarioGenerator.generateScenarios(
        baseline,
        baselineEstimate,
        constraints || {},
        userPrefs || {}
      );
      
      res.json({
        success: true,
        scenarios: scenarios
      });
    } catch (error) {
      logger.error('Scenario recalculation failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to recalculate scenarios: ' + error.message
      });
    }
  });

  // Get scope history
  router.get('/scopes', async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 20;

      // Get scopes from database using getRecentScopes method
      const scopes = db.getRecentScopes ? db.getRecentScopes(limit) : [];

      res.json({
        success: true,
        scopes: scopes.map(scope => ({
          id: scope.id,
          input: scope.input_raw || scope.input,
          industry: scope.industry,
          useCase: scope.use_case,
          persona: scope.persona,
          estimatedDays: scope.estimated_days,
          estimatedCost: scope.estimated_cost,
          confidence: scope.confidence,
          createdAt: scope.created_at || scope.createdAt,
          status: scope.status
        })),
        limit
      });
    } catch (error) {
      next(error);
    }
  });

  // Get specific scope
  router.get('/scopes/:id', async (req, res, next) => {
    try {
      const { id } = req.params;

      const scope = db.getScopeById ? db.getScopeById(id) : null;

      if (!scope) {
        return res.status(404).json({
          error: 'Scope not found',
          message: `No scope found with ID: ${id}`
        });
      }

      res.json({
        success: true,
        scope: {
          id: scope.id,
          input: scope.input_raw,
          industry: scope.industry,
          useCase: scope.use_case,
          persona: scope.persona,
          estimatedDays: scope.estimated_days,
          estimatedCost: scope.estimated_cost,
          confidence: scope.confidence,
          modules: scope.modules,
          risks: scope.risks,
          plan: scope.plan,
          outputFull: scope.output_full,
          createdAt: scope.created_at,
          status: scope.status
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Get review for existing scope
  router.get('/scopes/:id/review', async (req, res, next) => {
    try {
      const { id } = req.params;

      const scope = db.getScopeById ? db.getScopeById(id) : null;

      if (!scope) {
        return res.status(404).json({
          error: 'Scope not found',
          message: `No scope found with ID: ${id}`
        });
      }

      // Parse stored scope data
      const plan = scope.plan ? JSON.parse(scope.plan) : {};
      const modules = scope.modules ? JSON.parse(scope.modules) : [];
      const estimate = {
        timeline: { days: scope.estimated_days || 0 },
        cost: { total: scope.estimated_cost || 0 }
      };
      const domainContext = {
        industry: scope.industry || 'generic',
        useCase: scope.use_case || 'application'
      };
      const refinedScope = { refinedScope: { modules } };

      // Generate review
      const ScopeReviewer = require('../modules/scope-reviewer');
      const reviewer = new ScopeReviewer(executor.library, db, logger);

      const review = await reviewer.reviewScope(refinedScope.refinedScope, estimate, domainContext);

      res.json({
        success: true,
        review: review,
        scope: {
          id: scope.id,
          input: scope.input_raw,
          industry: scope.industry,
          useCase: scope.use_case
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Generate cost proposal for existing scope
  router.post('/scopes/:id/cost-proposal', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rateTier = 'avg', includeOverhead = true } = req.body;

      const scope = db.getScopeById ? db.getScopeById(id) : null;

      if (!scope) {
        return res.status(404).json({
          error: 'Scope not found',
          message: `No scope found with ID: ${id}`
        });
      }

      // Parse stored scope data
      const plan = scope.plan ? JSON.parse(scope.plan) : {};
      const modules = scope.modules ? JSON.parse(scope.modules) : [];
      const estimate = {
        timeline: { days: scope.estimated_days || 0 },
        cost: { total: scope.estimated_cost || 0 }
      };
      const refinedScope = { refinedScope: { modules } };

      // Generate cost proposal
      const CostProposalGenerator = require('../modules/cost-proposal');
      const proposalGen = new CostProposalGenerator(logger, executor.config || require('../utils/config-manager'));

      const proposal = proposalGen.generateProposal(refinedScope, estimate, {
        rateTier,
        includeOverhead
      });

      const markdown = proposalGen.formatProposalMarkdown(proposal, scope.use_case || 'Project');

      res.json({
        success: true,
        proposal: proposal,
        markdown: markdown
      });
    } catch (error) {
      next(error);
    }
  });

  // Generate specs for existing scope
  router.post('/scopes/:id/specs', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { level = 'standard' } = req.body;

      const scope = db.getScopeById ? db.getScopeById(id) : null;

      if (!scope) {
        return res.status(404).json({
          error: 'Scope not found',
          message: `No scope found with ID: ${id}`
        });
      }

      // Parse stored scope data
      const plan = scope.plan ? JSON.parse(scope.plan) : {};
      const modules = scope.modules ? JSON.parse(scope.modules) : [];
      const domainContext = {
        industry: scope.industry || 'generic',
        useCase: scope.use_case || 'application'
      };

      // Generate specs
      const SpecGenerator = require('../modules/specs/spec-generator');
      // Access library from executor (it's stored in ChainExecutor constructor)
      const library = executor.library;
      if (!library) {
        return res.status(500).json({
          error: 'Library not available',
          message: 'Cannot generate specs without library instance'
        });
      }
      const specGenerator = new SpecGenerator(library, logger);

      const specs = await specGenerator.generate(plan, modules, domainContext, level);

      if (!specs) {
        return res.status(500).json({
          error: 'Spec generation failed',
          message: 'Failed to generate technical specifications'
        });
      }

      res.json({
        success: true,
        specs: {
          outputDir: specs.outputDir,
          filesWritten: specs.filesWritten
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Delete scope
  router.delete('/scopes/:id', async (req, res, next) => {
    try {
      const { id } = req.params;

      // Database doesn't have delete method yet, return not implemented
      res.status(501).json({
        error: 'Not implemented',
        message: 'Delete functionality not available in current version'
      });
    } catch (error) {
      next(error);
    }
  });

  // Domain Knowledge endpoints
  const DomainKnowledgeManager = require('../modules/domain-knowledge-manager');
  const domainKnowledgeManager = new DomainKnowledgeManager(logger);

  // GET /api/domain-knowledge - List all domain knowledge
  router.get('/domain-knowledge', (req, res, next) => {
    try {
      const list = domainKnowledgeManager.listDomainKnowledge();
      res.json({ success: true, domains: list });
    } catch (error) {
      logger.error('Failed to list domain knowledge', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'DOMAIN_KNOWLEDGE_LIST_ERROR';
      next(error);
    }
  });

  // GET /api/domain-knowledge/:domain - Get specific domain knowledge
  router.get('/domain-knowledge/:domain', (req, res, next) => {
    try {
      const { domain } = req.params;
      const knowledge = domainKnowledgeManager.getDomainKnowledge(domain);
      
      if (!knowledge) {
        return res.status(404).json({
          success: false,
          error: `Domain knowledge not found: ${domain}`
        });
      }
      
      res.json({ success: true, knowledge });
    } catch (error) {
      logger.error('Failed to get domain knowledge', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'DOMAIN_KNOWLEDGE_GET_ERROR';
      next(error);
    }
  });

  // POST /api/domain-knowledge - Save domain knowledge
  router.post('/domain-knowledge', (req, res, next) => {
    try {
      const domainKnowledge = req.body;
      
      if (!domainKnowledge.domain && !domainKnowledge.platformType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: domain or platformType'
        });
      }
      
      const result = domainKnowledgeManager.saveDomainKnowledge(domainKnowledge);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Failed to save domain knowledge', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'DOMAIN_KNOWLEDGE_SAVE_ERROR';
      next(error);
    }
  });

  // PUT /api/domain-knowledge/:domain/pattern/:patternName - Update specific pattern
  router.put('/domain-knowledge/:domain/pattern/:patternName', (req, res, next) => {
    try {
      // Sanitize parameters
      const domain = InputSanitizer.sanitizeString(req.params.domain, {
        allowNewlines: false,
        maxLength: 100
      });
      const patternName = InputSanitizer.sanitizeString(req.params.patternName, {
        allowNewlines: false,
        maxLength: 100
      });
      const patternData = req.body;
      
      const result = domainKnowledgeManager.updatePattern(domain, patternName, patternData);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Failed to update pattern', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'PATTERN_UPDATE_ERROR';
      next(error);
    }
  });

  // DELETE /api/domain-knowledge/:domain/pattern/:patternName - Delete specific pattern
  router.delete('/domain-knowledge/:domain/pattern/:patternName', (req, res, next) => {
    try {
      // Sanitize parameters
      const domain = InputSanitizer.sanitizeString(req.params.domain, {
        allowNewlines: false,
        maxLength: 100
      });
      const patternName = InputSanitizer.sanitizeString(req.params.patternName, {
        allowNewlines: false,
        maxLength: 100
      });
      
      const result = domainKnowledgeManager.deletePattern(domain, patternName);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Failed to delete pattern', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'PATTERN_DELETE_ERROR';
      next(error);
    }
  });

  // Save scope analysis to enhanced database
  router.post('/scope/save', async (req, res, next) => {
    try {
      const { getProjectService } = require('../services/project-service');
      const projectService = getProjectService();
      
      const { input, results, clientInfo } = req.body;
      
      if (!input || !results) {
        return res.status(400).json({
          success: false,
          error: 'Input and results are required'
        });
      }
      
      const saveResult = await projectService.saveProject({
        input,
        ...results,
        client: clientInfo || {}
      });
      
      res.json({
        success: true,
        projectCode: saveResult.newDb?.project_code || saveResult.oldDb?.id,
        message: saveResult.newDb ? 
          `Project ${saveResult.newDb.project_code} saved` : 
          'Project saved',
        savedToNewDb: !!saveResult.newDb,
        savedToOldDb: !!saveResult.oldDb,
        errors: saveResult.errors || []
      });
    } catch (error) {
      logger.error('Save scope error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to save scope: ' + error.message
      });
    }
  });

  // Get client history and stats
  router.get('/client/:identifier', async (req, res, next) => {
    try {
      const { getProjectService } = require('../services/project-service');
      const projectService = getProjectService();
      
      const client = projectService.getClient(req.params.identifier);
      
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      
      // Get client stats if new database is enabled
      let stats = null;
      if (projectService.useNewDb && projectService.dbV2) {
        stats = projectService.dbV2.getClientStats(client.id);
      }
      
      res.json({
        success: true,
        client: {
          ...client,
          stats: stats
        }
      });
    } catch (error) {
      logger.error('Get client error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get client: ' + error.message
      });
    }
  });

  // Record project completion with actuals
  router.post('/project/:code/complete', async (req, res, next) => {
    try {
      const { getProjectService } = require('../services/project-service');
      const projectService = getProjectService();
      
      const { code } = req.params;
      const actuals = req.body;
      
      if (!actuals.cost && !actuals.timeline) {
        return res.status(400).json({
          success: false,
          error: 'Actual cost or timeline is required'
        });
      }
      
      const result = await projectService.recordProjectCompletion(code, actuals);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Project completion error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to record completion: ' + error.message
      });
    }
  });

  // Get analytics
  router.get('/analytics', async (req, res, next) => {
    try {
      const { getProjectService } = require('../services/project-service');
      const projectService = getProjectService();
      
      if (!projectService.useNewDb || !projectService.dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Analytics require new database to be enabled'
        });
      }
      
      // Get project stats
      const projectStats = projectService.dbV2.db.prepare(`
        SELECT 
          COUNT(*) as total_projects,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          AVG(scope_creep_percentage) as avg_scope_creep,
          AVG(client_satisfaction) as avg_satisfaction,
          AVG(profitability) as avg_profitability
        FROM projects
      `).get();
      
      // Get accuracy stats
      const accuracyStats = projectService.dbV2.getAccuracyStats();
      
      res.json({
        success: true,
        stats: {
          projects: projectStats,
          accuracy: accuracyStats
        }
      });
    } catch (error) {
      logger.error('Analytics error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get analytics: ' + error.message
      });
    }
  });

  return router;
}

module.exports = createRoutes;

