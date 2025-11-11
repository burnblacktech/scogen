// src/modules/scenario-generator-v2.js
// Intelligent Scenario Generator with Resource & Risk Context

class ScenarioGeneratorV2 {
  constructor() {
    // Scenario templates with strategic focus
    this.scenarioTemplates = {
      mvp: {
        name: 'MVP - Rapid Market Entry',
        description: 'Core features only, fastest to market',
        moduleSelection: 'critical',
        resourceStrategy: 'single_team',
        riskStrategy: 'accept',
        targetReduction: { cost: 0.6, time: 0.6 },
        suitable: ['startup', 'tight_budget', 'market_validation']
      },
      
      phased: {
        name: 'Phased Delivery',
        description: 'Spread cost and risk over multiple phases',
        moduleSelection: 'progressive',
        resourceStrategy: 'optimal',
        riskStrategy: 'distribute',
        phases: [
          { name: 'Foundation', percentage: 0.4 },
          { name: 'Growth', percentage: 0.35 },
          { name: 'Scale', percentage: 0.25 }
        ],
        suitable: ['enterprise', 'committee_decision', 'budget_constraints']
      },
      
      balanced: {
        name: 'Balanced Approach',
        description: 'Optimal balance of speed, cost, and features',
        moduleSelection: 'prioritized',
        resourceStrategy: 'optimal',
        riskStrategy: 'mitigate',
        targetReduction: { cost: 0.85, time: 0.85 },
        suitable: ['sme', 'clear_requirements', 'moderate_budget']
      },
      
      fast_track: {
        name: 'Fast-Track Delivery',
        description: 'Parallel development with multiple resources',
        moduleSelection: 'full',
        resourceStrategy: 'parallel',
        riskStrategy: 'buffer',
        resourceMultiplier: 2.5,
        timeReduction: 0.6,
        suitable: ['urgent', 'well_funded', 'competitive_pressure']
      },
      
      premium: {
        name: 'Premium Quality',
        description: 'Full scope with enhanced quality and documentation',
        moduleSelection: 'enhanced',
        resourceStrategy: 'senior',
        riskStrategy: 'eliminate',
        qualityMultiplier: 1.3,
        suitable: ['enterprise', 'regulated', 'mission_critical']
      }
    };

    // Resource allocation strategies
    this.resourceStrategies = {
      single_team: {
        developers: 1,
        designers: 0.5,
        qa: 0.5,
        overhead: 1.0
      },
      optimal: {
        developers: 2,
        designers: 1,
        qa: 1,
        overhead: 1.1
      },
      parallel: {
        developers: 3,
        designers: 1,
        qa: 2,
        overhead: 1.25
      },
      senior: {
        developers: 2,
        designers: 1,
        qa: 1,
        seniorMultiplier: 1.4,
        overhead: 1.15
      }
    };
  }

  // Generate scenarios based on complete context
  async generateScenarios(decomposition, riskAssessment, enrichedRequirements, clientProfile, options = {}) {
    console.log('🎯 Generating Intelligent Scenarios...');
    
    const scenarios = [];
    const baselineEstimate = this.createBaselineEstimate(decomposition, riskAssessment);

    // Determine which scenarios are suitable
    const suitableScenarios = this.determineSuitableScenarios(
      clientProfile,
      options,
      baselineEstimate
    );

    // Generate each suitable scenario
    for (const scenarioType of suitableScenarios) {
      const scenario = await this.generateScenario(
        scenarioType,
        decomposition,
        riskAssessment,
        enrichedRequirements,
        clientProfile,
        baselineEstimate,
        options
      );
      
      if (scenario) {
        scenarios.push(scenario);
      }
    }

    // Rank scenarios
    const rankedScenarios = this.rankScenarios(scenarios, options);

    // Add recommendations
    const finalScenarios = this.addRecommendations(rankedScenarios, clientProfile, options);

    console.log(`✅ Generated ${finalScenarios.length} scenarios`);

    return {
      baseline: baselineEstimate,
      scenarios: finalScenarios,
      recommendation: this.generateRecommendation(finalScenarios, clientProfile, options)
    };
  }

