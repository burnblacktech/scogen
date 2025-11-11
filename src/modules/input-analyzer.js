/**
 * Input Analyzer Module
 * 
 * Purpose: Assess input completeness and specificity before processing
 * Philosophy: Identify what's missing, not reject vague inputs
 */

class InputAnalyzer {
  constructor(logger) {
    this.logger = logger;
    this.qualityThresholds = {
      ready: 70,
      needsClarification: 40
    };
  }

  /**
   * Main analysis entry point
   * @param {string} input - User input text
   * @param {string|Object} inputType - Type of input (text, pdf, excel) or options object
   * @returns {Object} Analysis result with quality score and feasibility
   */
  async analyze(input, inputType = 'text') {
    // Handle options object (for backward compatibility)
    const options = typeof inputType === 'object' ? inputType : { inputType };
    const useQualityAnalysis = options.useQualityAnalysis === true || process.env.USE_QUALITY_ANALYSIS === 'true';
    
    if (useQualityAnalysis) {
      return this.analyzeQuality(input, options);
    }
    
    // Original analysis method (backward compatible)
    return this.analyzeOriginal(input, typeof inputType === 'string' ? inputType : 'text');
  }

  /**
   * Original analysis method (preserved for backward compatibility)
   */
  async analyzeOriginal(input, inputType = 'text') {
    this.logger.info('Analyzing input quality', { 
      inputLength: input.length,
      inputType 
    });

    if (!input || input.trim().length === 0) {
      return {
        completeness: 0,
        specificity: 0,
        feasibility: 'too-vague',
        missingCritical: ['No input provided'],
        clarificationsNeeded: ['Please provide your project requirements']
      };
    }

    // Perform checks
    const checks = {
      hasUserTypes: this.checkForUserTypes(input),
      hasFeatures: this.checkForFeatures(input),
      hasPlatform: this.checkForPlatform(input),
      hasScale: this.checkForScale(input),
      hasIntegrations: this.checkForIntegrations(input),
      hasBusinessModel: this.checkForBusinessModel(input),
      hasWorkflow: this.checkForWorkflow(input)
    };

    // Calculate scores
    const completeness = this.calculateCompleteness(checks);
    const specificity = this.calculateSpecificity(input, checks);

    // Determine feasibility
    let feasibility;
    if (completeness >= this.qualityThresholds.ready) {
      feasibility = 'ready';
    } else if (completeness >= this.qualityThresholds.needsClarification) {
      feasibility = 'needs-clarification';
    } else {
      feasibility = 'too-vague';
    }

    // Identify missing items
    const missingCritical = this.identifyMissingCritical(checks);
    const missingImportant = this.identifyMissingImportant(checks);
    const missingNiceToHave = this.identifyMissingNiceToHave(checks);

    // Generate clarification questions
    const clarificationsNeeded = this.generateClarificationQuestions(input, checks);

    const analysis = {
      completeness: Math.round(completeness),
      specificity: Math.round(specificity),
      feasibility,
      missingCritical,
      missingImportant,
      missingNiceToHave,
      clarificationsNeeded,
      checks
    };

    this.logger.info('Input analysis complete', {
      completeness: analysis.completeness,
      feasibility: analysis.feasibility,
      missingCriticalCount: analysis.missingCritical.length
    });

    return analysis;
  }

  /**
   * Check for user types/roles mentioned
   */
  checkForUserTypes(input) {
    const userTypeKeywords = [
      'admin', 'administrator', 'user', 'customer', 'client',
      'vendor', 'supplier', 'employee', 'manager', 'staff',
      'member', 'subscriber', 'guest', 'visitor', 'buyer',
      'seller', 'merchant', 'partner', 'agent', 'auditor',
      'role', 'permission', 'access', 'login', 'account'
    ];

    const lowerInput = input.toLowerCase();
    const found = userTypeKeywords.filter(keyword => 
      lowerInput.includes(keyword)
    );

    return {
      found: found.length > 0,
      count: found.length,
      types: found
    };
  }

