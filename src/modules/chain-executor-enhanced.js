/**
 * Enhanced Chain Executor with Smart Routing
 * 
 * Extends ChainExecutor to add:
 * - Trust scoring and smart routing
 * - Context extraction from requests
 * - Trust-based adjustments to output
 * - Non-proceed paths (questions, education, templates)
 */

const ChainExecutor = require('./chain-executor');
const InputAnalyzerEnhanced = require('./input-analyzer-enhanced');
const SmartRouter = require('./smart-router');
const ContextExtractor = require('../utils/context-extractor');

class ChainExecutorEnhanced extends ChainExecutor {
  constructor(config, logger, db, library) {
    super(config, logger, db, library);
    
    // Initialize enhanced modules
    this.inputAnalyzerEnhanced = new InputAnalyzerEnhanced(logger);
    this.router = new SmartRouter();
    
    // Override inputAnalyzer to use enhanced version
    this.inputAnalyzer = this.inputAnalyzerEnhanced;
    
    // Note: HiddenCostCalculator and projectService are initialized in parent
    // They will be available via this.hiddenCostCalculator and this.projectService
  }

  /**
   * Execute chain with enhanced routing
   * @param {string} input - User input
   * @param {Object} options - Options including request object for context
   * @returns {Object} Execution results with routing information
   */
  async execute(input, options = {}) {
    const results = {
      timestamp: Date.now(),
      input: input,
      options: options
    };
    
    try {
      // Step 0: Capture context
      const context = this.captureContext(options);
      this.logger.info('Enhanced chain execution started', { 
        sessionId: this.sessionId,
        hasContext: !!context
      });
      
      // Step 1: Enhanced input analysis with trust scoring
      results.analysis = await this.inputAnalyzerEnhanced.analyze(input, { 
        context,
        useQualityAnalysis: true 
      });
      
      this.logger.info('Enhanced input analysis complete', {
        quality: results.analysis.confidence || results.analysis.completeness,
        trust: results.analysis.trust?.score,
        intent: results.analysis.intent?.primary,
        routing: results.analysis.routing?.path
      });
      
      // Step 2: Smart routing
      const routingResult = await this.router.route(results.analysis, input, options);
      results.routing = routingResult;
      
      // If routing says don't proceed with full analysis
      if (!routingResult.proceed) {
        this.logger.info('Routing decision: non-proceed', {
          path: routingResult.routing?.path,
          message: routingResult.message
        });
        
        // Handle different non-proceed paths
        if (routingResult.showQuestions) {
          results.action = 'SHOW_QUESTIONS';
          results.data = { questions: routingResult.questions || [] };
        } else if (routingResult.showEducation) {
          results.action = 'SHOW_EDUCATION';
          results.data = { resources: routingResult.resources || [] };
        } else if (routingResult.showTemplate) {
          results.action = 'SHOW_TEMPLATE';
          results.data = { templateType: routingResult.templateType };
        } else if (routingResult.showUpload) {
          results.action = 'SHOW_UPLOAD';
          results.data = { acceptTypes: routingResult.acceptTypes || [] };
        } else if (routingResult.showGenericTemplate) {
          results.action = 'SHOW_TEMPLATE';
          results.data = { templateType: 'tender-response-template.xlsx' };
        }
        
        // Add metadata
        results.metadata = this.buildMetadata(results.analysis);
        results.warnings = results.analysis.trust?.flags || [];
        
        return results;
      }
      
      // Step 3: Continue with full analysis (existing chain)
      this.logger.info('Proceeding with full analysis');
      
      // Apply adjustments from routing
      const adjustedOptions = {
        ...options,
        adjustments: routingResult.adjustments
      };
      
      // Run the original chain with adjustments
      const fullAnalysis = await super.execute(input, adjustedOptions);
      
      // Merge results
      results.fullAnalysis = fullAnalysis;
      results.action = 'FULL_ANALYSIS';
      results.data = fullAnalysis;
      
      // Step 4: Apply trust-based modifications to output
      if (routingResult.adjustments) {
        results.fullAnalysis = this.applyTrustAdjustments(
          results.fullAnalysis, 
          routingResult.adjustments
        );
        results.data = results.fullAnalysis;
      }
      
      // Step 5: Add warnings and flags
      if (results.analysis.trust?.flags?.length > 0) {
        results.warnings = results.analysis.trust.flags;
      }
      
      // Add metadata
      results.metadata = this.buildMetadata(results.analysis);
      
      return results;
      
    } catch (error) {
      this.logger.error('Enhanced chain execution error', { error: error.message });
      results.error = error.message;
      results.action = 'SHOW_TEMPLATE';
      results.fallback = true;
      return results;
    }
  }
  