  // Create baseline estimate with all components
  createBaselineEstimate(decomposition, riskAssessment) {
    const riskBuffers = riskAssessment.recommendedBuffers;
    
    return {
      modules: decomposition.modules.length,
      deliverables: decomposition.stats.totalDeliverables,
      components: decomposition.stats.totalComponents,
      
      cost: {
        base: decomposition.totalCost,
        withRisk: Math.round(decomposition.totalCost * riskBuffers.cost),
        contingency: riskAssessment.contingencyReserve,
        total: Math.round(decomposition.totalCost * riskBuffers.cost + riskAssessment.contingencyReserve)
      },
      
      timeline: {
        base: decomposition.timeline.recommendedDays,
        withRisk: Math.round(decomposition.timeline.recommendedDays * riskBuffers.time),
        sequential: decomposition.timeline.sequentialDays,
        parallel: decomposition.timeline.parallelDays
      },
      
      resources: decomposition.costByResource,
      risks: riskAssessment.identifiedRisks.length,
      riskLevel: riskAssessment.level,
      confidence: riskAssessment.confidence
    };
  }

  // Determine which scenarios are suitable
  determineSuitableScenarios(clientProfile, options, baseline) {
    const suitable = [];
    
    // Always include balanced
    suitable.push('balanced');

    // MVP if budget constrained or startup
    if (options.maxBudget && options.maxBudget < baseline.cost.total * 0.7) {
      suitable.push('mvp');
    } else if (clientProfile?.clientSize === 'startup' || clientProfile?.budgetClarity === 'vague') {
      suitable.push('mvp');
    }

    // Phased if enterprise or committee
    if (clientProfile?.committeeDecision || clientProfile?.clientSize === 'enterprise') {
      suitable.push('phased');
    } else if (baseline.cost.total > 1000000) {
      suitable.push('phased');
    }

    // Fast-track if urgent
    if (options.urgency === 'high' || options.timeline === 'urgent') {
      suitable.push('fast_track');
    } else if (options.targetDeadline && baseline.timeline.withRisk > options.targetDeadline * 1.2) {
      suitable.push('fast_track');
    }

    // Premium if regulated or high-risk
    if (baseline.riskLevel === 'high' || baseline.riskLevel === 'critical') {
      suitable.push('premium');
    } else if (options.domain === 'fintech' || options.domain === 'healthcare') {
      suitable.push('premium');
    }

    return [...new Set(suitable)]; // Remove duplicates
  }

  // Generate a specific scenario
  async generateScenario(type, decomposition, riskAssessment, enrichedRequirements, clientProfile, baseline, options) {
    const template = this.scenarioTemplates[type];
    if (!template) return null;
    
    const scenario = {
      type,
      name: template.name,
      description: template.description,
      approach: this.describeApproach(type, baseline),
      
      // Module selection
      modules: this.selectModules(
        decomposition.modules,
        enrichedRequirements,
        template.moduleSelection
      ),
      
      // Resource allocation
      resources: this.allocateResources(
        decomposition,
        template.resourceStrategy,
        this.resourceStrategies[template.resourceStrategy]
      ),
      
      // Risk handling
      riskStrategy: this.applyRiskStrategy(
        riskAssessment,
        template.riskStrategy
      ),
      
      // Timeline calculation
      timeline: this.calculateTimeline(
        baseline,
        template,
        this.resourceStrategies[template.resourceStrategy]
      ),
      
      // Cost calculation
      cost: this.calculateCost(
        decomposition,
        template,
        riskAssessment,
        this.resourceStrategies[template.resourceStrategy]
      ),
      
      // Deliverables
      deliverables: this.calculateDeliverables(
        decomposition,
        template.moduleSelection
      ),
      
      // Trade-offs
      tradeoffs: this.identifyTradeoffs(type, baseline),
      
      // Benefits
      benefits: this.identifyBenefits(type, clientProfile),
      
      // Risks
      risks: this.identifyScenarioRisks(type, riskAssessment),
      
      // Success factors
      successFactors: this.identifySuccessFactors(type)
    };

    // Add phase breakdown if phased
    if (type === 'phased') {
      scenario.phases = this.generatePhases(decomposition, template.phases);
    }

    // Calculate ROI metrics
    scenario.roi = this.calculateROI(scenario, baseline);

    // Add suitability score
    scenario.suitability = this.calculateSuitability(scenario, clientProfile, options);

    return scenario;
  }

