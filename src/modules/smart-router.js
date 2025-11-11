/**
 * Smart Router Module
 * 
 * Intelligent routing based on input analysis, trust scores, and client intent
 * Returns JSON structures (not HTML) for frontend rendering
 */

class SmartRouter {
  constructor() {
    this.routes = {
      FULL_ANALYSIS: {
        name: 'Complete Analysis',
        modules: ['llm', 'parser', 'refiner', 'estimator', 'scenarios'],
        output: 'detailed',
        costLevel: 'high'
      },
      GUIDED_CLARIFICATION: {
        name: 'Clarification Flow',
        modules: ['quick_estimate', 'question_generator'],
        output: 'questions_first',
        costLevel: 'low'
      },
      EDUCATIONAL: {
        name: 'Educational Path',
        modules: ['resource_selector', 'case_study_matcher'],
        output: 'learning_content',
        costLevel: 'minimal'
      },
      TEMPLATE_SUGGESTION: {
        name: 'Template Download',
        modules: ['template_selector'],
        output: 'download_link',
        costLevel: 'minimal'
      },
      VALIDATION_FLOW: {
        name: 'Quote Validation',
        modules: ['quote_parser', 'market_comparison'],
        output: 'validation_report',
        costLevel: 'medium'
      },
      TEMPLATE_ONLY: {
        name: 'Template Response',
        modules: ['template_generator'],
        output: 'generic_template',
        costLevel: 'minimal'
      }
    };
  }

  /**
   * Route based on analysis
   * @param {Object} analysis - Enhanced analysis from InputAnalyzerEnhanced
   * @param {string} input - Original user input
   * @param {Object} options - Additional options
   * @returns {Object} Routing result with proceed flag and action data
   */
  async route(analysis, input, options = {}) {
    const routing = analysis.routing;
    const route = this.routes[routing.path];
    
    if (!route) {
      console.error(`Unknown route: ${routing.path}`);
      return this.executeRoute(this.routes.TEMPLATE_SUGGESTION, analysis, input, options);
    }
    
    // Execute route-specific logic
    const result = await this.executeRoute(route, analysis, input, options);
    
    return {
      ...result,
      routing: routing,
      route: route
    };
  }

  /**
   * Execute route-specific logic
   * @param {Object} route - Route configuration
   * @param {Object} analysis - Enhanced analysis
   * @param {string} input - Original input
   * @param {Object} options - Options
   * @returns {Object} Route execution result
   */
  async executeRoute(route, analysis, input, options) {
    switch(route.name) {
      case 'Complete Analysis':
        return {
          proceed: true,
          skipModules: [],
          adjustments: this.getAnalysisAdjustments(analysis),
          message: 'Proceeding with full analysis'
        };
        
      case 'Clarification Flow':
        return {
          proceed: false,
          showQuestions: true,
          questions: analysis.recommendations?.find(r => r.action === 'show_questions')?.questions || [],
          message: 'Please answer a few questions first'
        };
        
      case 'Educational Path':
        return {
          proceed: false,
          showEducation: true,
          resources: analysis.recommendations?.find(r => r.action === 'show_guide')?.resources || [],
          message: 'Let\'s help you understand the process better'
        };
        
      case 'Template Download':
        return {
          proceed: false,
          showTemplate: true,
          templateType: analysis.recommendations?.find(r => r.action === 'download_template')?.templateType,
          message: 'Download our template to structure your requirements'
        };
        
      case 'Quote Validation':
        return {
          proceed: false,
          showUpload: true,
          acceptTypes: ['.pdf', '.xlsx', '.docx'],
          message: 'Upload the quote you want to validate'
        };
        
      case 'Template Response':
        return {
          proceed: false,
          showGenericTemplate: true,
          message: 'Here\'s a standard template for tender response'
        };
        
      default:
        return {
          proceed: false,
          error: true,
          message: 'Unknown route'
        };
    }
  }

  /**
   * Get analysis adjustments based on trust and intent
   * @param {Object} analysis - Enhanced analysis
   * @returns {Object} Adjustments to apply
   */
  getAnalysisAdjustments(analysis) {
    const adjustments = {};
    const trust = analysis.trust || {};
    const intent = analysis.intent || {};
    
    // Trust-based adjustments
    if (trust.score < 50) {
      adjustments.scopeBuffer = 1.3; // Add 30% buffer for low trust
      adjustments.showEducational = true;
    } else if (trust.score > 80) {
      adjustments.scopeBuffer = 1.1; // Only 10% buffer for high trust
      adjustments.fastTrack = true;
    }
    
    // Intent-based adjustments
    if (intent.primary === 'builder') {
      adjustments.detailLevel = 'comprehensive';
      adjustments.includeTechnical = true;
    } else if (intent.primary === 'explorer') {
      adjustments.detailLevel = 'moderate';
      adjustments.includeEducational = true;
    } else if (intent.primary === 'shopper') {
      adjustments.detailLevel = 'minimal';
      adjustments.showRangeOnly = true;
    }
    
    // Flag-based adjustments
    if (trust.signals?.negative?.includes('vagueUrgent')) {
      adjustments.timelineBuffer = 1.5; // 50% timeline buffer
      adjustments.addWarning = 'Urgent timeline with vague requirements adds risk';
    }
    
    if (trust.signals?.negative?.includes('tooAmbitious')) {
      adjustments.suggestMVP = true;
      adjustments.showPhased = true;
    }
    
    return adjustments;
  }

  /**
   * Get cost of processing for this route
   * @param {string} routePath - Route path
   * @returns {number} Estimated cost
   */
  getProcessingCost(routePath) {
    const route = this.routes[routePath];
    const costs = {
      minimal: 0,
      low: 0.01,    // Minimal API calls
      medium: 0.05,  // Some API calls
      high: 0.20     // Full LLM processing
    };
    
    return costs[route?.costLevel || 'minimal'];
  }

  /**
   * Check if route should be cached
   * @param {string} routePath - Route path
   * @returns {boolean} Whether route is cacheable
   */
  shouldCache(routePath) {
    const cacheable = ['TEMPLATE_SUGGESTION', 'TEMPLATE_ONLY', 'EDUCATIONAL'];
    return cacheable.includes(routePath);
  }
}

module.exports = SmartRouter;

