class ScopeReviewer {
  constructor(library, db, logger) {
    this.library = library;
    this.db = db;
    this.logger = logger;
    this.completenessRules = this.loadCompletenessRules();
    this.accuracyRules = this.loadAccuracyRules();
    this.riskPatterns = this.loadRiskPatterns();
  }

  /**
   * Main review method - analyzes scope and generates review report
   */
  async reviewScope(scope, estimate, domainContext) {
    const modulesList = scope.modules || scope.refinedScope?.modules || [];
    this.logger.info('Starting scope review', { 
      modules: modulesList.length,
      domain: domainContext?.industry || 'generic'
    });

    // 1. Completeness check
    const completeness = this.checkCompleteness(scope, estimate, domainContext);

    // 2. Accuracy check (compare with historical data)
    const accuracy = await this.checkAccuracy(scope, estimate, domainContext);

    // 3. Risk assessment
    const risks = this.assessRisks(scope, estimate, domainContext);

    // 4. Generate recommendations
    const recommendations = this.generateRecommendations(completeness, accuracy, risks);

    // 5. Calculate adjusted estimates
    const adjustedEstimate = this.calculateAdjustments(estimate, recommendations);

    return {
      scores: {
        completeness: completeness.score,
        accuracy: accuracy.score,
        riskLevel: risks.level
      },
      issues: {
        completeness: completeness.issues,
        accuracy: accuracy.issues,
        risks: risks.items
      },
      recommendations: recommendations,
      adjustedEstimate: adjustedEstimate,
      originalEstimate: estimate,
      requiresReview: this.needsHumanReview(completeness, accuracy, risks)
    };
  }

  /**
   * Completeness Check - Are we missing critical components?
   */
  checkCompleteness(scope, estimate, domainContext) {
    const issues = [];
    let score = 100;
    
    // Handle different scope structures
    const modulesList = scope.modules || scope.refinedScope?.modules || [];
    if (!Array.isArray(modulesList) || modulesList.length === 0) {
      this.logger.warn('No modules found in scope for completeness check');
      return { score: 0, issues: [{ type: 'error', severity: 'high', message: 'No modules detected in scope' }], passed: false };
    }
    
    const modules = modulesList.map(m => (m.name || m.displayName || '').toLowerCase());

    // Rule 1: Auth required for any user-facing app
    if (!this.hasModule(modules, ['auth', 'authentication', 'login'])) {
      issues.push({
        type: 'missing_module',
        severity: 'high',
        module: 'Authentication',
        message: 'No authentication module found. Required for user management.',
        recommendation: 'Add "Auth" module with login/logout/password reset',
        impact: { cost: 12000, days: 2 }
      });
      score -= 15;
    }

    // Rule 2: Database required for data storage
    if (!this.hasModule(modules, ['database', 'datamodel', 'storage'])) {
      issues.push({
        type: 'missing_module',
        severity: 'medium',
        module: 'Database',
        message: 'No database module explicitly mentioned.',
        recommendation: 'Add database schema design phase',
        impact: { cost: 8000, days: 1.5 }
      });
      score -= 10;
    }

    // Rule 3: Payment systems need security
    if (this.hasModule(modules, ['payment', 'billing', 'transaction'])) {
      if (!this.hasModule(modules, ['security', 'encryption', 'ssl'])) {
        issues.push({
          type: 'missing_requirement',
          severity: 'critical',
          module: 'Security',
          message: 'Payment processing requires enhanced security measures.',
          recommendation: 'Add security audit and PCI-DSS compliance',
          impact: { cost: 25000, days: 4 }
        });
        score -= 20;
      }
    }

    // Rule 4: User roles for multi-user systems
    if (this.hasModule(modules, ['dashboard', 'admin'])) {
      if (!this.hasModule(modules, ['role', 'permission', 'rbac'])) {
        issues.push({
          type: 'missing_module',
          severity: 'medium',
          module: 'Role Management',
          message: 'Multi-user system should have role-based access control.',
          recommendation: 'Add role management module (admin, user, manager)',
          impact: { cost: 15000, days: 3 }
        });
        score -= 10;
      }
    }

    // Rule 5: Testing phase
    if (!this.hasModule(modules, ['testing', 'qa', 'test'])) {
      const totalCost = estimate?.cost?.total || estimate?.cost?.breakdown?.total || 0;
      const totalDays = estimate?.timeline?.days || estimate?.timeline?.weeks * 5 || 0;
      
      issues.push({
        type: 'missing_phase',
        severity: 'medium',
        module: 'Testing',
        message: 'No testing phase mentioned in scope.',
        recommendation: 'Add testing & QA phase (15-20% of dev time)',
        impact: { 
          cost: totalCost * 0.15, 
          days: totalDays * 0.15 
        }
      });
      score -= 10;
    }

    // Domain-specific rules
    if (domainContext.industry === 'retail') {
      if (this.hasModule(modules, ['payroll'])) {
        if (!this.hasModule(modules, ['taxcalculation', 'compliance', 'tax'])) {
          issues.push({
            type: 'missing_requirement',
            severity: 'high',
            module: 'Tax Compliance',
            message: 'Payroll systems must handle tax calculations (GST, TDS).',
            recommendation: 'Add tax calculation engine with Indian compliance',
            impact: { cost: 20000, days: 3.5 }
          });
          score -= 15;
        }
      }
    }

    return {
      score: Math.max(score, 0),
      issues: issues,
      passed: score >= 80
    };
  }