  // Select modules based on strategy
  selectModules(modules, enrichedRequirements, strategy) {
    switch (strategy) {
      case 'critical':
        return this.selectCriticalModules(modules, enrichedRequirements);
      case 'progressive':
        return this.selectProgressiveModules(modules);
      case 'prioritized':
        return this.selectPrioritizedModules(modules, 0.85);
      case 'full':
        return modules;
      case 'enhanced':
        return this.enhanceModules(modules);
      default:
        return modules;
    }
  }

  selectCriticalModules(modules, enrichedRequirements) {
    const critical = [];
    const criticalKeywords = ['auth', 'payment', 'core', 'essential', 'security', 'user'];
    
    for (const module of modules) {
      const moduleName = (module.module || module.name || '').toLowerCase();
      if (criticalKeywords.some(keyword => moduleName.includes(keyword))) {
        critical.push(module);
      }
    }

    // Ensure minimum viability
    if (critical.length < Math.ceil(modules.length * 0.4)) {
      // Add more modules to reach minimum
      const remaining = modules.filter(m => !critical.includes(m));
      critical.push(...remaining.slice(0, Math.ceil(modules.length * 0.4) - critical.length));
    }

    return critical;
  }

  selectProgressiveModules(modules) {
    // Sort by complexity and dependencies
    const sorted = [...modules].sort((a, b) => {
      const complexityOrder = { simple: 1, standard: 2, complex: 3 };
      const aComplexity = complexityOrder[a.complexity] || 2;
      const bComplexity = complexityOrder[b.complexity] || 2;
      return aComplexity - bComplexity;
    });
    
    return sorted;
  }

  selectPrioritizedModules(modules, percentage) {
    const count = Math.ceil(modules.length * percentage);
    return modules.slice(0, count);
  }

  enhanceModules(modules) {
    // Add quality enhancements
    return modules.map(module => ({
      ...module,
      enhanced: true,
      additionalFeatures: ['Advanced testing', 'Documentation', 'Training']
    }));
  }

  // Allocate resources based on strategy
  allocateResources(decomposition, strategyName, strategy) {
    const allocation = {
      strategy: strategyName,
      team: [],
      totalHeadcount: 0,
      costImpact: 1.0
    };
    
    // Backend developers
    if (decomposition.resources.backend) {
      allocation.team.push({
        role: 'Backend Developer',
        count: strategy.developers || 1,
        allocation: '100%',
        cost: decomposition.resources.backend.totalCost
      });
    }

    // Frontend developers
    if (decomposition.resources.frontend) {
      allocation.team.push({
        role: 'Frontend Developer',
        count: Math.ceil((strategy.developers || 1) * 0.8),
        allocation: '100%',
        cost: decomposition.resources.frontend.totalCost
      });
    }

    // Designers
    if (decomposition.resources.ui) {
      allocation.team.push({
        role: 'UI/UX Designer',
        count: strategy.designers || 0.5,
        allocation: strategy.designers >= 1 ? '100%' : '50%',
        cost: decomposition.resources.ui.totalCost
      });
    }

    // QA
    if (decomposition.resources.qa) {
      allocation.team.push({
        role: 'QA Engineer',
        count: strategy.qa || 1,
        allocation: strategy.qa >= 1 ? '100%' : '50%',
        cost: decomposition.resources.qa.totalCost
      });
    }

    // Calculate total headcount
    allocation.totalHeadcount = allocation.team.reduce((sum, member) => 
      sum + member.count, 0
    );

    // Calculate cost impact
    allocation.costImpact = strategy.overhead || 1.0;
    if (strategy.seniorMultiplier) {
      allocation.costImpact *= strategy.seniorMultiplier;
    }

    return allocation;
  }

