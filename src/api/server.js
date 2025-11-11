const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeSystem } = require('../index');
const ChainExecutor = require('../modules/chain-executor');
const routes = require('./routes');
const middleware = require('./middleware');

class APIServer {
  constructor() {
    this.app = express();
    this.server = null;
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
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : (process.env.NODE_ENV === 'production' 
          ? ['https://your-domain.com'] // Update with actual production domain
          : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']);
    
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

    // API routes
    this.app.use('/api', routes(this.executor, this.db, this.logger));

    // Serve static files from web directory
    const webPath = path.join(__dirname, '../../web');
    this.app.use(express.static(webPath));

    // Serve index.html for all non-API routes (SPA routing)
    this.app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(webPath, 'index.html'));
      }
    });

    // Error handling middleware (must be last)
    this.app.use(middleware.errorHandler(this.logger));

    this.logger.info('API server initialized');
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
      this.server = this.app.listen(port, () => {
        this.logger.info(`Web server started on port ${port}`);
        console.log(`\n🚀 Scogen Web UI running at http://localhost:${port}\n`);
        resolve();
      });
    });
  }

  async stop() {
    const cleanupPromises = [];
    
    // Close HTTP server
    if (this.server) {
      cleanupPromises.push(
        new Promise((resolve) => {
          this.server.close(() => {
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
    
    // Wait for all cleanup to complete
    await Promise.all(cleanupPromises);
    this.logger.info('API server cleanup complete');
  }

  getExecutor() {
    return this.executor;
  }
}

module.exports = APIServer;