  /**
   * Check for features mentioned
   */
  checkForFeatures(input) {
    const featureKeywords = [
      'dashboard', 'report', 'analytics', 'notification', 'email',
      'sms', 'payment', 'invoice', 'billing', 'subscription',
      'search', 'filter', 'export', 'import', 'upload', 'download',
      'approval', 'workflow', 'status', 'tracking', 'order',
      'inventory', 'catalog', 'product', 'cart', 'checkout',
      'authentication', 'authorization', 'profile', 'settings',
      'api', 'integration', 'webhook', 'sync', 'backup'
    ];

    const lowerInput = input.toLowerCase();
    const found = featureKeywords.filter(keyword => 
      lowerInput.includes(keyword)
    );

    return {
      found: found.length > 0,
      count: found.length,
      features: found
    };
  }

  /**
   * Check for platform type mentioned
   */
  checkForPlatform(input) {
    const platformKeywords = [
      'web', 'website', 'webapp', 'web app', 'web application',
      'mobile', 'app', 'ios', 'android', 'react native',
      'desktop', 'api', 'backend', 'frontend', 'full stack',
      'saas', 'platform', 'ecommerce', 'e-commerce', 'marketplace',
      'crm', 'erp', 'hrms', 'pos', 'cms'
    ];

    const lowerInput = input.toLowerCase();
    const found = platformKeywords.filter(keyword => 
      lowerInput.includes(keyword)
    );

    return {
      found: found.length > 0,
      count: found.length,
      platforms: found
    };
  }

  /**
   * Check for scale indicators
   */
  checkForScale(input) {
    const scaleKeywords = [
      'users', 'customers', 'employees', 'transactions', 'orders',
      'products', 'items', 'records', 'data', 'volume',
      'small', 'medium', 'large', 'enterprise', 'startup',
      'scale', 'traffic', 'concurrent', 'thousands', 'millions',
      'hundreds', 'tens', 'hundred', 'thousand', 'million'
    ];

    const scaleNumbers = input.match(/\b(\d+)\s*(users|customers|employees|products|orders|transactions|records)\b/gi);

    const lowerInput = input.toLowerCase();
    const found = scaleKeywords.filter(keyword => 
      lowerInput.includes(keyword)
    );

    return {
      found: found.length > 0 || (scaleNumbers && scaleNumbers.length > 0),
      count: found.length + (scaleNumbers ? scaleNumbers.length : 0),
      indicators: found,
      numbers: scaleNumbers || []
    };
  }

  /**
   * Check for integrations mentioned
   */
  checkForIntegrations(input) {
    const integrationKeywords = [
      'payment', 'gateway', 'razorpay', 'stripe', 'payu', 'paypal',
      'sms', 'twilio', 'msg91', 'whatsapp', 'email', 'sendgrid',
      'mailchimp', 'google', 'facebook', 'twitter', 'linkedin',
      'oauth', 'sso', 'saml', 'api', 'webhook', 'integration',
      'third party', 'external', 'connect', 'sync', 'import',
      'export', 'erp', 'accounting', 'crm', 'shipping', 'logistics'
    ];

    const lowerInput = input.toLowerCase();
    const found = integrationKeywords.filter(keyword => 
      lowerInput.includes(keyword)
    );

    return {
      found: found.length > 0,
      count: found.length,
      integrations: found
    };
  }

  /**
   * Check for business model mentioned
   */
  checkForBusinessModel(input) {
    const modelKeywords = [
      'b2b', 'b2c', 'b2b2c', 'marketplace', 'saas', 'subscription',
      'one-time', 'recurring', 'commission', 'fee', 'revenue',
      'pricing', 'plan', 'tier', 'freemium', 'monetization'
    ];

    const lowerInput = input.toLowerCase();
    const found = modelKeywords.filter(keyword => 
      lowerInput.includes(keyword)
    );

    return {
      found: found.length > 0,
      count: found.length,
      models: found
    };
  }

