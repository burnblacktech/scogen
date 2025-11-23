const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initializeSystem } = require('../index');
const ChainExecutor = require('../modules/chain-executor');
const routes = require('./routes');
const middleware = require('./middleware');

class APIServer {
  constructor() {
    this.app = express();
    this.httpServer = null;
    this.server = null; // Keep for compatibility
    this.io = null;
    this.executor = null;
    this.config = null;
    this.logger = null;
    this.db = null;
    this.projectService = null;
  }

  async initialize() {
    // Initialize system (same as CLI)
    // Suppress console output during initialization for web mode
    const originalConsoleLog = console.log;
    console.log = () => {}; // Suppress initialization messages
    
    const system = initializeSystem();
    console.log = originalConsoleLog; // Restore
    
    this.config = system.config;
    this.logger = system.logger;
    this.db = system.db;
    this.library = system.library;

    // Create ChainExecutor instance
    this.executor = new ChainExecutor(
      this.config,
      this.logger,
      this.db,
      this.library
    );

    // Middleware
    // Configure CORS with environment-based origins
    const configOrigins = this.config.get('web.cors.allowedOrigins') || [];
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : (process.env.NODE_ENV === 'production' 
          ? (configOrigins.length > 0 ? configOrigins : ['https://your-domain.com']) // Update with actual production domain
          : (configOrigins.length > 0 ? configOrigins : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']));
    
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
    
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Handle JSON parsing errors (must come after body-parser)
    this.app.use((error, req, res, next) => {
      if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
          details: {
            message: error.message,
            type: 'SyntaxError'
          }
        });
      }
      next(error);
    });

    // Request logging middleware
    this.app.use(middleware.requestLogger(this.logger));
    
    // Rate limiting middleware (if enabled)
    if (process.env.ENABLE_RATE_LIMITING === 'true' || process.env.NODE_ENV === 'production') {
      const { defaultRateLimiter } = require('./middleware/rate-limiter');
      this.app.use('/api', defaultRateLimiter.middleware());
      this.logger.info('Rate limiting enabled');
    }

    // Initialize enhanced database (if enabled)
    await this.initializeEnhancedDatabase();

    // Initialize memory monitoring (if enabled)
    if (process.env.ENABLE_MEMORY_MONITORING === 'true' || process.env.NODE_ENV === 'production') {
      const MemoryMonitor = require('../utils/memory-monitor');
      this.memoryMonitor = new MemoryMonitor(this.logger, {
        checkInterval: parseInt(process.env.MEMORY_CHECK_INTERVAL || '60000', 10),
        warningThreshold: parseInt(process.env.MEMORY_WARNING_THRESHOLD || '524288000', 10), // 500MB
        criticalThreshold: parseInt(process.env.MEMORY_CRITICAL_THRESHOLD || '1048576000', 10) // 1GB
      });
      this.memoryMonitor.start();
      this.logger.info('Memory monitoring enabled');
    }

    // Initialize cleanup service
    try {
      const CleanupService = require('../services/CleanupService');
      this.cleanupService = new CleanupService(this.logger, this.db, {
        generatedDir: path.join(process.cwd(), 'generated'),
        retentionHours: parseInt(process.env.PDF_RETENTION_HOURS || '24', 10),
        cleanupIntervalHours: parseInt(process.env.PDF_CLEANUP_INTERVAL_HOURS || '1', 10)
      });
      this.logger.info('PDF cleanup service initialized', {
        retentionHours: this.cleanupService.retentionHours,
        cleanupIntervalHours: this.cleanupService.cleanupIntervalHours
      });
    } catch (error) {
      this.logger.warn('Failed to initialize cleanup service (non-blocking)', {
        error: error.message
      });
      // Non-fatal: continue without cleanup service
      this.cleanupService = null;
    }

    // Create HTTP server from Express app
    this.httpServer = http.createServer(this.app);

