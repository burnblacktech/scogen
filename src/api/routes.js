const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const PerformanceMonitor = require('../utils/performance-monitor');
const RequestQueue = require('../utils/request-queue');
const InputSanitizer = require('../utils/input-sanitizer');
const { createRateLimiters } = require('../api/middleware/rate-limiter');

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
// Suppress canvas warnings (we only need text extraction, not rendering)
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  // Suppress canvas-related warnings from pdf-parse
  if (message.includes('@napi-rs/canvas') || 
      message.includes('ImageData') || 
      message.includes('Path2D') ||
      message.includes('Cannot polyfill')) {
    return; // Suppress these warnings
  }
  originalConsoleWarn.apply(console, args);
};

const pdfParse = require('pdf-parse');

// Restore original console.warn
console.warn = originalConsoleWarn;

// File upload configuration will be created in createRoutes function
// to allow access to config for dynamic file size limits

function createRoutes(executor, db, logger) {
  // Get configuration
  const config = executor?.config || require('../utils/config-manager');
  
  // Configure file upload with security (using config)
  const fileUploadConfig = config?.get?.('fileUpload') || {};
  const maxFileSize = fileUploadConfig.maxFileSize || 50 * 1024 * 1024;
  const allowedTypes = fileUploadConfig.allowedTypes || ['.pdf', '.xlsx', '.xls'];
  const allowedMimeTypes = fileUploadConfig.allowedMimeTypes || [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
  ];
  
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
    const mimeTypeMap = {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/octet-stream': ['.xlsx', '.xls'] // Some browsers send this for Excel
    };
    
    // Check MIME type
    const mimeType = file.mimetype;
    const ext = InputSanitizer.getFileExtension(file.originalname).toLowerCase();
    
    // Validate extension
    if (!allowedTypes.includes(ext)) {
      return cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }

    // Validate MIME type (if provided)
    if (mimeType && mimeType !== 'application/octet-stream') {
      const allowedForMime = mimeTypeMap[mimeType];
      if (!allowedForMime || !allowedForMime.includes(ext)) {
        return cb(new Error(`MIME type ${mimeType} does not match file extension ${ext}`), false);
      }
    }

    cb(null, true);
  };

  const upload = multer({ 
    storage: storage,
    limits: { 
      fileSize: maxFileSize,
      files: 1 // Only one file at a time
    },
    fileFilter: fileFilter
  });
  
  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Helper function to get dbV2
  const getDbV2 = () => {
    try {
      const { getProjectService } = require('../services/project-service');
      const projectService = getProjectService();
      return projectService?.dbV2 || null;
    } catch {
      return null;
    }
  };

  // Initialize SimpleAuth and session middleware
  let simpleAuth = null;
  let sessionMiddleware = null;
  
  try {
    const dbV2 = getDbV2();
    if (dbV2 && dbV2.db) {
      const SimpleAuth = require('../modules/simple-auth');
      const { createSessionMiddleware } = require('../api/middleware/session');
      // Pass the actual database connection, not the DatabaseManagerV2 instance
      simpleAuth = new SimpleAuth(dbV2.db);
      sessionMiddleware = createSessionMiddleware(simpleAuth);
      
      // Apply session middleware to all routes (optional auth)
      router.use(sessionMiddleware);
      
      logger.info('SimpleAuth initialized');
    } else {
      logger.warn('dbV2 not available, auth features disabled');
    }
  } catch (error) {
    logger.warn('Failed to initialize SimpleAuth', { error: error.message });
  }

  // Auth endpoints
  /**
   * POST /api/auth/register
   * Register a new user
   */
  router.post('/auth/register', async (req, res, next) => {
    try {
      if (!simpleAuth) {
        return res.status(503).json({
          success: false,
          error: 'Authentication service not available',
          code: 'AUTH_UNAVAILABLE'
        });
      }

      const { email, name, password } = req.body;

      if (!email || !name || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email, name, and password are required',
          code: 'MISSING_FIELDS'
        });
      }

      // Sanitize inputs
      const sanitizedEmail = InputSanitizer.sanitizeString(email, { allowNewlines: false, maxLength: 255 });
      const sanitizedName = InputSanitizer.sanitizeString(name, { allowNewlines: false, maxLength: 255 });

      const user = simpleAuth.createUser(sanitizedEmail, sanitizedName, password);

      res.json({
        success: true,
        user: user,
        message: 'User created successfully'
      });
    } catch (error) {
      logger.error('Registration failed', { error: error.message });
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
          code: 'USER_EXISTS'
        });
      }
      error.status = error.status || 500;
      error.code = error.code || 'REGISTRATION_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/auth/login
   * Login user and create session
   */
  router.post('/auth/login', async (req, res, next) => {
    try {
      if (!simpleAuth) {
        return res.status(503).json({
          success: false,
          error: 'Authentication service not available',
          code: 'AUTH_UNAVAILABLE'
        });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      // Sanitize email
      const sanitizedEmail = InputSanitizer.sanitizeString(email, { allowNewlines: false, maxLength: 255 });

      const session = simpleAuth.login(sanitizedEmail, password);

      res.json({
        success: true,
        sessionId: session.sessionId,
        user: session.user,
        message: 'Login successful'
      });
    } catch (error) {
      logger.error('Login failed', { 
        error: error.message, 
        stack: error.stack,
        email: req.body?.email,
        hasSimpleAuth: !!simpleAuth,
        hasDb: !!(simpleAuth?.db)
      });
      if (error.message.includes('Invalid credentials')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }
      // In development, return more details
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({
          success: false,
          error: error.message,
          code: 'LOGIN_ERROR',
          stack: error.stack
        });
      }
      error.status = error.status || 500;
      error.code = error.code || 'LOGIN_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/auth/logout
   * Logout user (destroy session)
   */
  router.post('/auth/logout', async (req, res, next) => {
    try {
      if (!simpleAuth) {
        return res.status(503).json({
          success: false,
          error: 'Authentication service not available',
          code: 'AUTH_UNAVAILABLE'
        });
      }

      const sessionId = req.sessionId || req.headers['x-session-token'] || req.body.sessionId;

      if (sessionId) {
        simpleAuth.logout(sessionId);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout failed', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'LOGOUT_ERROR';
      next(error);
    }
  });

  /**
   * GET /api/auth/me
   * Get current user info
   */
  router.get('/auth/me', async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      res.json({
        success: true,
        user: req.user
      });
    } catch (error) {
      logger.error('Get user info failed', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'GET_USER_ERROR';
      next(error);
    }
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
  router.post('/upload-pdf', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        // Handle multer errors (file size, file type, etc.)
        logger.error('PDF upload multer error', { error: err.message });
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed',
          code: err.code || 'UPLOAD_ERROR'
        });
      }
      next();
    });
  }, async (req, res, next) => {
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
      filePath = req.file.path;
      
      // Check file size to determine if streaming is needed
      const FileStreamer = require('../utils/file-streamer');
      const fileSize = FileStreamer.getFileSize(filePath);
      const useStreaming = FileStreamer.shouldStream(filePath, 10 * 1024 * 1024); // 10MB threshold
      
      // Read only first 4 bytes for magic number check (memory efficient)
      const magicBuffer = Buffer.alloc(4);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, magicBuffer, 0, 4, 0);
      fs.closeSync(fd);
      
      // Check PDF magic bytes (%PDF)
      const magicBytes = magicBuffer.toString('ascii');
      if (magicBytes !== '%PDF') {
        fs.unlinkSync(filePath);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid PDF file. File does not appear to be a valid PDF.',
          code: 'INVALID_PDF_FILE'
        });
      }

      // Parse PDF (use streaming for large files)
      let pdfData;
      let extractedText;
      
      if (useStreaming) {
        // For large files, read in chunks but pdf-parse still needs full buffer
        // In production, consider using a streaming PDF parser
        const pdfBuffer = fs.readFileSync(filePath);
        pdfData = await pdfParse(pdfBuffer);
        extractedText = pdfData.text;
        logger.info('Large PDF processed', { 
          fileSize: fileSize,
          pages: pdfData.numpages 
        });
      } else {
        const pdfBuffer = fs.readFileSync(filePath);
        pdfData = await pdfParse(pdfBuffer);
        extractedText = pdfData.text;
      }

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
  router.post('/upload-excel', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        // Handle multer errors (file size, file type, etc.)
        logger.error('Excel upload multer error', { error: err.message });
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed',
          code: err.code || 'UPLOAD_ERROR'
        });
      }
      next();
    });
  }, async (req, res, next) => {
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

      // Extract as text (optimized: combine filter and map in single pass)
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const textLines = [];
      for (const row of rows) {
        const filteredRow = [];
        for (const cell of row) {
          if (cell) filteredRow.push(cell);
        }
        const line = filteredRow.join(' | ');
        if (line.trim()) {
          textLines.push(line);
        }
      }
      const extractedText = textLines.join('\n');

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
  // Note: config is already declared at the top of createRoutes function
  const perfMonitor = new PerformanceMonitor(logger, config);
  const maxConcurrent = config?.get?.('performance.maxConcurrentRequests') || 
                       parseInt(process.env.MAX_CONCURRENT_REQUESTS || '3', 10);
  const requestQueue = new RequestQueue({
    maxConcurrent: maxConcurrent
  });

  // Create rate limiters from config
  const rateLimiters = createRateLimiters(config);

  // Execute scoping (with rate limiting)
  router.post('/scope', rateLimiters.scope.middleware(), async (req, res, next) => {
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
        rateTier,
        outputVersion, // NEW: Output version ('v1' or 'v2')
        testMode, // NEW: Testing mode flag
        testCategory // NEW: Test category for tracking
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
        // Normalize empty strings to undefined (clean up before validation)
        // This handles cases where frontend sends empty strings for optional fields
        if (typeof projectDetails.projectScale === 'string' && projectDetails.projectScale.trim() === '') {
          projectDetails.projectScale = undefined;
        }
        if (typeof projectDetails.maxBudget === 'string' && projectDetails.maxBudget.trim() === '') {
          projectDetails.maxBudget = undefined;
        }
        if (typeof projectDetails.targetDeadline === 'string' && projectDetails.targetDeadline.trim() === '') {
          projectDetails.targetDeadline = undefined;
        }
        if (typeof projectDetails.marketRegion === 'string' && projectDetails.marketRegion.trim() === '') {
          projectDetails.marketRegion = undefined;
        }
        if (typeof projectDetails.businessModel === 'string' && projectDetails.businessModel.trim() === '') {
          projectDetails.businessModel = undefined;
        }
        
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
        },
        // Ensure warnings is always an array
        warnings: Array.isArray(result.warnings) ? result.warnings : []
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
      
      // Include dual-layer estimation fields (NEW - Step 7.85)
      if (result.technicalTruth) {
        response.technicalTruth = result.technicalTruth;
      }
      if (result.adjustedProposal) {
        response.adjustedProposal = result.adjustedProposal;
      }
      if (result.dualEstimate) {
        response.dualEstimate = result.dualEstimate;
      }
      if (result.gapIndicator) {
        response.gapIndicator = result.gapIndicator;
      }
      if (result.budgetOptimization) {
        response.budgetOptimization = result.budgetOptimization;
      }
      
      // Add execution warnings if fallback was used
      if (fallbackUsed && executionErrors.length > 0) {
        // Ensure warnings is an array (defensive check)
        if (!Array.isArray(response.warnings)) {
          response.warnings = [];
        }
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
      
      // Final safety check: ensure warnings is always an array before sending
      if (response.warnings !== undefined && !Array.isArray(response.warnings)) {
        logger.warn('Warnings was not an array, converting', {
          requestId,
          warningsType: typeof response.warnings,
          warningsValue: response.warnings
        });
        response.warnings = Array.isArray(response.warnings) ? response.warnings : [];
      }
      
      // Generate V2 output if requested
      if (outputVersion === 'v2') {
        try {
          const OutputTranslator = require('../modules/output-translator');
          const Library = require('../modules/library');
          const library = new Library(logger);
          const outputTranslator = new OutputTranslator(library, logger);
          
          // Extract output level and format from query params or body
          const outputLevel = req.query.outputLevel || req.body.outputLevel || 'detailed';
          const outputFormat = req.query.format || req.body.format || 'html';
          
          // Generate V2 output
          const v2Output = outputTranslator.translateV2(response, {
            level: outputLevel,
            format: outputFormat
          });
          
          // Add V2 output to response
          response.outputV2 = v2Output;
          response.outputVersion = 'v2';
          
          // If HTML format, also add it as the main output for easy access
          if (outputFormat === 'html' && v2Output.html) {
            response.html = v2Output.html;
          }
        } catch (v2Error) {
          logger.warn('Failed to generate V2 output, falling back to V1', {
            error: v2Error.message
          });
          // Continue with V1 output (response already has standard format)
          response.outputVersion = 'v1';
          response.v2Error = 'V2 output generation failed, using V1';
        }
      } else {
        response.outputVersion = 'v1';
      }
      
      // Save project and track if in test mode
      if (testMode) {
        try {
          const { getProjectService } = require('../services/project-service');
          const projectService = getProjectService();
          
          // Prepare project data for saving
          const projectData = {
            input: combinedInput,
            client: {
              company_name: projectDetails?.companyName || 'Test Client',
              contact_name: projectDetails?.contactName || 'Test User',
              email: projectDetails?.contactEmail || 'test@example.com'
            },
            clientProfile: result.clientProfile || response.clientProfile,
            domainContext: result.conversation?.domainContext || result.domainContext,
            extractedIntent: result.conversation?.extractedIntent || result.extractedIntent,
            refinedScope: result.refined?.refinedScope || result.refinedScope,
            technicalBreakdown: result.technicalBreakdown || response.technical?.technicalBreakdown,
            edgeCases: result.enriched?.edgeCases || result.edgeCases || [],
            assumptions: result.assumptions || response.assumptions || [],
            estimate: primaryEstimate,
            hiddenCosts: result.hiddenCosts || response.hiddenCosts,
            scenarios: result.scenarios || response.scenarios,
            inputAnalysis: result.inputAnalysis,
            inputType: pdfText ? 'pdf' : (excelText ? 'excel' : 'text'),
            projectName: projectDetails?.projectName || 'Test Project'
          };
          
          // Save project
          const saveResult = await projectService.saveProject(projectData);
          
          if (saveResult.newDb && saveResult.newDb.id) {
            const projectId = saveResult.newDb.id;
            response.projectId = projectId;
            response.testMode = true;
            response.testCategory = testCategory || null;
            
            // Track test metrics
            const dbV2 = getDbV2();
            if (dbV2) {
              const TestingMetrics = require('../modules/testing-metrics');
              // TestingMetrics expects the actual database connection, not the manager
              const db = dbV2?.db || dbV2;
              const testingMetrics = new TestingMetrics(db, logger);
              
              const processingTime = Date.now() - startTime;
              
              await testingMetrics.trackProject(projectId, {
                category: testCategory || 'small',
                processingTime: processingTime
              });
              
              logger.info('Test project tracked', {
                projectId,
                category: testCategory,
                processingTime
              });
            }
          } else {
            logger.warn('Failed to save test project', {
              saveResult
            });
            response.testMode = true;
            response.testCategory = testCategory || null;
            response.testSaveError = 'Project saved but test tracking failed';
          }
        } catch (testError) {
          logger.warn('Test mode tracking failed (non-blocking)', {
            error: testError.message
          });
          response.testMode = true;
          response.testCategory = testCategory || null;
          response.testTrackingError = testError.message;
        }
      }
      
      // Clean response to ensure JSON serialization works
      // Helper function to safely serialize, removing circular references
      const safeStringify = (obj, space = 0) => {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
          // Skip functions
          if (typeof value === 'function') {
            return undefined;
          }
          // Skip undefined
          if (value === undefined) {
            return null;
          }
          // Handle circular references
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          // Convert Error objects to plain objects
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack
            };
          }
          return value;
        }, space);
      };
      
      try {
        // First try normal serialization
        const cleanResponse = JSON.parse(JSON.stringify(response));
        res.json(cleanResponse);
      } catch (jsonError) {
        logger.error('Failed to serialize response to JSON (first attempt)', {
          requestId,
          error: jsonError.message,
          errorPath: jsonError.path || 'unknown',
          responseKeys: Object.keys(response || {}),
          hasScenarios: !!response.scenarios,
          hasRiskAssessment: !!response.riskAssessment,
          hasTechnical: !!response.technical
        });
        
        // Try with safe stringify
        try {
          const safeResponse = JSON.parse(safeStringify(response));
          res.json(safeResponse);
          logger.warn('Response serialized using safe stringify', { requestId });
        } catch (safeError) {
          logger.error('Failed to serialize response even with safe stringify', {
            requestId,
            error: safeError.message,
            stack: safeError.stack
          });
          
          // Send minimal response with key indicators
          const minimalResponse = {
            success: response.success !== false,
            error: 'Failed to format response - data may contain non-serializable content',
            code: 'RESPONSE_SERIALIZATION_ERROR',
            hasEstimate: !!response.estimate,
            hasScenarios: !!response.scenarios,
            hasRiskAssessment: !!response.riskAssessment,
            hasTechnical: !!response.technical,
            estimateAvailable: !!(response.estimate || response.technical?.estimate),
            scenariosCount: response.scenarios?.scenarios?.length || 0
          };
          
          res.status(500).json(minimalResponse);
          return;
        }
      }
      
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
      try {
        if (process.env.ENABLE_REQUEST_QUEUE === 'true') {
          await requestQueue.enqueue(executeRequest, 0);
        } else {
          await executeRequest();
        }
      } catch (execError) {
        // If executeRequest throws, it should have already sent a response
        // But if it didn't, we need to handle it here
        if (!res.headersSent) {
          logger.error('Request execution failed and no response sent', {
            requestId,
            error: execError.message,
            stack: execError.stack
          });
          res.status(500).json({
            success: false,
            error: 'An internal error occurred. Please try again later.',
            code: 'REQUEST_ERROR'
          });
        }
        // Don't call next() if we already sent a response
        return;
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

  // Output generation endpoints (V2)
  
  /**
   * GET /api/projects/:id/output/:format
   * Generate output for existing project
   */
  router.get('/projects/:id/output/:format', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.id, { allowNewlines: false });
      const format = InputSanitizer.sanitizeString(req.params.format, { allowNewlines: false });
      
      if (!['html', 'json'].includes(format)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid format. Use "html" or "json"',
          code: 'INVALID_FORMAT'
        });
      }
      
      // Get project from database
      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }
      
      // Try to get project data
      // Note: This assumes projects are stored with full chain result
      // In production, you'd fetch from database and reconstruct chain result
      const project = dbV2.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }
      
      // Parse project data (reconstruct from stored fields)
      let projectData;
      try {
        // Reconstruct project data from database fields
        projectData = {
          technical: {
            plan: project.refined_scope ? JSON.parse(project.refined_scope) : {},
            estimate: project.base_estimate ? JSON.parse(project.base_estimate) : {},
            technicalBreakdown: project.technical_breakdown ? JSON.parse(project.technical_breakdown) : null
          },
          clientProfile: project.client_profile ? JSON.parse(project.client_profile) : null,
          hiddenCosts: project.hidden_costs ? JSON.parse(project.hidden_costs) : null,
          scenarios: project.scenarios ? JSON.parse(project.scenarios) : null,
          assumptions: project.assumptions ? JSON.parse(project.assumptions) : []
        };
      } catch (parseError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to parse project data',
          code: 'PARSE_ERROR'
        });
      }
      
      // Generate output
      const OutputTranslator = require('../modules/output-translator');
      const Library = require('../modules/library');
      const library = new Library(logger);
      const outputTranslator = new OutputTranslator(library, logger);
      
      const outputLevel = req.query.level || 'detailed';
      const v2Output = outputTranslator.translateV2(projectData, {
        level: outputLevel,
        format: format
      });
      
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        res.send(v2Output.html);
      } else {
        res.json({
          success: true,
          output: v2Output,
          projectId: projectId
        });
      }
    } catch (error) {
      logger.error('Failed to generate output', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'OUTPUT_GENERATION_ERROR';
      next(error);
    }
  });
  
  /**
   * POST /api/projects/:id/regenerate-output
   * Regenerate output with different options
   */
  router.post('/projects/:id/regenerate-output', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.id, { allowNewlines: false });
      const { level = 'detailed', format = 'html' } = req.body;
      
      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }
      
      const project = dbV2.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }
      
      // Reconstruct project data from database fields
      let projectData;
      try {
        projectData = {
          technical: {
            plan: project.refined_scope ? JSON.parse(project.refined_scope) : {},
            estimate: project.base_estimate ? JSON.parse(project.base_estimate) : {},
            technicalBreakdown: project.technical_breakdown ? JSON.parse(project.technical_breakdown) : null
          },
          clientProfile: project.client_profile ? JSON.parse(project.client_profile) : null,
          hiddenCosts: project.hidden_costs ? JSON.parse(project.hidden_costs) : null,
          scenarios: project.scenarios ? JSON.parse(project.scenarios) : null,
          assumptions: project.assumptions ? JSON.parse(project.assumptions) : []
        };
      } catch (parseError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to parse project data',
          code: 'PARSE_ERROR'
        });
      }
      
      const OutputTranslator = require('../modules/output-translator');
      const Library = require('../modules/library');
      const library = new Library(logger);
      const outputTranslator = new OutputTranslator(library, logger);
      
      const v2Output = outputTranslator.translateV2(projectData, {
        level: level,
        format: format
      });
      
      // Update project with new output version if needed
      if (req.body.updateProject !== false) {
        dbV2.prepare('UPDATE projects SET output_version = ? WHERE id = ?')
          .run('v2', projectId);
      }
      
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        res.send(v2Output.html);
      } else {
        res.json({
          success: true,
          output: v2Output,
          projectId: projectId,
          regenerated: true
        });
      }
    } catch (error) {
      logger.error('Failed to regenerate output', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'OUTPUT_REGENERATION_ERROR';
      next(error);
    }
  });
  
  /**
   * GET /api/projects/:id/output-preview
   * Preview output without saving
   */
  router.get('/projects/:id/output-preview', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.id, { allowNewlines: false });
      const level = req.query.level || 'detailed';
      const format = req.query.format || 'html';
      
      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }
      
      const project = dbV2.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }
      
      // Reconstruct project data from database fields
      let projectData;
      try {
        projectData = {
          technical: {
            plan: project.refined_scope ? JSON.parse(project.refined_scope) : {},
            estimate: project.base_estimate ? JSON.parse(project.base_estimate) : {},
            technicalBreakdown: project.technical_breakdown ? JSON.parse(project.technical_breakdown) : null
          },
          clientProfile: project.client_profile ? JSON.parse(project.client_profile) : null,
          hiddenCosts: project.hidden_costs ? JSON.parse(project.hidden_costs) : null,
          scenarios: project.scenarios ? JSON.parse(project.scenarios) : null,
          assumptions: project.assumptions ? JSON.parse(project.assumptions) : []
        };
      } catch (parseError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to parse project data',
          code: 'PARSE_ERROR'
        });
      }
      
      const OutputTranslator = require('../modules/output-translator');
      const Library = require('../modules/library');
      const library = new Library(logger);
      const outputTranslator = new OutputTranslator(library, logger);
      
      const v2Output = outputTranslator.translateV2(projectData, {
        level: level,
        format: format
      });
      
      res.json({
        success: true,
        preview: true,
        output: v2Output,
        projectId: projectId
      });
    } catch (error) {
      logger.error('Failed to preview output', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'OUTPUT_PREVIEW_ERROR';
      next(error);
    }
  });

  // Testing endpoints
  /**
   * GET /api/testing/stats
   * Get testing statistics
   */
  router.get('/testing/stats', async (req, res, next) => {
    try {
      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }

      const TestingMetrics = require('../modules/testing-metrics');
      // TestingMetrics expects the actual database connection, not the manager
      const db = dbV2?.db || dbV2;
      if (!db) {
        return res.status(503).json({
          success: false,
          error: 'Database connection not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }
      const testingMetrics = new TestingMetrics(db, logger);
      
      const stats = await testingMetrics.getTestingSummary();
      
      res.json({
        success: true,
        ...stats
      });
    } catch (error) {
      logger.error('Failed to get testing stats', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'TESTING_STATS_ERROR';
      next(error);
    }
  });

  /**
   * GET /api/testing/projects
   * Get list of test projects
   */
  router.get('/testing/projects', async (req, res, next) => {
    try {
      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }

      const TestingMetrics = require('../modules/testing-metrics');
      // TestingMetrics expects the actual database connection, not the manager
      const db = dbV2?.db || dbV2;
      if (!db) {
        return res.status(503).json({
          success: false,
          error: 'Database connection not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }
      const testingMetrics = new TestingMetrics(db, logger);
      
      const limit = parseInt(req.query.limit) || 50;
      const projects = testingMetrics.getTestProjects(limit);
      
      res.json({
        success: true,
        projects: projects
      });
    } catch (error) {
      logger.error('Failed to get test projects', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'TESTING_PROJECTS_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/testing/record
   * Record test metrics for a project
   */
  router.post('/testing/record', async (req, res, next) => {
    try {
      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }

      const { projectId, category, processingTime, inputQuality, outputModifications, wouldPayFor, improvements } = req.body;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required',
          code: 'MISSING_PROJECT_ID'
        });
      }

      const TestingMetrics = require('../modules/testing-metrics');
      // TestingMetrics expects the actual database connection, not the manager
      const db = dbV2?.db || dbV2;
      if (!db) {
        return res.status(503).json({
          success: false,
          error: 'Database connection not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }
      const testingMetrics = new TestingMetrics(db, logger);
      
      const result = await testingMetrics.trackProject(projectId, {
        category,
        processingTime,
        inputQuality,
        outputModifications,
        wouldPayFor,
        improvements
      });
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Failed to record test metrics', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'TESTING_RECORD_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/testing/feedback/:id
   * Submit feedback for a test project
   */
  router.post('/testing/feedback/:id', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.id, { allowNewlines: false });
      const { cost, timeline, output_quality_score, wouldPayFor, improvements } = req.body;

      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }

      const TestingMetrics = require('../modules/testing-metrics');
      // TestingMetrics expects the actual database connection, not the manager
      const db = dbV2?.db || dbV2;
      if (!db) {
        return res.status(503).json({
          success: false,
          error: 'Database connection not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }
      const testingMetrics = new TestingMetrics(db, logger);
      
      // Validate and sanitize feedback
      const feedback = {};
      if (cost !== undefined && cost !== null) {
        feedback.cost = typeof cost === 'string' ? parseFloat(cost) : cost;
        if (isNaN(feedback.cost) || feedback.cost < 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid cost value',
            code: 'INVALID_COST'
          });
        }
      }

      if (timeline !== undefined && timeline !== null) {
        feedback.timeline = typeof timeline === 'string' ? parseInt(timeline, 10) : timeline;
        if (isNaN(feedback.timeline) || feedback.timeline < 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid timeline value',
            code: 'INVALID_TIMELINE'
          });
        }
      }

      if (output_quality_score !== undefined && output_quality_score !== null) {
        feedback.output_quality_score = typeof output_quality_score === 'string' 
          ? parseInt(output_quality_score, 10) 
          : output_quality_score;
        if (isNaN(feedback.output_quality_score) || feedback.output_quality_score < 1 || feedback.output_quality_score > 10) {
          return res.status(400).json({
            success: false,
            error: 'Quality score must be between 1 and 10',
            code: 'INVALID_QUALITY_SCORE'
          });
        }
      }

      if (wouldPayFor !== undefined) {
        feedback.wouldPayFor = Boolean(wouldPayFor);
      }

      if (improvements) {
        feedback.improvements = InputSanitizer.sanitizeString(improvements, { 
          allowNewlines: true, 
          maxLength: 1000 
        });
      }

      const result = testingMetrics.submitFeedback(projectId, feedback);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Failed to submit test feedback', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'TESTING_FEEDBACK_ERROR';
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

  // Feedback endpoints
  const FeedbackAutomator = require('../modules/feedback-automator');
  const feedbackAutomator = new FeedbackAutomator(db, logger, config);

  /**
   * GET /api/projects/:id/feedback-request
   * Generate feedback request URL for a project
   */
  router.get('/projects/:id/feedback-request', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.id, { allowNewlines: false });
      
      const feedbackRequest = await feedbackAutomator.createFeedbackRequest(projectId);
      
      res.json({
        success: true,
        ...feedbackRequest
      });
    } catch (error) {
      logger.error('Failed to create feedback request', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'FEEDBACK_REQUEST_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/projects/:id/feedback
   * Submit feedback for a completed project
   */
  router.post('/projects/:id/feedback', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.id, { allowNewlines: false });
      const token = InputSanitizer.sanitizeString(req.query.token || req.body.token, { allowNewlines: false });
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Feedback token is required',
          code: 'MISSING_TOKEN'
        });
      }

      // Sanitize and validate actual data
      let actualData = req.body;
      if (actualData.cost !== undefined) {
        actualData.cost = typeof actualData.cost === 'string' 
          ? parseFloat(actualData.cost) 
          : actualData.cost;
        if (isNaN(actualData.cost) || actualData.cost < 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid cost value',
            code: 'INVALID_COST'
          });
        }
      }

      if (actualData.timeline !== undefined || actualData.days !== undefined) {
        const days = actualData.timeline || actualData.days;
        actualData.timeline = typeof days === 'string' ? parseInt(days, 10) : days;
        actualData.days = actualData.timeline;
        if (isNaN(actualData.timeline) || actualData.timeline < 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid timeline value',
            code: 'INVALID_TIMELINE'
          });
        }
      }

      if (actualData.scopeCreep !== undefined) {
        actualData.scopeCreep = typeof actualData.scopeCreep === 'string'
          ? parseFloat(actualData.scopeCreep)
          : actualData.scopeCreep;
        if (isNaN(actualData.scopeCreep)) {
          actualData.scopeCreep = 0;
        }
      }

      // Sanitize module actuals if provided
      if (actualData.moduleActuals && typeof actualData.moduleActuals === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(actualData.moduleActuals)) {
          const sanitizedKey = InputSanitizer.sanitizeString(key, { allowNewlines: false });
          const sanitizedValue = typeof value === 'number' ? value : parseFloat(value);
          if (!isNaN(sanitizedValue)) {
            sanitized[sanitizedKey] = sanitizedValue;
          }
        }
        actualData.moduleActuals = sanitized;
      }

      // Sanitize hidden costs if provided
      if (actualData.hiddenCosts && Array.isArray(actualData.hiddenCosts)) {
        actualData.hiddenCosts = actualData.hiddenCosts.map(cost => ({
          cost_type: InputSanitizer.sanitizeString(cost.cost_type || cost.type, { allowNewlines: false }),
          estimated_percentage: typeof cost.estimated_percentage === 'number' ? cost.estimated_percentage : parseFloat(cost.estimated_percentage || 0),
          estimated_amount: typeof cost.estimated_amount === 'number' ? cost.estimated_amount : parseFloat(cost.estimated_amount || 0),
          actual_percentage: typeof cost.actual_percentage === 'number' ? cost.actual_percentage : parseFloat(cost.actual_percentage || 0),
          actual_amount: typeof cost.actual_amount === 'number' ? cost.actual_amount : parseFloat(cost.actual_amount || 0)
        })).filter(cost => cost.cost_type);
      }

      const result = await feedbackAutomator.processFeedback(projectId, token, actualData);
      
      res.json({
        success: true,
        message: result.message,
        variances: result.variances
      });
    } catch (error) {
      logger.error('Failed to process feedback', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'FEEDBACK_PROCESSING_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/projects/:id/complete
   * Mark project as complete with actuals (alternative to feedback endpoint)
   */
  router.post('/projects/:id/complete', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.id, { allowNewlines: false });
      
      // This endpoint can be used internally or with authentication
      // For now, we'll use the same feedback processing logic
      const token = 'internal-complete-' + Date.now(); // Internal token
      
      // Sanitize actual data (same as feedback endpoint)
      let actualData = req.body;
      if (actualData.cost !== undefined) {
        actualData.cost = typeof actualData.cost === 'string' ? parseFloat(actualData.cost) : actualData.cost;
      }
      if (actualData.timeline !== undefined || actualData.days !== undefined) {
        actualData.timeline = actualData.timeline || actualData.days;
        actualData.days = actualData.timeline;
      }

      const result = await feedbackAutomator.processFeedback(projectId, token, actualData);
      
      // Also generate feedback request for future feedback collection
      const feedbackRequest = await feedbackAutomator.createFeedbackRequest(projectId);
      
      res.json({
        success: true,
        message: 'Project marked as complete',
        variances: result.variances,
        feedbackUrl: feedbackRequest.feedbackUrl
      });
    } catch (error) {
      logger.error('Failed to complete project', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'PROJECT_COMPLETION_ERROR';
      next(error);
    }
  });

  /**
   * CHECKPOINT ENDPOINTS
   */

  /**
   * POST /api/scope/checkpoint
   * Save checkpoint decision and continue/pause
   */
  router.post('/scope/checkpoint', async (req, res, next) => {
    try {
      const { sessionId, checkpointId, decisionType, decisionData } = req.body;
      
      if (!sessionId || !checkpointId || !decisionType) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, checkpointId, and decisionType are required',
          code: 'MISSING_PARAMETERS'
        });
      }

      // Get checkpoint manager from chain executor
      const { getProjectService } = require('../services/project-service');
      const projectService = getProjectService();
      
      if (!projectService || !projectService.dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Checkpoint system not available',
          code: 'CHECKPOINT_SYSTEM_UNAVAILABLE'
        });
      }

      const CheckpointManager = require('../modules/checkpoint-manager');
      const checkpointManager = new CheckpointManager(projectService.dbV2, logger);

      // Save decision
      const decision = checkpointManager.saveDecision(
        sessionId,
        checkpointId,
        decisionType,
        decisionData || {}
      );

      res.json({
        success: true,
        decision: decision,
        message: 'Checkpoint decision saved'
      });
    } catch (error) {
      logger.error('Failed to save checkpoint decision', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'CHECKPOINT_DECISION_ERROR';
      next(error);
    }
  });

  /**
   * GET /api/scope/checkpoint/:sessionId
   * Get checkpoint state for a session
   */
  router.get('/scope/checkpoint/:sessionId', async (req, res, next) => {
    try {
      const sessionId = InputSanitizer.sanitizeString(req.params.sessionId, { allowNewlines: false });
      const checkpointId = InputSanitizer.sanitizeString(req.query.checkpointId || '', { allowNewlines: false });

      const { getProjectService } = require('../services/project-service');
      const projectService = getProjectService();
      
      if (!projectService || !projectService.dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Checkpoint system not available',
          code: 'CHECKPOINT_SYSTEM_UNAVAILABLE'
        });
      }

      const CheckpointManager = require('../modules/checkpoint-manager');
      const checkpointManager = new CheckpointManager(projectService.dbV2, logger);

      if (checkpointId) {
        // Get specific checkpoint
        const checkpoint = checkpointManager.getCheckpoint(sessionId, checkpointId);
        if (!checkpoint) {
          return res.status(404).json({
            success: false,
            error: 'Checkpoint not found',
            code: 'CHECKPOINT_NOT_FOUND'
          });
        }
        res.json({ success: true, checkpoint });
      } else {
        // List all checkpoints for session
        const checkpoints = checkpointManager.listCheckpoints(sessionId);
        res.json({ success: true, checkpoints });
      }
    } catch (error) {
      logger.error('Failed to get checkpoint', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'CHECKPOINT_GET_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/scope/resume
   * Resume execution from a checkpoint
   */
  router.post('/scope/resume', async (req, res, next) => {
    try {
      const { sessionId, checkpointId } = req.body;
      
      if (!sessionId || !checkpointId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId and checkpointId are required',
          code: 'MISSING_PARAMETERS'
        });
      }

      // Resume execution using chain executor
      // Note: This requires access to chain executor instance
      // For now, return checkpoint state and let client handle continuation
      const { getProjectService } = require('../services/project-service');
      const projectService = getProjectService();
      
      if (!projectService || !projectService.dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Checkpoint system not available',
          code: 'CHECKPOINT_SYSTEM_UNAVAILABLE'
        });
      }

      const CheckpointManager = require('../modules/checkpoint-manager');
      const checkpointManager = new CheckpointManager(projectService.dbV2, logger);

      const resumeData = checkpointManager.resumeFromCheckpoint(sessionId, checkpointId);
      
      res.json({
        success: true,
        resumeData: resumeData,
        message: 'Checkpoint state restored. Use chain executor to continue execution.'
      });
    } catch (error) {
      logger.error('Failed to resume from checkpoint', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'CHECKPOINT_RESUME_ERROR';
      next(error);
    }
  });

  /**
   * PRESCRIPTION ENDPOINT
   */

  /**
   * POST /api/prescribe
   * Get architecture prescription for domain/requirements
   */
  router.post('/prescribe', async (req, res, next) => {
    try {
      const { domain, requirements } = req.body;
      
      if (!domain) {
        return res.status(400).json({
          success: false,
          error: 'domain is required',
          code: 'MISSING_DOMAIN'
        });
      }

      const PrescriptiveEngine = require('../modules/prescriptive-engine');
      const prescriptiveEngine = new PrescriptiveEngine(logger);

      const prescription = prescriptiveEngine.prescribe(domain, requirements || {});

      res.json({
        success: true,
        prescription: prescription
      });
    } catch (error) {
      logger.error('Failed to generate prescription', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'PRESCRIPTION_ERROR';
      next(error);
    }
  });

  /**
   * BLUEPRINT ENDPOINTS
   */

  /**
   * POST /api/blueprint/generate
   * Generate blueprint for a project
   */
  router.post('/blueprint/generate', async (req, res, next) => {
    try {
      const { project, depth } = req.body;
      
      if (!project) {
        return res.status(400).json({
          success: false,
          error: 'project data is required',
          code: 'MISSING_PROJECT'
        });
      }

      const BlueprintGenerator = require('../modules/blueprint-generator');
      const blueprintGen = new BlueprintGenerator(logger);

      const blueprint = blueprintGen.generateBlueprint(project, depth || 'detailed');

      res.json({
        success: true,
        blueprint: blueprint
      });
    } catch (error) {
      logger.error('Failed to generate blueprint', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'BLUEPRINT_GENERATION_ERROR';
      next(error);
    }
  });

  /**
   * SPRINT PLANNING ENDPOINTS
   */

  /**
   * POST /api/sprint/generate
   * Generate sprint plan for a project
   */
  router.post('/sprint/generate', async (req, res, next) => {
    try {
      const { project, teamSize = 5 } = req.body;
      
      if (!project) {
        return res.status(400).json({
          success: false,
          error: 'project data is required',
          code: 'MISSING_PROJECT'
        });
      }

      const SprintPlanner = require('../modules/sprint-planner');
      const sprintPlanner = new SprintPlanner(logger);

      const sprintPlan = sprintPlanner.generateSprints(project, teamSize);

      res.json({
        success: true,
        sprintPlan: sprintPlan
      });
    } catch (error) {
      logger.error('Failed to generate sprint plan', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'SPRINT_GENERATION_ERROR';
      next(error);
    }
  });

  /**
   * GET /api/sprint/:projectId
   * Get sprint plan for a project
   */
  router.get('/sprint/:projectId', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.projectId, { allowNewlines: false });
      
      // Get project from database
      const { getProjectService } = require('../services/project-service');
      const projectService = getProjectService();
      
      if (!projectService || !projectService.dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }

      // Get project data
      const project = projectService.dbV2.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      // Generate sprint plan from project data
      const SprintPlanner = require('../modules/sprint-planner');
      const sprintPlanner = new SprintPlanner(logger);
      
      // Reconstruct project object from database fields
      const projectData = {
        technicalBreakdown: project.technical_breakdown ? JSON.parse(project.technical_breakdown) : null,
        refinedScope: project.refined_scope ? JSON.parse(project.refined_scope) : null
      };
      
      const teamSize = project.team_size || 5;
      const sprintPlan = sprintPlanner.generateSprints(projectData, teamSize);

      res.json({
        success: true,
        sprintPlan: sprintPlan
      });
    } catch (error) {
      logger.error('Failed to get sprint plan', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'SPRINT_GET_ERROR';
      next(error);
    }
  });

  /**
   * GET /api/blueprint/:projectId
   * Get saved blueprint for a project
   */
  router.get('/blueprint/:projectId', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.projectId, { allowNewlines: false });
      
      // Get project from database
      const { getProjectService } = require('../services/project-service');
      const projectService = getProjectService();
      
      if (!projectService || !projectService.dbV2) {
        return res.status(503).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_UNAVAILABLE'
        });
      }

      // Get project data
      const project = projectService.dbV2.getProject(parseInt(projectId));
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      // Reconstruct project data for blueprint generation
      const projectData = {
        technicalBreakdown: project.technical_breakdown ? JSON.parse(project.technical_breakdown) : null,
        refinedScope: project.refined_scope ? JSON.parse(project.refined_scope) : null,
        estimate: project.base_estimate ? JSON.parse(project.base_estimate) : null
      };

      const BlueprintGenerator = require('../modules/blueprint-generator');
      const blueprintGen = new BlueprintGenerator(logger);

      const blueprint = blueprintGen.generateBlueprint(projectData, 'comprehensive');

      res.json({
        success: true,
        blueprint: blueprint,
        projectId: projectId
      });
    } catch (error) {
      logger.error('Failed to get blueprint', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'BLUEPRINT_GET_ERROR';
      next(error);
    }
  });

  // ============================================
  // CONVERSATION MODE ENDPOINTS
  // ============================================

  // Initialize conversation modules
  let conversationEngine = null;
  let questionBank = null;
  let requirementExtractor = null;
  
  try {
    const QuestionBank = require('../modules/question-bank');
    const RequirementExtractor = require('../modules/requirement-extractor');
    const ConversationEngine = require('../modules/conversation-engine');
    const InputAnalyzer = require('../modules/input-analyzer');
    
    questionBank = new QuestionBank(logger);
    const inputAnalyzer = new InputAnalyzer(logger);
    requirementExtractor = new RequirementExtractor(logger, inputAnalyzer);
    conversationEngine = new ConversationEngine(logger, questionBank, requirementExtractor);
    
    logger.info('Conversation modules initialized');
  } catch (error) {
    logger.warn('Failed to initialize conversation modules', { error: error.message });
  }

  /**
   * POST /api/conversation/start
   * Initialize new conversation, return sessionId
   */
  router.post('/conversation/start', async (req, res, next) => {
    try {
      if (!conversationEngine || !db) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Conversation service not initialized'
        });
      }

      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          error: 'Database unavailable',
          message: 'Database V2 not available'
        });
      }

      // Generate unique session ID
      const sessionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize conversation engine state
      conversationEngine.resetState();
      const initialState = conversationEngine.getState();
      
      // Create conversation in database
      const conversationId = dbV2.createConversation(sessionId, initialState);
      
      res.json({
        success: true,
        sessionId: sessionId,
        conversationId: conversationId,
        message: 'Conversation started'
      });
    } catch (error) {
      logger.error('Failed to start conversation', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'CONVERSATION_START_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/conversation/:id/message
   * Process user message, return bot response, completeness, suggestions
   */
  router.post('/conversation/:id/message', async (req, res, next) => {
    try {
      if (!conversationEngine || !db) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Conversation service not initialized'
        });
      }

      const { id: sessionId } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Message is required'
        });
      }

      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          error: 'Database unavailable',
          message: 'Database V2 not available'
        });
      }

      // Get existing conversation
      let conversation = dbV2.getConversation(sessionId);
      
      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found',
          message: 'Please start a new conversation'
        });
      }

      // Restore state in conversation engine
      conversationEngine.setState(conversation.state);
      
      // Process user input
      const result = await conversationEngine.processInput(message, conversation.state);
      
      // Update conversation in database
      dbV2.updateConversation(
        sessionId,
        result.state,
        result.requirements,
        result.completeness
      );
      
      // Add conversation turn
      // Count user messages to determine turn number (each turn = 1 user message + 1 bot response)
      const userMessages = conversation.state.conversation.filter(c => c.role === 'user').length;
      const turnNumber = userMessages; // Turn number is based on user message count
      dbV2.addConversationTurn(
        conversation.id,
        turnNumber,
        message,
        result.botResponse,
        result.requirements
      );
      
      res.json({
        success: true,
        completeness: result.completeness,
        canGenerate: result.canGenerate,
        stage: result.stage,
        stageName: result.stageName,
        botResponse: result.botResponse,
        nextQuestion: result.nextQuestion,
        suggestions: result.suggestions,
        preview: result.preview
      });
    } catch (error) {
      logger.error('Failed to process conversation message', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'CONVERSATION_MESSAGE_ERROR';
      next(error);
    }
  });

  /**
   * GET /api/conversation/:id/state
   * Get current conversation state and requirements
   */
  router.get('/conversation/:id/state', async (req, res, next) => {
    try {
      const { id: sessionId } = req.params;

      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          error: 'Database unavailable',
          message: 'Database V2 not available'
        });
      }

      const conversation = dbV2.getConversation(sessionId);
      
      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found',
          message: 'Conversation does not exist'
        });
      }

      // Get conversation turns
      const turns = dbV2.getConversationTurns(conversation.id);

      res.json({
        success: true,
        conversation: {
          sessionId: conversation.sessionId,
          completeness: conversation.completeness,
          requirements: conversation.requirements,
          status: conversation.status,
          createdAt: conversation.createdAt,
          lastActivityAt: conversation.lastActivityAt
        },
        turns: turns
      });
    } catch (error) {
      logger.error('Failed to get conversation state', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'CONVERSATION_STATE_ERROR';
      next(error);
    }
  });

  /**
   * GET /api/conversation/:id/preview
   * Get template-based preview without generation
   */
  router.get('/conversation/:id/preview', async (req, res, next) => {
    try {
      if (!conversationEngine) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Conversation service not initialized'
        });
      }

      const { id: sessionId } = req.params;

      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          error: 'Database unavailable',
          message: 'Database V2 not available'
        });
      }

      const conversation = dbV2.getConversation(sessionId);
      
      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found',
          message: 'Conversation does not exist'
        });
      }

      // Restore state and generate preview
      conversationEngine.setState(conversation.state);
      const preview = conversationEngine.generatePreview();

      res.json({
        success: true,
        preview: preview
      });
    } catch (error) {
      logger.error('Failed to generate preview', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'CONVERSATION_PREVIEW_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/conversation/:id/generate
   * Trigger actual generation with selected outputs
   */
  router.post('/conversation/:id/generate', async (req, res, next) => {
    try {
      const { id: sessionId } = req.params;
      const { outputs = ['business', 'technical'] } = req.body;

      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          error: 'Database unavailable',
          message: 'Database V2 not available'
        });
      }

      const conversation = dbV2.getConversation(sessionId);
      
      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found',
          message: 'Conversation does not exist'
        });
      }

      // Mark conversation as completed
      dbV2.updateConversationStatus(sessionId, 'completed');

      // Convert conversation requirements to chain input format
      const GenerationController = require('../modules/generation-controller');
      const generationController = new GenerationController(logger, executor, db);
      
      const chainInput = generationController.convertToChainInput(conversation.requirements);
      
      // Execute chain with selected outputs
      const result = await generationController.generate(sessionId, {
        outputs: outputs,
        requirements: conversation.requirements
      });

      res.json({
        success: true,
        result: result,
        outputs: outputs,
        projectId: result.projectId || null,
        progressiveOutputEnabled: result.progressiveOutputEnabled || false
      });
    } catch (error) {
      logger.error('Failed to generate from conversation', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'CONVERSATION_GENERATE_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/conversation/:id/save
   * Save conversation state (explicit save)
   */
  router.post('/conversation/:id/save', async (req, res, next) => {
    try {
      const { id: sessionId } = req.params;

      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          error: 'Database unavailable',
          message: 'Database V2 not available'
        });
      }

      const conversation = dbV2.getConversation(sessionId);
      
      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found',
          message: 'Conversation does not exist'
        });
      }

      // Save conversation state
      dbV2.saveConversationState(sessionId, conversation.state);

      res.json({
        success: true,
        message: 'Conversation saved successfully'
      });
    } catch (error) {
      logger.error('Failed to save conversation', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'CONVERSATION_SAVE_ERROR';
      next(error);
    }
  });

  /**
   * GET /api/conversation/:id/resume
   * Resume saved conversation
   */
  router.get('/conversation/:id/resume', async (req, res, next) => {
    try {
      if (!conversationEngine) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Conversation service not initialized'
        });
      }

      const { id: sessionId } = req.params;

      const dbV2 = getDbV2();
      if (!dbV2) {
        return res.status(503).json({
          error: 'Database unavailable',
          message: 'Database V2 not available'
        });
      }

      const conversation = dbV2.getConversation(sessionId);
      
      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found',
          message: 'Conversation does not exist'
        });
      }

      // Get conversation turns
      const turns = dbV2.getConversationTurns(conversation.id);

      // Restore state in conversation engine
      conversationEngine.setState(conversation.state);

      res.json({
        success: true,
        conversation: {
          sessionId: conversation.sessionId,
          completeness: conversation.completeness,
          requirements: conversation.requirements,
          status: conversation.status
        },
        turns: turns,
        state: conversation.state
      });
    } catch (error) {
      logger.error('Failed to resume conversation', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'CONVERSATION_RESUME_ERROR';
      next(error);
    }
  });

  /**
   * Progressive Output System Endpoints
   */

  /**
   * GET /api/output/levels/:projectId
   * Get available output levels for a project
   */
  router.get('/output/levels/:projectId', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.projectId, { allowNewlines: false });
      
      const OutputDeliveryController = require('../modules/output-delivery-controller');
      const controller = new OutputDeliveryController(logger);
      
      const levels = controller.getAvailableLevels(projectId);
      
      res.json({
        success: true,
        ...levels
      });
    } catch (error) {
      logger.error('Failed to get output levels', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'OUTPUT_LEVELS_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/output/deliver
   * Deliver output for specific level
   */
  router.post('/output/deliver', async (req, res, next) => {
    try {
      const { projectId, level, previousLevel } = req.body;
      
      if (!projectId || !level) {
        return res.status(400).json({
          success: false,
          error: 'projectId and level are required',
          code: 'MISSING_PARAMS'
        });
      }

      const sanitizedProjectId = InputSanitizer.sanitizeString(projectId, { allowNewlines: false });
      const sanitizedLevel = InputSanitizer.sanitizeString(level, { allowNewlines: false });
      const sanitizedPreviousLevel = previousLevel ? InputSanitizer.sanitizeString(previousLevel, { allowNewlines: false }) : null;
      
      const OutputDeliveryController = require('../modules/output-delivery-controller');
      const controller = new OutputDeliveryController(logger);
      
      const output = await controller.deliverOutput(sanitizedProjectId, sanitizedLevel, sanitizedPreviousLevel);
      
      res.json({
        success: true,
        output: output
      });
    } catch (error) {
      logger.error('Failed to deliver output', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'OUTPUT_DELIVERY_ERROR';
      next(error);
    }
  });

  /**
   * POST /api/output/upgrade
   * Upgrade from one level to another
   */
  router.post('/output/upgrade', async (req, res, next) => {
    try {
      const { projectId, fromLevel, toLevel } = req.body;
      
      if (!projectId || !fromLevel || !toLevel) {
        return res.status(400).json({
          success: false,
          error: 'projectId, fromLevel, and toLevel are required',
          code: 'MISSING_PARAMS'
        });
      }

      const sanitizedProjectId = InputSanitizer.sanitizeString(projectId, { allowNewlines: false });
      const sanitizedFromLevel = InputSanitizer.sanitizeString(fromLevel, { allowNewlines: false });
      const sanitizedToLevel = InputSanitizer.sanitizeString(toLevel, { allowNewlines: false });
      
      const OutputDeliveryController = require('../modules/output-delivery-controller');
      const controller = new OutputDeliveryController(logger);
      
      const upgrade = await controller.upgradeOutput(sanitizedProjectId, sanitizedFromLevel, sanitizedToLevel);
      
      res.json({
        success: true,
        upgrade: upgrade
      });
    } catch (error) {
      logger.error('Failed to upgrade output', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'OUTPUT_UPGRADE_ERROR';
      next(error);
    }
  });

  /**
   * GET /api/output/training/:projectId
   * Get all levels (training mode only)
   */
  router.get('/output/training/:projectId', async (req, res, next) => {
    try {
      if (process.env.TRAINING_MODE !== 'true') {
        return res.status(403).json({
          success: false,
          error: 'Training mode not enabled',
          code: 'TRAINING_MODE_DISABLED'
        });
      }

      const projectId = InputSanitizer.sanitizeString(req.params.projectId, { allowNewlines: false });
      
      const OutputDeliveryController = require('../modules/output-delivery-controller');
      const controller = new OutputDeliveryController(logger);
      
      const levels = ['L1_DISCOVERY', 'L2_PLANNING', 'L3_ARCHITECTURE', 'L4_IMPLEMENTATION', 'L5_COMPLETE'];
      const allOutputs = {};
      
      for (const level of levels) {
        try {
          const output = await controller.deliverOutput(projectId, level);
          allOutputs[level] = output;
        } catch (error) {
          logger.warn(`Failed to get level ${level}`, { error: error.message });
        }
      }
      
      res.json({
        success: true,
        outputs: allOutputs,
        trainingMode: true
      });
    } catch (error) {
      logger.error('Failed to get training outputs', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'TRAINING_OUTPUT_ERROR';
      next(error);
    }
  });

  /**
   * PROGRESSIVE DOCUMENTATION SYSTEM ROUTES
   */

  /**
   * Extract and verify scope from input
   * POST /api/scope/verify
   */
  router.post('/scope/verify', rateLimiters.scope.middleware(), async (req, res, next) => {
    try {
      const { input, inputType = 'text', domainContext = {} } = req.body;

      if (!input || input.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Input is required',
          code: 'MISSING_INPUT'
        });
      }

      const ScopeVerifier = require('../modules/scope-verifier');
      const Parser = require('../modules/parser');
      const Library = require('../modules/library');
      
      const library = new Library(logger);
      const parser = new Parser(library, logger);
      const scopeVerifier = new ScopeVerifier(parser, logger);

      const extractedScope = await scopeVerifier.extractAndVerifyScope(
        input,
        inputType,
        domainContext
      );

      res.json({
        success: true,
        scope: extractedScope
      });
    } catch (error) {
      logger.error('Scope verification failed', { error: error.message, stack: error.stack });
      error.status = error.status || 500;
      error.code = error.code || 'SCOPE_VERIFICATION_ERROR';
      next(error);
    }
  });

  /**
   * Lock scope after verification
   * POST /api/scope/lock
   */
  router.post('/scope/lock', async (req, res, next) => {
    try {
      const { verifiedModules, projectId, metadata = {} } = req.body;

      if (!verifiedModules || !Array.isArray(verifiedModules) || verifiedModules.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Verified modules are required',
          code: 'MISSING_MODULES'
        });
      }

      const ScopeVerifier = require('../modules/scope-verifier');
      const Parser = require('../modules/parser');
      const Library = require('../modules/library');
      
      const library = new Library(logger);
      const parser = new Parser(library, logger);
      const scopeVerifier = new ScopeVerifier(parser, logger);

      // Lock scope with stale detection
      const lockedScope = await scopeVerifier.lockScope(
        verifiedModules, 
        {
          ...metadata,
          projectId
        },
        db, // Pass db for stale detection
        projectId // Pass projectId for stale detection
      );

      // Store in database if projectId provided
      if (projectId && db) {
        // Run migration for stale_levels if needed
        db.runMigration('add-stale-levels.sql');
        
        const project = db.getProject(projectId);
        if (project) {
          const stmt = db.db.prepare(`
            UPDATE projects 
            SET locked_scope = ?, scope_checksum = ?, scope_locked_at = CURRENT_TIMESTAMP, stale_levels = ?
            WHERE id = ? OR project_code = ?
          `);
          stmt.run(
            JSON.stringify(lockedScope),
            lockedScope.checksum,
            JSON.stringify(lockedScope.metadata.staleLevels || []),
            projectId,
            projectId
          );
        }
      }

      res.json({
        success: true,
        lockedScope: lockedScope
      });
    } catch (error) {
      logger.error('Scope locking failed', { error: error.message, stack: error.stack });
      error.status = error.status || 500;
      error.code = error.code || 'SCOPE_LOCKING_ERROR';
      next(error);
    }
  });

  /**
   * Generate a specific documentation level
   * POST /api/levels/generate
   */
  router.post('/levels/generate', async (req, res, next) => {
    try {
      const { projectId, level, lockedScope, previousLevels = [], chainResult = {} } = req.body;

      if (!projectId || !level || !lockedScope) {
        return res.status(400).json({
          success: false,
          error: 'projectId, level, and lockedScope are required',
          code: 'MISSING_PARAMS'
        });
      }

      if (level < 1 || level > 5) {
        return res.status(400).json({
          success: false,
          error: 'Level must be between 1 and 5',
          code: 'INVALID_LEVEL'
        });
      }

      const LevelGenerator = require('../modules/level-generator');
      const Library = require('../modules/library');
      
      const library = new Library(logger);
      const levelGenerator = new LevelGenerator(logger, library);

      const levelData = await levelGenerator.generateLevel(
        level,
        lockedScope,
        previousLevels,
        chainResult
      );

      // Render document
      const DocumentRenderer = require('../modules/document-renderer');
      const renderer = new DocumentRenderer(logger);
      const renderResult = renderer.renderLevel(levelData);
      const renderedContent = renderResult.content || renderResult; // Handle both formats
      const contentHash = renderResult.hash || null;
      const engineVersion = renderResult.engineVersion || levelData.metadata?.engineVersion || null;

      // Store in database
      if (db) {
        // Run migrations if needed
        db.runMigration('add-content-hash.sql');
        
        // Check if we need to add engine_version column
        try {
          const tableInfo = db.db.prepare(`PRAGMA table_info(document_levels)`).all();
          const hasEngineVersion = tableInfo.some(col => col.name === 'engine_version');
          
          if (!hasEngineVersion) {
            // Add column if missing
            db.db.prepare(`ALTER TABLE document_levels ADD COLUMN engine_version TEXT`).run();
          }
        } catch (e) {
          // Column might already exist or table doesn't exist yet
        }
        
        const stmt = db.db.prepare(`
          INSERT OR REPLACE INTO document_levels 
          (project_id, level, content, content_hash, engine_version, cross_references, metadata, generated_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        stmt.run(
          projectId,
          level,
          renderedContent,
          contentHash,
          engineVersion,
          JSON.stringify(levelData.crossReferences || {}),
          JSON.stringify({
            pages: levelData.pages,
            title: levelData.title,
            generatedAt: levelData.generatedAt,
            generationTime: levelData.metadata?.generationTime,
            performancePassed: levelData.metadata?.performancePassed,
            pseudocodeCoverage: levelData.metadata?.pseudocodeCoverage,
            engineVersion: engineVersion
          })
        );

        // Update project's generated_levels array
        const project = db.getProject(projectId);
        if (project) {
          const generatedLevels = project.generated_levels 
            ? JSON.parse(project.generated_levels) 
            : [];
          if (!generatedLevels.includes(level)) {
            generatedLevels.push(level);
            generatedLevels.sort();
          }
          const updateStmt = db.db.prepare(`
            UPDATE projects 
            SET generated_levels = ?
            WHERE id = ? OR project_code = ?
          `);
          updateStmt.run(JSON.stringify(generatedLevels), projectId, projectId);
        }
      }

      // Run validation (non-blocking in production, blocking in dev)
      let validationResult = null;
      try {
        // Run validation script
        const validationScript = path.join(__dirname, '../../scripts/validate-docs.js');
        const { stdout } = await execAsync(`node "${validationScript}" ${projectId}`);
        validationResult = JSON.parse(stdout);
        
        // If validation failed and we're in strict mode, return error
        if (!validationResult.passed && process.env.VALIDATION_STRICT === 'true') {
          return res.status(400).json({
            success: false,
            error: 'Documentation validation failed',
            validation: validationResult,
            code: 'VALIDATION_FAILED'
          });
        }
      } catch (error) {
        // Validation script failed - log but don't block
        logger.warn('Validation script failed', { error: error.message });
      }

      // Compute and store metrics (async, non-blocking)
      try {
        const metricsScript = path.join(__dirname, '../../scripts/compute-doc-metrics.js');
        execAsync(`node "${metricsScript}" ${projectId}`).catch(err => {
          logger.warn('Metrics computation failed', { error: err.message });
        });
      } catch (error) {
        logger.warn('Failed to compute metrics', { error: error.message });
      }

      res.json({
        success: true,
        level: levelData,
        renderedContent: renderedContent,
        contentHash: contentHash,
        summary: renderer.renderLevelSummary(levelData),
        validation: validationResult
      });
    } catch (error) {
      logger.error('Level generation failed', { error: error.message, stack: error.stack });
      error.status = error.status || 500;
      error.code = error.code || 'LEVEL_GENERATION_ERROR';
      next(error);
    }
  });

  /**
   * Get generated level document
   * GET /api/levels/:projectId/:level
   */
  router.get('/levels/:projectId/:level', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.projectId, { allowNewlines: false });
      const level = parseInt(req.params.level);

      if (level < 1 || level > 5) {
        return res.status(400).json({
          success: false,
          error: 'Level must be between 1 and 5',
          code: 'INVALID_LEVEL'
        });
      }

      if (!db) {
        return res.status(500).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_ERROR'
        });
      }

      const stmt = db.db.prepare(`
        SELECT * FROM document_levels 
        WHERE project_id = ? AND level = ?
      `);
      const doc = stmt.get(projectId, level);

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: 'Level not generated yet',
          code: 'LEVEL_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        level: level,
        content: doc.content,
        crossReferences: JSON.parse(doc.cross_references || '{}'),
        metadata: JSON.parse(doc.metadata || '{}'),
        generatedAt: doc.generated_at
      });
    } catch (error) {
      logger.error('Failed to get level document', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'GET_LEVEL_ERROR';
      next(error);
    }
  });

  /**
   * Get all generated levels for a project
   * GET /api/levels/:projectId
   */
  router.get('/levels/:projectId', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.projectId, { allowNewlines: false });

      if (!db) {
        return res.status(500).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_ERROR'
        });
      }

      const stmt = db.db.prepare(`
        SELECT level, metadata, generated_at 
        FROM document_levels 
        WHERE project_id = ?
        ORDER BY level ASC
      `);
      const docs = stmt.all(projectId);

      const levels = docs.map(doc => ({
        level: doc.level,
        metadata: JSON.parse(doc.metadata || '{}'),
        generatedAt: doc.generated_at
      }));

      res.json({
        success: true,
        levels: levels
      });
    } catch (error) {
      logger.error('Failed to get project levels', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'GET_LEVELS_ERROR';
      next(error);
    }
  });

  /**
   * Validate documentation for a project
   * POST /api/levels/validate/:projectId
   */
  router.post('/levels/validate/:projectId', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.projectId, { allowNewlines: false });

      const validationScript = path.join(__dirname, '../../scripts/validate-docs.js');
      const { stdout, stderr } = await execAsync(`node "${validationScript}" ${projectId}`);
      
      const validationResult = JSON.parse(stdout);
      
      res.json({
        success: true,
        validation: validationResult
      });
    } catch (error) {
      // If validation script exits with code 1, parse the error output
      if (error.code === 1 && error.stdout) {
        try {
          const validationResult = JSON.parse(error.stdout);
          res.json({
            success: false,
            validation: validationResult
          });
        } catch (parseError) {
          logger.error('Failed to parse validation result', { error: error.message });
          res.status(500).json({
            success: false,
            error: 'Validation failed',
            details: error.stdout
          });
        }
      } else {
        logger.error('Validation endpoint failed', { error: error.message });
        error.status = error.status || 500;
        error.code = error.code || 'VALIDATION_ERROR';
        next(error);
      }
    }
  });

  /**
   * Get documentation metrics for a project
   * GET /api/levels/metrics/:projectId
   */
  router.get('/levels/metrics/:projectId', async (req, res, next) => {
    try {
      const projectId = InputSanitizer.sanitizeString(req.params.projectId, { allowNewlines: false });

      if (!db) {
        return res.status(500).json({
          success: false,
          error: 'Database not available',
          code: 'DATABASE_ERROR'
        });
      }

      const stmt = db.db.prepare(`
        SELECT level, metric_name, metric_value, metric_data, computed_at
        FROM documentation_metrics
        WHERE project_id = ?
        ORDER BY level ASC, metric_name ASC
      `);
      const metrics = stmt.all(projectId);

      const grouped = {};
      metrics.forEach(m => {
        if (!grouped[m.level]) {
          grouped[m.level] = {};
        }
        grouped[m.level][m.metric_name] = {
          value: m.metric_value,
          data: m.metric_data ? JSON.parse(m.metric_data) : null,
          computedAt: m.computed_at
        };
      });

      res.json({
        success: true,
        metrics: grouped
      });
    } catch (error) {
      logger.error('Failed to get metrics', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'GET_METRICS_ERROR';
      next(error);
    }
  });

  return router;
}

module.exports = createRoutes;

