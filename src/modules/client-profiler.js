/**
 * Client Profiler Module
 * 
 * Purpose: Assess client maturity, risk level, and project characteristics
 * Philosophy: Understand WHO the client is, not just WHAT they want
 */

class ClientProfiler {
  constructor(logger) {
    this.logger = logger;
    this.profilePatterns = this.loadProfilePatterns();
  }

  /**
   * Main profiling entry point
   * @param {string} input - User input text
   * @param {Array} conversationHistory - Optional conversation history
   * @returns {Object} Client profile with risk assessment and recommendations
   */
  async profileClient(input, conversationHistory = null) {
    this.logger.info('Profiling client', { 
      inputLength: input?.length || 0 
    });

    if (!input || input.trim().length === 0) {
      return this.getDefaultProfile();
    }

    const profile = {
      techSavvy: this.assessTechSavvy(input),
      decisionMaker: this.assessDecisionMaker(input),
      urgency: this.assessUrgency(input),
      hadFailure: this.detectPreviousFailure(input),
      budgetClarity: this.assessBudgetClarity(input),
      clientSize: this.assessClientSize(input),
      committeeDecision: this.detectCommittee(input),
      
      // Derived insights (calculated below)
      riskLevel: 'medium',
      handHoldingNeeded: false,
      trustBuildingNeeded: false,
      priceStrategy: 'standard',
      documentationDepth: 'standard',
      
      // Hidden cost multipliers (calculated below)
      coordinationMultiplier: 1.0,
      scopeCreepMultiplier: 1.0,
      documentationMultiplier: 1.0,
      riskMultiplier: 1.0
    };

    // Calculate derived insights
    this.calculateRiskProfile(profile);
    this.calculateCostMultipliers(profile);
    this.generateRecommendations(profile);

    this.logger.info('Client profile complete', {
      techSavvy: profile.techSavvy,
      riskLevel: profile.riskLevel,
      hadFailure: profile.hadFailure
    });

    return profile;
  }

  /**
   * Load profile patterns for detection
   */
  loadProfilePatterns() {
    return {
      techSavvy: {
        high: ['api', 'microservices', 'ci/cd', 'kubernetes', 'scalability', 
               'docker', 'aws', 'azure', 'backend', 'frontend', 'database',
               'rest api', 'graphql', 'authentication', 'authorization'],
        medium: ['database', 'hosting', 'responsive', 'framework', 'server',
                'deployment', 'integration', 'third-party'],
        low: ['website', 'app', 'online', 'simple', 'just like', 'similar to',
              'basic', 'easy', 'quick']
      },
      decisionMaker: {
        yes: ['i need', 'my budget', 'i want', 'my company', 'i am',
              'we need', 'our company', 'i require'],
        no: ['our team', 'they want', 'my boss', 'the client', 'stakeholders',
             'management', 'board', 'committee', 'approval needed']
      },
      urgency: {
        high: ['asap', 'urgent', 'immediately', 'yesterday', 'this month',
               'quickly', 'fast', 'rushed', 'deadline', 'time sensitive'],
        medium: ['soon', 'quarter', 'few months', 'next month', 'timeline'],
        low: ['next year', 'planning', 'exploring', 'considering', 'future',
              'eventually', 'someday']
      },
      previousFailure: {
        signals: ['previous vendor', 'failed', 'incomplete', 'abandoned',
                  'dispute', 'lawsuit', 'didn\'t work', 'waste', 'lost money',
                  'bad experience', 'unsatisfactory', 'wrong vendor']
      },
      budgetClarity: {
        clear: ['budget is', 'allocated', 'approved', 'lakh', 'crore',
                'rupees', '₹', 'rs.', 'budget of', 'have budget'],
        vague: ['cost-effective', 'affordable', 'reasonable', 'competitive',
                'within budget', 'budget-friendly'],
        costFocused: ['cheapest', 'lowest cost', 'minimum', 'reduce cost',
                      'cut costs', 'save money', 'budget constraint']
      },
      clientSize: {
        startup: ['startup', 'new company', 'just started', 'early stage'],
        enterprise: ['enterprise', 'large company', 'corporation', 'multinational',
                     'fortune', '500 employees', '1000+ employees'],
        sme: [] // Default if not startup or enterprise
      }
    };
  }

