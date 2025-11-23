// src/core/intelligence/ContextAwareScenarios.js
// Context-Aware Scenario Generator with Dynamic Multipliers

const ComplexityAnalyzer = require('../estimation/ComplexityAnalyzer');
const DynamicCostCalculator = require('../estimation/DynamicCostCalculator');
const IntelligentTimeline = require('./IntelligentTimeline');

class ContextAwareScenarios {
  constructor(db = null, logger = null) {
    this.complexityAnalyzer = new ComplexityAnalyzer();
    this.costCalculator = new DynamicCostCalculator(db, logger);
    this.timelineCalculator = new IntelligentTimeline();
    this.db = db;
    this.logger = logger || console;
  }

  /**
   * Generate context-aware scenarios (not fixed multipliers!)
   * @param {Object} project - Project object
   * @param {Array} modules - Array of modules
   * @param {Object} resources - Resource allocation
   * @returns {Promise<Object>} Scenarios with dynamic multipliers
   */
  async generateScenarios(project, modules, resources) {
    // Analyze project characteristics
    const projectProfile = this.analyzeProject(project, modules);

    // Generate dynamic scenarios
    const scenarios = {
      optimistic: await this.generateOptimistic(projectProfile, modules, resources),
      realistic: await this.generateRealistic(projectProfile, modules, resources),
      pessimistic: await this.generatePessimistic(projectProfile, modules, resources),
      recommended: null // Will be calculated after others
    };

    // Generate recommended scenario using PERT
    scenarios.recommended = await this.generateRecommended(scenarios, projectProfile);

    // Add comparative analysis
    scenarios.comparison = this.compareScenarios(scenarios);

    return scenarios;
  }

  /**
   * Analyze project characteristics
   */
  analyzeProject(project, modules) {
    const complexities = modules.map(m => 
      this.complexityAnalyzer.analyze(m, project)
    );

    return {
      averageComplexity: this.average(complexities.map(c => c.overall)),
      maxComplexity: Math.max(...complexities.map(c => c.overall)),
      minComplexity: Math.min(...complexities.map(c => c.overall)),
      uncertaintyLevel: this.calculateUncertainty(modules, project),
      domainRisk: this.assessDomainRisk(project.domain || project.industry),
      integrationCount: modules.reduce((sum, m) => sum + (m.dependencies?.length || 0), 0),
      externalAPIs: modules.reduce((sum, m) => sum + ((m.externalIntegrations?.length || 0) + (m.external_apis?.length || 0)), 0),
      teamCapability: this.assessTeamCapability(project.teamExperience),
      clientComplexity: this.assessClientComplexity(project.clientType)
    };
  }

  /**
   * Generate optimistic scenario
   */
  async generateOptimistic(profile, modules, resources) {
    // Calculate dynamic multipliers based on profile
    const multipliers = {
      complexity: this.getOptimisticComplexityMultiplier(profile.averageComplexity),
      uncertainty: 0.9, // 10% reduction for optimistic
      productivity: 1.2, // 20% higher productivity
      parallelization: 1.3 // 30% better parallelization
    };

    // Calculate adjusted estimates
    const adjustedModules = await Promise.all(modules.map(async module => {
      const cost = await this.costCalculator.calculateModuleCost(module, {
        ...profile,
        scenario: 'optimistic'
      });

      return {
        ...module,
        hours: cost.hours.adjusted * multipliers.complexity * multipliers.uncertainty,
        cost: cost.cost.total * multipliers.complexity * multipliers.uncertainty
      };
    }));

    const totalHours = adjustedModules.reduce((sum, m) => sum + m.hours, 0);
    const totalCost = adjustedModules.reduce((sum, m) => sum + m.cost, 0);

    // Calculate timeline
    const timeline = this.timelineCalculator.calculateProjectTimeline(
      adjustedModules,
      this.optimizeResources(resources, multipliers.productivity),
      { parallelization: multipliers.parallelization }
    );

    return {
      name: 'Best Case Scenario',
      probability: this.calculateOptimisticProbability(profile),
      totalHours: Math.round(totalHours),
      totalCost: Math.round(totalCost),
      duration: timeline.workingDays,
      assumptions: [
        'No major technical challenges',
        'Experienced team available',
        'Clear requirements, minimal changes',
        'Good client collaboration'
      ],
      risks: [
        'May be too optimistic if unknowns exist',
        'Requires perfect execution',
        'No buffer for issues'
      ],
      multipliers: multipliers,
      confidence: this.calculateScenarioConfidence(profile, 'optimistic')
    };
  }

