// src/core/estimation/DynamicCostCalculator.js
// Dynamic Cost Calculation Engine

const ComplexityAnalyzer = require('./ComplexityAnalyzer');

class DynamicCostCalculator {
  constructor(db = null, logger = null) {
    this.complexityAnalyzer = new ComplexityAnalyzer();
    this.db = db;
    this.logger = logger || console;
    
    // Base hourly rates by resource type (INR)
    this.baseRates = {
      backend: 1200,      // ₹1200/hour for backend developer
      frontend: 1000,     // ₹1000/hour for frontend developer
      mobile: 1100,       // ₹1100/hour for mobile developer
      ui: 800,            // ₹800/hour for UI/UX designer
      qa: 900,            // ₹900/hour for QA engineer
      devops: 1300,       // ₹1300/hour for DevOps engineer
      pm: 1500            // ₹1500/hour for project manager
    };

    // Base hours by complexity level (for standard modules)
    this.baseHoursByComplexity = {
      1: 8,    // Very simple: 8 hours
      2: 16,   // Simple: 16 hours
      3: 32,   // Medium: 32 hours
      4: 64,   // Complex: 64 hours
      5: 128   // Very complex: 128 hours
    };

    // Complexity multiplier ranges
    this.complexityMultipliers = {
      1: { min: 0.7, max: 0.9 },   // Very simple: 70-90% of base
      2: { min: 0.8, max: 1.0 },   // Simple: 80-100% of base
      3: { min: 0.9, max: 1.2 },   // Medium: 90-120% of base
      4: { min: 1.1, max: 1.5 },   // Complex: 110-150% of base
      5: { min: 1.4, max: 2.0 }    // Very complex: 140-200% of base
    };
  }

  /**
   * Calculate module cost dynamically based on complexity and context
   * Enhanced with learning adjustments and GST
   * @param {Object} module - Module object
   * @param {Object} projectContext - Project context
   * @returns {Promise<Object>} Cost calculation result
   */
  async calculateModuleCost(module, projectContext = {}) {
    // Analyze complexity
    const complexity = this.complexityAnalyzer.analyze(module, projectContext);

    // Calculate base hours
    const baseHours = this.calculateBaseHours(module, complexity);

    // Apply context adjustments
    const contextAdjusted = this.applyContextAdjustments(baseHours, complexity, projectContext);

    // Apply learning adjustments (if learning engine available)
    const learningAdjusted = await this.applyLearningAdjustments(
      contextAdjusted.hours || contextAdjusted,
      module,
      projectContext
    );

    const finalHours = learningAdjusted.hours || contextAdjusted.hours || contextAdjusted;

    // Calculate dynamic rates
    const rates = this.calculateDynamicRates(complexity, projectContext);

    // Calculate cost breakdown by resource
    const costBreakdown = this.calculateCostBreakdown(module, finalHours, rates, complexity);

    // Calculate development cost
    const developmentCost = Object.values(costBreakdown).reduce((sum, resource) => {
      return sum + (resource.cost || 0);
    }, 0);

    // Generate full breakdown with testing, docs, PM, risk buffer
    const fullBreakdown = this.generateFullBreakdown(developmentCost, finalHours, complexity, projectContext);

    // Calculate confidence
    const confidence = learningAdjusted.confidence || this.calculateCostConfidence(complexity, projectContext);

    return {
      module: module.name || module.module,
      complexity: complexity.overall,
      complexityBreakdown: complexity.breakdown,
      hours: {
        base: baseHours,
        adjusted: finalHours,
        breakdown: this.calculateHoursBreakdown(module, finalHours, complexity)
      },
      rates: rates,
      cost: {
        total: Math.round(fullBreakdown.totalWithGST),
        breakdown: fullBreakdown,
        byResource: this.summarizeByResource(costBreakdown)
      },
      confidence: confidence,
      source: learningAdjusted.source || 'theoretical',
      factors: this.explainCostFactors(complexity, projectContext, finalHours, fullBreakdown.totalWithGST)
    };
  }

