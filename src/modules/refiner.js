const { v4: uuidv4 } = require('uuid');

class Refiner {
  constructor(library, logger) {
    this.library = library;
    this.logger = logger;
  }

  refine(parsedScope, psychProfile, budgetTier, domainContext, options = {}) {
    let modules = [...parsedScope.modules];
    let edges = [...parsedScope.edges];

    // Step 1: Prioritize modules
    modules = this.assignPriority(modules, parsedScope.intent, domainContext);

    // Step 2: Apply persona adjustments
    const personaAdjusted = this.applyPersonaLogic(
      modules,
      psychProfile,
      budgetTier
    );
    modules = personaAdjusted.modules;
    edges.push(...personaAdjusted.warnings);

    // Step 3: Budget trimming (only if constraints provided, otherwise calculate from scope)
    const budgetAdjusted = this.applyBudgetConstraints(
      modules,
      budgetTier,
      domainContext,
      options
    );
    modules = budgetAdjusted.modules;
    edges.push(...budgetAdjusted.changes);

    // Step 4: Add implicit modules (domain suggestions)
    const withImplicits = this.addImplicitModules(
      modules,
      parsedScope.intent,
      domainContext
    );
    modules = withImplicits.modules;
    edges.push(...withImplicits.suggestions);

    // Step 5: Assign phases (week-by-week)
    modules = this.assignPhases(modules);

    // Step 6: Calculate feasibility
    const feasibility = this.calculateFeasibility(
      modules,
      edges,
      budgetTier,
      psychProfile
    );

    // Edge Case 7: Zero modules check
    if (modules.filter(m => m.priority !== 'deferred').length === 0) {
      this.logger.warn('All modules deferred—forcing minimum scope');
      modules = this.forceMinimumScope(parsedScope.modules);
    }

    this.logger.info('Refinement complete', {
      modulesCount: modules.length,
      activeModules: modules.filter(m => m.priority !== 'deferred').length,
      feasibility: feasibility.score
    });

    return {
      refinedScope: {
        modules,
        edges,
        feasibility
      }
    };
  }

  assignPriority(modules, intent, domainContext) {
    return modules.map(mod => {
      let priority = mod.priority || 'medium';

      // Critical: Auth, core use-case module
      if (mod.name === 'Auth') priority = 'critical';
      if (intent.useCase && mod.name.toLowerCase().includes(intent.useCase.toLowerCase())) {
        priority = 'critical';
      }

      // High: Dashboard, Reports
      if (['Dashboard', 'Reports'].includes(mod.name)) priority = 'high';

      // Medium: Analytics, Notifications
      if (['Analytics', 'Notifications'].includes(mod.name)) priority = 'medium';

      // Low: Nice-to-haves
      if (['Search', 'Chat'].includes(mod.name)) priority = 'low';

      return { ...mod, priority };
    });
  }

  applyPersonaLogic(modules, psychProfile, budgetTier) {
    const warnings = [];
    let adjusted = [...modules];

    const cap = psychProfile.psychAdjustments.moduleCapSuggestion;

    // Edge Case 1: Cap exceeded
    if (cap && modules.length > cap) {
      const critical = modules.filter(m => m.priority === 'critical');
      const high = modules.filter(m => m.priority === 'high');
      const medium = modules.filter(m => m.priority === 'medium');
      const low = modules.filter(m => m.priority === 'low');

      const keep = [...critical, ...high].slice(0, cap);
      const defer = [...critical, ...high].slice(cap).concat(medium, low);

      adjusted = keep;
      defer.forEach(mod => {
        adjusted.push({
          ...mod,
          priority: 'deferred',
          deferrable: true,
          deferReason: `${psychProfile.primaryPersona} profile: Focus on core ${cap} first`,
          phase: 2
        });
      });

      warnings.push({
        desc: `Trimmed ${defer.length} modules to fit ${psychProfile.primaryPersona} comfort zone (${cap} max)`,
        score: 5,
        source: 'persona_trim'
      });
    }

    // Edge Case 4: Reuse emphasis
    if (psychProfile.psychAdjustments.reuseEmphasis === 'high') {
      const reusableCount = modules.filter(m => {
        const reuse = this.library.getReusableModule(m.name, 'generic');
        return reuse.available;
      }).length;

      if (reusableCount > modules.length * 0.5) {
        warnings.push({
          desc: `${reusableCount} of ${modules.length} modules reusable—safe path for ${psychProfile.primaryPersona}`,
          score: 2,
          source: 'reuse_emphasis'
        });
      }
    }

    return { modules: adjusted, warnings };
  }