  // Apply risk strategy
  applyRiskStrategy(riskAssessment, strategy) {
    const strategies = {
      accept: {
        approach: 'Accept risks with minimal mitigation',
        bufferReduction: 0.5,
        contingencyReduction: 0.3,
        mitigationItems: 3
      },
      mitigate: {
        approach: 'Standard risk mitigation',
        bufferReduction: 1.0,
        contingencyReduction: 1.0,
        mitigationItems: 7
      },
      buffer: {
        approach: 'Add buffers for all risks',
        bufferReduction: 1.2,
        contingencyReduction: 1.2,
        mitigationItems: 5
      },
      eliminate: {
        approach: 'Extensive risk elimination',
        bufferReduction: 1.5,
        contingencyReduction: 1.5,
        mitigationItems: 10
      },
      distribute: {
        approach: 'Distribute risks across phases',
        bufferReduction: 0.8,
        contingencyReduction: 0.8,
        mitigationItems: 5
      }
    };
    
    const selectedStrategy = strategies[strategy] || strategies.mitigate;

    return {
      ...selectedStrategy,
      adjustedBuffers: {
        time: riskAssessment.recommendedBuffers.time * selectedStrategy.bufferReduction,
        cost: riskAssessment.recommendedBuffers.cost * selectedStrategy.bufferReduction
      },
      adjustedContingency: riskAssessment.contingencyReserve * selectedStrategy.contingencyReduction,
      mitigationPlan: (riskAssessment.mitigationPlan?.immediate || []).slice(0, selectedStrategy.mitigationItems)
    };
  }

  // Calculate timeline for scenario
  calculateTimeline(baseline, template, resourceStrategy) {
    let adjustedTimeline = baseline.timeline.base;
    
    // Apply template adjustments
    if (template.targetReduction?.time) {
      adjustedTimeline *= template.targetReduction.time;
    }

    // Apply resource strategy impact
    if (resourceStrategy.developers > 1) {
      // Parallel development reduces time
      const parallelFactor = 1 / (1 + (resourceStrategy.developers - 1) * 0.4);
      adjustedTimeline *= parallelFactor;
    }

    // Apply fast-track reduction
    if (template.timeReduction) {
      adjustedTimeline *= template.timeReduction;
    }

    return {
      days: Math.ceil(adjustedTimeline),
      weeks: Math.ceil(adjustedTimeline / 5),
      months: (adjustedTimeline / 20).toFixed(1),
      comparedToBaseline: ((adjustedTimeline / baseline.timeline.withRisk) * 100).toFixed(0) + '%'
    };
  }

  // Calculate cost for scenario
  calculateCost(decomposition, template, riskAssessment, resourceStrategy) {
    let adjustedCost = decomposition.totalCost;
    
    // Apply module selection impact
    if (template.targetReduction?.cost) {
      adjustedCost *= template.targetReduction.cost;
    }

    // Apply resource strategy impact
    if (resourceStrategy.overhead) {
      adjustedCost *= resourceStrategy.overhead;
    }

    // Apply resource multiplier for parallel work
    if (template.resourceMultiplier) {
      adjustedCost *= template.resourceMultiplier;
    }

    // Apply senior multiplier
    if (resourceStrategy.seniorMultiplier) {
      adjustedCost *= resourceStrategy.seniorMultiplier;
    }

    // Apply quality multiplier
    if (template.qualityMultiplier) {
      adjustedCost *= template.qualityMultiplier;
    }

    // Apply risk buffers based on strategy
    const riskBuffer = riskAssessment.recommendedBuffers.cost;
    const strategyBuffer = this.getStrategyRiskBuffer(template.riskStrategy);
    adjustedCost *= (1 + (riskBuffer - 1) * strategyBuffer);

    return {
      base: Math.round(adjustedCost),
      withContingency: Math.round(adjustedCost + riskAssessment.contingencyReserve * strategyBuffer),
      breakdown: this.generateCostBreakdown(adjustedCost, decomposition.costByResource),
      savingsFromBaseline: decomposition.totalCost - adjustedCost
    };
  }