  /**
   * Accuracy Check - Are estimates realistic?
   */
  async checkAccuracy(scope, estimate, domainContext) {
    const issues = [];
    let score = 100;

    // Handle different scope structures
    const modulesList = scope.modules || scope.refinedScope?.modules || [];
    const totalCost = estimate?.cost?.total || estimate?.cost?.breakdown?.total || 0;
    const totalDays = estimate?.timeline?.days || estimate?.timeline?.weeks * 5 || 0;

    // 1. Compare with historical data
    const historicalComparison = await this.compareWithHistory(scope, estimate, domainContext);
    if (historicalComparison.variance > 0.3) {  // >30% difference
      issues.push({
        type: 'estimate_variance',
        severity: 'high',
        message: `Estimate differs significantly from historical data (${Math.round(historicalComparison.variance * 100)}% variance)`,
        details: historicalComparison,
        recommendation: `Review estimates for: ${historicalComparison.outlierModules.join(', ') || 'overall scope'}`,
        impact: { 
          cost: historicalComparison.adjustedCost - totalCost, 
          days: historicalComparison.adjustedDays - totalDays 
        }
      });
      score -= 20;
    }

    // 2. Check effort per module against baselines
    for (const module of modulesList) {
      const baseline = this.library.getBaseline(domainContext.industry || 'generic');
      if (baseline && baseline.module_efforts) {
        const baselineEffort = baseline.module_efforts[module.name];
        if (baselineEffort) {
          // Estimate module effort from complexity
          const { getComplexityDays } = require('../utils/module-utils');
          const moduleEffort = getComplexityDays(module.complexity);
          const difference = Math.abs(moduleEffort - baselineEffort) / baselineEffort;
          
          if (difference > 0.5) {  // >50% difference
            issues.push({
              type: 'module_effort_mismatch',
              severity: 'medium',
              module: module.name,
              message: `${module.name} effort (${moduleEffort} days) differs from baseline (${baselineEffort} days)`,
              recommendation: `Review ${module.name} scope or adjust to ${baselineEffort} days`,
              impact: { 
                cost: (baselineEffort - moduleEffort) * 8 * 800, 
                days: baselineEffort - moduleEffort 
              }
            });
            score -= 10;
          }
        }
      }
    }

    // 3. Check timeline vs complexity
    const complexityScore = this.calculateComplexityScore({ modules: modulesList });
    const timelineRatio = totalDays > 0 ? complexityScore / totalDays : 0;
    
    if (timelineRatio > 2) {  // Too aggressive timeline
      issues.push({
        type: 'timeline_risk',
        severity: 'high',
        message: 'Timeline appears too aggressive for project complexity',
        details: { 
          complexityScore, 
          estimatedDays: totalDays, 
          recommendedDays: Math.round(complexityScore * 0.8) 
        },
        recommendation: `Consider extending timeline to ${Math.round(complexityScore * 0.8)} days`,
        impact: { days: Math.round(complexityScore * 0.8) - totalDays }
      });
      score -= 15;
    }

    // 4. Check resource allocation
    const resourceCheck = this.validateResourceAllocation({ modules: modulesList }, estimate);
    if (!resourceCheck.valid) {
      issues.push({
        type: 'resource_mismatch',
        severity: 'medium',
        message: resourceCheck.message,
        recommendation: resourceCheck.recommendation,
        impact: resourceCheck.impact
      });
      score -= 10;
    }

    return {
      score: Math.max(score, 0),
      issues: issues,
      passed: score >= 75
    };
  }