  applyBudgetConstraints(modules, budgetTier, domainContext, options = {}) {
    const changes = [];
    let adjusted = [...modules];

    // NEW LOGIC: Only apply constraints if maxBudget or targetDeadline provided
    // Otherwise, calculate timeline/cost from scope (no capping)
    const hasMaxBudget = options.projectDetails?.maxBudget;
    const hasTargetDeadline = options.projectDetails?.targetDeadline;

    if (!hasMaxBudget && !hasTargetDeadline) {
      // No constraints - calculate from scope, return as-is
      this.logger.debug('No budget/deadline constraints - calculating from scope');
      return { modules: adjusted, changes };
    }

    // Estimate current effort from scope
    const totalEffort = modules.reduce((sum, mod) => {
      const complexity = { low: 1, med: 2, high: 4 }[mod.complexity] || 2;
      return sum + complexity;
    }, 0);

    // If maxBudget provided, warn if estimated cost exceeds it (but don't cap)
    if (hasMaxBudget) {
      // Parse budget (e.g., "₹5L", "₹50L", "₹2Cr")
      const budgetStr = options.projectDetails.maxBudget.toLowerCase();
      let budgetAmount = 0;
      
      if (budgetStr.includes('cr') || budgetStr.includes('crore')) {
        const num = parseFloat(budgetStr.replace(/[^0-9.]/g, ''));
        budgetAmount = num * 10000000; // 1 crore = 10M
      } else if (budgetStr.includes('l') || budgetStr.includes('lakh')) {
        const num = parseFloat(budgetStr.replace(/[^0-9.]/g, ''));
        budgetAmount = num * 100000; // 1 lakh = 100K
      } else {
        budgetAmount = parseFloat(budgetStr.replace(/[^0-9.]/g, ''));
      }

      if (budgetAmount > 0) {
        // Rough estimate: ₹5000/day average (will be refined by estimator)
        const estimatedCost = totalEffort * 5000;
        
        if (estimatedCost > budgetAmount) {
          changes.push({
            desc: `⚠️ Estimated cost (₹${Math.round(estimatedCost).toLocaleString('en-IN')}) exceeds budget constraint (${options.projectDetails.maxBudget}). Consider reducing scope or adjusting requirements.`,
            score: 8,
            source: 'budget_constraint',
            warning: true // Advisory, not blocking
          });
        }
      }
    }

    // If targetDeadline provided, warn if timeline seems tight (but don't cap)
    if (hasTargetDeadline) {
      // Rough estimate: 5 days per week
      const estimatedWeeks = Math.ceil(totalEffort / 5);
      
      changes.push({
        desc: `⚠️ Estimated timeline (~${estimatedWeeks} weeks) vs target deadline (${options.projectDetails.targetDeadline}). Timeline will be calculated from scope.`,
        score: 6,
        source: 'deadline_constraint',
        warning: true // Advisory, not blocking
      });
    }

    return { modules: adjusted, changes };
  }

