/**
 * Hidden Cost Calculator Module
 * 
 * Purpose: Calculate real-world project costs including hidden factors
 * Philosophy: Show what consultants know but clients don't always see
 */

const { handleError, wrapError, ErrorTypes } = require('../core/errors/ErrorHandler');
const { validateRequired, validateObject, validateArray } = require('../utils/validators');

class HiddenCostCalculator {
  constructor(logger) {
    this.logger = logger;
    this.costFactors = this.loadCostFactors();
  }

  /**
   * Main calculator method
   * @param {number} developmentCost - Base development cost
   * @param {Object} clientProfile - Client profile from ClientProfiler
   * @param {Object} projectScope - Project scope details
   * @param {Object} options - Additional options
   * @returns {Object} Hidden costs breakdown with internal vs client costs
   */
  calculateHiddenCosts(developmentCost, clientProfile, projectScope, options = {}) {
    this.logger.info('Calculating hidden costs', {
      developmentCost,
      riskLevel: clientProfile?.riskLevel,
      techSavvy: clientProfile?.techSavvy
    });

    const hiddenCosts = {
      development: developmentCost,
      breakdown: {},
      total: developmentCost,
      percentageIncrease: 0,
      
      // For internal visibility
      internal: {
        realCost: 0,
        margin: 0,
        risk: 'medium'
      },
      
      // For client presentation (selective disclosure)
      client: {
        shown: {},
        hidden: {},
        total: 0
      }
    };

    // Calculate each hidden cost component
    Object.keys(this.costFactors).forEach(component => {
      const cost = this.calculateComponent(
        component, 
        developmentCost, 
        clientProfile, 
        projectScope
      );
      hiddenCosts.breakdown[component] = cost;
      hiddenCosts.total += cost.amount;
    });

    // Categorize costs for client vs internal
    this.categorizeCosts(hiddenCosts, clientProfile);
    
    // Calculate percentages and risk
    hiddenCosts.percentageIncrease = 
      ((hiddenCosts.total - developmentCost) / developmentCost) * 100;
    
    hiddenCosts.internal.realCost = hiddenCosts.total;
    hiddenCosts.internal.margin = this.calculateMargin(hiddenCosts, clientProfile);
    hiddenCosts.internal.risk = this.assessProjectRisk(hiddenCosts, clientProfile);
    
    // Add recommendations
    hiddenCosts.recommendations = this.generateRecommendations(hiddenCosts, clientProfile);
    
    this.logger.info('Hidden costs calculated', {
      total: hiddenCosts.total,
      percentageIncrease: hiddenCosts.percentageIncrease.toFixed(1) + '%',
      clientTotal: hiddenCosts.client.total
    });

    return hiddenCosts;
  }

  /**
   * Load cost factor definitions
   */
  loadCostFactors() {
    return {
      clientCoordination: {
        base: 0.05,
        factors: {
          lowTechSavvy: 0.10,
          committee: 0.08,
          notDecisionMaker: 0.05,
          previousFailure: 0.07
        }
      },
      scopeCreep: {
        base: 0.10,
        factors: {
          vagueBudget: 0.15,
          lowTechSavvy: 0.10,
          highUrgency: 0.08,
          noSpecsProvided: 0.12
        }
      },
      documentation: {
        base: 0.05,
        factors: {
          detailed: 0.10,
          simplified: 0.08,
          committee: 0.07,
          enterprise: 0.10
        }
      },
      testing: {
        base: 0.15,
        factors: {
          previousFailure: 0.10,
          criticalSystem: 0.10,
          multipleIntegrations: 0.08
        }
      },
      deployment: {
        base: 0.05,
        factors: {
          noExistingInfra: 0.05,
          multipleEnvironments: 0.05,
          enterprise: 0.08
        }
      },
      postLaunch: {
        base: 0.08,
        factors: {
          firstTimeClient: 0.05,
          complexIntegrations: 0.07,
          highUserLoad: 0.05
        }
      },
      projectManagement: {
        base: 0.10,
        factors: {
          multipleStakeholders: 0.05,
          distributed: 0.05,
          highRisk: 0.08
        }
      },
      knowledgeTransfer: {
        base: 0.03,
        factors: {
          internalTeamTakeover: 0.10,
          lowTechSavvy: 0.07,
          complexSystem: 0.05
        }
      }
    };
  }