  getStrategyRiskBuffer(strategy) {
    const buffers = {
      accept: 0.3,
      mitigate: 0.7,
      buffer: 1.0,
      eliminate: 1.2,
      distribute: 0.6
    };
    return buffers[strategy] || 0.7;
  }

  // Calculate deliverables
  calculateDeliverables(decomposition, moduleSelection) {
    const totalDeliverables = decomposition.stats.totalDeliverables;
    
    const reductions = {
      critical: 0.4,
      progressive: 0.85,
      prioritized: 0.85,
      full: 1.0,
      enhanced: 1.2
    };

    const factor = reductions[moduleSelection] || 1.0;

    return {
      count: Math.round(totalDeliverables * factor),
      percentage: Math.round(factor * 100) + '%',
      components: Math.round(decomposition.stats.totalComponents * factor)
    };
  }

  // Generate cost breakdown
  generateCostBreakdown(totalCost, originalBreakdown) {
    const breakdown = {};
    let remaining = totalCost;
    
    for (const [resource, data] of Object.entries(originalBreakdown || {})) {
      const percentage = parseFloat(data.percentage || '0') / 100;
      breakdown[resource] = {
        cost: Math.round(totalCost * percentage),
        percentage: data.percentage || '0%'
      };
      remaining -= breakdown[resource].cost;
    }

    // Adjust for rounding
    if (remaining !== 0 && breakdown.backend) {
      breakdown.backend.cost += remaining;
    }

    return breakdown;
  }

  // Describe approach for each scenario
  describeApproach(type, baseline) {
    const approaches = {
      mvp: `Focus on ${Math.round(baseline.modules * 0.4)} core modules that provide immediate value. Defer nice-to-have features to future phases.`,
      phased: 'Deliver in 3 strategic phases, spreading investment and risk. Each phase provides working functionality.',
      balanced: `Include ${Math.round(baseline.modules * 0.85)} modules with standard quality and testing. Optimal for most projects.`,
      fast_track: `Deploy ${Math.round((baseline.resources?.backend?.deliverableCount || 10) * 2.5)} parallel resources to compress timeline by 40%.`,
      premium: `Full scope with enhanced testing, documentation, and senior resources. ${Math.round(baseline.confidence * 1.2)}% confidence level.`
    };
    
    return approaches[type] || 'Standard development approach';
  }

  // Identify trade-offs
  identifyTradeoffs(type, baseline) {
    const tradeoffs = {
      mvp: {
        pros: [
          'Fastest time to market',
          `${Math.round((1 - 0.6) * 100)}% cost savings`,
          'Early user feedback',
          'Lower initial risk'
        ],
        cons: [
          'Limited functionality',
          'May need significant rework',
          'Not suitable for complex domains',
          'User experience compromises'
        ]
      },
      phased: {
        pros: [
          'Spread investment over time',
          'Risk distribution',
          'Early value delivery',
          'Flexibility to pivot'
        ],
        cons: [
          'Higher total cost (coordination)',
          'Longer overall timeline',
          'Integration complexity',
          'Multiple deployments needed'
        ]
      },
      balanced: {
        pros: [
          'Good feature coverage',
          'Predictable delivery',
          'Standard risk levels',
          'Cost-effective'
        ],
        cons: [
          'No particular optimization',
          'Average time to market',
          'Standard quality',
          'May not suit extreme constraints'
        ]
      },
      fast_track: {
        pros: [
          '40% faster delivery',
          'Competitive advantage',
          'Full feature set',
          'Parallel development'
        ],
        cons: [
          `${Math.round((2.5 - 1) * 100)}% higher cost`,
          'Coordination complexity',
          'Higher risk',
          'Quality concerns with speed'
        ]
      },
      premium: {
        pros: [
          'Highest quality',
          'Comprehensive documentation',
          'Lower long-term maintenance',
          'Risk minimization'
        ],
        cons: [
          `${Math.round((1.3 - 1) * 100)}% cost premium`,
          'Longer timeline',
          'Over-engineering risk',
          'May exceed actual needs'
        ]
      }
    };
    
    return tradeoffs[type] || { pros: [], cons: [] };
  }