  addImplicitModules(modules, intent, domainContext) {
    const suggestions = [];
    let withImplicits = [...modules];

    // Edge Case 6: Domain implicit modules
    if (intent.industry === 'retail' && intent.useCase === 'payroll') {
      if (!modules.find(m => m.name === 'Reports')) {
        const reportModule = {
          id: uuidv4(),
          name: 'Reports',
          displayName: 'Reports',
          complexity: 'med',
          deps: ['Dashboard'],
          confidence: 0.7,
          source: 'domain_suggested',
          priority: 'medium',
          suggested: true,
          suggestionReason: '90% of retail payrolls add reporting within 6 months'
        };

        withImplicits.push(reportModule);

        suggestions.push({
          desc: reportModule.suggestionReason,
          score: 4,
          source: 'domain_implicit'
        });
      }
    }

    return { modules: withImplicits, suggestions };
  }

  assignPhases(modules) {
    const phased = modules.map(mod => {
      if (mod.phase) return mod;

      if (mod.priority === 'critical') return { ...mod, phase: 1 };
      if (mod.priority === 'high') return { ...mod, phase: 1 };
      if (mod.priority === 'medium') return { ...mod, phase: 2 };
      if (mod.priority === 'low' || mod.suggested) return { ...mod, phase: 3 };

      return { ...mod, phase: 2 };
    });

    // Edge Case 8: Dependency phase conflicts
    phased.forEach(mod => {
      if (mod.deps && mod.deps.length > 0) {
        mod.deps.forEach(depName => {
          const depModule = phased.find(m => m.name === depName);
          if (depModule && depModule.phase > mod.phase) {
            this.logger.warn(`Dependency conflict: ${depName} in phase ${depModule.phase}, needed by ${mod.name} in phase ${mod.phase}`);
            depModule.phase = mod.phase;
          }
        });
      }
    });

    return phased;
  }

  calculateFeasibility(modules, edges, budgetTier, psychProfile) {
    let score = 1.0;

    const highRiskEdges = edges.filter(e => e.score > 7);
    score -= highRiskEdges.length * 0.05;

    // REMOVED: Hardcoded budget module limits - calculate from scope
    // Module count is determined by requirements, not predetermined tiers
    const activeModules = modules.filter(m => m.priority !== 'deferred').length;
    // Keep basic feasibility check but don't penalize based on budget tier
    // (removed budgetModuleLimits check)

    const reusableCount = modules.filter(m => {
      const reuse = this.library.getReusableModule(m.name, 'generic');
      return reuse.available;
    }).length;
    // Safety check: avoid division by zero
    if (modules.length > 0) {
      score += (reusableCount / modules.length) * 0.1;
    }

    const cap = psychProfile.psychAdjustments.moduleCapSuggestion;
    if (!cap || activeModules <= cap) {
      score += 0.05;
    }

    score = Math.max(0.5, Math.min(1.0, score));

    let confidence = 'high';
    if (score < 0.7) confidence = 'medium';
    if (score < 0.6) confidence = 'low';

    const risks = edges
      .filter(e => e.score > 6)
      .map(e => e.desc)
      .slice(0, 3);

    const trimmed = modules
      .filter(m => m.deferrable)
      .map(m => m.displayName);

    const added = modules
      .filter(m => m.suggested)
      .map(m => m.displayName);

    return {
      score: parseFloat(score.toFixed(2)),
      confidence,
      risks,
      trimmedModules: trimmed,
      addedModules: added
    };
  }

  forceMinimumScope(originalModules) {
    this.logger.warn('Forcing minimum scope: Auth + 1 core module');

    const auth = originalModules.find(m => m.name === 'Auth') || {
      id: uuidv4(),
      name: 'Auth',
      displayName: 'Login/Auth',
      complexity: 'med',
      deps: [],
      confidence: 1.0,
      source: 'forced',
      priority: 'critical',
      phase: 1
    };

    const core = originalModules.find(m => m.priority === 'critical' && m.name !== 'Auth') || 
                 originalModules[0] || {
      id: uuidv4(),
      name: 'Dashboard',
      displayName: 'Dashboard',
      complexity: 'med',
      deps: ['Auth'],
      confidence: 0.8,
      source: 'forced',
      priority: 'critical',
      phase: 1
    };

    return [auth, core];
  }
}

module.exports = Refiner;

