/**
 * Enhanced Input Analyzer with Trust Scoring and Smart Routing
 * 
 * Extends InputAnalyzer to add:
 * - Trust signal analysis (positive/negative/contextual)
 * - Client intent detection
 * - Routing determination
 * - Smart recommendations
 */

const InputAnalyzer = require('./input-analyzer');

class InputAnalyzerEnhanced extends InputAnalyzer {
  constructor(logger) {
    super(logger);
    
    // Trust signals configuration
    this.trustSignals = {
      positive: {
        hasTimeline: { pattern: /\d+\s*(days?|weeks?|months?)/i, weight: 15 },
        hasBudget: { pattern: /₹|rs|lakh|crore|thousand|\d+k|\d+l/i, weight: 20 },
        hasUserCount: { pattern: /\d+\s*users?|\d+\s*customers?/i, weight: 10 },
        hasBusinessModel: { pattern: /b2b|b2c|saas|marketplace|d2c/i, weight: 10 },
        hasSpecificTech: { pattern: /react|angular|node|python|java|postgresql|mysql|mongodb/i, weight: 5 },
        hasCurrentSolution: { pattern: /currently using|existing system|replace|migration/i, weight: 15 },
        hasIndustry: { pattern: /retail|healthcare|finance|education|logistics|manufacturing/i, weight: 5 },
        detailedRequirements: { check: (input) => input.length > 500, weight: 10 }
      },
      
      negative: {
        hasEquityOffer: { pattern: /equity|revenue share|profit share|partnership/i, weight: -30 },
        tooAmbitious: { pattern: /next billion|unicorn|uber for|amazon of|flipkart like/i, weight: -20 },
        vagueUrgent: { 
          check: (input) => /asap|urgent|immediately/i.test(input) && input.length < 200, 
          weight: -25 
        },
        justChecking: { pattern: /just checking|just need price|ballpark|rough estimate/i, weight: -15 },
        tenderLanguage: { pattern: /tender|RFP|RFQ|quotation|L1|technical bid/i, weight: -20 },
        studentProject: { pattern: /college project|university project|learning|academic/i, weight: -25 },
        noSpecifics: { check: (input) => !(/\d+/.test(input)), weight: -10 },
        tooShort: { check: (input) => input.length < 100, weight: -15 }
      },
      
      contextual: {
        hasReferral: { check: (context) => context?.referrer?.includes('trusted'), weight: 25 },
        repeatClient: { check: (context) => context?.isRepeatClient, weight: 30 },
        fromAds: { check: (context) => context?.source?.includes('ads'), weight: -5 },
        directVisit: { check: (context) => context?.source === 'direct', weight: 5 }
      }
    };

    // Client intent patterns
    this.intentPatterns = {
      builder: {
        signals: ['need to build', 'want to develop', 'looking for development', 'require a system'],
        confidence: 0
      },
      explorer: {
        signals: ['exploring options', 'researching', 'understanding cost', 'feasibility study'],
        confidence: 0
      },
      validator: {
        signals: ['validate quote', 'second opinion', 'review estimate', 'check pricing'],
        confidence: 0
      },
      shopper: {
        signals: ['comparing prices', 'multiple quotes', 'best price', 'lowest cost'],
        confidence: 0
      },
      dreamer: {
        signals: ['after funding', 'once investor', 'when we raise', 'post seed round'],
        confidence: 0
      },
      tender: {
        signals: ['tender submission', 'RFP response', 'technical proposal', 'bid document'],
        confidence: 0
      }
    };

    // Routing rules based on scores
    this.routingRules = {
      premium: { quality: 70, trust: 70, path: 'FULL_ANALYSIS' },
      standard: { quality: 50, trust: 50, path: 'FULL_ANALYSIS' },
      guided: { quality: 40, trust: 40, path: 'GUIDED_CLARIFICATION' },
      educational: { quality: 30, trust: 30, path: 'EDUCATIONAL' },
      template: { quality: 0, trust: 0, path: 'TEMPLATE_SUGGESTION' }
    };
  }