    // Initialize Socket.IO
    this.io = socketIO(this.httpServer, {
      cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Set up Socket.IO connection handlers
    this.setupSocketIO();

    // API routes (pass io instance and cleanupService)
    this.app.use('/api', routes(this.executor, this.db, this.logger, this.io, this.cleanupService));

    // Redirects must come BEFORE static file serving
    // Otherwise index.html gets served automatically

    // Redirect root to new unified flow
    this.app.get('/', (req, res) => {
      res.redirect('/simple.html');
    });

    // Redirect old index.html to new unified flow
    this.app.get('/index.html', (req, res) => {
      res.redirect('/simple.html');
    });

    // Legacy dashboard access (for backward compatibility)
    this.app.get('/legacy-dashboard', (req, res) => {
      res.redirect('/dashboard.html');
    });

    // Serve static files from web directory
    const webPath = path.join(__dirname, '../../web');
    this.app.use(express.static(webPath));

    // Serve generated PDFs
    const generatedPath = path.join(__dirname, '../../generated');
    this.app.use('/downloads', express.static(generatedPath));

    // Serve specific HTML files for non-API routes
    this.app.get('*', (req, res, next) => {
      if (!req.path.startsWith('/api')) {
        // If it's a specific HTML file, serve it
        if (req.path.endsWith('.html')) {
          const filePath = path.join(webPath, req.path);
          res.sendFile(filePath, (err) => {
            if (err) {
              // If file doesn't exist, redirect to dashboard
              res.redirect('/dashboard.html');
            }
          });
        } else {
          // Otherwise, redirect to dashboard
          res.redirect('/dashboard.html');
        }
      } else {
        next();
      }
    });

    // Error handling middleware (must be last)
    this.app.use(middleware.errorHandler(this.logger));

    this.logger.info('API server initialized');
  }

  /**
   * Set up Socket.IO connection handlers
   */
  setupSocketIO() {
    this.io.on('connection', (socket) => {
      this.logger.info('Socket.IO client connected', { socketId: socket.id });

      // Subscribe to job updates
      socket.on('subscribe', (jobId) => {
        if (!jobId || typeof jobId !== 'string') {
          socket.emit('error', { message: 'Invalid jobId' });
          return;
        }

        socket.join(jobId);
        this.logger.info('Client subscribed to job', { socketId: socket.id, jobId });

        // Send current status if job exists (will be handled by GenerationQueue)
        socket.emit('subscribed', { jobId });
      });

      socket.on('disconnect', () => {
        this.logger.info('Socket.IO client disconnected', { socketId: socket.id });
      });

      socket.on('error', (error) => {
        this.logger.error('Socket.IO error', { socketId: socket.id, error: error.message });
      });
    });

    this.logger.info('Socket.IO initialized');
  }

  /**
   * Initialize enhanced database system (V2)
   */
  async initializeEnhancedDatabase() {
    try {
      const { getProjectService } = require('../services/project-service');
      this.projectService = getProjectService();
      
      if (this.projectService.useNewDb && this.projectService.dbV2) {
        this.logger.info('Enhanced database V2 initialized');
        
        // Run migrations if enabled
        if (process.env.RUN_MIGRATIONS === 'true') {
          const DatabaseMigrator = require('../database/migrator');
          const migrator = new DatabaseMigrator();
          await migrator.migrate();
          this.logger.info('Database migrations completed');
        }
      } else {
        this.logger.info('Enhanced database V2 disabled (USE_NEW_DB=false)');
      }
    } catch (error) {
      this.logger.warn('Enhanced database initialization failed (non-blocking)', {
        error: error.message
      });
      // Non-fatal: continue without enhanced database
    }
  }

  async start() {
    const port = this.config.get('web.port') || process.env.WEB_PORT || 3000;

    return new Promise((resolve) => {
      this.httpServer.listen(port, () => {
        this.server = this.httpServer; // Keep for compatibility
        this.logger.info(`Web server started on port ${port}`);
        this.logger.info('Socket.IO ready for connections');
        
        // Start cleanup service
        if (this.cleanupService) {
          this.cleanupService.scheduleCleanup();
          this.logger.info('PDF cleanup service started');
        }
        
        console.log(`\n[START] Scogen Web UI running at http://localhost:${port}\n`);
        resolve();
      });
    });
  }

  async stop() {
    const cleanupPromises = [];
    
    // Close Socket.IO
    if (this.io) {
      try {
        this.io.close();
        this.logger.info('Socket.IO closed');
      } catch (error) {
        this.logger.warn('Error closing Socket.IO', { error: error.message });
      }
    }

    // Close HTTP server
    if (this.httpServer || this.server) {
      const serverToClose = this.httpServer || this.server;
      cleanupPromises.push(
        new Promise((resolve) => {
          serverToClose.close(() => {
            this.logger.info('Web server stopped');
            resolve();
          });
        })
      );
    }
    
    // Close database connections
    if (this.db) {
      try {
        this.db.close();
        this.logger.info('Database connection closed');
      } catch (error) {
        this.logger.warn('Error closing database connection', { error: error.message });
      }
    }
    
    // Close project service database connections
    if (this.projectService) {
      try {
        this.projectService.close();
        this.logger.info('Project service database connections closed');
      } catch (error) {
        this.logger.warn('Error closing project service connections', { error: error.message });
      }
    }
    
    // Stop memory monitoring
    if (this.memoryMonitor) {
      try {
        this.memoryMonitor.stop();
        this.logger.info('Memory monitoring stopped');
      } catch (error) {
        this.logger.warn('Error stopping memory monitor', { error: error.message });
      }
    }

    // Stop cleanup service
    if (this.cleanupService) {
      try {
        this.cleanupService.stop();
        this.logger.info('PDF cleanup service stopped');
      } catch (error) {
        this.logger.warn('Error stopping cleanup service', { error: error.message });
      }
    }
    
    // Wait for all cleanup to complete
    await Promise.all(cleanupPromises);
    this.logger.info('API server cleanup complete');
  }

  getExecutor() {
    return this.executor;
  }

  /**
   * Get Socket.IO instance
   * @returns {Object} Socket.IO instance
   */
  getIO() {
    return this.io;
  }
}

module.exports = APIServer;

