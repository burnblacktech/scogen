/**
 * Scenario Generator Module
 * 
 * Purpose: Generate multiple viable paths from baseline scope + constraints
 * Philosophy: Never reject, always show possibilities
 */

class ScenarioGenerator {
  constructor(estimator, refiner, logger) {
    this.estimator = estimator;
    this.refiner = refiner;
    this.logger = logger;
  }

  /**
   * Main entry point: Generate viable scenarios (simplified - 1-3 scenarios)
   * @param {Object} baselineScope - Full scope with all modules
   * @param {Object} baselineEstimate - Baseline cost and timeline
   * @param {Object} constraints - User constraints (maxBudget, targetDeadline, etc.)
   * @param {Object} userPrefs - User preferences (priorityMode, riskTolerance, etc.)
   * @returns {Object} - All scenarios with rankings
   */
  generateScenarios(baselineScope, baselineEstimate, constraints = {}, userPrefs = {}, clientProfile = null) {
    this.logger.info('Generating scenarios (simplified)', { 
      baselineCost: baselineEstimate.cost?.total,
      baselineTimeline: baselineEstimate.timeline?.weeks,
      moduleCount: baselineScope.modules?.length || 0,
      constraints 
    });

    const scenarios = [];
    const moduleCount = baselineScope.modules?.length || 0;
    const timelineWeeks = baselineEstimate.timeline?.weeks || 0;

    // Use client-visible cost if available, otherwise use total
    const clientCost = baselineEstimate.client?.cost || baselineEstimate.cost?.total || 0;
    const baselineCost = clientCost || baselineEstimate.cost?.total || 0;

    // Always add baseline scenario (full scope)
    scenarios.push({
      type: 'baseline',
      name: 'Complete Solution',
      description: 'Everything as specified',
      scope: baselineScope,
      modules: baselineScope.modules || [],
      cost: baselineCost,
      timeline: timelineWeeks,
      fitsConstraints: this.checkFit(
        baselineCost,
        timelineWeeks,
        constraints
      ),
      tradeoffs: {
        pros: ['Complete vision', 'No compromises', 'All features from day 1'],
        cons: ['May exceed budget', 'Longer timeline', 'Higher upfront cost']
      },
      recommendation: constraints.maxBudget && baselineCost > constraints.maxBudget
        ? 'If budget/timeline are flexible'
        : 'Recommended if constraints allow'
    });

    // Add MVP if:
    // - Scope has 5+ modules, OR
    // - Client had previous failure (recommend pilot), OR
    // - Client is cost-focused
    if (moduleCount >= 5 || 
        (clientProfile && (clientProfile.hadFailure || clientProfile.budgetClarity === 'costFocused'))) {
      const mvpScenario = this.generateMVPScenario(
        baselineScope,
        baselineEstimate,
        constraints,
        userPrefs,
        clientProfile
      );
      scenarios.push(mvpScenario);
    }

    // Add fast-track if:
    // - Timeline is 8+ weeks, AND
    // - (High urgency + clear budget) OR (no client profile restrictions)
    if (timelineWeeks >= 8) {
      const shouldAddFastTrack = !clientProfile || 
        (clientProfile.urgency === 'high' && clientProfile.budgetClarity === 'clear');
      
      if (shouldAddFastTrack) {
        scenarios.push(this.generateTeamScenario(
          baselineScope,
          baselineEstimate,
          constraints,
          userPrefs
        ));
      }
    }

    // Add phased delivery if:
    // - Committee decision, OR
    // - High cost (>10L)
    if (clientProfile && (clientProfile.committeeDecision || baselineCost > 1000000)) {
      scenarios.push(this.generatePhasedScenario(
        baselineScope,
        baselineEstimate,
        constraints,
        userPrefs,
        clientProfile
      ));
    }

    // Rank scenarios by fit to constraints and user preferences
    const ranked = this.rankScenarios(scenarios, constraints, userPrefs);

    this.logger.info('Scenarios generated', {
      count: ranked.length,
      types: ranked.map(s => s.type)
    });

    return {
      baseline: {
        scope: baselineScope,
        cost: baselineEstimate.cost?.total || 0,
        timeline: timelineWeeks,
        modules: moduleCount
      },
      constraints: constraints,
      scenarios: ranked,
      recommendation: ranked[0]?.type || 'baseline'
    };
  }