  /**
   * Check for workflow/process mentioned
   */
  checkForWorkflow(input) {
    const workflowKeywords = [
      'workflow', 'process', 'approval', 'status', 'state',
      'step', 'stage', 'phase', 'order', 'sequence',
      'pipeline', 'lifecycle', 'transition', 'trigger',
      'automation', 'rule', 'condition', 'if', 'when'
    ];

    const lowerInput = input.toLowerCase();
    const found = workflowKeywords.filter(keyword => 
      lowerInput.includes(keyword)
    );

    return {
      found: found.length > 0,
      count: found.length,
      workflows: found
    };
  }

  /**
   * Calculate completeness score (0-100%)
   */
  calculateCompleteness(checks) {
    const weights = {
      hasUserTypes: 15,
      hasFeatures: 25,
      hasPlatform: 15,
      hasScale: 10,
      hasIntegrations: 10,
      hasBusinessModel: 10,
      hasWorkflow: 15
    };

    let score = 0;
    let totalWeight = 0;

    Object.keys(weights).forEach(key => {
      const check = checks[key];
      const weight = weights[key];
      totalWeight += weight;

      if (check.found) {
        // Bonus for multiple mentions
        const bonus = Math.min(check.count * 2, 10);
        score += weight + bonus;
      }
    });

    // Normalize to 0-100
    return Math.min((score / totalWeight) * 100, 100);
  }

  /**
   * Calculate specificity score (0-100%)
   */
  calculateSpecificity(input, checks) {
    // Base specificity from input length (more detail = more specific)
    const lengthScore = Math.min((input.length / 500) * 30, 30);

    // Specificity from number of features mentioned
    const featureScore = Math.min(checks.hasFeatures.count * 3, 40);

    // Specificity from numbers/quantities mentioned
    const numberMatches = input.match(/\b\d+\b/g);
    const numberScore = numberMatches ? Math.min(numberMatches.length * 2, 20) : 0;

    // Specificity from technical terms
    const technicalTerms = ['api', 'database', 'server', 'frontend', 'backend', 'deploy', 'host'];
    const technicalCount = technicalTerms.filter(term => 
      input.toLowerCase().includes(term)
    ).length;
    const technicalScore = Math.min(technicalCount * 2, 10);

    return Math.min(lengthScore + featureScore + numberScore + technicalScore, 100);
  }

  /**
   * Identify missing critical items
   */
  identifyMissingCritical(checks) {
    const missing = [];

    if (!checks.hasPlatform.found) {
      missing.push('Platform type (web, mobile, desktop, etc.)');
    }

    if (!checks.hasFeatures.found || checks.hasFeatures.count < 3) {
      missing.push('Core features and functionality');
    }

    if (!checks.hasUserTypes.found) {
      missing.push('User types/roles (admin, customer, etc.)');
    }

    return missing;
  }

  /**
   * Identify missing important items
   */
  identifyMissingImportant(checks) {
    const missing = [];

    if (!checks.hasScale.found) {
      missing.push('Scale indicators (number of users, products, transactions)');
    }

    if (!checks.hasIntegrations.found) {
      missing.push('Third-party integrations (payment, SMS, email, etc.)');
    }

    if (!checks.hasBusinessModel.found) {
      missing.push('Business model (B2B, B2C, marketplace, subscription, etc.)');
    }

    return missing;
  }

  /**
   * Identify missing nice-to-have items
   */
  identifyMissingNiceToHave(checks) {
    const missing = [];

    if (!checks.hasWorkflow.found) {
      missing.push('Workflow/process details');
    }

    return missing;
  }