  /**
   * Generate full cost breakdown with testing, docs, PM, risk buffer, and GST
   */
  generateFullBreakdown(developmentCost, hours, complexity, projectContext) {
    const breakdown = {
      development: developmentCost,
      testing: Math.round(developmentCost * 0.3), // 30% for testing
      documentation: Math.round(developmentCost * 0.1), // 10% for docs
      projectManagement: Math.round(developmentCost * 0.15) // 15% PM
    };

    breakdown.subtotal = breakdown.development + breakdown.testing + 
                         breakdown.documentation + breakdown.projectManagement;

    // Risk buffer based on complexity
    const riskMultiplier = this.getRiskMultiplier(complexity.overall);
    breakdown.riskBuffer = Math.round(breakdown.subtotal * riskMultiplier);

    // Total before GST
    breakdown.total = breakdown.subtotal + breakdown.riskBuffer;

    // Add GST for Indian market (if applicable)
    if (projectContext.indianFactors?.requiresGST !== false) {
      breakdown.gst = Math.round(breakdown.total * 0.18); // 18% GST
      breakdown.totalWithGST = breakdown.total + breakdown.gst;
    } else {
      breakdown.gst = 0;
      breakdown.totalWithGST = breakdown.total;
    }

    return breakdown;
  }

  /**
   * Get risk multiplier based on complexity
   */
  getRiskMultiplier(complexity) {
    // Risk increases exponentially with complexity
    const riskMap = {
      1: 0.1,   // 10% buffer
      2: 0.15,  // 15% buffer
      3: 0.25,  // 25% buffer
      4: 0.4,   // 40% buffer
      5: 0.6    // 60% buffer
    };

    const rounded = Math.round(complexity);
    return riskMap[rounded] || 0.25;
  }

  /**
   * Apply learning adjustments from historical data
   */
  async applyLearningAdjustments(adjustedHours, module, projectContext) {
    // Try to get learning engine if available
    let learningEngine = null;
    try {
      const LearningEngine = require('../learning/LearningEngine');
      // Learning engine would be injected via constructor in full implementation
      // For now, try to instantiate if db is available
      if (this.db) {
        learningEngine = new LearningEngine(this.db, this.logger);
      }
    } catch (error) {
      // Learning engine not available, use theoretical
    }

    if (!learningEngine) {
      return {
        hours: adjustedHours,
        confidence: 0.7,
        source: 'theoretical',
        adjustmentFactor: 1.0
      };
    }

    try {
      // Get historical accuracy
      const domain = projectContext.domain || projectContext.industry || 'generic';
      const complexity = module.complexity || this.complexityAnalyzer.analyze(module, projectContext).overall;
      
      const historical = await learningEngine.getHistoricalAccuracy(domain, complexity);
      
      if (historical.sampleSize < 3) {
        // Not enough data
        return {
          hours: adjustedHours,
          confidence: 0.6,
          source: 'theoretical',
          adjustmentFactor: 1.0
        };
      }

      // Apply historical adjustment
      const adjustmentFactor = historical.averageActualToEstimate;
      const finalHours = adjustedHours * adjustmentFactor;

      return {
        hours: finalHours,
        confidence: historical.confidence,
        source: 'historical',
        adjustmentFactor: adjustmentFactor,
        basedOn: `${historical.sampleSize} similar projects`
      };
    } catch (error) {
      // Fallback to theoretical
      return {
        hours: adjustedHours,
        confidence: 0.7,
        source: 'theoretical',
        adjustmentFactor: 1.0
      };
    }
  }

  /**
   * Calculate base hours for a module
   * Enhanced with module size matrix
   */
  calculateBaseHours(module, complexity) {
    // Determine module size
    const moduleSize = this.determineModuleSize(module);
    
    // Base hours matrix (complexity vs module size)
    const baseMatrix = {
      'small': { 1: 8, 2: 16, 3: 32, 4: 56, 5: 88 },
      'medium': { 1: 24, 2: 48, 3: 96, 4: 168, 5: 264 },
      'large': { 1: 56, 2: 112, 3: 224, 4: 392, 5: 616 },
      'xlarge': { 1: 120, 2: 240, 3: 480, 4: 840, 5: 1320 }
    };

    // Get base hours from matrix
    const complexityRounded = Math.round(complexity.overall);
    let baseHours = baseMatrix[moduleSize][complexityRounded] || baseMatrix[moduleSize][3];

    // Interpolate for decimal complexity
    if (complexity.overall !== complexityRounded) {
      const floor = Math.floor(complexity.overall);
      const ceil = Math.ceil(complexity.overall);
      const fraction = complexity.overall - floor;
      
      const floorHours = baseMatrix[moduleSize][floor] || baseHours;
      const ceilHours = baseMatrix[moduleSize][ceil] || baseHours;
      baseHours = floorHours + (ceilHours - floorHours) * fraction;
    }

    return Math.round(baseHours);
  }