  /**
   * Calculate individual cost component
   */
  calculateComponent(component, baseCost, clientProfile, projectScope) {
    const factor = this.costFactors[component];
    let percentage = factor.base;
    const appliedFactors = [];
    
    // Apply client profile factors
    if (component === 'clientCoordination') {
      if (clientProfile?.techSavvy === 'low') {
        percentage += factor.factors.lowTechSavvy;
        appliedFactors.push('Non-technical client');
      }
      if (clientProfile?.committeeDecision) {
        percentage += factor.factors.committee;
        appliedFactors.push('Multiple stakeholders');
      }
      if (clientProfile && !clientProfile.decisionMaker) {
        percentage += factor.factors.notDecisionMaker;
        appliedFactors.push('Indirect decision maker');
      }
      if (clientProfile?.hadFailure) {
        percentage += factor.factors.previousFailure;
        appliedFactors.push('Previous project failure');
      }
    }
    
    if (component === 'scopeCreep') {
      if (clientProfile?.budgetClarity === 'vague') {
        percentage += factor.factors.vagueBudget;
        appliedFactors.push('Unclear requirements');
      }
      if (clientProfile?.techSavvy === 'low') {
        percentage += factor.factors.lowTechSavvy;
        appliedFactors.push('Likely requirement changes');
      }
      if (clientProfile?.urgency === 'high') {
        percentage += factor.factors.highUrgency;
        appliedFactors.push('High urgency increases change risk');
      }
      // Check if specs provided
      if (!projectScope?.hasDetailedSpecs) {
        percentage += factor.factors.noSpecsProvided;
        appliedFactors.push('No detailed specs provided');
      }
    }
    
    if (component === 'documentation') {
      if (clientProfile?.documentationDepth === 'detailed') {
        percentage += factor.factors.detailed;
        appliedFactors.push('Detailed documentation needed');
      } else if (clientProfile?.documentationDepth === 'simplified') {
        percentage += factor.factors.simplified;
        appliedFactors.push('Simplified documentation for non-technical client');
      }
      if (clientProfile?.committeeDecision) {
        percentage += factor.factors.committee;
        appliedFactors.push('Multiple approvals needed');
      }
      if (clientProfile?.clientSize === 'enterprise') {
        percentage += factor.factors.enterprise;
        appliedFactors.push('Enterprise documentation standards');
      }
    }
    
    if (component === 'testing') {
      if (clientProfile?.hadFailure) {
        percentage += factor.factors.previousFailure;
        appliedFactors.push('Extra testing due to past failure');
      }
      // Check for critical systems
      if (projectScope?.isCriticalSystem) {
        percentage += factor.factors.criticalSystem;
        appliedFactors.push('Critical system requires extensive testing');
      }
      // Check for integrations
      if (projectScope?.integrationCount > 3) {
        percentage += factor.factors.multipleIntegrations;
        appliedFactors.push('Multiple integrations require integration testing');
      }
    }
    
    if (component === 'deployment') {
      if (!projectScope?.hasExistingInfrastructure) {
        percentage += factor.factors.noExistingInfra;
        appliedFactors.push('No existing infrastructure');
      }
      if (projectScope?.needsMultipleEnvironments) {
        percentage += factor.factors.multipleEnvironments;
        appliedFactors.push('Multiple environments (dev/staging/prod)');
      }
      if (clientProfile?.clientSize === 'enterprise') {
        percentage += factor.factors.enterprise;
        appliedFactors.push('Enterprise deployment complexity');
      }
    }
    
    if (component === 'postLaunch') {
      // Check if first-time client (no previous projects)
      if (!clientProfile?.previousProjects || clientProfile.previousProjects === 0) {
        percentage += factor.factors.firstTimeClient;
        appliedFactors.push('First-time client support');
      }
      if (projectScope?.integrationCount > 3) {
        percentage += factor.factors.complexIntegrations;
        appliedFactors.push('Complex integrations need monitoring');
      }
      if (projectScope?.expectedUserLoad > 10000) {
        percentage += factor.factors.highUserLoad;
        appliedFactors.push('High user load requires monitoring');
      }
    }
    
    if (component === 'projectManagement') {
      if (clientProfile?.committeeDecision) {
        percentage += factor.factors.multipleStakeholders;
        appliedFactors.push('Multiple stakeholders need coordination');
      }
      if (clientProfile?.riskLevel === 'high') {
        percentage += factor.factors.highRisk;
        appliedFactors.push('High risk requires extra management');
      }
    }
    
    if (component === 'knowledgeTransfer') {
      if (projectScope?.needsInternalTeamTakeover) {
        percentage += factor.factors.internalTeamTakeover;
        appliedFactors.push('Internal team takeover requires training');
      }
      if (clientProfile?.techSavvy === 'low') {
        percentage += factor.factors.lowTechSavvy;
        appliedFactors.push('Non-technical team needs extra training');
      }
      if (projectScope?.complexity === 'high') {
        percentage += factor.factors.complexSystem;
        appliedFactors.push('Complex system requires detailed handover');
      }
    }
    
    const amount = Math.round(baseCost * percentage);
    
    return {
      amount,
      percentage: percentage * 100,
      factors: appliedFactors,
      description: this.getComponentDescription(component)
    };
  }