  /**
   * Generate targeted clarification questions
   */
  generateClarificationQuestions(input, checks) {
    const questions = [];
    const lowerInput = input.toLowerCase();

    // Platform questions
    if (!checks.hasPlatform.found) {
      if (lowerInput.includes('ecommerce') || lowerInput.includes('e-commerce') || lowerInput.includes('shop')) {
        questions.push('Is this a web application, mobile app, or both?');
      } else {
        questions.push('What platform are you building for? (Web, mobile app, desktop, API)');
      }
    }

    // Scale questions
    if (!checks.hasScale.found) {
      if (lowerInput.includes('user') || lowerInput.includes('customer')) {
        questions.push('Approximately how many users/customers will use this? (< 100, 100-1000, 1000-10000, 10000+)');
      } else if (lowerInput.includes('product') || lowerInput.includes('item')) {
        questions.push('How many products/items will you manage? (10s, 100s, 1000s+)');
      } else {
        questions.push('What is the expected scale? (Number of users, transactions, or data volume)');
      }
    }

    // Feature questions
    if (checks.hasFeatures.count < 3) {
      if (lowerInput.includes('payment') || lowerInput.includes('order')) {
        questions.push('What payment methods do you need? (Card, UPI, COD, EMI, Wallet)');
      }
      if (lowerInput.includes('user') || lowerInput.includes('account')) {
        questions.push('Do you need user accounts, or guest checkout only?');
      }
    }

    // Integration questions
    if (!checks.hasIntegrations.found) {
      if (lowerInput.includes('payment') || lowerInput.includes('order')) {
        questions.push('Do you need payment gateway integration? (Razorpay, PayU, Stripe, etc.)');
      }
      if (lowerInput.includes('notification') || lowerInput.includes('alert')) {
        questions.push('Do you need SMS/Email/WhatsApp notifications?');
      }
    }

    // Business model questions
    if (!checks.hasBusinessModel.found) {
      if (lowerInput.includes('marketplace') || lowerInput.includes('vendor')) {
        questions.push('Is this a single-vendor or multi-vendor marketplace?');
      } else if (lowerInput.includes('saas') || lowerInput.includes('subscription')) {
        questions.push('What is your pricing model? (One-time, subscription, usage-based)');
      }
    }

    return questions;
  }

  /**
   * Suggest template based on input analysis
   */
  suggestTemplate(checks, input) {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('ecommerce') || lowerInput.includes('e-commerce') || 
        lowerInput.includes('shop') || lowerInput.includes('store') ||
        lowerInput.includes('marketplace')) {
      return 'ecommerce-requirements.xlsx';
    }

    if (lowerInput.includes('saas') || lowerInput.includes('subscription') ||
        lowerInput.includes('platform')) {
      return 'saas-product-requirements.xlsx';
    }

    if (lowerInput.includes('internal') || lowerInput.includes('tool') ||
        lowerInput.includes('admin') || lowerInput.includes('dashboard')) {
      return 'internal-tool-requirements.xlsx';
    }