  /**
   * Determine module size based on features and functions
   */
  determineModuleSize(module) {
    const featureCount = Array.isArray(module.features) ? module.features.length : 
                        (module.features ? Object.keys(module.features).length : 0);
    const functionCount = Array.isArray(module.functions) ? module.functions.length :
                         (module.functions ? Object.keys(module.functions).length : 0);
    const totalPoints = featureCount + functionCount;

    if (totalPoints < 5) return 'small';
    if (totalPoints < 15) return 'medium';
    if (totalPoints < 30) return 'large';
    return 'xlarge';
  }

  /**
   * Apply context adjustments to hours
   */
  applyContextAdjustments(baseHours, complexity, projectContext) {
    let adjustedHours = baseHours;

    // Team experience adjustment
    const teamExperience = projectContext.teamExperience || 'medium';
    const experienceMultipliers = {
      'senior': 0.85,    // Senior team: 15% faster
      'medium': 1.0,      // Medium team: baseline
      'junior': 1.2       // Junior team: 20% slower
    };
    adjustedHours *= experienceMultipliers[teamExperience] || 1.0;

    // Domain knowledge adjustment
    const domainKnowledge = projectContext.domainKnowledge || 'medium';
    const knowledgeMultipliers = {
      'expert': 0.9,     // Expert: 10% faster
      'familiar': 1.0,   // Familiar: baseline
      'new': 1.3         // New domain: 30% slower
    };
    adjustedHours *= knowledgeMultipliers[domainKnowledge] || 1.0;

    // Tech stack familiarity
    const techStackFamiliarity = projectContext.techStackFamiliarity || 'medium';
    const techMultipliers = {
      'expert': 0.9,
      'familiar': 1.0,
      'new': 1.25
    };
    adjustedHours *= techMultipliers[techStackFamiliarity] || 1.0;

    // Client type adjustment
    const clientType = projectContext.clientType || 'sme';
    const clientMultipliers = {
      'startup': 0.95,   // Startups: slightly faster (less bureaucracy)
      'sme': 1.0,        // SME: baseline
      'enterprise': 1.15 // Enterprise: 15% slower (more processes)
    };
    adjustedHours *= clientMultipliers[clientType] || 1.0;

    // Project scale adjustment
    const scale = projectContext.scale || 'sme';
    if (scale === 'enterprise') {
      adjustedHours *= 1.1; // Enterprise: 10% more overhead
    }

    // Indian market factors
    if (projectContext.indianFactors) {
      const indianFactors = projectContext.indianFactors;
      
      // GST compliance adds complexity
      if (indianFactors.requiresGST) {
        adjustedHours *= 1.1;
      }

      // Compliance requirements
      if (indianFactors.requiresCompliance) {
        adjustedHours *= 1.15;
      }

      // Localization (if needed)
      if (indianFactors.requiresLocalization) {
        adjustedHours *= 1.05;
      }
    }

    // Uncertainty buffer
    if (complexity.uncertainty > 2) {
      adjustedHours *= 1.1; // Add 10% buffer for uncertainty
    }

    return Math.round(adjustedHours);
  }

  /**
   * Calculate dynamic rates based on complexity and context
   */
  calculateDynamicRates(complexity, projectContext) {
    const rates = { ...this.baseRates };

    // Adjust rates based on complexity
    // Higher complexity = higher rates (senior developers needed)
    const complexityMultiplier = 1.0 + (complexity.overall - 3) * 0.1;
    
    Object.keys(rates).forEach(resource => {
      rates[resource] = Math.round(rates[resource] * complexityMultiplier);
    });

    // Domain-specific rate adjustments
    const domain = projectContext.domain || projectContext.industry || 'generic';
    const domainRateMultipliers = {
      'fintech': 1.2,      // Fintech: 20% premium
      'healthcare': 1.15,  // Healthcare: 15% premium
      'ecommerce': 1.0,    // E-commerce: baseline
      'generic': 1.0
    };
    
    const domainMultiplier = domainRateMultipliers[domain] || 1.0;
    Object.keys(rates).forEach(resource => {
      rates[resource] = Math.round(rates[resource] * domainMultiplier);
    });

    return rates;
  }

  /**
   * Calculate cost breakdown by resource type
   */
  calculateCostBreakdown(module, adjustedHours, rates, complexity) {
    const breakdown = {};
    const moduleName = (module.name || module.module || '').toLowerCase();

    // Determine resource allocation based on module type
    const resourceAllocation = this.determineResourceAllocation(moduleName, complexity);

    // Calculate cost for each resource
    Object.keys(resourceAllocation).forEach(resource => {
      const allocation = resourceAllocation[resource];
      const hours = Math.round(adjustedHours * allocation);
      const cost = hours * rates[resource];

      breakdown[resource] = {
        hours: hours,
        rate: rates[resource],
        cost: Math.round(cost),
        allocation: allocation,
        percentage: (allocation * 100).toFixed(1) + '%'
      };
    });

    return breakdown;
  }