  /**
   * Main analysis method - extends parent
   * @param {string} input - User input text
   * @param {Object} options - Analysis options including context
   * @returns {Object} Enhanced analysis with trust scoring and routing
   */
  async analyze(input, options = {}) {
    // Get base analysis from parent
    const baseAnalysis = await super.analyze(input, options);
    
    // Add trust scoring
    const trustAnalysis = this.analyzeTrust(input, options.context);
    
    // Detect client intent
    const intent = this.detectIntent(input);
    
    // Determine routing
    const routing = this.determineRouting(baseAnalysis, trustAnalysis, intent);
    
    // Compile comprehensive analysis
    const enhancedAnalysis = {
      ...baseAnalysis,
      trust: trustAnalysis,
      intent: intent,
      routing: routing,
      recommendations: this.generateSmartRecommendations(baseAnalysis, trustAnalysis, intent, routing)
    };
    
    return enhancedAnalysis;
  }

  /**
   * Analyze trust signals from input and context
   * @param {string} input - User input text
   * @param {Object} context - Contextual information (source, referrer, etc.)
   * @returns {Object} Trust analysis with score, signals, and flags
   */
  analyzeTrust(input, context = {}) {
    const analysis = {
      score: 50, // Start neutral
      signals: {
        positive: [],
        negative: [],
        contextual: []
      },
      flags: [],
      confidence: 'medium'
    };
    
    const inputLower = input.toLowerCase();
    
    // Check positive signals
    for (const [key, signal] of Object.entries(this.trustSignals.positive)) {
      if (signal.pattern && signal.pattern.test(input)) {
        analysis.signals.positive.push(key);
        analysis.score += signal.weight;
      } else if (signal.check && signal.check(input)) {
        analysis.signals.positive.push(key);
        analysis.score += signal.weight;
      }
    }
    
    // Check negative signals
    for (const [key, signal] of Object.entries(this.trustSignals.negative)) {
      if (signal.pattern && signal.pattern.test(input)) {
        analysis.signals.negative.push(key);
        analysis.score += signal.weight; // weight is already negative
        analysis.flags.push(this.generateFlag(key));
      } else if (signal.check && signal.check(input)) {
        analysis.signals.negative.push(key);
        analysis.score += signal.weight;
        analysis.flags.push(this.generateFlag(key));
      }
    }
    
    // Check contextual signals
    if (context) {
      for (const [key, signal] of Object.entries(this.trustSignals.contextual)) {
        if (signal.check && signal.check(context)) {
          analysis.signals.contextual.push(key);
          analysis.score += signal.weight;
        }
      }
    }
    
    // Normalize score to 0-100
    analysis.score = Math.max(0, Math.min(100, analysis.score));
    
    // Set confidence level
    if (analysis.score >= 70) analysis.confidence = 'high';
    else if (analysis.score >= 40) analysis.confidence = 'medium';
    else analysis.confidence = 'low';
    
    return analysis;
  }

  /**
   * Detect client intent from input
   * @param {string} input - User input text
   * @returns {Object} Intent analysis with primary, secondary, and confidence
   */
  detectIntent(input) {
    const inputLower = input.toLowerCase();
    const detectedIntents = [];
    
    for (const [intentType, pattern] of Object.entries(this.intentPatterns)) {
      pattern.confidence = 0;
      const matchCount = pattern.signals.filter(signal => inputLower.includes(signal)).length;
      
      if (matchCount > 0) {
        pattern.confidence = (matchCount / pattern.signals.length) * 100;
        detectedIntents.push({
          type: intentType,
          confidence: pattern.confidence
        });
      }
    }
    
    // Sort by confidence
    detectedIntents.sort((a, b) => b.confidence - a.confidence);
    
    return {
      primary: detectedIntents[0]?.type || 'unknown',
      secondary: detectedIntents[1]?.type || null,
      all: detectedIntents,
      confidence: detectedIntents[0]?.confidence || 0
    };
  }