  /**
   * Generate MVP scenario (scope reduction)
   */
  generateMVPScenario(baselineScope, baselineEstimate, constraints, userPrefs) {
    const modules = baselineScope.modules || [];
    
    // Identify critical modules (must-have for MVP)
    const criticalModules = modules.filter(m => 
      m.priority === 'critical' || 
      m.name === 'Auth' || 
      m.name === 'Dashboard'
    );

    // Everything else is deferred
    const deferredModules = modules.filter(m => 
      !criticalModules.includes(m)
    );

    // Calculate MVP estimate
    const mvpScope = {
      ...baselineScope,
      modules: criticalModules
    };

    // Rough estimate: MVP is typically 60-70% of full scope
    const mvpCost = Math.round((baselineEstimate.cost?.total || 0) * 0.65);
    const mvpTimeline = Math.round((baselineEstimate.timeline?.weeks || 0) * 0.65);

    const fitsConstraints = this.checkFit(mvpCost, mvpTimeline, constraints);

    // Adjust name and recommendation based on client profile
    let scenarioName = 'MVP Scope';
    let recommendation = fitsConstraints ? '⭐ Recommended if budget/timeline constrained' : 'Consider if constraints are tight';
    
    if (clientProfile?.hadFailure) {
      scenarioName = 'Pilot Project';
      recommendation = '⭐ Recommended: Reduces risk, builds trust';
    } else if (clientProfile?.budgetClarity === 'costFocused') {
      recommendation = '⭐ Recommended: Fits budget constraints';
    }

    return {
      type: 'mvp',
      name: scenarioName,
      description: clientProfile?.hadFailure ? 'Lower risk pilot to build trust' : 'Essential features within budget',
      scope: mvpScope,
      deferred: deferredModules,
      cost: mvpCost,
      timeline: mvpTimeline,
      fitsConstraints: fitsConstraints,
      gap: {
        budget: constraints.maxBudget ? mvpCost - constraints.maxBudget : 0,
        timeline: constraints.targetDeadline ? mvpTimeline - this.parseDeadline(constraints.targetDeadline) : 0
      },
      tradeoffs: {
        pros: [
          'Fits budget constraints',
          'Faster delivery',
          'Validates market before full build',
          'Lower upfront investment'
        ],
        cons: [
          'Limited features in Phase 1',
          'Manual workarounds needed',
          'Phase 2 required for full vision',
          'Context switching cost between phases'
        ]
      },
      recommendation: recommendation
    };
  }

  /**
   * Generate team expansion scenario (faster delivery)
   */
  generateTeamScenario(baselineScope, baselineEstimate, constraints, userPrefs) {
    const baselineCost = baselineEstimate.cost?.total || 0;
    const baselineTimeline = baselineEstimate.timeline?.weeks || 0;

    // Team expansion: 1 senior + 1 junior
    // Timeline: ÷ 1.8 (parallel work)
    // Cost: × 2.1 (two developers + coordination overhead)
    const teamCost = Math.round(baselineCost * 2.1);
    const teamTimeline = Math.round(baselineTimeline / 1.8);

    const fitsConstraints = this.checkFit(teamCost, teamTimeline, constraints);

    return {
      type: 'fast',
      name: 'Fast-Track (2 developers)',
      description: 'Parallel development',
      scope: baselineScope, // Full scope
      team: '1 senior + 1 junior developer',
      cost: teamCost,
      timeline: teamTimeline,
      fitsConstraints: fitsConstraints,
      gap: {
        budget: constraints.maxBudget ? teamCost - constraints.maxBudget : 0,
        timeline: constraints.targetDeadline ? teamTimeline - this.parseDeadline(constraints.targetDeadline) : 0
      },
      tradeoffs: {
        pros: [
          'Full functionality from day 1',
          'Faster delivery (timeline ÷ 1.8)',
          'Parallel development possible',
          'Reduced single-point-of-failure risk'
        ],
        cons: [
          'Higher cost (× 2.1)',
          'Team coordination overhead (~15%)',
          'Code review and merge time',
          'Requires experienced team lead'
        ]
      },
      alternatives: {
        '2 juniors instead of 1 senior': {
          cost: Math.round(baselineCost * 1.6),
          timeline: Math.round(baselineTimeline / 1.4),
          note: 'Lower cost but longer timeline, quality variance risk'
        }
      },
      recommendation: fitsConstraints ? 'Good if timeline is critical' : 'Budget increase needed'
    };
  }