  /**
   * Generate realistic scenario
   */
  async generateRealistic(profile, modules, resources) {
    // Calculate dynamic multipliers based on actual project characteristics
    const multipliers = this.calculateRealisticMultipliers(profile);

    // Calculate adjusted estimates
    const adjustedModules = await Promise.all(modules.map(async module => {
      const cost = await this.costCalculator.calculateModuleCost(module, profile);

      return {
        ...module,
        hours: cost.hours.adjusted * multipliers.overall,
        cost: cost.cost.total * multipliers.overall
      };
    }));

    const totalHours = adjustedModules.reduce((sum, m) => sum + m.hours, 0);
    const totalCost = adjustedModules.reduce((sum, m) => sum + m.cost, 0);

    // Realistic timeline
    const timeline = this.timelineCalculator.calculateProjectTimeline(
      adjustedModules,
      resources,
      { realistic: true }
    );

    return {
      name: 'Most Likely Scenario',
      probability: this.calculateRealisticProbability(profile),
      totalHours: Math.round(totalHours),
      totalCost: Math.round(totalCost),
      duration: timeline.workingDays,
      assumptions: [
        'Normal project challenges',
        'Some requirement changes expected',
        'Standard team productivity',
        'Typical client engagement'
      ],
      confidence: this.calculateScenarioConfidence(profile, 'realistic'),
      multipliers: multipliers
    };
  }

  /**
   * Generate pessimistic scenario
   */
  async generatePessimistic(profile, modules, resources) {
    // Calculate worst-case multipliers
    const multipliers = {
      complexity: this.getPessimisticComplexityMultiplier(profile.maxComplexity),
      uncertainty: 1.3, // 30% increase for unknowns
      productivity: 0.7, // 30% lower productivity
      issues: 1.4 // 40% additional time for issues
    };

    // Apply Murphy's Law adjustments
    const adjustedModules = await Promise.all(modules.map(async module => {
      const cost = await this.costCalculator.calculateModuleCost(module, {
        ...profile,
        scenario: 'pessimistic'
      });

      return {
        ...module,
        hours: cost.hours.adjusted * multipliers.complexity * multipliers.uncertainty * multipliers.issues,
        cost: cost.cost.total * multipliers.complexity * multipliers.uncertainty * multipliers.issues
      };
    }));

    const totalHours = adjustedModules.reduce((sum, m) => sum + m.hours, 0);
    const totalCost = adjustedModules.reduce((sum, m) => sum + m.cost, 0);

    // Pessimistic timeline
    const timeline = this.timelineCalculator.calculateProjectTimeline(
      adjustedModules,
      this.reduceResources(resources, multipliers.productivity),
      { pessimistic: true }
    );

    return {
      name: 'Worst Case Scenario',
      probability: this.calculatePessimisticProbability(profile),
      totalHours: Math.round(totalHours),
      totalCost: Math.round(totalCost),
      duration: timeline.workingDays,
      assumptions: [
        'Significant technical challenges',
        'Major requirement changes',
        'Team issues or turnover',
        'Difficult client stakeholders'
      ],
      risks: [
        'All identified risks materialize',
        'Unknown unknowns emerge',
        'External dependencies fail'
      ],
      multipliers: multipliers,
      confidence: this.calculateScenarioConfidence(profile, 'pessimistic')
    };
  }

  /**
   * Generate recommended scenario using PERT
   */
  async generateRecommended(scenarios, profile) {
    const optimistic = scenarios.optimistic;
    const realistic = scenarios.realistic;
    const pessimistic = scenarios.pessimistic;

    // PERT-based calculation (weighted average)
    const pertEstimate = {
      hours: (optimistic.totalHours + 4 * realistic.totalHours + pessimistic.totalHours) / 6,
      cost: (optimistic.totalCost + 4 * realistic.totalCost + pessimistic.totalCost) / 6,
      duration: (optimistic.duration + 4 * realistic.duration + pessimistic.duration) / 6
    };

    // Add smart buffer based on profile
    const buffer = this.calculateSmartBuffer(profile);

    return {
      name: 'Recommended Estimate',
      method: 'PERT + Smart Buffer',
      totalHours: Math.round(pertEstimate.hours * (1 + buffer)),
      totalCost: Math.round(pertEstimate.cost * (1 + buffer)),
      duration: Math.ceil(pertEstimate.duration * (1 + buffer)),
      buffer: `${(buffer * 100).toFixed(0)}%`,
      reasoning: this.generateRecommendationReasoning(profile, buffer),
      confidence: this.calculateOverallConfidence(profile, [optimistic, realistic, pessimistic]),
      breakdown: {
        optimistic: optimistic.totalCost,
        realistic: realistic.totalCost,
        pessimistic: pessimistic.totalCost,
        pert: Math.round(pertEstimate.cost),
        recommended: Math.round(pertEstimate.cost * (1 + buffer))
      }
    };
  }