  /**
   * Categorize costs for client vs internal visibility
   */
  categorizeCosts(hiddenCosts, clientProfile) {
    // Costs always shown to client
    const alwaysShow = ['testing', 'deployment', 'projectManagement', 'documentation'];
    
    // Costs shown based on profile
    const conditionalShow = {
      'knowledgeTransfer': clientProfile?.techSavvy === 'low',
      'postLaunch': true, // Always show as "warranty/support"
      'clientCoordination': clientProfile?.committeeDecision
    };
    
    // Never show to client (internal buffer)
    const neverShow = ['scopeCreep'];
    
    hiddenCosts.client.shown = {};
    hiddenCosts.client.hidden = {};
    hiddenCosts.client.total = hiddenCosts.development;
    
    Object.entries(hiddenCosts.breakdown).forEach(([key, value]) => {
      if (alwaysShow.includes(key)) {
        hiddenCosts.client.shown[key] = value;
        hiddenCosts.client.total += value.amount;
      } else if (conditionalShow[key]) {
        hiddenCosts.client.shown[key] = value;
        hiddenCosts.client.total += value.amount;
      } else {
        hiddenCosts.client.hidden[key] = value;
      }
    });
  }

  /**
   * Calculate recommended margin
   */
  calculateMargin(hiddenCosts, clientProfile) {
    const baseMargin = 0.20; // 20% base
    let adjustedMargin = baseMargin;
    
    // Adjust based on risk
    if (clientProfile?.riskLevel === 'high') adjustedMargin += 0.10;
    if (clientProfile?.riskLevel === 'low') adjustedMargin -= 0.05;
    
    // Adjust based on urgency
    if (clientProfile?.urgency === 'high') adjustedMargin += 0.10;
    
    // Adjust based on market position
    if (clientProfile?.priceStrategy === 'premium') adjustedMargin += 0.15;
    if (clientProfile?.priceStrategy === 'competitive') adjustedMargin -= 0.10;
    
    return Math.max(0.10, Math.min(0.50, adjustedMargin)); // Clamp between 10% and 50%
  }

  /**
   * Assess overall project risk
   */
  assessProjectRisk(hiddenCosts, clientProfile) {
    const totalIncrease = hiddenCosts.percentageIncrease;
    
    if (totalIncrease > 60 || clientProfile?.riskLevel === 'high') {
      return 'high';
    } else if (totalIncrease > 35 || clientProfile?.riskLevel === 'medium') {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate cost recommendations
   */
  generateRecommendations(hiddenCosts, clientProfile) {
    const recommendations = [];
    
    if (hiddenCosts.percentageIncrease > 50) {
      recommendations.push({
        type: 'warning',
        message: 'Hidden costs exceed 50% of development. Consider phased approach.'
      });
    }
    
    if (hiddenCosts.breakdown.scopeCreep && hiddenCosts.breakdown.scopeCreep.percentage > 20) {
      recommendations.push({
        type: 'action',
        message: 'High scope creep risk. Enforce strict change management process.'
      });
    }
    
    if (clientProfile?.priceStrategy === 'competitive' && hiddenCosts.internal.margin < 0.15) {
      recommendations.push({
        type: 'warning',
        message: 'Low margin project. Ensure strict scope control.'
      });
    }
    
    if (hiddenCosts.breakdown.clientCoordination && hiddenCosts.breakdown.clientCoordination.percentage > 15) {
      recommendations.push({
        type: 'action',
        message: 'High coordination overhead. Assign dedicated project manager.'
      });
    }
    
    return recommendations;
  }

  /**
   * Get component description
   */
  getComponentDescription(component) {
    const descriptions = {
      clientCoordination: 'Client meetings, clarifications, and approvals',
      scopeCreep: 'Buffer for inevitable requirement changes',
      documentation: 'Technical and user documentation',
      testing: 'Quality assurance and user acceptance testing',
      deployment: 'Server setup, deployment, and go-live support',
      postLaunch: 'Post-launch support and bug fixes (1 month)',
      projectManagement: 'Project coordination and reporting',
      knowledgeTransfer: 'Training and handover to client team'
    };
    return descriptions[component] || component;
  }
}

module.exports = HiddenCostCalculator;

