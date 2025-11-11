class Estimator {
  constructor(library, logger) {
    this.library = library;
    this.logger = logger;
    
    this.HOURLY_RATES = {
      retail: 80,
      saas: 100,
      healthcare: 120,
      finance: 110,
      education: 75,
      generic: 85
    };

    this.BUDGET_CAPS = {
      tight: 500,
      moderate: 2000,
      flexible: 10000
    };

    this.COMPLEXITY_DAYS = {
      low: 1,
      med: 2,
      high: 4
    };
  }

  /**
   * Calculate estimate from technical breakdown (component-level)
   */
  calculateFromTechnicalBreakdown(technicalBreakdown, refinedScope, budgetTier, psychProfile, domainContext) {
    this.logger.info('Using technical breakdown for estimation');
    
    let totalEffort = 0;
    const componentEfforts = [];
    
    // Sum component efforts
    technicalBreakdown.technicalBreakdowns.forEach(breakdown => {
      if (breakdown.technicalComponents) {
        breakdown.technicalComponents.forEach(component => {
          const effort = component.adjustedEffort || component.baseEffort || 0;
          const hourlyRate = this.getHourlyRate(domainContext?.industry || 'generic');
          const dailyRate = hourlyRate * 8;
          const cost = effort * dailyRate;
          
          componentEfforts.push({
            businessModule: breakdown.businessModule,
            component: component.component,
            layer: component.layer,
            effort: effort,
            cost: Math.round(cost),
            complexity: component.complexity
          });
          
          totalEffort += effort;
        });
      }
    });
    
    // Apply persona buffers
    const personaBuffer = psychProfile?.psychAdjustments?.timelineBuffer || 0;
    const adjustedEffort = totalEffort * (1 + personaBuffer);
    
    // Calculate costs
    const hourlyRate = this.getHourlyRate(domainContext?.industry || 'generic');
    const dailyRate = hourlyRate * 8;
    const baseCost = totalEffort * dailyRate;
    const adjustedCost = adjustedEffort * dailyRate;
    
    // Calculate timeline
    const weeks = Math.ceil(adjustedEffort / 5); // 5 days per week
    const days = Math.ceil(adjustedEffort);
    
    // Calculate confidence based on technical breakdown completeness
    const confidence = this.calculateTechnicalConfidence(technicalBreakdown);
    
    return {
      estimate: {
        timeline: {
          days: days,
          weeks: weeks,
          months: Math.ceil(weeks / 4),
          range: {
            min: Math.ceil(adjustedEffort * 0.8),
            max: Math.ceil(adjustedEffort * 1.2)
          }
        },
        cost: {
          total: Math.round(adjustedCost),
          breakdown: {
            base: Math.round(baseCost),
            personaBuffer: Math.round(adjustedCost - baseCost),
            total: Math.round(adjustedCost)
          },
          byComponent: componentEfforts
        },
        savings: {
          total: 0,
          message: 'Component-level estimation (no reuse calculated)'
        },
        effort: {
          total: Math.round(adjustedEffort * 10) / 10,
          base: Math.round(totalEffort * 10) / 10,
          personaBuffer: Math.round((adjustedEffort - totalEffort) * 10) / 10,
          byComponent: componentEfforts.map(c => ({
            component: c.component,
            effort: c.effort
          }))
        },
        confidence: {
          overall: confidence,
          timeline: confidence,
          cost: confidence,
          message: `Technical breakdown confidence: ${Math.round(confidence * 100)}%`
        },
        method: 'technical_breakdown',
        componentCount: technicalBreakdown.totalComponents || 0
      }
    };
  }

  /**
   * Calculate confidence based on technical breakdown quality
   */
  calculateTechnicalConfidence(technicalBreakdown) {
    if (!technicalBreakdown || !technicalBreakdown.technicalBreakdowns) {
      return 0.6; // Default confidence
    }
    
    let confidence = 0.7; // Base confidence for technical breakdown
    
    // Increase confidence if all modules have breakdowns
    const breakdowns = technicalBreakdown.technicalBreakdowns || [];
    if (breakdowns.length > 0) {
      const avgComponentsPerModule = technicalBreakdown.totalComponents / breakdowns.length;
      if (avgComponentsPerModule >= 3) {
        confidence += 0.1; // More components = more detailed = higher confidence
      }
    }
    
    // Increase confidence if code structure is detailed
    if (technicalBreakdown.codeStructure) {
      const totalFiles = Object.values(technicalBreakdown.codeStructure)
        .reduce((sum, files) => sum + files.length, 0);
      if (totalFiles > 10) {
        confidence += 0.1;
      }
    }
    
    return Math.min(0.95, confidence); // Cap at 95%
  }

  estimate(refinedScope, budgetTier, psychProfile, domainContext, generatedPlan, technicalBreakdown = null) {
    // If technical breakdown is available, use component-level calculation
    if (technicalBreakdown && technicalBreakdown.technicalBreakdowns) {
      return this.calculateFromTechnicalBreakdown(technicalBreakdown, refinedScope, budgetTier, psychProfile, domainContext);
    }

    // Fallback to module-level calculation
    const timeline = this.calculateTimeline(
      refinedScope.modules,
      psychProfile,
      domainContext,
      generatedPlan,
      budgetTier
    );

    const cost = this.calculateCost(
      timeline,
      refinedScope.modules,
      budgetTier,
      domainContext
    );

    const savings = this.calculateSavings(
      refinedScope.modules,
      domainContext,
      cost.breakdown.base
    );

    const confidence = this.calculateConfidence(
      refinedScope.feasibility,
      domainContext,
      refinedScope.modules
    );

    confidence.overall = Math.min(confidence.overall, refinedScope.feasibility.score);

    const comparisons = this.compareWithDomain(
      timeline,
      cost,
      domainContext,
      budgetTier
    );

    return {
      estimate: {
        timeline,
        cost,
        savings,
        hourly_rate: this.getHourlyRate(domainContext.industry || 'generic'),
        confidence,
        comparisons
      }
    };
  }

  calculateTimeline(modules, psychProfile, domainContext, generatedPlan, budgetTier) {
    const activeModules = modules.filter(m => m.priority !== 'deferred');

    let baseDays = 0;
    
    activeModules.forEach(mod => {
      let moduleEffort = this.COMPLEXITY_DAYS[mod.complexity] || 2;

      if (mod.reusable) {
        const reuse = this.library.getReusableModule(mod.name, domainContext.industry || 'generic');
        if (reuse.available) {
          moduleEffort *= 0.5;
        }
      }

      moduleEffort = Math.max(1, moduleEffort);

      if (mod.deps && mod.deps.length > 0) {
        const depChainDepth = this.calculateDepChainDepth(mod, modules);
        if (depChainDepth > 2) {
          const integrationTax = (depChainDepth - 2) * 0.1;
          moduleEffort *= (1 + integrationTax);
        }
      }

      baseDays += moduleEffort;
    });

    baseDays += 3; // Setup
    baseDays += 2; // Integration/deploy

    const buffer = psychProfile.psychAdjustments.timelineBuffer || 0;
    let adjustedDays = baseDays * (1 + buffer);

    // REMOVED: Hardcoded budget caps - timeline is calculated from scope
    // Budget constraints are now advisory warnings, not hard caps
    
    const min = Math.ceil(adjustedDays * 0.85);
    const max = Math.ceil(adjustedDays * 1.15);

    return {
      days: Math.ceil(adjustedDays),
      weeks: Math.ceil(adjustedDays / 5),
      months: Math.ceil(adjustedDays / 20), // ~20 working days per month
      range: { min, max },
      confidence: this.getTimelineConfidence(domainContext)
    };
  }

  calculateDepChainDepth(module, allModules, depth = 0, visited = new Set()) {
    if (visited.has(module.name)) return depth;
    visited.add(module.name);

    if (!module.deps || module.deps.length === 0) return depth;

    const depthScores = module.deps.map(depName => {
      const depModule = allModules.find(m => m.name === depName);
      if (!depModule) return depth + 1;
      return this.calculateDepChainDepth(depModule, allModules, depth + 1, visited);
    });

    return Math.max(...depthScores);
  }

  calculateCost(timeline, modules, budgetTier, domainContext) {
    const hourlyRate = this.getHourlyRate(domainContext.industry || 'generic');
    const hoursPerDay = 6;

    const baseCost = timeline.days * hoursPerDay * hourlyRate;

    const reusableModules = modules.filter(m => {
      if (!m.reusable) return false;
      const reuse = this.library.getReusableModule(m.name, domainContext.industry || 'generic');
      return reuse.available;
    });

    let reuseDiscount = 0;
    reusableModules.forEach(mod => {
      const reuse = this.library.getReusableModule(mod.name, domainContext.industry || 'generic');
      const moduleBaseCost = this.COMPLEXITY_DAYS[mod.complexity] * hoursPerDay * hourlyRate;
      reuseDiscount += moduleBaseCost * 0.5;
    });

    let complexityAdjustment = 0;
    if (domainContext.industry === 'healthcare' || domainContext.industry === 'finance') {
      complexityAdjustment = baseCost * 0.2;
    }

    let riskBuffer = 0;
    const highRiskEdges = modules.flatMap(m => m.edges || []).filter(e => e && e.score > 7);
    if (highRiskEdges.length > 0) {
      riskBuffer = baseCost * 0.1;
    }

    let totalCost = baseCost - reuseDiscount + complexityAdjustment + riskBuffer;

    const budgetTierKey = budgetTier || 'moderate';
    const budgetCap = this.BUDGET_CAPS[budgetTierKey];
    let budgetFit = 'within_cap';
    let cappedAt = null;

    if (totalCost > budgetCap) {
      budgetFit = 'exceeds_cap';
      cappedAt = budgetCap;
    }

    return {
      total: Math.ceil(totalCost),
      currency: 'INR',
      breakdown: {
        base: Math.ceil(baseCost),
        reuse_discount: -Math.ceil(reuseDiscount),
        complexity_adjustment: Math.ceil(complexityAdjustment),
        risk_buffer: Math.ceil(riskBuffer)
      },
      budgetFit,
      cappedAt
    };
  }

  calculateSavings(modules, domainContext, baseCost) {
    const reusableModules = modules.filter(m => {
      if (!m.reusable) return false;
      const reuse = this.library.getReusableModule(m.name, domainContext.industry || 'generic');
      return reuse.available;
    });

    if (reusableModules.length === 0) {
      return {
        reuse: { amount: 0, percentage: 0, modules: [] },
        total: 0,
        message: 'Custom build—creates reusable assets for future projects'
      };
    }

    const hourlyRate = this.getHourlyRate(domainContext.industry || 'generic');
    let totalSavings = 0;

    reusableModules.forEach(mod => {
      const moduleBaseCost = this.COMPLEXITY_DAYS[mod.complexity] * 6 * hourlyRate;
      totalSavings += moduleBaseCost * 0.5;
    });

    const savingsPercentage = baseCost > 0 ? (totalSavings / baseCost) * 100 : 0;

    return {
      reuse: {
        amount: Math.ceil(totalSavings),
        percentage: Math.ceil(savingsPercentage),
        modules: reusableModules.map(m => m.name)
      },
      total: Math.ceil(totalSavings),
      message: `Saves $${Math.ceil(totalSavings)} via proven ${reusableModules.map(m => m.displayName || m.name).join(' + ')} template${reusableModules.length > 1 ? 's' : ''}`
    };
  }

  calculateConfidence(feasibility, domainContext, modules) {
    // Safety check: ensure feasibility has a score
    let overallConfidence = (feasibility && typeof feasibility.score === 'number' && !isNaN(feasibility.score)) 
      ? feasibility.score 
      : 0.8; // Default to 80% if missing or invalid

    // Ensure confidence is between 0 and 1
    overallConfidence = Math.max(0, Math.min(1, overallConfidence));

    let timelineConfidence = 0.8;
    if (domainContext.budgetReality) {
      timelineConfidence = 0.9;
    }

    let costConfidence = 0.8;
    const reusableCount = modules.filter(m => {
      const reuse = this.library.getReusableModule(m.name, domainContext.industry || 'generic');
      return reuse.available;
    }).length;
    
    if (reusableCount > modules.length * 0.5) {
      costConfidence = 0.85;
    }

    if (overallConfidence < 0.6) {
      return {
        overall: overallConfidence,
        timeline: timelineConfidence,
        cost: costConfidence,
        message: `Low confidence (${(overallConfidence * 100).toFixed(0)}%)—scope vague. Recommend +30% budget buffer.`,
        warning: true
      };
    }

    let message = `${(overallConfidence * 100).toFixed(0)}% confident`;
    if (domainContext.industry && domainContext.useCase) {
      message += `—${domainContext.industry} ${domainContext.useCase} patterns well-understood`;
    }

    return {
      overall: overallConfidence,
      timeline: timelineConfidence,
      cost: costConfidence,
      message,
      warning: false
    };
  }

  compareWithDomain(timeline, cost, domainContext, budgetTier) {
    if (!domainContext.budgetReality?.[budgetTier]) {
      return null;
    }

    const reality = domainContext.budgetReality[budgetTier];
    const daysVariance = ((timeline.days - reality.days) / reality.days) * 100;
    const costVariance = ((cost.total - reality.cost) / reality.cost) * 100;

    let varianceReason = '';
    if (Math.abs(daysVariance) > 10) {
      if (daysVariance > 0) {
        varianceReason = 'Higher complexity';
      } else {
        varianceReason = 'Lower complexity or high reuse';
      }
    }

    return {
      domain_average: {
        days: reality.days,
        cost: reality.cost,
        variance: `${daysVariance > 0 ? '+' : ''}${daysVariance.toFixed(0)}% days, ${costVariance > 0 ? '+' : ''}${costVariance.toFixed(0)}% cost`,
        reason: varianceReason
      }
    };
  }

  getHourlyRate(industry) {
    return this.HOURLY_RATES[industry] || this.HOURLY_RATES.generic;
  }

  getTimelineConfidence(domainContext) {
    if (domainContext.budgetReality) return 0.9;
    if (domainContext.commonModules?.length > 0) return 0.85;
    return 0.8;
  }
}

module.exports = Estimator;

