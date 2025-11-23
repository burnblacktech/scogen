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
    console.log('[INFO] Generating Intelligent Scenarios...');
    const startTime = Date.now();
    const MAX_TOTAL_TIME = 30000; // 30 seconds total timeout
    
    try {
      console.log('   [INFO] Validating inputs...');
      // Validate inputs
      if (!decomposition || !riskAssessment) {
        throw new Error('Missing required inputs: decomposition or riskAssessment');
      }
      console.log('   [OK] Inputs validated');

      const scenarios = [];
      console.log('   [INFO] Creating baseline estimate...');
      const baselineEstimate = this.createBaselineEstimate(decomposition, riskAssessment);
      console.log('   [OK] Baseline estimate created');

      // Determine which scenarios are suitable
      console.log('   [INFO] Determining suitable scenarios...');
      const suitableScenarios = this.determineSuitableScenarios(
        clientProfile || {},
        options,
        baselineEstimate
      );
      console.log(`   [INFO] Generating ${suitableScenarios.length} scenario(s): ${suitableScenarios.join(', ')}`);

      // Check timeout before starting loop
      if (Date.now() - startTime > MAX_TOTAL_TIME) {
        console.log('   [WARN] Timeout before scenario generation - returning baseline only');
        return {
          baseline: baselineEstimate,
          scenarios: [],
          recommendation: { primary: 'baseline', reasoning: 'Scenario generation timeout' }
        };
      }

      // Generate each suitable scenario with error handling
      for (let i = 0; i < suitableScenarios.length; i++) {
        // Check timeout on each iteration
        if (Date.now() - startTime > MAX_TOTAL_TIME) {
          console.log(`   ⚠️ Timeout after ${i} scenarios - returning partial results`);
          break;
        }
        const scenarioType = suitableScenarios[i];
        try {
          console.log(`   [${i + 1}/${suitableScenarios.length}] Generating ${scenarioType} scenario...`);
          
          // Wrap synchronous operation in Promise to make it interruptible
          const scenarioPromise = new Promise((resolve, reject) => {
            // Use setImmediate to allow event loop to process timeout
            setImmediate(() => {
              try {
                // Now execute the actual scenario generation
                const result = this.generateScenarioSync(
                  scenarioType,
                  decomposition,
                  riskAssessment,
                  enrichedRequirements || {},
                  clientProfile || {},
                  baselineEstimate,
                  options
                );
                resolve(result);
              } catch (error) {
                reject(error);
              }
            });
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Scenario generation timeout: ${scenarioType} took > 10 seconds`)), 10000)
          );
          
          const scenario = await Promise.race([scenarioPromise, timeoutPromise]);
          
          if (scenario) {
            scenarios.push(scenario);
            console.log(`   [OK] ${scenarioType} scenario generated`);
          } else {
            console.log(`   [WARN] ${scenarioType} scenario returned null (skipped)`);
          }
        } catch (scenarioError) {
          console.error(`   [ERROR] Failed to generate ${scenarioType} scenario:`, scenarioError.message);
          if (scenarioError.stack) {
            console.error(scenarioError.stack);
          }
          // Continue with other scenarios even if one fails
          continue;
        }
      }

      if (scenarios.length === 0) {
        console.log('   [WARN] No scenarios were generated successfully');
        // Return at least baseline
        return {
          baseline: baselineEstimate,
          scenarios: [],
          recommendation: { primary: 'baseline', reasoning: 'No scenarios could be generated' }
        };
      }

      console.log(`   Ranking ${scenarios.length} scenario(s)...`);
      
      // Rank scenarios
      let rankedScenarios;
      try {
        rankedScenarios = this.rankScenarios(scenarios, options);
      } catch (rankError) {
        console.error('   [WARN] Ranking failed, using original order:', rankError.message);
        rankedScenarios = scenarios;
      }

      console.log(`   Adding recommendations...`);
      
      // Add recommendations
      let finalScenarios;
      try {
        finalScenarios = this.addRecommendations(rankedScenarios, clientProfile || {}, options);
      } catch (recError) {
        console.error('   [WARN] Recommendation generation failed, using ranked scenarios:', recError.message);
        finalScenarios = rankedScenarios;
      }

      console.log(`[OK] Generated ${finalScenarios.length} scenarios`);

      // Generate recommendation safely
      let recommendation;
      try {
        recommendation = this.generateRecommendation(finalScenarios, clientProfile || {}, options);
      } catch (recError) {
        console.error('   [WARN] Recommendation generation failed:', recError.message);
        recommendation = { 
          primary: finalScenarios[0]?.type || 'baseline', 
          reasoning: 'Unable to generate detailed recommendation' 
        };
      }

      return {
        baseline: baselineEstimate,
        scenarios: finalScenarios,
        recommendation: recommendation
      };
    } catch (error) {
      console.error('[ERROR] Scenario generation failed:', error.message);
      console.error(error.stack);
      throw error;
    }
  }

  // Calculate immutable technical baseline - preserves ALL modules regardless of budget
  calculateTechnicalBaseline(decomposition, riskAssessment) {
    if (!decomposition || !riskAssessment) {
      throw new Error('Missing decomposition or riskAssessment in calculateTechnicalBaseline');
    }
    
    const modules = Array.isArray(decomposition.modules) ? decomposition.modules : [];
    const stats = decomposition.stats || { totalDeliverables: 0, totalComponents: 0 };
    const timeline = decomposition.timeline || { recommendedDays: 60, sequentialDays: 90, parallelDays: 35 };
    const totalCost = decomposition.totalCost || 0;
    const costByResource = decomposition.costByResource || {};
    
    // Calculate optimal team size from resource allocation
    let teamSize = 0;
    if (costByResource.backend) teamSize += costByResource.backend.count || 0;
    if (costByResource.frontend) teamSize += costByResource.frontend.count || 0;
    if (costByResource.design) teamSize += costByResource.design.count || 0;
    if (costByResource.qa) teamSize += costByResource.qa.count || 0;
    if (teamSize === 0) teamSize = 5; // Default if not calculated
    
    // Calculate actual effort in person-days
    const actualEffort = Math.round(totalCost / 5000); // Rough estimate: ₹5000 per person-day
    
    // Determine complexity
    let actualComplexity = 'medium';
    if (modules.length > 20) actualComplexity = 'high';
    else if (modules.length < 5) actualComplexity = 'low';
    
    return {
      actualModules: modules.length,
      actualEffort: actualEffort,
      actualCost: totalCost,
      actualTimeline: timeline.recommendedDays || 60,
      actualTeamSize: teamSize,
      actualComplexity: actualComplexity,
      modules: modules, // Preserve ALL modules
      stats: stats,
      resources: costByResource,
      riskLevel: riskAssessment.level || 'medium',
      confidence: riskAssessment.confidence || 70
    };
  }

  // Generate budget-fitted scenario that adjusts timeline/team instead of removing modules
  generateBudgetFittedScenario(baseline, constraints) {
    const userBudget = constraints.maxBudget ? this.parseBudget(constraints.maxBudget) : null;
    if (!userBudget || !baseline) {
      return null;
    }
    
    const actualCost = baseline.actualCost || baseline.cost?.total || 0;
    
    if (userBudget >= actualCost) {
      // Budget sufficient - show actual cost with good margin
      return {
        name: 'Within Budget',
        type: 'budget_fitted',
        strategy: 'standard',
        cost: {
          base: actualCost,
          withContingency: Math.round(userBudget * 0.95), // Leave 5% buffer
          total: Math.round(userBudget * 0.95)
        },
        timeline: {
          days: baseline.actualTimeline || baseline.timeline?.base || 60,
          withRisk: baseline.actualTimeline || baseline.timeline?.base || 60
        },
        modules: baseline.modules || [], // KEEP ALL MODULES
        moduleCount: baseline.actualModules || baseline.modules?.length || 0,
        message: 'Your budget comfortably covers the project scope',
        fitsConstraints: true,
        constraintFit: {
          budget: 'perfect',
          timeline: 'unknown'
        }
      };
    } else {
      // Budget insufficient - show proportional distribution
      const shortfall = actualCost - userBudget;
      const shortfallPercent = (shortfall / actualCost) * 100;
      
      // Calculate adjustments
      const adjustedTeam = this.calculateAdjustedTeam(baseline, userBudget);
      const extendedTimeline = this.calculateExtendedTimeline(baseline, userBudget);
      const approach = this.suggestApproach(shortfallPercent);
      
      return {
        name: 'Budget Optimized',
        type: 'budget_fitted',
        strategy: 'proportional',
        cost: {
          base: actualCost,
          withContingency: userBudget,
          total: userBudget
        },
        timeline: {
          days: extendedTimeline,
          withRisk: extendedTimeline
        },
        modules: baseline.modules || [], // KEEP ALL MODULES
        moduleCount: baseline.actualModules || baseline.modules?.length || 0,
        adjustments: {
          teamSize: adjustedTeam,
          timeline: extendedTimeline,
          approach: approach,
          shortfallPercent: shortfallPercent.toFixed(0)
        },
        message: `Budget is ${shortfallPercent.toFixed(0)}% below standard cost. Suggested adjustments:`,
        options: [
          `Extend timeline to ${Math.ceil(extendedTimeline)} days with smaller team of ${adjustedTeam}`,
          `Start with ${Math.ceil((baseline.actualModules || 0) * 0.6)} core modules, add rest later`,
          `Use junior developers with senior oversight`,
          `Client handles testing and documentation`
        ],
        fitsConstraints: false,
        constraintFit: {
          budget: 'close',
          timeline: 'unknown'
        },
        moduleDistribution: this.calculateProportionalDistribution(baseline.modules || [], userBudget)
      };
    }
  }
  
  // Calculate proportional distribution of budget across all modules
  calculateProportionalDistribution(modules, budget) {
    const distribution = {};
    const totalCost = modules.reduce((sum, m) => {
      const moduleCost = m.cost || m.estimatedCost || 0;
      return sum + moduleCost;
    }, 0);
    
    if (totalCost === 0) {
      // If no cost data, distribute evenly
      const perModule = budget / modules.length;
      modules.forEach((module, index) => {
        distribution[module.name || `Module ${index + 1}`] = {
          originalCost: 0,
          allocatedBudget: Math.floor(perModule),
          percentageOfBudget: ((1 / modules.length) * 100).toFixed(1)
        };
      });
      return distribution;
    }
    
    modules.forEach(module => {
      const moduleCost = module.cost || module.estimatedCost || 0;
      const proportion = moduleCost / totalCost;
      distribution[module.name || module.id || 'Unknown'] = {
        originalCost: moduleCost,
        allocatedBudget: Math.floor(budget * proportion),
        percentageOfBudget: (proportion * 100).toFixed(1)
      };
    });
    
    return distribution;
  }
  
  // Calculate adjusted team size based on budget constraint
  calculateAdjustedTeam(baseline, budget) {
    const actualCost = baseline.actualCost || baseline.cost?.total || 0;
    const actualTeamSize = baseline.actualTeamSize || baseline.teamSize || 5;
    
    if (budget >= actualCost) {
      return actualTeamSize;
    }
    
    // Reduce team size proportionally, but not below 2
    const budgetRatio = budget / actualCost;
    const adjustedSize = Math.max(2, Math.floor(actualTeamSize * budgetRatio * 0.8)); // 80% of proportional
    
    return adjustedSize;
  }
  
  // Calculate extended timeline based on budget constraint
  calculateExtendedTimeline(baseline, budget) {
    const actualCost = baseline.actualCost || baseline.cost?.total || 0;
    const actualTimeline = baseline.actualTimeline || baseline.timeline?.base || 60;
    
    if (budget >= actualCost) {
      return actualTimeline;
    }
    
    // Extend timeline inversely proportional to budget reduction
    const budgetRatio = budget / actualCost;
    const extendedTimeline = Math.ceil(actualTimeline / (budgetRatio * 0.9)); // 90% efficiency
    
    return extendedTimeline;
  }
  
  // Suggest approach based on shortfall percentage
  suggestApproach(shortfallPercent) {
    if (shortfallPercent < 10) {
      return 'Minor adjustments needed - extend timeline slightly';
    } else if (shortfallPercent < 25) {
      return 'Moderate adjustments - extend timeline and reduce team size';
    } else if (shortfallPercent < 40) {
      return 'Significant adjustments - phased delivery recommended';
    } else {
      return 'Major adjustments - consider phased approach or scope prioritization';
    }
  }
  
  // Parse budget string to number
  parseBudget(budgetStr) {
    if (!budgetStr) return null;
    if (typeof budgetStr === 'number') return budgetStr;
    
    const str = String(budgetStr).trim().toLowerCase();
    const numStr = str.replace(/[₹,\s]/g, '');
    
    // Handle K, L, Cr suffixes
    if (numStr.endsWith('cr')) {
      return parseFloat(numStr.replace('cr', '')) * 10000000;
    } else if (numStr.endsWith('l')) {
      return parseFloat(numStr.replace('l', '')) * 100000;
    } else if (numStr.endsWith('k')) {
      return parseFloat(numStr.replace('k', '')) * 1000;
    }
    
    return parseFloat(numStr) || null;
  }

  // Create baseline estimate with all components
  createBaselineEstimate(decomposition, riskAssessment) {
    // Add null checks to prevent hanging
    if (!decomposition || !riskAssessment) {
      throw new Error('Missing decomposition or riskAssessment in createBaselineEstimate');
    }
    
    const riskBuffers = riskAssessment.recommendedBuffers || { cost: 1.15, time: 1.2 };
    const modules = Array.isArray(decomposition.modules) ? decomposition.modules : [];
    const stats = decomposition.stats || { totalDeliverables: 0, totalComponents: 0 };
    const timeline = decomposition.timeline || { recommendedDays: 60, sequentialDays: 90, parallelDays: 35 };
    const totalCost = decomposition.totalCost || 0;
    const contingencyReserve = riskAssessment.contingencyReserve || 0;
    
    return {
      modules: modules.length,
      deliverables: stats.totalDeliverables || 0,
      components: stats.totalComponents || 0,
      
      cost: {
        base: totalCost,
        withRisk: Math.round(totalCost * (riskBuffers.cost || 1.15)),
        contingency: contingencyReserve,
        total: Math.round(totalCost * (riskBuffers.cost || 1.15) + contingencyReserve)
      },
      
      timeline: {
        base: timeline.recommendedDays || 60,
        withRisk: Math.round((timeline.recommendedDays || 60) * (riskBuffers.time || 1.2)),
        sequential: timeline.sequentialDays || 90,
        parallel: timeline.parallelDays || 35
      },
      
      resources: decomposition.costByResource || {},
      risks: (riskAssessment.identifiedRisks || []).length,
      riskLevel: riskAssessment.level || 'medium',
      confidence: riskAssessment.confidence || 70
    };
  }

  // Determine which scenarios are suitable
  determineSuitableScenarios(clientProfile, options, baseline) {
    const suitable = [];
    
    // Always include balanced
    suitable.push('balanced');

    const baselineCost = baseline?.cost?.total || 0;
    const baselineTimeline = baseline?.timeline?.withRisk || 0;
    const baselineRiskLevel = baseline?.riskLevel || 'medium';

    // MVP if budget constrained or startup
    if (options.maxBudget && baselineCost > 0 && options.maxBudget < baselineCost * 0.7) {
      suitable.push('mvp');
    } else if (clientProfile?.clientSize === 'startup' || clientProfile?.budgetClarity === 'vague') {
      suitable.push('mvp');
    }

    // Phased if enterprise or committee
    if (clientProfile?.committeeDecision || clientProfile?.clientSize === 'enterprise') {
      suitable.push('phased');
    } else if (baselineCost > 1000000) {
      suitable.push('phased');
    }

    // Fast-track if urgent
    if (options.urgency === 'high' || options.timeline === 'urgent') {
      suitable.push('fast_track');
    } else if (options.targetDeadline && baselineTimeline > 0 && baselineTimeline > options.targetDeadline * 1.2) {
      suitable.push('fast_track');
    }

    // Premium if regulated or high-risk
    if (baselineRiskLevel === 'high' || baselineRiskLevel === 'critical') {
      suitable.push('premium');
    } else if (options.domain === 'fintech' || options.domain === 'healthcare') {
      suitable.push('premium');
    }

    return [...new Set(suitable)]; // Remove duplicates
  }

  // Generate a specific scenario (synchronous version - called from async wrapper)
  generateScenarioSync(type, decomposition, riskAssessment, enrichedRequirements, clientProfile, baseline, options) {
    try {
      console.log(`      [INFO] Getting template for ${type}...`);
      const template = this.scenarioTemplates[type];
      if (!template) {
        console.error(`   [WARN] Template not found for scenario type: ${type}`);
        return null;
      }
      
      // Validate inputs
      if (!decomposition || !riskAssessment || !baseline) {
        console.error(`   [WARN] Missing required inputs for ${type} scenario`);
        return null;
      }
      
      const modules = Array.isArray(decomposition.modules) ? decomposition.modules : [];
      const resourceStrategy = this.resourceStrategies[template.resourceStrategy] || this.resourceStrategies.standard;
      
      console.log(`      [INFO] Building scenario object for ${type}...`);
      
      const scenario = {
        type,
        name: template.name || `${type} scenario`,
        description: template.description || '',
        approach: this.describeApproach(type, baseline),
        
        // Module selection
        modules: this.selectModules(
          modules,
          enrichedRequirements || {},
          template.moduleSelection || 'full'
        ),
        
        // Resource allocation
        resources: this.allocateResources(
          decomposition,
          template.resourceStrategy || 'standard',
          resourceStrategy
        ),
        
        // Risk handling
        riskStrategy: this.applyRiskStrategy(
          riskAssessment,
          template.riskStrategy || 'mitigate'
        ),
        
        // Timeline calculation
        timeline: this.calculateTimeline(
          baseline,
          template,
          resourceStrategy
        ),
        
        // Cost calculation
        cost: this.calculateCost(
          decomposition,
          template,
          riskAssessment,
          resourceStrategy
        ),
        
        // Deliverables
        deliverables: this.calculateDeliverables(
          decomposition,
          template.moduleSelection || 'full'
        ),
        
        // Trade-offs
        tradeoffs: this.identifyTradeoffs(type, baseline),
        
        // Benefits
        benefits: this.identifyBenefits(type, clientProfile || {}),
        
        // Risks
        risks: this.identifyScenarioRisks(type, riskAssessment),
        
        // Success factors
        successFactors: this.identifySuccessFactors(type)
      };

      console.log(`      [INFO] Adding optional fields for ${type}...`);

      // Add phase breakdown if phased
      if (type === 'phased' && template.phases) {
        try {
          scenario.phases = this.generatePhases(decomposition, template.phases);
        } catch (phaseError) {
          console.error(`   [WARN] Failed to generate phases for ${type}:`, phaseError.message);
          scenario.phases = [];
        }
      }

      // Calculate ROI metrics
      try {
        scenario.roi = this.calculateROI(scenario, baseline);
      } catch (roiError) {
        console.error(`   [WARN] Failed to calculate ROI for ${type}:`, roiError.message);
        scenario.roi = {};
      }

      // Add suitability score
      try {
        scenario.suitability = this.calculateSuitability(scenario, clientProfile || {}, options);
      } catch (suitError) {
        console.error(`   [WARN] Failed to calculate suitability for ${type}:`, suitError.message);
        scenario.suitability = 50;
      }

      return scenario;
    } catch (error) {
      console.error(`   [ERROR] Error generating ${type} scenario:`, error.message);
      console.error(error.stack);
      return null;
    }
  }

  // Keep async version for backward compatibility (now wraps sync version)
  async generateScenario(type, decomposition, riskAssessment, enrichedRequirements, clientProfile, baseline, options) {
    return this.generateScenarioSync(type, decomposition, riskAssessment, enrichedRequirements, clientProfile, baseline, options);
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
    
    // Get resources from either decomposition.resources or costByResource
    // decomposition.resources has structure: { backend: { totalCost: ... }, ... }
    // costByResource has structure: { backend: { cost: ..., title: ... }, ... }
    const resources = decomposition.resources || {};
    const costByResource = decomposition.costByResource || {};
    
    // Helper to get cost from either structure
    const getResourceCost = (key) => {
      if (resources[key] && resources[key].totalCost !== undefined) {
        return resources[key].totalCost;
      }
      if (costByResource[key] && costByResource[key].cost !== undefined) {
        return costByResource[key].cost;
      }
      return 0;
    };
    
    // Backend developers
    if (resources.backend || costByResource.backend) {
      const cost = getResourceCost('backend');
      if (cost > 0) {
        allocation.team.push({
          role: 'Backend Developer',
          count: strategy.developers || 1,
          allocation: '100%',
          cost: cost
        });
      }
    }

    // Frontend developers
    if (resources.frontend || costByResource.frontend) {
      const cost = getResourceCost('frontend');
      if (cost > 0) {
        allocation.team.push({
          role: 'Frontend Developer',
          count: Math.ceil((strategy.developers || 1) * 0.8),
          allocation: '100%',
          cost: cost
        });
      }
    }

    // Designers (UI/UX)
    if (resources.ui || costByResource.ui) {
      const cost = getResourceCost('ui');
      if (cost > 0) {
        allocation.team.push({
          role: 'UI/UX Designer',
          count: strategy.designers || 0.5,
          allocation: strategy.designers >= 1 ? '100%' : '50%',
          cost: cost
        });
      }
    }

    // QA
    if (resources.qa || costByResource.qa) {
      const cost = getResourceCost('qa');
      if (cost > 0) {
        allocation.team.push({
          role: 'QA Engineer',
          count: strategy.qa || 1,
          allocation: strategy.qa >= 1 ? '100%' : '50%',
          cost: cost
        });
      }
    }

    // If no team members found, create a default team structure
    if (allocation.team.length === 0) {
      const totalCost = decomposition.totalCost || 0;
      if (totalCost > 0) {
        // Estimate team based on total cost
        allocation.team.push({
          role: 'Full-Stack Developer',
          count: strategy.developers || 2,
          allocation: '100%',
          cost: Math.round(totalCost * 0.7)
        });
        allocation.team.push({
          role: 'QA Engineer',
          count: strategy.qa || 1,
          allocation: '50%',
          cost: Math.round(totalCost * 0.3)
        });
      }
    }

    // Calculate total headcount
    allocation.totalHeadcount = allocation.team.reduce((sum, member) => 
      sum + (member.count || 0), 0
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
    
    // Get recommended buffers with defaults
    const recommendedBuffers = riskAssessment?.recommendedBuffers || { cost: 1.15, time: 1.2 };
    const timeBuffer = recommendedBuffers.time || 1.2;
    const costBuffer = recommendedBuffers.cost || 1.15;
    const contingencyReserve = riskAssessment?.contingencyReserve || 0;

    return {
      ...selectedStrategy,
      adjustedBuffers: {
        time: timeBuffer * selectedStrategy.bufferReduction,
        cost: costBuffer * selectedStrategy.bufferReduction
      },
      adjustedContingency: contingencyReserve * selectedStrategy.contingencyReduction,
      mitigationPlan: (riskAssessment?.mitigationPlan?.immediate || []).slice(0, selectedStrategy.mitigationItems)
    };
  }

  // Calculate timeline for scenario
  calculateTimeline(baseline, template, resourceStrategy) {
    const timeline = baseline?.timeline || { base: 60, withRisk: 72, sequential: 90, parallel: 35 };
    let adjustedTimeline = timeline.base || 60;
    
    // Apply template adjustments
    if (template?.targetReduction?.time) {
      adjustedTimeline *= template.targetReduction.time;
    }

    // Apply resource strategy impact
    if (resourceStrategy?.developers > 1) {
      // Parallel development reduces time
      const parallelFactor = 1 / (1 + (resourceStrategy.developers - 1) * 0.4);
      adjustedTimeline *= parallelFactor;
    }

    // Apply fast-track reduction
    if (template?.timeReduction) {
      adjustedTimeline *= template.timeReduction;
    }

    const withRiskTimeline = timeline.withRisk || adjustedTimeline;
    return {
      days: Math.ceil(adjustedTimeline),
      weeks: Math.ceil(adjustedTimeline / 5),
      months: (adjustedTimeline / 20).toFixed(1),
      comparedToBaseline: withRiskTimeline > 0 ? ((adjustedTimeline / withRiskTimeline) * 100).toFixed(0) + '%' : '100%'
    };
  }

  // Calculate cost for scenario
  calculateCost(decomposition, template, riskAssessment, resourceStrategy) {
    let adjustedCost = decomposition?.totalCost || 0;
    
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
    const recommendedBuffers = riskAssessment?.recommendedBuffers || { cost: 1.15, time: 1.2 };
    const riskBuffer = recommendedBuffers.cost || 1.15;
    const strategyBuffer = this.getStrategyRiskBuffer(template.riskStrategy);
    adjustedCost *= (1 + (riskBuffer - 1) * strategyBuffer);

    const contingencyReserve = riskAssessment?.contingencyReserve || 0;
    return {
      base: Math.round(adjustedCost),
      withContingency: Math.round(adjustedCost + contingencyReserve * strategyBuffer),
      breakdown: this.generateCostBreakdown(adjustedCost, decomposition.costByResource || {}),
      savingsFromBaseline: (decomposition.totalCost || 0) - adjustedCost
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
    const stats = decomposition?.stats || { totalDeliverables: 0, totalComponents: 0 };
    const totalDeliverables = stats.totalDeliverables || 0;
    const totalComponents = stats.totalComponents || 0;
    
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
      components: Math.round(totalComponents * factor)
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
    const baselineModules = baseline?.modules || 0;
    const baselineConfidence = baseline?.confidence || 70;
    const backendDeliverables = baseline?.resources?.backend?.deliverableCount || 10;
    
    const approaches = {
      mvp: `Focus on ${Math.round(baselineModules * 0.4)} core modules that provide immediate value. Defer nice-to-have features to future phases.`,
      phased: 'Deliver in 3 strategic phases, spreading investment and risk. Each phase provides working functionality.',
      balanced: `Include ${Math.round(baselineModules * 0.85)} modules with standard quality and testing. Optimal for most projects.`,
      fast_track: `Deploy ${Math.round(backendDeliverables * 2.5)} parallel resources to compress timeline by 40%.`,
      premium: `Full scope with enhanced testing, documentation, and senior resources. ${Math.round(baselineConfidence * 1.2)}% confidence level.`
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
    const modules = Array.isArray(decomposition?.modules) ? decomposition.modules : [];
    const stats = decomposition?.stats || { totalDeliverables: 0, totalComponents: 0 };
    const timeline = decomposition?.timeline || { recommendedDays: 60, sequentialDays: 90, parallelDays: 35 };
    
    if (modules.length === 0 || !phaseTemplates || phaseTemplates.length === 0) {
      return phases;
    }
    
    const sortedModules = [...modules].sort((a, b) => {
      const complexityOrder = { simple: 1, standard: 2, complex: 3 };
      return (complexityOrder[a.complexity] || 2) - (complexityOrder[b.complexity] || 2);
    });
    
    let moduleIndex = 0;

    for (const template of phaseTemplates) {
      if (!template || !template.percentage) continue;
      
      const moduleCount = Math.ceil(sortedModules.length * template.percentage);
      const phaseModules = sortedModules.slice(moduleIndex, moduleIndex + moduleCount);
      moduleIndex += moduleCount;
      
      const phaseCost = phaseModules.reduce((sum, m) => sum + (m.totalCost || 0), 0);
      
      phases.push({
        name: template.name || `Phase ${phases.length + 1}`,
        modules: phaseModules.length,
        deliverables: Math.round((stats.totalDeliverables || 0) * template.percentage),
        cost: phaseCost,
        timeline: Math.round((timeline.recommendedDays || 60) * template.percentage),
        description: `${template.percentage * 100}% of functionality`,
        keyFeatures: phaseModules.slice(0, 3).map(m => m.module || m.name || 'Module').filter(Boolean)
      });
    }

    return phases;
  }

  // Calculate ROI metrics
  calculateROI(scenario, baseline) {
    const scenarioTimeline = scenario?.timeline?.days || 0;
    const scenarioCost = scenario?.cost?.withContingency || 0;
    const baselineCost = baseline?.cost?.total || 0;
    
    let costEfficiency = '0%';
    if (baselineCost > 0) {
      const efficiency = ((baselineCost - scenarioCost) / baselineCost * 100);
      costEfficiency = efficiency.toFixed(0) + '%';
    }
    
    const roi = {
      timeToMarket: scenarioTimeline,
      costEfficiency: costEfficiency,
      riskReduction: this.calculateRiskReduction(scenario?.riskStrategy || {}),
      valueDelivery: this.calculateValueDelivery(scenario)
    };
    
    // Time to value
    if (scenario?.type === 'mvp') {
      roi.timeToValue = Math.round(scenarioTimeline * 0.5) + ' days';
    } else if (scenario?.type === 'phased' && Array.isArray(scenario.phases) && scenario.phases.length > 0) {
      roi.timeToValue = (scenario.phases[0].timeline || scenarioTimeline) + ' days';
    } else {
      roi.timeToValue = scenarioTimeline + ' days';
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
    
    return reductions[riskStrategy?.approach] || 'Standard';
  }

  calculateValueDelivery(scenario) {
    if (!scenario) return 'Standard';
    if (scenario.type === 'mvp') return 'Early';
    if (scenario.type === 'phased') return 'Progressive';
    if (scenario.type === 'fast_track') return 'Accelerated';
    return 'Standard';
  }

  // Calculate suitability score
  calculateSuitability(scenario, clientProfile, options) {
    let score = 50; // Base score
    
    if (!scenario || !scenario.cost || !scenario.timeline) {
      return score;
    }
    
    const scenarioCost = scenario.cost.withContingency || scenario.cost.base || 0;
    const scenarioTimeline = scenario.timeline.days || 0;
    
    // Budget fit
    if (options?.maxBudget && scenarioCost > 0) {
      if (scenarioCost <= options.maxBudget) {
        score += 20;
      } else if (scenarioCost <= options.maxBudget * 1.2) {
        score += 10;
      } else {
        score -= 20;
      }
    }

    // Timeline fit
    if (options?.targetDeadline && scenarioTimeline > 0) {
      if (scenarioTimeline <= options.targetDeadline) {
        score += 20;
      } else if (scenarioTimeline <= options.targetDeadline * 1.2) {
        score += 10;
      } else {
        score -= 20;
      }
    }

    // Client profile fit
    if (scenario.type === 'mvp' && clientProfile?.clientSize === 'startup') score += 15;
    if (scenario.type === 'phased' && clientProfile?.committeeDecision) score += 15;
    if (scenario.type === 'premium' && clientProfile?.hadFailure) score += 15;
    if (scenario.type === 'fast_track' && options?.urgency === 'high') score += 15;

    // Risk alignment
    if (clientProfile?.riskTolerance === 'low' && scenario.riskStrategy?.approach === 'Extensive risk elimination') score += 10;
    if (clientProfile?.riskTolerance === 'high' && scenario.riskStrategy?.approach === 'Accept risks with minimal mitigation') score += 10;

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