    // Default to web app template
    return 'web-app-requirements.xlsx';
  }

  /**
   * ENHANCED QUALITY ANALYSIS METHODS
   * These methods provide more detailed quality assessment
   */

  /**
   * Enhanced quality analysis with completeness, specificity, clarity metrics
   */
  async analyzeQuality(input, options = {}) {
    this.logger.info('Analyzing input quality (enhanced)', { 
      inputLength: input.length,
      inputType: options.inputType || 'text'
    });

    if (!input || input.trim().length === 0) {
      return {
        completeness: 0,
        specificity: 0,
        clarity: 0,
        feasibility: 'too-vague',
        missingCritical: ['No input provided'],
        clarificationsNeeded: ['Please provide your project requirements'],
        recommendations: [{
          type: 'template',
          message: 'Please provide your project requirements',
          priority: 'high'
        }],
        confidence: 0
      };
    }

    // Calculate quality metrics
    const completeness = this.calculateCompletenessEnhanced(input);
    const specificity = this.calculateSpecificityEnhanced(input);
    const clarity = this.calculateClarityEnhanced(input);

    // Determine feasibility
    const feasibility = this.determineFeasibilityEnhanced({
      completeness,
      specificity,
      clarity
    });

    // Find missing elements
    const missingCritical = this.findMissingCriticalEnhanced(input);
    const missingImportant = this.findMissingImportantEnhanced(input);

    // Generate clarifications
    const clarificationsNeeded = this.generateClarificationsEnhanced(missingCritical, missingImportant);

    // Generate recommendations
    const recommendations = this.generateRecommendationsEnhanced({
      completeness,
      specificity,
      clarity,
      missingCritical
    });

    // Calculate confidence
    const confidence = this.calculateConfidenceEnhanced({
      completeness,
      specificity,
      clarity,
      feasibility
    });

    const analysis = {
      completeness: Math.round(completeness),
      specificity: Math.round(specificity),
      clarity: Math.round(clarity),
      feasibility,
      missingCritical,
      missingImportant,
      clarificationsNeeded,
      recommendations,
      confidence: Math.round(confidence),
      // Keep original checks for compatibility
      checks: {
        hasUserTypes: this.checkForUserTypes(input),
        hasFeatures: this.checkForFeatures(input),
        hasPlatform: this.checkForPlatform(input),
        hasScale: this.checkForScale(input),
        hasIntegrations: this.checkForIntegrations(input),
        hasBusinessModel: this.checkForBusinessModel(input),
        hasWorkflow: this.checkForWorkflow(input)
      }
    };

    this.logger.info('Enhanced input analysis complete', {
      completeness: analysis.completeness,
      specificity: analysis.specificity,
      clarity: analysis.clarity,
      feasibility: analysis.feasibility,
      confidence: analysis.confidence
    });

    return analysis;
  }

  /**
   * Enhanced completeness calculation
   * Checks for required elements: features, users, platform, timeline
   */
  calculateCompletenessEnhanced(input) {
    const text = typeof input === 'string' ? input.toLowerCase() : JSON.stringify(input).toLowerCase();
    
    const requiredElements = {
      features: ['feature', 'module', 'functionality', 'requirement', 'capability'],
      users: ['user', 'role', 'admin', 'customer', 'member', 'employee'],
      platform: ['web', 'mobile', 'android', 'ios', 'desktop', 'platform', 'app'],
      timeline: ['deadline', 'launch', 'timeline', 'duration', 'when', 'date', 'month', 'week']
    };
    
    let found = 0;
    let total = 0;
    
    for (const [category, keywords] of Object.entries(requiredElements)) {
      total++;
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        found++;
        // Bonus for multiple keyword matches in same category
        if (matches.length > 1) {
          found += 0.2; // Small bonus
        }
      }
    }
    
    return Math.min((found / total) * 100, 100);
  }

  /**
   * Enhanced specificity calculation
   * Checks for numbers, budget mentions, timeline specifics, penalizes vague terms
   */
  calculateSpecificityEnhanced(input) {
    const text = typeof input === 'string' ? input.toLowerCase() : JSON.stringify(input).toLowerCase();
    const wordCount = text.split(/\s+/).length;
    
    if (wordCount < 20) return 20; // Too brief
    
    let score = 50; // Base score
    
    // Check for specific details
    const hasNumbers = /\d+/.test(text);
    const hasTimeline = /\d+\s*(day|week|month|year)s?/.test(text);
    const hasBudget = /₹|rs|lakh|crore|thousand|\d+k|\d+l|\d+cr/.test(text);
    const hasTechStack = /(react|angular|vue|node|python|java|php|mysql|postgres|mongodb)/.test(text);
    
    if (hasNumbers) score += 10;
    if (hasTimeline) score += 15;
    if (hasBudget) score += 15;
    if (hasTechStack) score += 10;
    
    // Penalize vague phrases
    const vaguePhrases = [
      'simple', 'basic', 'something like', 'kind of', 'etc',
      'and so on', 'and more', 'various', 'multiple', 'several',
      'standard', 'normal', 'typical', 'just like'
    ];
    const vagueCount = vaguePhrases.filter(phrase => text.includes(phrase)).length;
    score -= vagueCount * 5;
    
    // Word count bonus (detailed descriptions)
    if (wordCount > 100) score += 10;
    if (wordCount > 200) score += 10;
    if (wordCount > 500) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Enhanced clarity calculation
   * Checks for structured content, penalizes run-on sentences
   */
  calculateClarityEnhanced(input) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    
    let score = 70; // Base score
    
    // Check for structured content
    const hasBulletPoints = /[•\-\*]\s|\d+\.\s/.test(text);
    const hasSections = /\n\n/.test(text);
    const hasHeaders = /(requirement|feature|module|objective)s?:/i.test(text);
    
    if (hasBulletPoints) score += 10;
    if (hasSections) score += 10;
    if (hasHeaders) score += 10;
    
    // Penalize run-on sentences
    const sentences = text.split(/[.!?]+/);
    const avgSentenceLength = text.length / Math.max(sentences.length, 1);
    if (avgSentenceLength > 200) score -= 15;
    if (avgSentenceLength > 300) score -= 10;
    
    // Penalize too many vague phrases
    const vaguePhrases = ['simple', 'basic', 'something like', 'kind of', 'etc'];
    const vagueCount = vaguePhrases.filter(phrase => text.toLowerCase().includes(phrase)).length;
    if (vagueCount > 3) score -= 15;
    if (vagueCount > 5) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine feasibility based on quality metrics
   */
  determineFeasibilityEnhanced(qualityMetrics) {
    const overall = (qualityMetrics.completeness + qualityMetrics.specificity + qualityMetrics.clarity) / 3;
    
    if (overall >= 70) return 'ready';
    if (overall >= 40) return 'needs-clarification';
    return 'too-vague';
  }

  /**
   * Find missing critical elements
   */
  findMissingCriticalEnhanced(input) {
    const text = typeof input === 'string' ? input.toLowerCase() : JSON.stringify(input).toLowerCase();
    const missing = [];
    
    const critical = {
      'Core Features': !text.includes('feature') && !text.includes('module') && !text.includes('functionality'),
      'User Types': !text.includes('user') && !text.includes('role') && !text.includes('admin') && !text.includes('customer'),
      'Platform': !text.includes('web') && !text.includes('mobile') && !text.includes('app') && !text.includes('platform'),
      'Timeline': !text.includes('deadline') && !text.includes('timeline') && !text.includes('launch') && !text.includes('when')
    };
    
    for (const [item, isMissing] of Object.entries(critical)) {
      if (isMissing) missing.push(item);
    }
    
    return missing;
  }

  /**
   * Find missing important elements
   */
  findMissingImportantEnhanced(input) {
    const text = typeof input === 'string' ? input.toLowerCase() : JSON.stringify(input).toLowerCase();
    const missing = [];
    
    const important = {
      'Scale': !text.includes('user') && !text.includes('customer') && !/\d+/.test(text),
      'Integration': !text.includes('integration') && !text.includes('api') && !text.includes('third-party'),
      'Budget': !/₹|rs|lakh|crore|budget|cost|price/.test(text)
    };
    
    for (const [item, isMissing] of Object.entries(important)) {
      if (isMissing) missing.push(item);
    }
    
    return missing;
  }

  /**
   * Generate clarifications for missing elements
   */
  generateClarificationsEnhanced(critical, important) {
    const clarifications = [];
    
    // Critical clarifications
    for (const element of critical) {
      clarifications.push({
        priority: 'critical',
        element,
        question: this.getClarificationQuestion(element),
        required: true
      });
    }
    
    // Important clarifications (max 3)
    for (const element of important.slice(0, 3)) {
      clarifications.push({
        priority: 'important',
        element,
        question: this.getClarificationQuestion(element),
        required: false
      });
    }
    
    return clarifications;
  }

  /**
   * Get clarification question for element
   */
  getClarificationQuestion(element) {
    const questions = {
      'Core Features': 'What are the core features/modules needed?',
      'User Types': 'Who will use this system? (user types/roles)',
      'Platform': 'Which platforms? (Web/Mobile/Desktop)',
      'Timeline': 'What\'s your target timeline/deadline?',
      'Scale': 'Expected number of users/volume?',
      'Integration': 'Any third-party integrations needed?',
      'Budget': 'What\'s your budget range?'
    };
    return questions[element] || `Please specify ${element}`;
  }

  /**
   * Generate recommendations based on quality metrics
   */
  generateRecommendationsEnhanced(qualityMetrics) {
    const recommendations = [];
    
    if (qualityMetrics.completeness < 40) {
      recommendations.push({
        type: 'template',
        message: 'Requirements are incomplete. Consider using our Excel template.',
        action: 'download-template',
        priority: 'high'
      });
    }
    
    if (qualityMetrics.specificity < 50) {
      recommendations.push({
        type: 'detail',
        message: 'Add specific details like numbers, timelines, and technical preferences.',
        action: 'add-details',
        priority: 'medium'
      });
    }
    
    if (qualityMetrics.clarity < 60) {
      recommendations.push({
        type: 'structure',
        message: 'Structure requirements with bullet points or sections for clarity.',
        action: 'restructure',
        priority: 'medium'
      });
    }
    
    if (qualityMetrics.missingCritical && qualityMetrics.missingCritical.length > 0) {
      recommendations.push({
        type: 'critical',
        message: `Missing critical information: ${qualityMetrics.missingCritical.join(', ')}`,
        action: 'fill-critical',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidenceEnhanced(qualityMetrics) {
    const weights = {
      completeness: 0.4,
      specificity: 0.3,
      clarity: 0.2,
      feasibility: 0.1
    };
    
    let score = 
      qualityMetrics.completeness * weights.completeness +
      qualityMetrics.specificity * weights.specificity +
      qualityMetrics.clarity * weights.clarity;
    
    if (qualityMetrics.feasibility === 'ready') score += 10;
    if (qualityMetrics.feasibility === 'too-vague') score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate quick form for missing critical items
   */
  generateQuickForm(analysis) {
    const form = {
      title: 'Quick Details Needed',
      fields: [],
      canProceed: analysis.completeness >= 40
    };
    
    // Add fields for critical missing items
    if (analysis.clarificationsNeeded) {
      for (const clarification of analysis.clarificationsNeeded) {
        if (clarification.priority === 'critical') {
          form.fields.push({
            name: clarification.element,
            label: clarification.question,
            type: this.getFieldType(clarification.element),
            required: true,
            options: this.getFieldOptions(clarification.element)
          });
        }
      }
    }
    
    return form;
  }

  /**
   * Get field type for form generation
   */
  getFieldType(element) {
    const types = {
      'Timeline': 'date',
      'Budget': 'select',
      'Scale': 'select',
      'Platform': 'checkbox',
      'User Types': 'text',
      'Core Features': 'textarea'
    };
    return types[element] || 'text';
  }

  /**
   * Get field options for select/checkbox fields
   */
  getFieldOptions(element) {
    const options = {
      'Budget': [
        '< ₹5 Lakhs',
        '₹5-10 Lakhs',
        '₹10-25 Lakhs',
        '₹25-50 Lakhs',
        '> ₹50 Lakhs'
      ],
      'Scale': [
        '< 100 users',
        '100-1000 users',
        '1000-10000 users',
        '> 10000 users'
      ],
      'Platform': [
        'Web',
        'iOS',
        'Android',
        'Desktop'
      ]
    };
    return options[element] || [];
  }
}

module.exports = InputAnalyzer;