  // Identify benefits
  identifyBenefits(type, clientProfile) {
    const benefits = [];
    
    if (type === 'mvp' && clientProfile?.clientSize === 'startup') {
      benefits.push('Perfect for market validation');
      benefits.push('Preserves runway');
    }

    if (type === 'phased' && clientProfile?.committeeDecision) {
      benefits.push('Easier approval process');
      benefits.push('Demonstrate value progressively');
    }

    if (type === 'fast_track' && clientProfile?.urgency === 'high') {
      benefits.push('Meets urgent deadline');
      benefits.push('First-mover advantage');
    }

    if (type === 'premium' && clientProfile?.hadFailure) {
      benefits.push('Rebuilds confidence');
      benefits.push('Minimizes failure risk');
    }

    return benefits;
  }

  // Identify scenario-specific risks
  identifyScenarioRisks(type, riskAssessment) {
    const scenarioRisks = {
      mvp: [
        'Feature gaps may frustrate users',
        'Technical debt accumulation',
        'Scaling challenges later'
      ],
      phased: [
        'Integration complexity between phases',
        'Total cost may exceed single-phase',
        'Stakeholder fatigue'
      ],
      balanced: [
        'No specific optimizations',
        'May not meet extreme constraints'
      ],
      fast_track: [
        'Coordination overhead',
        'Quality risks from speed',
        'Resource conflicts'
      ],
      premium: [
        'Over-engineering possibility',
        'Budget overrun risk',
        'Longer time to market'
      ]
    };
    
    return scenarioRisks[type] || [];
  }

  // Identify success factors
  identifySuccessFactors(type) {
    const factors = {
      mvp: [
        'Clear MVP definition',
        'Strong product owner',
        'User feedback loop'
      ],
      phased: [
        'Phase planning clarity',
        'Consistent team',
        'Integration planning'
      ],
      balanced: [
        'Steady progress tracking',
        'Regular stakeholder updates',
        'Standard practices'
      ],
      fast_track: [
        'Excellent coordination',
        'Senior resources',
        'Clear communication'
      ],
      premium: [
        'Quality metrics',
        'Comprehensive testing',
        'Documentation standards'
      ]
    };
    
    return factors[type] || [];
  }

  // Generate phases for phased delivery
  generatePhases(decomposition, phaseTemplates) {
    const phases = [];
    const sortedModules = [...decomposition.modules].sort((a, b) => {
      const complexityOrder = { simple: 1, standard: 2, complex: 3 };
      return (complexityOrder[a.complexity] || 2) - (complexityOrder[b.complexity] || 2);
    });
    
    let moduleIndex = 0;

    for (const template of phaseTemplates) {
      const moduleCount = Math.ceil(sortedModules.length * template.percentage);
      const phaseModules = sortedModules.slice(moduleIndex, moduleIndex + moduleCount);
      moduleIndex += moduleCount;
      
      const phaseCost = phaseModules.reduce((sum, m) => sum + (m.totalCost || 0), 0);
      
      phases.push({
        name: template.name,
        modules: phaseModules.length,
        deliverables: Math.round(decomposition.stats.totalDeliverables * template.percentage),
        cost: phaseCost,
        timeline: Math.round(decomposition.timeline.recommendedDays * template.percentage),
        description: `${template.percentage * 100}% of functionality`,
        keyFeatures: phaseModules.slice(0, 3).map(m => m.module || m.name)
      });
    }

    return phases;
  }

  // Calculate ROI metrics
  calculateROI(scenario, baseline) {
    const roi = {
      timeToMarket: scenario.timeline.days,
      costEfficiency: ((baseline.cost.total - scenario.cost.withContingency) / baseline.cost.total * 100).toFixed(0) + '%',
      riskReduction: this.calculateRiskReduction(scenario.riskStrategy),
      valueDelivery: this.calculateValueDelivery(scenario)
    };
    
    // Time to value
    if (scenario.type === 'mvp') {
      roi.timeToValue = Math.round(scenario.timeline.days * 0.5) + ' days';
    } else if (scenario.type === 'phased' && scenario.phases) {
      roi.timeToValue = scenario.phases[0].timeline + ' days';
    } else {
      roi.timeToValue = scenario.timeline.days + ' days';
    }

    return roi;
  }