  /**
   * Calculate realistic multipliers (not fixed!)
   */
  calculateRealisticMultipliers(profile) {
    const multipliers = {};

    // Complexity-based multiplier (not fixed!)
    multipliers.complexity = 0.7 + (profile.averageComplexity / 5) * 0.8;

    // Uncertainty multiplier
    multipliers.uncertainty = 1 + (profile.uncertaintyLevel * 0.3);

    // Domain risk multiplier
    multipliers.domain = 1 + (profile.domainRisk * 0.2);

    // Integration complexity
    if (profile.integrationCount > 10) {
      multipliers.integration = 1.3;
    } else if (profile.integrationCount > 5) {
      multipliers.integration = 1.15;
    } else {
      multipliers.integration = 1.0;
    }

    // Team capability adjustment
    multipliers.team = 2 - profile.teamCapability; // Inverse relationship

    // Calculate overall multiplier
    multipliers.overall =
      multipliers.complexity *
      multipliers.uncertainty *
      multipliers.domain *
      multipliers.integration *
      multipliers.team;

    return multipliers;
  }

  /**
   * Calculate smart buffer based on profile
   */
  calculateSmartBuffer(profile) {
    let buffer = 0.15; // Base 15%

    // Add buffer based on complexity
    if (profile.averageComplexity > 3.5) buffer += 0.1;
    if (profile.maxComplexity > 4.5) buffer += 0.15;

    // Add buffer for uncertainty
    buffer += profile.uncertaintyLevel * 0.2;

    // Add buffer for integrations
    if (profile.integrationCount > 10) buffer += 0.1;
    if (profile.externalAPIs > 3) buffer += 0.1;

    // Adjust for team capability
    if (profile.teamCapability < 0.7) buffer += 0.1;

    // Cap at reasonable maximum
    return Math.min(buffer, 0.6); // Max 60% buffer
  }

  /**
   * Get optimistic complexity multiplier
   */
  getOptimisticComplexityMultiplier(complexity) {
    // Lower complexity = lower multiplier
    return 0.7 + (complexity / 5) * 0.3; // Range: 0.7 to 1.0
  }

  /**
   * Get pessimistic complexity multiplier
   */
  getPessimisticComplexityMultiplier(complexity) {
    // Higher complexity = higher multiplier
    return 1.0 + (complexity / 5) * 0.8; // Range: 1.0 to 1.8
  }

  /**
   * Calculate uncertainty level
   */
  calculateUncertainty(modules, project) {
    let uncertainty = 0;

    // Check for unclear requirements
    if (!project.requirements?.detailed) uncertainty += 0.3;

    // Check for new technology
    const techStack = JSON.stringify(project.techStack || {}).toLowerCase();
    if (techStack.includes('new') || techStack.includes('experimental')) uncertainty += 0.2;

    // Check for external dependencies
    const externalDeps = modules.filter(m => 
      (m.externalIntegrations?.length > 0) || (m.external_apis?.length > 0)
    ).length;
    uncertainty += externalDeps * 0.05;

    return Math.min(uncertainty, 1);
  }

  /**
   * Assess domain risk
   */
  assessDomainRisk(domain) {
    const riskMap = {
      'fintech': 0.8,
      'healthcare': 0.9,
      'logistics': 0.6,
      'ecommerce': 0.4,
      'education': 0.3,
      'social': 0.2,
      'generic': 0.5
    };
    return riskMap[domain] || 0.5;
  }