  /**
   * Assess technical knowledge level
   */
  assessTechSavvy(input) {
    const text = input.toLowerCase();
    const scores = {
      high: this.countMatches(text, this.profilePatterns.techSavvy.high) * 3,
      medium: this.countMatches(text, this.profilePatterns.techSavvy.medium) * 2,
      low: this.countMatches(text, this.profilePatterns.techSavvy.low)
    };
    
    if (scores.high > scores.medium && scores.high > scores.low && scores.high >= 3) {
      return 'high';
    }
    if (scores.low > scores.medium && scores.low >= 2) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Assess if user is decision maker
   */
  assessDecisionMaker(input) {
    const text = input.toLowerCase();
    const yesSignals = this.countMatches(text, this.profilePatterns.decisionMaker.yes);
    const noSignals = this.countMatches(text, this.profilePatterns.decisionMaker.no);
    
    return yesSignals > noSignals;
  }

  /**
   * Assess urgency level
   */
  assessUrgency(input) {
    const text = input.toLowerCase();
    const scores = {
      high: this.countMatches(text, this.profilePatterns.urgency.high) * 2,
      medium: this.countMatches(text, this.profilePatterns.urgency.medium),
      low: this.countMatches(text, this.profilePatterns.urgency.low)
    };
    
    if (scores.high > 0) return 'high';
    if (scores.low > 0) return 'low';
    return 'medium';
  }

  /**
   * Detect previous project failures
   */
  detectPreviousFailure(input) {
    const text = input.toLowerCase();
    return this.profilePatterns.previousFailure.signals
      .some(signal => text.includes(signal));
  }

  /**
   * Assess budget clarity
   */
  assessBudgetClarity(input) {
    const text = input.toLowerCase();
    
    if (this.countMatches(text, this.profilePatterns.budgetClarity.clear) > 0) {
      return 'clear';
    }
    if (this.countMatches(text, this.profilePatterns.budgetClarity.costFocused) > 0) {
      return 'costFocused';
    }
    if (this.countMatches(text, this.profilePatterns.budgetClarity.vague) > 0) {
      return 'vague';
    }
    return 'vague'; // Default to vague if not specified
  }

  /**
   * Assess client size
   */
  assessClientSize(input) {
    const text = input.toLowerCase();
    
    if (this.profilePatterns.clientSize.startup.some(signal => text.includes(signal))) {
      return 'startup';
    }
    if (this.profilePatterns.clientSize.enterprise.some(signal => text.includes(signal))) {
      return 'enterprise';
    }
    return 'sme';
  }

  /**
   * Detect committee/group decisions
   */
  detectCommittee(input) {
    const signals = [
      'stakeholders', 'team decision', 'board approval', 
      'multiple departments', 'committee', 'they want',
      'management approval', 'need approval', 'get approval'
    ];
    const text = input.toLowerCase();
    return signals.some(signal => text.includes(signal));
  }

  /**
   * Calculate overall risk profile
   */
  calculateRiskProfile(profile) {
    let riskScore = 0;
    
    // Risk factors
    if (profile.techSavvy === 'low') riskScore += 2;
    if (!profile.decisionMaker) riskScore += 2;
    if (profile.hadFailure) riskScore += 3;
    if (profile.urgency === 'high') riskScore += 2;
    if (profile.budgetClarity === 'vague') riskScore += 2;
    if (profile.budgetClarity === 'costFocused') riskScore += 3;
    if (profile.committeeDecision) riskScore += 2;
    
    // Set risk level
    if (riskScore >= 8) {
      profile.riskLevel = 'high';
      profile.trustBuildingNeeded = true;
    } else if (riskScore >= 4) {
      profile.riskLevel = 'medium';
    } else {
      profile.riskLevel = 'low';
    }
    
    // Set support needs
    profile.handHoldingNeeded = profile.techSavvy === 'low';
    
    // Set pricing strategy
    if (profile.budgetClarity === 'costFocused') {
      profile.priceStrategy = 'competitive';
    } else if (profile.urgency === 'high' && profile.budgetClarity === 'clear') {
      profile.priceStrategy = 'premium';
    } else {
      profile.priceStrategy = 'standard';
    }
    
    // Set documentation needs
    if (profile.committeeDecision || profile.hadFailure) {
      profile.documentationDepth = 'detailed';
    } else if (profile.techSavvy === 'low') {
      profile.documentationDepth = 'simplified';
    }
  }

  /**
   * Calculate hidden cost multipliers
   */
  calculateCostMultipliers(profile) {
    // Coordination costs
    if (profile.techSavvy === 'low') profile.coordinationMultiplier += 0.15;
    if (profile.committeeDecision) profile.coordinationMultiplier += 0.10;
    if (!profile.decisionMaker) profile.coordinationMultiplier += 0.05;
    
    // Scope creep risk
    if (profile.budgetClarity === 'vague') profile.scopeCreepMultiplier += 0.20;
    if (profile.techSavvy === 'low') profile.scopeCreepMultiplier += 0.15;
    if (profile.urgency === 'high') profile.scopeCreepMultiplier += 0.10;
    
    // Documentation needs
    if (profile.documentationDepth === 'detailed') profile.documentationMultiplier += 0.20;
    if (profile.documentationDepth === 'simplified') profile.documentationMultiplier += 0.15;
    if (profile.hadFailure) profile.documentationMultiplier += 0.10;
    
    // Overall risk buffer
    if (profile.riskLevel === 'high') profile.riskMultiplier += 0.25;
    if (profile.riskLevel === 'medium') profile.riskMultiplier += 0.10;
    if (profile.hadFailure) profile.riskMultiplier += 0.15;
  }

  /**
   * Generate project recommendations
   */
  generateRecommendations(profile) {
    profile.recommendations = [];
    profile.warnings = [];
    profile.dealStructure = [];
    
    // Recommendations based on profile
    if (profile.techSavvy === 'low') {
      profile.recommendations.push('Use simple language in documentation');
      profile.recommendations.push('Include visual diagrams and workflows');
      profile.recommendations.push('Plan for extra client education time');
    }
    
    if (profile.hadFailure) {
      profile.recommendations.push('Start with smaller pilot project');
      profile.recommendations.push('Add weekly progress demos');
      profile.recommendations.push('Define clear acceptance criteria upfront');
      profile.dealStructure.push('Suggest milestone-based delivery');
    }
    
    if (profile.committeeDecision) {
      profile.recommendations.push('Prepare executive summary separately');
      profile.recommendations.push('Create stakeholder communication plan');
      profile.recommendations.push('Document all decisions and approvals');
    }
    
    if (profile.urgency === 'high' && profile.riskLevel === 'high') {
      profile.warnings.push('High urgency + high risk. Consider phased approach.');
    }
    
    if (profile.budgetClarity === 'costFocused') {
      profile.warnings.push('Client is extremely price sensitive. Show clear ROI.');
      profile.dealStructure.push('Offer basic vs standard vs premium options');
    }
    
    // Payment structure recommendations
    if (profile.riskLevel === 'high') {
      profile.dealStructure.push('Require 40-50% advance payment');
      profile.dealStructure.push('Shorter milestone cycles (2 weeks)');
    } else {
      profile.dealStructure.push('Standard 30% advance');
      profile.dealStructure.push('Monthly milestone payments');
    }
    
    return profile;
  }

  /**
   * Count pattern matches in text
   */
  countMatches(text, patterns) {
    return patterns.filter(pattern => text.includes(pattern)).length;
  }

  /**
   * Get default profile when input is empty
   */
  getDefaultProfile() {
    return {
      techSavvy: 'medium',
      decisionMaker: true,
      urgency: 'medium',
      hadFailure: false,
      budgetClarity: 'vague',
      clientSize: 'sme',
      committeeDecision: false,
      riskLevel: 'medium',
      handHoldingNeeded: false,
      trustBuildingNeeded: false,
      priceStrategy: 'standard',
      documentationDepth: 'standard',
      coordinationMultiplier: 1.0,
      scopeCreepMultiplier: 1.0,
      documentationMultiplier: 1.0,
      riskMultiplier: 1.0,
      recommendations: [],
      warnings: [],
      dealStructure: []
    };
  }
}

module.exports = ClientProfiler;