  /**
   * Determine resource allocation percentages
   */
  determineResourceAllocation(moduleName, complexity) {
    // Default allocation
    let allocation = {
      backend: 0.4,
      frontend: 0.3,
      qa: 0.2,
      ui: 0.1
    };

    // Adjust based on module type
    if (moduleName.includes('payment') || moduleName.includes('gateway')) {
      allocation = { backend: 0.5, frontend: 0.2, qa: 0.25, ui: 0.05 };
    } else if (moduleName.includes('auth') || moduleName.includes('authentication')) {
      allocation = { backend: 0.5, frontend: 0.25, qa: 0.2, ui: 0.05 };
    } else if (moduleName.includes('dashboard') || moduleName.includes('reporting')) {
      allocation = { backend: 0.3, frontend: 0.35, qa: 0.2, ui: 0.15 };
    } else if (moduleName.includes('api') || moduleName.includes('service')) {
      allocation = { backend: 0.6, frontend: 0.1, qa: 0.25, ui: 0.05 };
    }

    // Adjust based on complexity
    if (complexity.overall > 4) {
      // Very complex: more backend and QA
      allocation.backend *= 1.1;
      allocation.qa *= 1.2;
      allocation.frontend *= 0.9;
    }

    // Normalize to ensure total = 1.0
    const total = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    Object.keys(allocation).forEach(key => {
      allocation[key] /= total;
    });

    return allocation;
  }

  /**
   * Calculate hours breakdown
   */
  calculateHoursBreakdown(module, totalHours, complexity) {
    const allocation = this.determineResourceAllocation(
      (module.name || module.module || '').toLowerCase(),
      complexity
    );

    const breakdown = {};
    Object.keys(allocation).forEach(resource => {
      breakdown[resource] = Math.round(totalHours * allocation[resource]);
    });

    return breakdown;
  }

  /**
   * Summarize cost by resource
   */
  summarizeByResource(costBreakdown) {
    const summary = [];
    Object.keys(costBreakdown).forEach(resource => {
      const data = costBreakdown[resource];
      summary.push({
        resource: resource,
        hours: data.hours,
        cost: data.cost,
        percentage: data.percentage
      });
    });
    return summary;
  }

  /**
   * Calculate confidence in cost estimate
   */
  calculateCostConfidence(complexity, projectContext) {
    let confidence = complexity.confidence || 0.8;

    // Reduce confidence if context is incomplete
    if (!projectContext.domain && !projectContext.industry) {
      confidence -= 0.1;
    }

    if (!projectContext.teamExperience) {
      confidence -= 0.05;
    }

    // Increase confidence if we have good complexity analysis
    if (complexity.overall > 0 && complexity.confidence > 0.8) {
      confidence += 0.05;
    }

    return Math.max(0.5, Math.min(1.0, confidence));
  }

  /**
   * Explain cost factors
   * Enhanced with breakdown details
   */
  explainCostFactors(complexity, projectContext, hours, cost) {
    const factors = [];

    factors.push(`Module: ${projectContext.moduleName || 'Module'}`);
    factors.push(`Complexity Score: ${complexity.overall.toFixed(1)}/5`);
    
    if (complexity.breakdown && complexity.breakdown.primaryDriver) {
      factors.push(`Primary Complexity Driver: ${complexity.breakdown.primaryDriver}`);
    }
    
    factors.push(`Base Development Hours: ${hours} hours`);
    
    if (projectContext.teamExperience) {
      factors.push(`Team Experience: ${projectContext.teamExperience}`);
    }

    if (projectContext.domain) {
      factors.push(`Domain: ${projectContext.domain}`);
    }

    if (complexity.uncertainty > 2) {
      factors.push(`High Uncertainty Factor (${complexity.uncertainty.toFixed(1)}/3) adds buffer`);
    }

    if (projectContext.indianFactors?.requiresGST) {
      factors.push(`GST (18%) included for Indian market`);
    }

    if (projectContext.indianFactors?.requiresCompliance) {
      factors.push(`Compliance requirements add complexity`);
    }

    return factors;
  }
}

module.exports = DynamicCostCalculator;