  /**
   * Assess team capability
   */
  assessTeamCapability(teamExperience) {
    const capabilityMap = {
      'expert': 0.9,
      'experienced': 0.8,
      'moderate': 0.6,
      'beginner': 0.4
    };
    return capabilityMap[teamExperience] || 0.6;
  }

  /**
   * Assess client complexity
   */
  assessClientComplexity(clientType) {
    const complexityMap = {
      'startup': 0.3,
      'sme': 0.5,
      'enterprise': 0.8,
      'government': 0.9
    };
    return complexityMap[clientType] || 0.5;
  }

  /**
   * Calculate scenario probabilities
   */
  calculateOptimisticProbability(profile) {
    // Lower probability if high complexity or uncertainty
    let prob = 0.3; // Base 30%
    if (profile.averageComplexity < 2.5) prob += 0.1;
    if (profile.uncertaintyLevel < 0.3) prob += 0.1;
    if (profile.teamCapability > 0.8) prob += 0.1;
    return Math.min(prob, 0.5);
  }

  calculateRealisticProbability(profile) {
    // Most likely scenario
    return 0.5; // 50% base
  }

  calculatePessimisticProbability(profile) {
    // Higher probability if high complexity or uncertainty
    let prob = 0.2; // Base 20%
    if (profile.averageComplexity > 3.5) prob += 0.1;
    if (profile.uncertaintyLevel > 0.7) prob += 0.1;
    if (profile.teamCapability < 0.5) prob += 0.1;
    return Math.min(prob, 0.4);
  }

  /**
   * Calculate scenario confidence
   */
  calculateScenarioConfidence(profile, scenarioType) {
    const baseConfidence = {
      'optimistic': 0.6,
      'realistic': 0.8,
      'pessimistic': 0.7
    };

    let confidence = baseConfidence[scenarioType];

    // Adjust based on complexity
    if (profile.averageComplexity > 4) confidence -= 0.15;
    if (profile.averageComplexity < 2) confidence += 0.1;

    return Math.max(0.4, Math.min(0.95, confidence));
  }

  /**
   * Calculate overall confidence
   */
  calculateOverallConfidence(profile, scenarios) {
    const avgConfidence = scenarios.reduce((sum, s) => sum + (s.confidence || 0.7), 0) / scenarios.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  /**
   * Generate recommendation reasoning
   */
  generateRecommendationReasoning(profile, buffer) {
    const reasons = [];
    
    if (profile.averageComplexity > 3.5) {
      reasons.push(`High average complexity (${profile.averageComplexity.toFixed(1)}/5) requires additional buffer`);
    }
    
    if (profile.uncertaintyLevel > 0.5) {
      reasons.push(`High uncertainty level (${(profile.uncertaintyLevel * 100).toFixed(0)}%) increases risk`);
    }
    
    if (profile.integrationCount > 10) {
      reasons.push(`Many integrations (${profile.integrationCount}) add coordination overhead`);
    }
    
    if (buffer > 0.25) {
      reasons.push(`Smart buffer of ${(buffer * 100).toFixed(0)}% applied based on project characteristics`);
    }
    
    return reasons.length > 0 ? reasons.join('. ') : 'Standard buffer applied for typical project risks';
  }

  /**
   * Compare scenarios
   */
  compareScenarios(scenarios) {
    return {
      costRange: {
        min: scenarios.optimistic.totalCost,
        max: scenarios.pessimistic.totalCost,
        recommended: scenarios.recommended.totalCost
      },
      timelineRange: {
        min: scenarios.optimistic.duration,
        max: scenarios.pessimistic.duration,
        recommended: scenarios.recommended.duration
      },
      variance: {
        cost: ((scenarios.pessimistic.totalCost - scenarios.optimistic.totalCost) / scenarios.optimistic.totalCost * 100).toFixed(0) + '%',
        timeline: ((scenarios.pessimistic.duration - scenarios.optimistic.duration) / scenarios.optimistic.duration * 100).toFixed(0) + '%'
      }
    };
  }

  /**
   * Optimize resources for optimistic scenario
   */
  optimizeResources(resources, productivityMultiplier) {
    // Placeholder - would optimize resource allocation
    return resources;
  }

  /**
   * Reduce resources for pessimistic scenario
   */
  reduceResources(resources, productivityMultiplier) {
    // Placeholder - would account for reduced productivity
    return resources;
  }

  /**
   * Calculate average
   */
  average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}

module.exports = ContextAwareScenarios;

