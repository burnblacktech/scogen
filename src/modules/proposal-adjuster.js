// src/modules/proposal-adjuster.js
// Proposal Adjuster - Handles commercial proposal adjustments while maintaining technical truth

class ProposalAdjuster {
  constructor(technicalBaseline) {
    this.technicalBaseline = technicalBaseline;
    this.defaultAdjustments = {
      margin: 0.15, // 15% default margin
      riskBuffer: 0.20, // 20% default risk buffer
      paymentTerms: 'milestone',
      teamSizeAdjustment: 1.0,
      timelineAdjustment: 1.0
    };
  }

  /**
   * Calculate adjusted proposal based on adjustments
   * @param {Object} adjustments - Adjustment parameters
   * @returns {Object} Adjusted proposal
   */
  calculateAdjustedProposal(adjustments = {}) {
    const margin = adjustments.margin !== undefined ? adjustments.margin : this.defaultAdjustments.margin;
    const riskBuffer = adjustments.riskBuffer !== undefined ? adjustments.riskBuffer : this.defaultAdjustments.riskBuffer;
    const teamFactor = adjustments.teamSizeAdjustment !== undefined ? adjustments.teamSizeAdjustment : this.defaultAdjustments.teamSizeAdjustment;
    const timelineFactor = adjustments.timelineAdjustment !== undefined ? adjustments.timelineAdjustment : this.defaultAdjustments.timelineAdjustment;
    const budgetOverride = adjustments.budgetOverride;
    const paymentTerms = adjustments.paymentTerms || this.defaultAdjustments.paymentTerms;

    const base = this.technicalBaseline.actualCost || this.technicalBaseline.cost?.total || 0;
    const marginAmount = base * (margin / 100);
    const riskAmount = base * (riskBuffer / 100);

    const calculated = base + marginAmount + riskAmount;
    const finalCost = budgetOverride || calculated;

    // Calculate timeline based on team size adjustment
    const baseTimeline = this.technicalBaseline.actualTimeline || this.technicalBaseline.timeline?.base || 60;
    const adjustedTimeline = Math.ceil(baseTimeline / (teamFactor * timelineFactor));
    const baseTeamSize = this.technicalBaseline.actualTeamSize || this.technicalBaseline.teamSize || 5;
    const adjustedTeamSize = Math.ceil(baseTeamSize * teamFactor);

    // Calculate distribution if budget is lower
    let moduleDistribution = null;
    if (finalCost < base) {
      moduleDistribution = this.calculateModuleDistribution(finalCost, base);
    }

    // Generate narrative
    const narrative = this.generateNarrative(finalCost, base);

    return {
      technicalCost: base,
      proposedCost: finalCost,
      margin: marginAmount,
      riskBuffer: riskAmount,
      marginPercent: margin,
      riskBufferPercent: riskBuffer,
      timeline: adjustedTimeline,
      teamSize: adjustedTeamSize,
      paymentTerms: paymentTerms,
      moduleDistribution: moduleDistribution,
      narrative: narrative,
      adjustments: {
        margin: margin,
        riskBuffer: riskBuffer,
        teamSizeAdjustment: teamFactor,
        timelineAdjustment: timelineFactor
      }
    };
  }

  /**
   * Generate narrative based on pricing ratio
   * @param {number} proposed - Proposed cost
   * @param {number} actual - Actual technical cost
   * @returns {Object} Narrative with tone, message, and justification
   */
  generateNarrative(proposed, actual) {
    if (actual === 0) {
      return {
        tone: 'standard',
        message: 'Standard professional service delivery',
        justification: 'Optimal balance of quality, cost, and timeline'
      };
    }

    const ratio = proposed / actual;

    if (ratio >= 1.2) {
      return {
        tone: 'premium',
        message: 'Premium service with enhanced support and faster delivery',
        justification: 'Includes dedicated team, priority support, and comprehensive documentation'
      };
    } else if (ratio >= 0.9) {
      return {
        tone: 'standard',
        message: 'Standard professional service delivery',
        justification: 'Optimal balance of quality, cost, and timeline'
      };
    } else if (ratio >= 0.7) {
      return {
        tone: 'competitive',
        message: 'Competitive pricing with adjusted approach',
        justification: 'Optimized resource allocation and phased delivery'
      };
    } else {
      return {
        tone: 'strategic',
        message: 'Strategic partnership pricing',
        justification: 'Long-term partnership with shared risk model'
      };
    }
  }