  /**
   * Generate phased delivery scenario (spread cost)
   */
  generatePhasedScenario(baselineScope, baselineEstimate, constraints, userPrefs) {
    const modules = baselineScope.modules || [];
    const baselineCost = baselineEstimate.cost?.total || 0;
    const baselineTimeline = baselineEstimate.timeline?.weeks || 0;

    // Phase 1: MVP (critical modules)
    const phase1Modules = modules.filter(m => 
      m.priority === 'critical' || m.priority === 'high'
    );
    const phase1Cost = Math.round(baselineCost * 0.6);
    const phase1Timeline = Math.round(baselineTimeline * 0.6);

    // Phase 2: Growth (medium priority)
    const phase2Modules = modules.filter(m => m.priority === 'medium');
    const phase2Cost = Math.round(baselineCost * 0.25);
    const phase2Timeline = Math.round(baselineTimeline * 0.25);

    // Phase 3: Scale (low priority)
    const phase3Modules = modules.filter(m => m.priority === 'low');
    const phase3Cost = Math.round(baselineCost * 0.15);
    const phase3Timeline = Math.round(baselineTimeline * 0.15);

    const phase1Fits = this.checkFit(phase1Cost, phase1Timeline, constraints);

    return {
      type: 'phased',
      name: 'Phased Delivery',
      description: clientProfile?.committeeDecision ? 'Spread cost and approvals over time' : 'Spread cost over time',
      phases: {
        phase1: {
          name: 'Phase 1: MVP',
          modules: phase1Modules,
          cost: phase1Cost,
          timeline: phase1Timeline,
          start: 'Now'
        },
        phase2: {
          name: 'Phase 2: Growth',
          modules: phase2Modules,
          cost: phase2Cost,
          timeline: phase2Timeline,
          start: '+3 months'
        },
        phase3: {
          name: 'Phase 3: Scale',
          modules: phase3Modules,
          cost: phase3Cost,
          timeline: phase3Timeline,
          start: '+6 months'
        }
      },
      totalCost: baselineCost,
      totalTimeline: baselineTimeline,
      initialInvestment: phase1Cost,
      fitsConstraints: phase1Fits,
      gap: {
        budget: constraints.maxBudget ? phase1Cost - constraints.maxBudget : 0,
        timeline: constraints.targetDeadline ? phase1Timeline - this.parseDeadline(constraints.targetDeadline) : 0
      },
      tradeoffs: {
        pros: [
          'Fits current budget constraint',
          'Validates market before full build',
          'Spreads cost over time',
          'Can pivot based on Phase 1 learning',
          'Lower initial investment'
        ],
        cons: [
          'Phase 2/3 costs may increase (market rates)',
          'Context switching cost between phases (~₹15K)',
          'Incomplete functionality until Phase 3',
          'Requires ongoing commitment'
        ]
      },
      recommendation: phase1Fits ? '⭐ Recommended for budget-constrained projects' : 'Phase 1 may need adjustment'
    };
  }