  /**
   * Determine routing based on quality, trust, and intent
   * @param {Object} qualityAnalysis - Base quality analysis
   * @param {Object} trustAnalysis - Trust analysis
   * @param {Object} intent - Intent analysis
   * @returns {Object} Routing decision
   */
  determineRouting(qualityAnalysis, trustAnalysis, intent) {
    const quality = qualityAnalysis.confidence || qualityAnalysis.completeness || 0;
    const trust = trustAnalysis.score;
    
    // Special routing for specific intents
    if (intent.primary === 'tender') {
      return {
        path: 'TEMPLATE_ONLY',
        reason: 'Tender/RFP detected - providing standard template',
        priority: 'low'
      };
    }
    
    if (intent.primary === 'validator') {
      return {
        path: 'VALIDATION_FLOW',
        reason: 'Quote validation requested',
        priority: 'medium'
      };
    }
    
    if (intent.primary === 'dreamer' && trust < 40) {
      return {
        path: 'EDUCATIONAL',
        reason: 'Project appears to be unfunded',
        priority: 'low'
      };
    }
    
    // Special handling for very low trust (even if quality is okay)
    if (trust < 30 && intent.primary !== 'tender') {
      return {
        path: 'EDUCATIONAL',
        reason: `Low trust score (${trust}%) - educational content recommended`,
        priority: 'low'
      };
    }
    
    // Standard routing based on quality and trust
    for (const [level, rule] of Object.entries(this.routingRules)) {
      if (quality >= rule.quality && trust >= rule.trust) {
        return {
          path: rule.path,
          reason: `Quality: ${quality.toFixed(0)}%, Trust: ${trust}%`,
          priority: trust >= 70 ? 'high' : trust >= 40 ? 'medium' : 'low',
          level: level
        };
      }
    }
    
    // If quality is low but trust is medium, suggest clarification
    if (quality < 50 && trust >= 30 && trust < 50) {
      return {
        path: 'GUIDED_CLARIFICATION',
        reason: `Quality: ${quality.toFixed(0)}%, Trust: ${trust}% - needs clarification`,
        priority: 'medium'
      };
    }
    
    // Default to template suggestion
    return {
      path: 'TEMPLATE_SUGGESTION',
      reason: 'Requirements need more structure',
      priority: 'low'
    };
  }