  /**
   * Generate budget-fitted proposal
   * @param {Object} baseline - Technical baseline
   * @param {number} budget - User budget
   * @returns {Object} Budget-fitted proposal
   */
  generateBudgetFittedProposal(baseline, budget) {
    const actualCost = baseline.actualCost || baseline.cost?.total || 0;

    if (budget >= actualCost) {
      // Budget sufficient
      const margin = (budget - actualCost) / actualCost;
      return {
        proposedCost: budget,
        technicalCost: actualCost,
        margin: budget - actualCost,
        marginPercent: (margin * 100).toFixed(1),
        narrative: this.generateNarrative(budget, actualCost),
        fitsBudget: true
      };
    } else {
      // Budget insufficient - proportional distribution
      const shortfall = actualCost - budget;
      const shortfallPercent = (shortfall / actualCost) * 100;
      const moduleDistribution = this.calculateModuleDistribution(budget, actualCost);

      return {
        proposedCost: budget,
        technicalCost: actualCost,
        shortfall: shortfall,
        shortfallPercent: shortfallPercent.toFixed(1),
        moduleDistribution: moduleDistribution,
        narrative: this.generateNarrative(budget, actualCost),
        fitsBudget: false,
        adjustments: {
          teamSize: this.calculateAdjustedTeam(baseline, budget),
          timeline: this.calculateExtendedTimeline(baseline, budget)
        }
      };
    }
  }

  /**
   * Calculate module distribution when budget < cost
   * @param {number} budget - Available budget
   * @param {number} totalCost - Total technical cost
   * @returns {Object} Distribution map
   */
  calculateModuleDistribution(budget, totalCost) {
    const modules = this.technicalBaseline.modules || [];
    if (modules.length === 0) {
      return null;
    }

    const distribution = {};
    const moduleCosts = modules.map(m => m.cost || m.estimatedCost || 0);
    const totalModuleCost = moduleCosts.reduce((sum, cost) => sum + cost, 0);

    if (totalModuleCost === 0) {
      // Distribute evenly if no cost data
      const perModule = budget / modules.length;
      modules.forEach((module, index) => {
        distribution[module.name || `Module ${index + 1}`] = {
          allocatedBudget: Math.floor(perModule),
          percentageOfBudget: ((1 / modules.length) * 100).toFixed(1)
        };
      });
    } else {
      // Distribute proportionally
      modules.forEach(module => {
        const moduleCost = module.cost || module.estimatedCost || 0;
        const proportion = moduleCost / totalModuleCost;
        distribution[module.name || module.id || 'Unknown'] = {
          originalCost: moduleCost,
          allocatedBudget: Math.floor(budget * proportion),
          percentageOfBudget: (proportion * 100).toFixed(1)
        };
      });
    }

    return distribution;
  }

  /**
   * Calculate gap indicator for UI display
   * @param {number} commercial - Commercial/proposed cost
   * @param {number} technical - Technical/actual cost
   * @returns {Object} Gap indicator with emoji and text
   */
  calculateGapIndicator(commercial, technical) {
    if (technical === 0) {
      return {
        emoji: '🔵',
        text: 'Standard pricing',
        color: 'blue'
      };
    }

    const gap = (commercial - technical) / technical;
    const gapPercent = (gap * 100).toFixed(0);

    if (gap >= 0.2) {
      return {
        emoji: '🟢',
        text: 'Healthy margins',
        color: 'green',
        gapPercent: `+${gapPercent}%`
      };
    } else if (gap >= 0) {
      return {
        emoji: '🔵',
        text: 'Standard pricing',
        color: 'blue',
        gapPercent: `+${gapPercent}%`
      };
    } else if (gap >= -0.2) {
      return {
        emoji: '🟡',
        text: 'Competitive pricing',
        color: 'yellow',
        gapPercent: `${gapPercent}%`
      };
    } else {
      return {
        emoji: '🔴',
        text: 'Strategic pricing',
        color: 'red',
        gapPercent: `${gapPercent}%`
      };
    }
  }

  /**
   * Calculate adjusted team size based on budget
   * @param {Object} baseline - Technical baseline
   * @param {number} budget - Available budget
   * @returns {number} Adjusted team size
   */
  calculateAdjustedTeam(baseline, budget) {
    const actualCost = baseline.actualCost || baseline.cost?.total || 0;
    const actualTeamSize = baseline.actualTeamSize || baseline.teamSize || 5;

    if (budget >= actualCost) {
      return actualTeamSize;
    }

    const budgetRatio = budget / actualCost;
    return Math.max(2, Math.floor(actualTeamSize * budgetRatio * 0.8));
  }

  /**
   * Calculate extended timeline based on budget
   * @param {Object} baseline - Technical baseline
   * @param {number} budget - Available budget
   * @returns {number} Extended timeline in days
   */
  calculateExtendedTimeline(baseline, budget) {
    const actualCost = baseline.actualCost || baseline.cost?.total || 0;
    const actualTimeline = baseline.actualTimeline || baseline.timeline?.base || 60;

    if (budget >= actualCost) {
      return actualTimeline;
    }

    const budgetRatio = budget / actualCost;
    return Math.ceil(actualTimeline / (budgetRatio * 0.9));
  }
}

module.exports = ProposalAdjuster;