  /**
   * Generate tech optimization scenario (reduce cost)
   */
  generateTechScenario(baselineScope, baselineEstimate, constraints, userPrefs) {
    const baselineCost = baselineEstimate.cost?.total || 0;
    const baselineTimeline = baselineEstimate.timeline?.weeks || 0;

    // Tech optimizations reduce cost but may increase timeline slightly
    // Use Firebase instead of custom backend: -₹1.5L
    // Use UI template instead of custom: -₹80K
    // Use Supabase auth instead of custom: -₹25K
    const savings = 150000 + 80000 + 25000; // ₹2.55L savings
    const optimizedCost = Math.max(0, baselineCost - savings);
    
    // Timeline slightly longer due to learning curve and less control
    const optimizedTimeline = Math.round(baselineTimeline * 1.15);

    const fitsConstraints = this.checkFit(optimizedCost, optimizedTimeline, constraints);

    return {
      type: 'tech',
      name: 'Technical Optimizations (Reduce Cost)',
      scope: baselineScope, // Full scope
      cost: optimizedCost,
      timeline: optimizedTimeline,
      fitsConstraints: fitsConstraints,
      optimizations: [
        {
          name: 'Use Firebase (BaaS)',
          savings: 150000,
          impact: 'No custom backend needed, but ongoing cost ₹60K/year'
        },
        {
          name: 'Use UI Template',
          savings: 80000,
          impact: 'Faster development, less customization flexibility'
        },
        {
          name: 'Use Supabase Auth',
          savings: 25000,
          impact: 'Pre-built auth, vendor dependency'
        }
      ],
      totalSavings: savings,
      ongoingCosts: {
        firebase: 60000, // per year
        note: 'Firebase hosting and services'
      },
      gap: {
        budget: constraints.maxBudget ? optimizedCost - constraints.maxBudget : 0,
        timeline: constraints.targetDeadline ? optimizedTimeline - this.parseDeadline(constraints.targetDeadline) : 0
      },
      tradeoffs: {
        pros: [
          'Lower upfront cost',
          'Faster initial development (templates)',
          'Less infrastructure management',
          'Proven solutions (Firebase, Supabase)'
        ],
        cons: [
          'Ongoing costs (₹60K/year for Firebase)',
          'Less customization flexibility',
          'Vendor lock-in risk',
          'Slightly longer timeline (learning curve)'
        ]
      },
      recommendation: fitsConstraints ? 'Good if cost is primary constraint' : 'May need additional adjustments'
    };
  }

  /**
   * Check if scenario fits constraints
   */
  checkFit(cost, timeline, constraints) {
    if (!constraints.maxBudget && !constraints.targetDeadline) {
      return true; // No constraints = always fits
    }

    const budgetFits = !constraints.maxBudget || cost <= constraints.maxBudget;
    const timelineFits = !constraints.targetDeadline || 
      timeline <= this.parseDeadline(constraints.targetDeadline);

    return budgetFits && timelineFits;
  }

  /**
   * Parse deadline string to weeks
   */
  parseDeadline(deadline) {
    if (!deadline) return null;
    
    const str = deadline.toLowerCase();
    
    // Try to extract number
    const match = str.match(/(\d+)/);
    if (!match) return null;
    
    const num = parseInt(match[1]);
    
    if (str.includes('week')) return num;
    if (str.includes('month')) return num * 4;
    if (str.includes('day')) return Math.ceil(num / 5);
    
    return num; // Default assume weeks
  }

  /**
   * Rank scenarios by fit to constraints and user preferences
   */
  rankScenarios(scenarios, constraints, userPrefs) {
    return scenarios.map(scenario => {
      let score = 0;

      // Fit to constraints (higher score if fits)
      if (scenario.fitsConstraints) {
        score += 100;
      } else {
        // Partial credit based on how close
        const budgetGap = constraints.maxBudget ? 
          Math.abs(scenario.cost - constraints.maxBudget) / constraints.maxBudget : 0;
        const timelineGap = constraints.targetDeadline ?
          Math.abs(scenario.timeline - this.parseDeadline(constraints.targetDeadline)) / this.parseDeadline(constraints.targetDeadline) : 0;
        
        score += 50 * (1 - Math.min(budgetGap + timelineGap, 1));
      }

      // User preferences
      if (userPrefs.priorityMode === 'mvp' && scenario.type === 'mvp') score += 20;
      if (userPrefs.priorityMode === 'complete' && scenario.type === 'baseline') score += 20;
      if (userPrefs.deliveryMode === 'phased' && scenario.type === 'phased') score += 20;

      // Cost efficiency (lower cost = higher score if fits)
      if (scenario.fitsConstraints) {
        const costEfficiency = 1 - (scenario.cost / (constraints.maxBudget || scenario.cost));
        score += costEfficiency * 10;
      }

      return { ...scenario, score };
    }).sort((a, b) => b.score - a.score);
  }
}

module.exports = ScenarioGenerator;