  /**
   * Capture context from options (request object or manual)
   * @param {Object} options - Options including req object
   * @returns {Object} Context object
   */
  captureContext(options) {
    // If request object provided, extract context
    if (options.req) {
      return ContextExtractor.extract(options.req, options);
    }
    
    // Otherwise use manual context or defaults
    return {
      source: options.source || 'direct',
      referrer: options.referrer || null,
      isRepeatClient: options.clientId ? true : false,
      deviceType: options.deviceType || 'desktop',
      timestamp: Date.now(),
      sessionId: options.sessionId || null,
      ...options.context
    };
  }
  
  /**
   * Apply trust adjustments to analysis output
   * @param {Object} analysis - Full analysis from chain
   * @param {Object} adjustments - Trust-based adjustments
   * @returns {Object} Adjusted analysis
   */
  applyTrustAdjustments(analysis, adjustments) {
    if (!adjustments) return analysis;
    
    // Apply scope buffer
    if (adjustments.scopeBuffer && analysis.estimate) {
      if (analysis.estimate.timeline) {
        analysis.estimate.timeline = {
          ...analysis.estimate.timeline,
          days: Math.ceil(analysis.estimate.timeline.days * adjustments.scopeBuffer),
          weeks: Math.ceil(analysis.estimate.timeline.weeks * adjustments.scopeBuffer)
        };
      }
      if (analysis.estimate.cost) {
        const cost = typeof analysis.estimate.cost === 'object' 
          ? analysis.estimate.cost.total || analysis.estimate.cost
          : analysis.estimate.cost;
        const adjustedCost = Math.ceil(cost * adjustments.scopeBuffer);
        
        if (typeof analysis.estimate.cost === 'object') {
          analysis.estimate.cost.total = adjustedCost;
          analysis.estimate.cost.bufferApplied = adjustments.scopeBuffer;
        } else {
          analysis.estimate.cost = adjustedCost;
        }
      }
    }
    
    // Add warnings
    if (adjustments.addWarning) {
      if (!analysis.risks) analysis.risks = [];
      analysis.risks.push({
        type: 'trust',
        message: adjustments.addWarning,
        severity: 'medium'
      });
    }
    
    // Suggest MVP if needed
    if (adjustments.suggestMVP && analysis.scenarios) {
      const mvpScenario = analysis.scenarios.find(s => s.type === 'mvp');
      if (mvpScenario) {
        mvpScenario.recommended = true;
        mvpScenario.reason = 'Recommended due to project ambition level';
      }
    }
    
    // Adjust detail level
    if (adjustments.showRangeOnly && analysis.estimate) {
      const cost = typeof analysis.estimate.cost === 'object' 
        ? analysis.estimate.cost.total || analysis.estimate.cost
        : analysis.estimate.cost;
      
      analysis.estimate.showDetails = false;
      analysis.estimate.range = {
        min: Math.floor(cost * 0.8),
        max: Math.ceil(cost * 1.2)
      };
    }
    
    return analysis;
  }

  /**
   * Build metadata object for response
   * @param {Object} analysis - Enhanced analysis
   * @returns {Object} Metadata object
   */
  buildMetadata(analysis) {
    return {
      trust: {
        score: analysis.trust?.score || 0,
        confidence: analysis.trust?.confidence || 'medium'
      },
      quality: {
        completeness: analysis.completeness || 0,
        specificity: analysis.specificity || 0,
        clarity: analysis.clarity || 0,
        confidence: analysis.confidence || 0
      },
      intent: {
        primary: analysis.intent?.primary || 'unknown',
        confidence: analysis.intent?.confidence || 0
      },
      routing: {
        path: analysis.routing?.path || 'UNKNOWN',
        priority: analysis.routing?.priority || 'low',
        reason: analysis.routing?.reason || ''
      }
    };
  }
}

module.exports = ChainExecutorEnhanced;