  /**
   * Generate smart recommendations based on analysis
   * @param {Object} quality - Quality analysis
   * @param {Object} trust - Trust analysis
   * @param {Object} intent - Intent analysis
   * @param {Object} routing - Routing decision
   * @returns {Array} Recommendations array
   */
  generateSmartRecommendations(quality, trust, intent, routing) {
    const recommendations = [];
    
    // Routing-based recommendations
    switch(routing.path) {
      case 'FULL_ANALYSIS':
        recommendations.push({
          type: 'success',
          message: 'Requirements are clear. Generating detailed analysis...',
          action: 'proceed'
        });
        break;
        
      case 'GUIDED_CLARIFICATION':
        recommendations.push({
          type: 'info',
          message: 'We need a few clarifications to provide accurate estimates',
          action: 'show_questions',
          questions: this.generateClarificationQuestions(quality, trust)
        });
        break;
        
      case 'EDUCATIONAL':
        recommendations.push({
          type: 'warning',
          message: 'Let\'s first understand what makes a successful project',
          action: 'show_guide',
          resources: this.selectEducationalResources(intent.primary)
        });
        break;
        
      case 'TEMPLATE_SUGGESTION':
        recommendations.push({
          type: 'info',
          message: 'Use our template to structure your requirements better',
          action: 'download_template',
          templateType: this.selectTemplate(intent.primary, quality.projectType)
        });
        break;
        
      case 'VALIDATION_FLOW':
        recommendations.push({
          type: 'info',
          message: 'Upload the quote you want to validate',
          action: 'upload_quote'
        });
        break;
    }
    
    // Trust-based warnings
    if (trust.flags && trust.flags.length > 0) {
      trust.flags.forEach(flag => {
        if (flag.severity === 'high') {
          recommendations.push({
            type: 'warning',
            message: flag.message,
            action: flag.action
          });
        }
      });
    }
    
    // Quality-based suggestions
    const qualityScore = quality.confidence || quality.completeness || 0;
    if (qualityScore < 40) {
      const missing = quality.missingCritical || [];
      recommendations.push({
        type: 'suggestion',
        message: `Add details about: ${missing.join(', ')}`,
        action: 'improve_input'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate appropriate flag for negative signals
   * @param {string} signalKey - Signal key
   * @returns {Object} Flag object with message, severity, and action
   */
  generateFlag(signalKey) {
    const flagMessages = {
      hasEquityOffer: {
        message: 'Equity-based payment detected. We work on cash terms only.',
        severity: 'high',
        action: 'clarify_payment'
      },
      tooAmbitious: {
        message: 'Project scope seems very ambitious. Let\'s start with an MVP.',
        severity: 'medium',
        action: 'suggest_mvp'
      },
      vagueUrgent: {
        message: 'Urgent timeline with unclear requirements is risky.',
        severity: 'high',
        action: 'clarify_requirements'
      },
      justChecking: {
        message: 'For rough estimates, use our calculator tool instead.',
        severity: 'low',
        action: 'redirect_calculator'
      },
      tenderLanguage: {
        message: 'For tender submissions, download our standard template.',
        severity: 'medium',
        action: 'provide_template'
      },
      studentProject: {
        message: 'For academic projects, check our student resources.',
        severity: 'medium',
        action: 'redirect_educational'
      }
    };
    
    return flagMessages[signalKey] || {
      message: 'Some concerns detected in requirements',
      severity: 'low',
      action: 'review'
    };
  }

  /**
   * Generate clarification questions based on what's missing
   * @param {Object} quality - Quality analysis
   * @param {Object} trust - Trust analysis
   * @returns {Array} Questions array (max 3)
   */
  generateClarificationQuestions(quality, trust) {
    const questions = [];
    
    // Priority questions based on missing critical info
    const checks = quality.checks || {};
    if (!checks.hasBudget) {
      questions.push({
        field: 'budget',
        question: 'What\'s your budget range for this project?',
        type: 'select',
        options: ['< 5 Lakhs', '5-10 Lakhs', '10-25 Lakhs', '25-50 Lakhs', '> 50 Lakhs'],
        required: true
      });
    }
    
    if (!checks.hasTimeline) {
      questions.push({
        field: 'timeline',
        question: 'When do you need this completed?',
        type: 'select',
        options: ['1 month', '2-3 months', '3-6 months', '6+ months'],
        required: true
      });
    }
    
    if (!checks.hasUserCount) {
      questions.push({
        field: 'users',
        question: 'How many users will use this system?',
        type: 'select',
        options: ['< 100', '100-1000', '1000-10000', '> 10000'],
        required: false
      });
    }
    
    // Trust-based questions
    if (trust.score < 50) {
      questions.push({
        field: 'purpose',
        question: 'What\'s the primary purpose of this project?',
        type: 'select',
        options: ['Business Critical', 'Efficiency Improvement', 'Customer Facing', 'Internal Tool', 'Experimental'],
        required: true
      });
    }
    
    return questions.slice(0, 3); // Max 3 questions to avoid cognitive overload
  }

  /**
   * Select educational resources based on intent
   * @param {string} intent - Primary intent type
   * @returns {Array} Resource file names
   */
  selectEducationalResources(intent) {
    const resources = {
      dreamer: ['how-to-validate-your-idea.pdf', 'mvp-first-approach.pdf'],
      explorer: ['software-development-process.pdf', 'typical-costs-india.pdf'],
      tender: ['tender-requirements-template.xlsx'],
      unknown: ['getting-started-guide.pdf']
    };
    
    return resources[intent] || resources.unknown;
  }

  /**
   * Select appropriate template
   * @param {string} intent - Primary intent type
   * @param {string} projectType - Project type from quality analysis
   * @returns {string} Template file name
   */
  selectTemplate(intent, projectType) {
    if (intent === 'tender') return 'tender-response-template.xlsx';
    
    const templates = {
      ecommerce: 'ecommerce-requirements.xlsx',
      saas: 'saas-requirements.xlsx',
      marketplace: 'marketplace-requirements.xlsx',
      general: 'general-requirements.xlsx'
    };
    
    return templates[projectType] || templates.general;
  }
}

module.exports = InputAnalyzerEnhanced;