  calculateRiskReduction(riskStrategy) {
    const reductions = {
      'Accept risks with minimal mitigation': 'Minimal',
      'Standard risk mitigation': 'Standard',
      'Add buffers for all risks': 'High',
      'Extensive risk elimination': 'Maximum',
      'Distribute risks across phases': 'Distributed'
    };
    
    return reductions[riskStrategy.approach] || 'Standard';
  }

  calculateValueDelivery(scenario) {
    if (scenario.type === 'mvp') return 'Early';
    if (scenario.type === 'phased') return 'Progressive';
    if (scenario.type === 'fast_track') return 'Accelerated';
    return 'Standard';
  }

  // Calculate suitability score
  calculateSuitability(scenario, clientProfile, options) {
    let score = 50; // Base score
    
    // Budget fit
    if (options.maxBudget) {
      if (scenario.cost.withContingency <= options.maxBudget) {
        score += 20;
      } else if (scenario.cost.withContingency <= options.maxBudget * 1.2) {
        score += 10;
      } else {
        score -= 20;
      }
    }

    // Timeline fit
    if (options.targetDeadline) {
      if (scenario.timeline.days <= options.targetDeadline) {
        score += 20;
      } else if (scenario.timeline.days <= options.targetDeadline * 1.2) {
        score += 10;
      } else {
        score -= 20;
      }
    }

    // Client profile fit
    if (scenario.type === 'mvp' && clientProfile?.clientSize === 'startup') score += 15;
    if (scenario.type === 'phased' && clientProfile?.committeeDecision) score += 15;
    if (scenario.type === 'premium' && clientProfile?.hadFailure) score += 15;
    if (scenario.type === 'fast_track' && options.urgency === 'high') score += 15;

    // Risk alignment
    if (clientProfile?.riskTolerance === 'low' && scenario.riskStrategy.approach === 'Extensive risk elimination') score += 10;
    if (clientProfile?.riskTolerance === 'high' && scenario.riskStrategy.approach === 'Accept risks with minimal mitigation') score += 10;

    return Math.max(0, Math.min(100, score));
  }

  // Rank scenarios
  rankScenarios(scenarios, options) {
    return scenarios.sort((a, b) => {
      // Primary sort by suitability
      if (b.suitability !== a.suitability) {
        return b.suitability - a.suitability;
      }
      
      // Secondary sort by constraint fit
      const aFitsBudget = !options.maxBudget || a.cost.withContingency <= options.maxBudget;
      const bFitsBudget = !options.maxBudget || b.cost.withContingency <= options.maxBudget;
      
      if (aFitsBudget !== bFitsBudget) {
        return bFitsBudget ? 1 : -1;
      }
      
      // Tertiary sort by timeline
      return a.timeline.days - b.timeline.days;
    });
  }

  // Add recommendations to scenarios
  addRecommendations(scenarios, clientProfile, options) {
    return scenarios.map((scenario, index) => {
      const enhanced = { ...scenario };
      
      // Mark top scenario
      if (index === 0) {
        enhanced.recommended = true;
        enhanced.recommendationReason = this.getRecommendationReason(scenario, clientProfile, options);
      }
      
      // Add constraint fit indicators
      enhanced.constraintFit = {
        budget: this.checkBudgetFit(scenario, options),
        timeline: this.checkTimelineFit(scenario, options),
        risk: this.checkRiskFit(scenario, clientProfile)
      };
      
      // Add decision helpers
      enhanced.decisionHelpers = {
        whenToChoose: this.getWhenToChoose(scenario.type),
        notSuitableWhen: this.getNotSuitableWhen(scenario.type)
      };
      
      return enhanced;
    });
  }

