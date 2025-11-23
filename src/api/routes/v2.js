/**
 * API v2 Routes - Precision Pivot Endpoints
 * 
 * New precision-focused API endpoints with function-level detail
 * Versioned separately from v1 for backward compatibility
 */

const express = require('express');

/**
 * Initialize v2 routes
 * @param {Object} dependencies - Required dependencies (logger, db, etc.)
 */
function createV2Routes(dependencies) {
    const { logger, db } = dependencies;
    const router = express.Router();
    
    // Import controllers
    const RequirementController = require('../../core/controllers/RequirementController');
    const EstimationController = require('../../core/controllers/EstimationController');
    const GenerationController = require('../../core/controllers/GenerationController');
    const LiveCallController = require('../../core/controllers/LiveCallController');
    
    const reqController = new RequirementController(logger, db);
    const estController = new EstimationController(logger, db);
    const genController = new GenerationController(logger, db);
    const liveController = new LiveCallController(logger, db);
    
    // ============================================================================
    // REQUIREMENT PROCESSING
    // ============================================================================
    
    /**
     * POST /api/v2/requirements/parse
     * Parse requirements with Indian context
     */
    router.post('/requirements/parse', async (req, res, next) => {
        try {
            const { input, inputType = 'text', options = {} } = req.body;
            
            if (!input) {
                return res.status(400).json({
                    success: false,
                    error: 'Input is required',
                    code: 'MISSING_INPUT'
                });
            }
            
            const result = await reqController.parse(input, inputType, options);
            
            res.json({
                success: true,
                result: result
            });
        } catch (error) {
            logger.error('Requirement parsing failed', { error: error.message });
            error.status = error.status || 500;
            error.code = error.code || 'PARSE_ERROR';
            next(error);
        }
    });
    
    /**
     * POST /api/v2/requirements/extract-features
     * Extract features with function breakdown
     */
    router.post('/requirements/extract-features', async (req, res, next) => {
        try {
            const { requirements, projectContext = {} } = req.body;
            
            const result = await reqController.extractFeatures(requirements, projectContext);
            
            res.json({
                success: true,
                features: result.features,
                functionBreakdown: result.functionBreakdown,
                confidence: result.confidence
            });
        } catch (error) {
            logger.error('Feature extraction failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    /**
     * POST /api/v2/requirements/voice
     * Process voice input (transcript)
     */
    router.post('/requirements/voice', async (req, res, next) => {
        try {
            const { transcript, language = 'en-IN' } = req.body;
            
            if (!transcript) {
                return res.status(400).json({
                    success: false,
                    error: 'Transcript is required'
                });
            }
            
            const result = await reqController.processVoice(transcript, language);
            
            res.json({
                success: true,
                parsed: result.parsed,
                quickEstimate: result.quickEstimate,
                suggestedQuestions: result.suggestedQuestions
            });
        } catch (error) {
            logger.error('Voice processing failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    // ============================================================================
    // MULTI-DIMENSIONAL MAPPING & ESTIMATION
    // ============================================================================
    
    /**
     * POST /api/v2/estimation/map-feature
     * Map feature using multi-dimensional approach
     */
    router.post('/estimation/map-feature', async (req, res, next) => {
        try {
            const { feature, projectContext = {} } = req.body;
            
            if (!feature || !feature.name) {
                return res.status(400).json({
                    success: false,
                    error: 'Feature object with name is required'
                });
            }
            
            const result = await estController.mapFeature(feature, projectContext);
            
            res.json({
                success: true,
                mapping: result
            });
        } catch (error) {
            logger.error('Feature mapping failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    /**
     * POST /api/v2/estimation/calculate-cost
     * Calculate cost with Indian context (GST, compliance)
     */
    router.post('/estimation/calculate-cost', async (req, res, next) => {
        try {
            const { features, projectContext = {}, options = {} } = req.body;
            
            if (!features || !Array.isArray(features)) {
                return res.status(400).json({
                    success: false,
                    error: 'Features array is required'
                });
            }
            
            const result = await estController.calculateCost(features, projectContext, options);
            
            res.json({
                success: true,
                cost: result
            });
        } catch (error) {
            logger.error('Cost calculation failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    /**
     * POST /api/v2/estimation/optimize-resources
     * Optimize team composition and resource allocation
     */
    router.post('/estimation/optimize-resources', async (req, res, next) => {
        try {
            const { features, constraints = {} } = req.body;
            
            const result = await estController.optimizeResources(features, constraints);
            
            res.json({
                success: true,
                optimization: result
            });
        } catch (error) {
            logger.error('Resource optimization failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    // ============================================================================
    // GENERATION
    // ============================================================================
    
    /**
     * POST /api/v2/generation/pseudocode
     * Generate 95% complete pseudocode
     */
    router.post('/generation/pseudocode', async (req, res, next) => {
        try {
            const { feature, projectContext = {}, options = {} } = req.body;
            
            if (!feature) {
                return res.status(400).json({
                    success: false,
                    error: 'Feature object is required'
                });
            }
            
            const result = await genController.generatePseudocode(feature, projectContext, options);
            
            res.json({
                success: true,
                pseudocode: result
            });
        } catch (error) {
            logger.error('Pseudocode generation failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    /**
     * POST /api/v2/generation/sprint-plan
     * Generate sprint plan with Indian holidays
     */
    router.post('/generation/sprint-plan', async (req, res, next) => {
        try {
            const { projectId, startDate, team, options = {} } = req.body;
            
            if (!projectId || !startDate) {
                return res.status(400).json({
                    success: false,
                    error: 'projectId and startDate are required'
                });
            }
            
            // Get project from database
            const project = db.prepare('SELECT * FROM projects WHERE id = ? OR project_code = ?')
                .get(projectId, projectId);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found'
                });
            }
            
            const result = await genController.generateSprintPlan(
                project,
                team || { composition: { seniors: 1, mids: 2, juniors: 1 } },
                new Date(startDate),
                options
            );
            
            res.json({
                success: true,
                sprintPlan: result
            });
        } catch (error) {
            logger.error('Sprint planning failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    /**
     * POST /api/v2/generation/blueprint
     * Generate complete development blueprint
     */
    router.post('/generation/blueprint', async (req, res, next) => {
        try {
            const { projectId, options = {} } = req.body;
            
            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'projectId is required'
                });
            }
            
            const result = await genController.generateBlueprint(projectId, options);
            
            res.json({
                success: true,
                blueprint: result
            });
        } catch (error) {
            logger.error('Blueprint generation failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    // ============================================================================
    // LIVE CALL ENDPOINTS
    // ============================================================================
    
    /**
     * POST /api/v2/live-call/process
     * Process live call transcript for quick estimation
     */
    router.post('/live-call/process', async (req, res, next) => {
        try {
            const { transcript, mode = 'live_call', options = {} } = req.body;
            
            if (!transcript || transcript.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Transcript is required'
                });
            }
            
            const result = await liveController.processTranscript(transcript, mode, options);
            
            res.json({
                success: true,
                projectId: result.projectId,
                estimate: result.estimate,
                confidence: result.confidence,
                suggestedQuestions: result.suggestedQuestions,
                nextActions: result.nextActions
            });
        } catch (error) {
            logger.error('Live call processing failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    /**
     * POST /api/v2/live-call/to-progressive/:projectId
     * Transition from LiveCall to Progressive Output/Docs
     */
    router.post('/live-call/to-progressive/:projectId', async (req, res, next) => {
        try {
            const { projectId } = req.params;
            const { level = 'L1', system = 'output' } = req.body;
            
            const result = await liveController.transitionToProgressive(
                projectId,
                level,
                system
            );
            
            res.json({
                success: true,
                progressiveOutput: result.progressiveOutput,
                availableLevels: result.availableLevels,
                canSwitchTo: result.canSwitchTo
            });
        } catch (error) {
            logger.error('Progressive transition failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    /**
     * GET /api/v2/live-call/quick-estimate/:projectId
     * Get quick estimate for live call
     */
    router.get('/live-call/quick-estimate/:projectId', async (req, res, next) => {
        try {
            const { projectId } = req.params;
            
            const result = await liveController.getQuickEstimate(projectId);
            
            res.json({
                success: true,
                estimate: result
            });
        } catch (error) {
            logger.error('Quick estimate failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    // ============================================================================
    // INDIAN CONTEXT
    // ============================================================================
    
    /**
     * GET /api/v2/indian/holidays
     * Get Indian holidays for date range
     */
    router.get('/indian/holidays', async (req, res, next) => {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'startDate and endDate query parameters are required'
                });
            }
            
            const IndianHolidayManager = require('../../core/generation/SprintPlanner').IndianHolidayManager;
            const holidayManager = new IndianHolidayManager(logger);
            
            const holidays = await holidayManager.getHolidays(
                new Date(startDate),
                new Date(endDate)
            );
            
            res.json({
                success: true,
                holidays: holidays,
                count: holidays.length
            });
        } catch (error) {
            logger.error('Holiday lookup failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    /**
     * POST /api/v2/indian/calculate-gst
     * Calculate GST amount
     */
    router.post('/indian/calculate-gst', async (req, res, next) => {
        try {
            const { amount, rate = 0.18 } = req.body;
            
            if (typeof amount !== 'number' || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid amount is required'
                });
            }
            
            const GSTCalculator = require('../../services/indian-context/GSTCalculator');
            const calculator = new GSTCalculator(logger);
            
            const result = calculator.calculate(amount, rate);
            
            res.json({
                success: true,
                gst: result
            });
        } catch (error) {
            logger.error('GST calculation failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    /**
     * POST /api/v2/indian/compliance-check
     * Check compliance requirements
     */
    router.post('/indian/compliance-check', async (req, res, next) => {
        try {
            const { feature, projectContext = {} } = req.body;
            
            const ComplianceChecker = require('../../services/indian-context/ComplianceChecker');
            const checker = new ComplianceChecker(logger);
            
            const result = await checker.check(feature, projectContext);
            
            res.json({
                success: true,
                compliance: result
            });
        } catch (error) {
            logger.error('Compliance check failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    // ============================================================================
    // CHAIN RESULT OPTIMIZATION
    // ============================================================================
    
    /**
     * GET /api/v2/chain-result/:projectId
     * Get optimized chain result (cached or generate)
     */
    router.get('/chain-result/:projectId', async (req, res, next) => {
        try {
            const { projectId } = req.params;
            const { enhance = false, forceRegenerate = false } = req.query;
            
            const ChainResultOptimizer = require('../../core/optimization/ChainResultOptimizer');
            const optimizer = new ChainResultOptimizer(logger, db);
            
            // Get requirements from project
            const project = db.prepare('SELECT * FROM projects WHERE id = ? OR project_code = ?')
                .get(projectId, projectId);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found'
                });
            }
            
            const requirements = {
                input: project.input || '',
                inputType: 'text'
            };
            
            const result = await optimizer.getOptimizedChainResult(
                projectId,
                requirements,
                { enhance: enhance === 'true', forceRegenerate: forceRegenerate === 'true' }
            );
            
            res.json({
                success: true,
                chainResult: result,
                cached: !forceRegenerate
            });
        } catch (error) {
            logger.error('Chain result retrieval failed', { error: error.message });
            error.status = error.status || 500;
            next(error);
        }
    });
    
    // ============================================================================
    // INTELLIGENCE ENDPOINTS
    // ============================================================================
    
    // Mount intelligence routes
    const intelligenceRoutes = require('./intelligence');
    router.use('/intelligence', intelligenceRoutes);
    
    // ============================================================================
    // LEARNING & FEEDBACK ENDPOINTS
    // ============================================================================
    
    // Mount learning routes
    try {
        const learningRoutes = require('./learning');
        if (learningRoutes && typeof learningRoutes.use === 'function') {
            router.use('/learning', learningRoutes);
        } else {
            logger.warn('[WARN] Learning routes not available, skipping mount');
        }
    } catch (error) {
        logger.error('[ERROR] Failed to load learning routes', error);
        // Continue without learning routes
    }
    
    // ============================================================================
    // TEMPLATE & ANALYTICS ENDPOINTS
    // ============================================================================
    
    // Templates
    const TemplateSystem = require('../../core/templates/TemplateSystem');
    const templateSystem = new TemplateSystem(db, logger);
    
    /**
     * GET /api/v2/templates
     * List available templates
     */
    router.get('/templates', (req, res) => {
      try {
        const templates = templateSystem.listTemplates();
        res.json({ success: true, templates });
      } catch (error) {
        logger.error('[ERROR] Failed to list templates', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    /**
     * GET /api/v2/templates/:templateId
     * Get template details
     */
    router.get('/templates/:templateId', (req, res) => {
      try {
        const { templateId } = req.params;
        const template = templateSystem.getTemplate(templateId);
        
        if (!template) {
          return res.status(404).json({
            success: false,
            error: 'Template not found'
          });
        }
        
        res.json({ success: true, template });
      } catch (error) {
        logger.error('[ERROR] Failed to get template', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    /**
     * POST /api/v2/templates/:templateId/create-project
     * Create project from template
     */
    router.post('/templates/:templateId/create-project', async (req, res) => {
      try {
        const { templateId } = req.params;
        const { customizations } = req.body;
        
        const project = await templateSystem.createProjectFromTemplate(
          templateId,
          customizations || {}
        );
        
        res.json({ success: true, project });
      } catch (error) {
        logger.error('[ERROR] Failed to create project from template', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Analytics
    const AnalyticsDashboard = require('../../core/analytics/AnalyticsDashboard');
    const analytics = new AnalyticsDashboard(db, logger);
    
    /**
     * GET /api/v2/analytics/metrics
     * Get comprehensive business metrics
     */
    router.get('/analytics/metrics', async (req, res) => {
      try {
        const metrics = await analytics.getBusinessMetrics();
        res.json({ success: true, metrics });
      } catch (error) {
        logger.error('[ERROR] Failed to get analytics', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    /**
     * GET /api/v2/analytics/accuracy
     * Get accuracy metrics
     */
    router.get('/analytics/accuracy', async (req, res) => {
      try {
        const accuracy = await analytics.getAccuracyMetrics();
        res.json({ success: true, accuracy });
      } catch (error) {
        logger.error('[ERROR] Failed to get accuracy metrics', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    return router;
}

module.exports = createV2Routes;