  /**
   * Risk Assessment - What can go wrong?
   */
  assessRisks(scope, estimate, domainContext) {
    const risks = [];
    let riskScore = 0;

    // Handle different scope structures
    const modulesList = scope.modules || scope.refinedScope?.modules || [];
    const totalCost = estimate?.cost?.total || estimate?.cost?.breakdown?.total || 0;
    const totalDays = estimate?.timeline?.days || estimate?.timeline?.weeks * 5 || 0;

    // 1. Technical risks
    const techRisks = this.identifyTechnicalRisks({ modules: modulesList });
    risks.push(...techRisks);
    riskScore += techRisks.reduce((sum, r) => sum + r.score, 0);

    // 2. Timeline risks
    if (totalDays < 14) {
      risks.push({
        category: 'timeline',
        severity: 'medium',
        score: 5,
        description: 'Tight timeline (<2 weeks) increases execution risk',
        mitigation: 'Add buffer or reduce scope for MVP'
      });
      riskScore += 5;
    }

    // 3. Budget risks
    const budgetRiskThreshold = this.library?.config?.get?.('scopeReview.budgetRiskThreshold') || 50000;
    if (totalCost < budgetRiskThreshold) {
      risks.push({
        category: 'budget',
        severity: 'low',
        score: 3,
        description: 'Low budget may limit quality or features',
        mitigation: 'Prioritize core features, defer nice-to-haves'
      });
      riskScore += 3;
    }

    // 4. Integration risks
    const integrations = modulesList.filter(m => {
      const name = (m.name || m.displayName || '').toLowerCase();
      return name.includes('integration') || name.includes('api');
    });
    if (integrations.length > 0) {
      risks.push({
        category: 'integration',
        severity: 'medium',
        score: 6,
        description: `${integrations.length} third-party integration(s) - potential API changes or downtime`,
        mitigation: 'Build fallback mechanisms, add API documentation validation phase'
      });
      riskScore += 6;
    }

    // 5. Scope creep risk
    if (!modulesList.some(m => m.priority === 'critical')) {
      risks.push({
        category: 'scope',
        severity: 'medium',
        score: 5,
        description: 'No clear prioritization - potential for scope creep',
        mitigation: 'Define MVP clearly, lock Phase 1 scope'
      });
      riskScore += 5;
    }

    // Determine risk level
    let level = 'low';
    if (riskScore > 15) level = 'high';
    else if (riskScore > 8) level = 'medium';

    return {
      level: level,
      score: riskScore,
      items: risks
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(completeness, accuracy, risks) {
    const recommendations = [];

    // From completeness issues
    completeness.issues.forEach(issue => {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        recommendations.push({
          priority: 'high',
          action: 'add_module',
          module: issue.module,
          reason: issue.message,
          impact: issue.impact
        });
      }
    });

    // From accuracy issues
    accuracy.issues.forEach(issue => {
      if (issue.type === 'estimate_variance') {
        recommendations.push({
          priority: 'high',
          action: 'adjust_estimate',
          details: issue.details,
          reason: issue.message,
          impact: issue.impact
        });
      }
    });

    // From risks
    if (risks.level === 'high') {
      recommendations.push({
        priority: 'high',
        action: 'add_buffer',
        reason: 'High risk level detected',
        impact: { cost: 0, days: Math.ceil(risks.score * 0.5) }
      });
    }

    return recommendations;
  }

  /**
   * Calculate adjusted estimates based on recommendations
   */
  calculateAdjustments(originalEstimate, recommendations) {
    const totalCost = originalEstimate?.cost?.total || originalEstimate?.cost?.breakdown?.total || 0;
    const totalDays = originalEstimate?.timeline?.days || originalEstimate?.timeline?.weeks * 5 || 0;
    
    let adjustedCost = totalCost;
    let adjustedDays = totalDays;

    recommendations.forEach(rec => {
      if (rec.impact) {
        adjustedCost += rec.impact.cost || 0;
        adjustedDays += rec.impact.days || 0;
      }
    });

    return {
      cost: {
        original: totalCost,
        adjusted: Math.round(adjustedCost),
        delta: Math.round(adjustedCost - totalCost)
      },
      timeline: {
        original: totalDays,
        adjusted: Math.round(adjustedDays),
        delta: Math.round(adjustedDays - totalDays)
      }
    };
  }

  /**
   * Determine if human review is required
   */
  needsHumanReview(completeness, accuracy, risks) {
    return (
      completeness.score < 80 ||
      accuracy.score < 75 ||
      risks.level === 'high' ||
      completeness.issues.some(i => i.severity === 'critical') ||
      accuracy.issues.some(i => i.severity === 'high')
    );
  }

  // Helper methods
  hasModule(modules, keywords) {
    return modules.some(m => 
      keywords.some(k => m.includes(k.toLowerCase()))
    );
  }

  async compareWithHistory(scope, estimate, domainContext) {
    // Get historical projects from database
    try {
      const modulesList = scope.modules || scope.refinedScope?.modules || [];
      const totalCost = estimate?.cost?.total || estimate?.cost?.breakdown?.total || 0;
      const totalDays = estimate?.timeline?.days || estimate?.timeline?.weeks * 5 || 0;
      
      const historical = this.db.getAllProjects ? this.db.getAllProjects() : [];
      
      // Optimize: Single pass to filter, parse, and calculate sums
      let filteredCount = 0;
      let costSum = 0;
      let daysSum = 0;
      const filtered = [];
      
      for (const p of historical) {
        // Early exit if industry doesn't match
        if (p.industry !== domainContext.industry) continue;
        
        const pModules = p.modules ? (Array.isArray(p.modules) ? p.modules : JSON.parse(p.modules || '[]')) : [];
        
        // Check module count similarity
        if (Math.abs(pModules.length - modulesList.length) <= 2) {
          filtered.push(p);
          filteredCount++;
          costSum += (p.actual_cost || 0);
          daysSum += (p.actual_days || 0);
        }
      }

      if (filteredCount === 0) {
        return { 
          variance: 0, 
          adjustedCost: totalCost, 
          adjustedDays: totalDays,
          outlierModules: []
        };
      }

      const avgCost = costSum / filteredCount;
      const avgDays = daysSum / filteredCount;

      const estimatedCost = totalCost;
      const estimatedDays = totalDays;

      const costVariance = estimatedCost > 0 ? Math.abs(estimatedCost - avgCost) / estimatedCost : 0;
      const daysVariance = estimatedDays > 0 ? Math.abs(estimatedDays - avgDays) / estimatedDays : 0;

      // Identify outlier modules by comparing individual module estimates with historical patterns
      const outlierModules = this.identifyOutlierModules(modulesList, filtered, domainContext);

      return {
        variance: Math.max(costVariance, daysVariance),
        adjustedCost: avgCost,
        adjustedDays: avgDays,
        historicalAvg: { cost: avgCost, days: avgDays },
        outlierModules: outlierModules
      };
    } catch (error) {
      this.logger.warn('Historical comparison failed', { error: error.message });
      return { 
        variance: 0, 
        adjustedCost: estimate.cost?.total || 0, 
        adjustedDays: estimate.timeline?.days || 0,
        outlierModules: []
      };
    }
  }

  calculateComplexityScore(scope) {
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    const modulesList = scope.modules || scope.refinedScope?.modules || [];
    return modulesList.reduce((sum, m) => sum + (weights[m.complexity] || 2), 0);
  }

  validateResourceAllocation(scope, estimate) {
    // Check if resource allocation matches module complexity
    const modulesList = scope.modules || scope.refinedScope?.modules || [];
    const criticalModules = modulesList.filter(m => m.complexity === 'critical' || m.complexity === 'high');
    const totalDays = estimate?.timeline?.days || estimate?.timeline?.weeks * 5 || 0;
    const totalCost = estimate?.cost?.total || estimate?.cost?.breakdown?.total || 0;

    if (criticalModules.length > 0 && totalDays > 0) {
      const dailyRate = totalCost / totalDays;
      const seniorResourceRate = this.library?.config?.get?.('scopeReview.seniorResourceDailyRate') || 5000;
      if (dailyRate < seniorResourceRate) {
        return {
          valid: false,
          message: `Critical modules require senior resources (avg ₹${seniorResourceRate.toLocaleString('en-IN')}+/day)`,
          recommendation: 'Allocate senior developers for critical modules',
          impact: { cost: criticalModules.length * 3 * seniorResourceRate }
        };
      }
    }

    return { valid: true };
  }

  identifyTechnicalRisks(scope) {
    const risks = [];
    const modulesList = scope.modules || scope.refinedScope?.modules || [];

    modulesList.forEach(module => {
      const name = (module.name || module.displayName || '').toLowerCase();

      if (name.includes('payment') || name.includes('transaction')) {
        risks.push({
          category: 'technical',
          severity: 'high',
          score: 8,
          module: module.name || module.displayName,
          description: 'Payment processing requires security compliance and testing',
          mitigation: 'Use established payment gateway, add extensive testing'
        });
      }

      if (name.includes('realtime') || name.includes('websocket')) {
        risks.push({
          category: 'technical',
          severity: 'medium',
          score: 6,
          module: module.name || module.displayName,
          description: 'Real-time features add complexity (scaling, state management)',
          mitigation: 'Use proven libraries, add load testing'
        });
      }
    });

    return risks;
  }

  loadCompletenessRules() {
    // Load completeness rules from configuration or database
    // Currently using hardcoded rules; can be extended to load from config/db
    // Future enhancement: Store rules in database for dynamic updates
    try {
      // Try to load from database if available
      if (this.db && this.db.getCompletenessRules) {
        const rules = this.db.getCompletenessRules();
        if (rules && Object.keys(rules).length > 0) {
          return rules;
        }
      }
      
      // Try to load from config if available
      if (this.library?.config) {
        const configMinModules = this.library.config.get('scopeReview.minModules');
        const configRequiredCategories = this.library.config.get('scopeReview.requiredCategories');
        
        if (configMinModules !== undefined || configRequiredCategories !== undefined) {
          return {
            minModules: configMinModules ?? 3,
            requiredCategories: configRequiredCategories ?? ['authentication', 'data-storage'],
            domainSpecific: {
              'ecommerce': ['payment', 'cart', 'catalog'],
              'fintech': ['security', 'compliance', 'audit'],
              'healthcare': ['privacy', 'compliance', 'data-encryption']
            }
          };
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load completeness rules from database/config, using defaults', {
        error: error.message
      });
    }
    
    // Default rules (can be moved to config file)
    return {
      minModules: 3,
      requiredCategories: ['authentication', 'data-storage'],
      domainSpecific: {
        'ecommerce': ['payment', 'cart', 'catalog'],
        'fintech': ['security', 'compliance', 'audit'],
        'healthcare': ['privacy', 'compliance', 'data-encryption']
      }
    };
  }

  loadAccuracyRules() {
    // Load accuracy rules from configuration or database
    // Currently using hardcoded rules; can be extended to load from config/db
    try {
      if (this.db && this.db.getAccuracyRules) {
        const rules = this.db.getAccuracyRules();
        if (rules && Object.keys(rules).length > 0) {
          return rules;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load accuracy rules from database, using defaults', {
        error: error.message
      });
    }
    
    // Default rules
    return {
      varianceThreshold: 0.3, // 30% variance is acceptable
      costVarianceWeight: 0.6,
      timelineVarianceWeight: 0.4
    };
  }

  loadRiskPatterns() {
    // Load risk patterns from configuration or database
    try {
      if (this.db && this.db.getRiskPatterns) {
        const patterns = this.db.getRiskPatterns();
        if (patterns && Object.keys(patterns).length > 0) {
          return patterns;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load risk patterns from database, using defaults', {
        error: error.message
      });
    }
    
    // Default risk patterns
    return {
      highRiskKeywords: ['payment', 'transaction', 'security', 'compliance'],
      mediumRiskKeywords: ['realtime', 'websocket', 'integration', 'third-party'],
      complexityMultipliers: {
        'critical': 1.5,
        'high': 1.3,
        'medium': 1.0,
        'low': 0.8
      }
    };
  }

  /**
   * Identify modules with estimates that significantly differ from historical patterns
   * @param {Array} modules - Current module estimates
   * @param {Array} historicalProjects - Historical project data
   * @param {Object} domainContext - Domain context
   * @returns {Array} - List of outlier module names
   */
  identifyOutlierModules(modules, historicalProjects, domainContext) {
    const outliers = [];
    // Load threshold from config
    const varianceThreshold = this.library?.config?.get?.('scopeReview.outlierVarianceThreshold') || 0.4; // 40% variance threshold for outliers

    if (!modules || modules.length === 0 || !historicalProjects || historicalProjects.length === 0) {
      return outliers;
    }

    // Extract module-level estimates from historical projects (optimized single pass)
    const historicalModuleData = {};
    for (const project of historicalProjects) {
      try {
        const projectModules = project.modules 
          ? (Array.isArray(project.modules) ? project.modules : JSON.parse(project.modules || '[]'))
          : [];
        
        for (const mod of projectModules) {
          const modName = (mod.name || mod.displayName || '').toLowerCase();
          if (!historicalModuleData[modName]) {
            historicalModuleData[modName] = { costs: [], timelines: [] };
          }
          if (mod.estimatedCost) historicalModuleData[modName].costs.push(mod.estimatedCost);
          if (mod.estimatedDays) historicalModuleData[modName].timelines.push(mod.estimatedDays);
        }
      } catch (error) {
        this.logger.warn('Failed to parse historical module data', { error: error.message });
      }
    }

    // Compare current modules with historical data (optimized)
    for (const module of modules) {
      const modName = (module.name || module.displayName || '').toLowerCase();
      const historical = historicalModuleData[modName];
      
      if (!historical || historical.costs.length === 0) {
        continue; // No historical data for this module
      }

      // Calculate averages in single pass
      let costSum = 0;
      let timelineSum = 0;
      for (const cost of historical.costs) {
        costSum += cost;
      }
      for (const timeline of historical.timelines) {
        timelineSum += timeline;
      }
      
      const avgHistoricalCost = costSum / historical.costs.length;
      const avgHistoricalTimeline = historical.timelines.length > 0
        ? timelineSum / historical.timelines.length
        : 0;

      const currentCost = module.estimatedCost || module.cost || 0;
      const currentTimeline = module.estimatedDays || module.timeline?.days || 0;

      // Calculate variance
      const costVariance = avgHistoricalCost > 0 
        ? Math.abs(currentCost - avgHistoricalCost) / avgHistoricalCost 
        : 0;
      const timelineVariance = avgHistoricalTimeline > 0
        ? Math.abs(currentTimeline - avgHistoricalTimeline) / avgHistoricalTimeline
        : 0;

      // Flag as outlier if variance exceeds threshold
      if (costVariance > varianceThreshold || timelineVariance > varianceThreshold) {
        outliers.push({
          name: module.name || module.displayName,
          costVariance: costVariance,
          timelineVariance: timelineVariance,
          currentEstimate: { cost: currentCost, timeline: currentTimeline },
          historicalAvg: { cost: avgHistoricalCost, timeline: avgHistoricalTimeline }
        });
      }
    }

    return outliers;
  }
}

module.exports = ScopeReviewer;