  getRecommendationReason(scenario, clientProfile, options) {
    const reasons = [];
    
    if (scenario.constraintFit?.budget === 'perfect') reasons.push('Fits budget perfectly');
    if (scenario.constraintFit?.timeline === 'perfect') reasons.push('Meets timeline requirements');
    if (scenario.suitability >= 80) reasons.push('Highly suitable for your context');

    if (scenario.type === 'mvp' && clientProfile?.clientSize === 'startup') {
      reasons.push('Ideal for startups needing market validation');
    }

    if (scenario.type === 'phased' && clientProfile?.committeeDecision) {
      reasons.push('Easier approval with phased approach');
    }

    return reasons.join('. ') || 'Best overall balance';
  }

  checkBudgetFit(scenario, options) {
    if (!options.maxBudget) return 'unknown';
    
    const ratio = scenario.cost.withContingency / options.maxBudget;

    if (ratio <= 0.9) return 'perfect';
    if (ratio <= 1.0) return 'fits';
    if (ratio <= 1.2) return 'close';
    return 'exceeds';
  }

  checkTimelineFit(scenario, options) {
    if (!options.targetDeadline) return 'unknown';
    
    const ratio = scenario.timeline.days / options.targetDeadline;

    if (ratio <= 0.9) return 'perfect';
    if (ratio <= 1.0) return 'fits';
    if (ratio <= 1.2) return 'close';
    return 'exceeds';
  }

  checkRiskFit(scenario, clientProfile) {
    const riskTolerance = clientProfile?.riskTolerance || 'medium';
    const strategy = scenario.riskStrategy.approach;
    
    if (riskTolerance === 'low' && strategy === 'Extensive risk elimination') return 'perfect';
    if (riskTolerance === 'high' && strategy === 'Accept risks with minimal mitigation') return 'perfect';
    if (riskTolerance === 'medium' && strategy === 'Standard risk mitigation') return 'perfect';

    return 'acceptable';
  }

  getWhenToChoose(type) {
    const guidance = {
      mvp: 'When you need market validation or have budget constraints',
      phased: 'When you need to spread investment or have multiple stakeholders',
      balanced: 'When you have clear requirements and moderate constraints',
      fast_track: 'When time to market is critical',
      premium: 'When quality and risk minimization are paramount'
    };
    
    return guidance[type] || 'Standard situations';
  }

  getNotSuitableWhen(type) {
    const guidance = {
      mvp: 'Complex integrations or regulated industries',
      phased: 'Urgent timeline or small projects',
      balanced: 'Extreme constraints or special requirements',
      fast_track: 'Limited budget or quality concerns',
      premium: 'Tight budget or MVP validation'
    };
    
    return guidance[type] || 'Extreme constraints';
  }

  // Generate overall recommendation
  generateRecommendation(scenarios, clientProfile, options) {
    const topScenario = scenarios[0];
    
    return {
      primary: topScenario.name,
      reasoning: topScenario.recommendationReason || 'Best fit for your requirements',
      alternatives: scenarios.slice(1, 3).map(s => ({
        name: s.name,
        whenToConsider: s.decisionHelpers.whenToChoose
      })),
      keyInsight: this.generateKeyInsight(scenarios, clientProfile, options)
    };
  }

  generateKeyInsight(scenarios, clientProfile, options) {
    if (options.maxBudget && scenarios[0].cost.withContingency > options.maxBudget) {
      return 'Budget constraint requires scope reduction. Consider MVP or phased approach.';
    }
    
    if (options.targetDeadline && scenarios[0].timeline.days > options.targetDeadline) {
      return 'Timeline constraint requires parallel resources. Consider fast-track approach.';
    }

    if (clientProfile?.riskLevel === 'high') {
      return 'High risk profile suggests premium approach with extensive mitigation.';
    }

    if (scenarios[0].type === 'mvp') {
      return 'Starting with MVP allows market validation before full investment.';
    }

    return 'Recommended scenario provides best balance of cost, time, and risk for your context.';
  }
}

module.exports = ScenarioGeneratorV2;

