class CostProposalGenerator {
  constructor(logger, config) {
    this.logger = logger;
    this.config = config;
    this.rates = this.loadIndianMarketRates();
    this.overheadRates = {
      epf: 0.12,
      esi: 0.0325,
      gratuity: 0.0481,
      leave: 0.08,
      infrastructure: 0.18,
      total: 0.45  // Combined overhead
    };
  }

  loadIndianMarketRates() {
    return {
      // Experience-based hourly rates (₹)
      experience: {
        junior: { min: 156, max: 250, avg: 200 },
        mid: { min: 313, max: 625, avg: 450 },
        senior: { min: 675, max: 1044, avg: 850 },
        lead: { min: 1044, max: 1563, avg: 1300 },
        architect: { min: 1563, max: 2606, avg: 2000 }
      },
      
      // Skill-based hourly rates (₹)
      skills: {
        frontend: { min: 300, max: 800, avg: 500 },
        backend: { min: 400, max: 1000, avg: 650 },
        fullstack: { min: 500, max: 1200, avg: 800 },
        devops: { min: 600, max: 1400, avg: 950 },
        uiux: { min: 300, max: 700, avg: 450 },
        qa: { min: 200, max: 500, avg: 350 },
        pm: { min: 800, max: 1500, avg: 1100 }
      },
      
      // Module complexity → resource level mapping
      moduleMapping: {
        low: 'junior',
        medium: 'mid',
        high: 'senior',
        critical: 'lead'
      }
    };
  }

  /**
   * Generate detailed cost proposal from scope
   * @param {Object} refinedScope - Refined scope with modules
   * @param {Object} estimate - Estimate object with timeline and cost
   * @param {Object} options - Proposal options (rate tier, overhead inclusion)
   * @returns {Object} - Detailed cost breakdown
   */
  generateProposal(refinedScope, estimate, options = {}) {
    const {
      rateTier = 'avg',  // 'min', 'avg', 'max'
      includeOverhead = true,
      includeManagement = true,
      includeBuffer = true,
      teamComposition = 'auto'  // or custom array
    } = options;

    // Extract modules from nested structure
    const modules = refinedScope.refinedScope?.modules || refinedScope.modules || [];

    // 1. Map modules to resources
    const resourceAllocation = this.mapModulesToResources(modules);

    // 2. Calculate development cost
    const devCost = this.calculateDevelopmentCost(resourceAllocation, rateTier);

    // 3. Add overhead costs
    const overheadCost = includeOverhead ? 
      this.calculateOverhead(devCost.totalCost) : 0;

    // 4. Add management cost
    const managementCost = includeManagement ? 
      this.calculateManagementCost(devCost.totalHours) : 0;

    // 5. Add testing cost
    const testingCost = this.calculateTestingCost(devCost.totalCost);

    // 6. Add deployment cost
    const deploymentCost = this.calculateDeploymentCost(devCost.totalHours);

    // 7. Add buffer
    const bufferCost = includeBuffer ? 
      (devCost.totalCost + overheadCost + managementCost + testingCost + deploymentCost) * 0.15 : 0;

    // 8. Calculate totals
    const subtotal = devCost.totalCost + overheadCost + managementCost + testingCost + deploymentCost;
    const total = subtotal + bufferCost;

    return {
      summary: {
        totalCost: Math.round(total),
        developmentCost: Math.round(devCost.totalCost),
        overheadCost: Math.round(overheadCost),
        managementCost: Math.round(managementCost),
        testingCost: Math.round(testingCost),
        deploymentCost: Math.round(deploymentCost),
        bufferCost: Math.round(bufferCost),
        totalHours: devCost.totalHours,
        estimatedDuration: this.calculateDuration(devCost.totalHours)
      },
      breakdown: {
        development: {
          breakdown: devCost.breakdown,
          totalCost: devCost.totalCost,
          totalHours: devCost.totalHours
        },
        overhead: this.breakdownOverhead(overheadCost),
        management: { 
          hours: managementCost / this.rates.skills.pm.avg, 
          cost: managementCost 
        },
        testing: { percentage: '15-20%', cost: testingCost },
        deployment: { percentage: '5-10%', cost: deploymentCost },
        buffer: { percentage: '15%', cost: bufferCost }
      },
      resourceAllocation: resourceAllocation,
      assumptions: this.generateAssumptions(refinedScope, options),
      timeline: this.generateTimeline(devCost.totalHours, resourceAllocation)
    };
  }

  mapModulesToResources(modules) {
    const allocation = [];

    for (const module of modules) {
      const complexity = module.complexity || 'medium';
      const experienceLevel = this.rates.moduleMapping[complexity] || 'mid';
      
      // Determine skill type based on module name
      let skillType = this.determineSkillType(module.name || module.displayName || '');
      
      // Estimate hours (from module effort or default)
      const hours = module.effort || this.estimateModuleHours(module);

      allocation.push({
        module: module.name || module.displayName,
        complexity: complexity,
        experienceLevel: experienceLevel,
        skillType: skillType,
        hours: hours,
        resource: `${experienceLevel} ${skillType}`.toUpperCase()
      });
    }

    return allocation;
  }

  determineSkillType(moduleName) {
    const name = moduleName.toLowerCase();
    
    if (name.includes('ui') || name.includes('dashboard') || name.includes('frontend')) {
      return 'frontend';
    }
    if (name.includes('api') || name.includes('backend') || name.includes('database')) {
      return 'backend';
    }
    if (name.includes('devops') || name.includes('deployment') || name.includes('ci')) {
      return 'devops';
    }
    if (name.includes('design') || name.includes('ux')) {
      return 'uiux';
    }
    
    return 'fullstack';  // Default
  }

  estimateModuleHours(module) {
    const baseHours = {
      low: 8,
      medium: 16,
      high: 32,
      critical: 48
    };
    return baseHours[module.complexity] || 16;
  }

  calculateDevelopmentCost(resourceAllocation, rateTier = 'avg') {
    let totalCost = 0;
    let totalHours = 0;
    const breakdown = [];

    for (const allocation of resourceAllocation) {
      const rate = this.rates.skills[allocation.skillType]?.[rateTier] || this.rates.skills.fullstack[rateTier];
      const cost = allocation.hours * rate;
      
      totalCost += cost;
      totalHours += allocation.hours;
      breakdown.push({
        module: allocation.module,
        resource: allocation.resource,
        hours: allocation.hours,
        rate: rate,
        cost: Math.round(cost)
      });
    }

    return { totalCost, totalHours, breakdown };
  }

  calculateOverhead(baseCost) {
    return baseCost * this.overheadRates.total;
  }

  breakdownOverhead(overheadCost) {
    return {
      epf: Math.round(overheadCost * (this.overheadRates.epf / this.overheadRates.total)),
      esi: Math.round(overheadCost * (this.overheadRates.esi / this.overheadRates.total)),
      gratuity: Math.round(overheadCost * (this.overheadRates.gratuity / this.overheadRates.total)),
      leave: Math.round(overheadCost * (this.overheadRates.leave / this.overheadRates.total)),
      infrastructure: Math.round(overheadCost * (this.overheadRates.infrastructure / this.overheadRates.total)),
      total: Math.round(overheadCost)
    };
  }

  calculateManagementCost(totalHours) {
    // 15-20% of development time for PM
    const pmHours = totalHours * 0.18;
    return pmHours * this.rates.skills.pm.avg;
  }

  calculateTestingCost(devCost) {
    // 15-20% of dev cost for QA
    return devCost * 0.18;
  }

  calculateDeploymentCost(totalHours) {
    // 5-10% of dev hours for deployment/training
    const deployHours = totalHours * 0.08;
    return deployHours * this.rates.skills.devops.avg;
  }

  calculateDuration(totalHours) {
    // Assume 8 hours/day, 5 days/week
    const workingDays = Math.ceil(totalHours / 8);
    const weeks = Math.ceil(workingDays / 5);
    
    return {
      hours: totalHours,
      days: workingDays,
      weeks: weeks,
      months: Math.ceil(weeks / 4)
    };
  }

  generateTimeline(totalHours, resourceAllocation) {
    // Phase breakdown
    const phases = [
      { name: 'Planning & Design', percentage: 0.15 },
      { name: 'Development', percentage: 0.50 },
      { name: 'Testing', percentage: 0.20 },
      { name: 'Deployment & Training', percentage: 0.10 },
      { name: 'Buffer/Contingency', percentage: 0.05 }
    ];

    return phases.map(phase => ({
      phase: phase.name,
      hours: Math.round(totalHours * phase.percentage),
      percentage: (phase.percentage * 100) + '%'
    }));
  }

  generateAssumptions(scope, options) {
    return [
      'Rates based on current Indian IT market standards (2024)',
      'Assumes full-time resource allocation (8 hours/day)',
      'Includes statutory benefits as per Indian labor laws (EPF, ESI, Gratuity)',
      'Infrastructure costs include office space, equipment, internet, utilities',
      'Management overhead includes PM, coordination, reporting',
      'Testing includes unit, integration, and UAT testing',
      'Deployment includes production setup and training',
      '15% buffer for scope changes and unforeseen issues',
      'Rates may vary based on technology stack and expertise required',
      'Assumes team availability and no external dependencies'
    ];
  }

  /**
   * Format proposal as markdown document
   */
  formatProposalMarkdown(proposal, projectName = 'Untitled Project') {
    let md = `# Cost Proposal - ${projectName}\n\n`;
    md += `**Date:** ${new Date().toLocaleDateString('en-IN')}\n\n`;
    md += `---\n\n`;

    // Executive Summary
    md += `## Executive Summary\n\n`;
    md += `**Total Project Cost:** ₹${proposal.summary.totalCost.toLocaleString('en-IN')}\n\n`;
    md += `**Estimated Duration:** ${proposal.summary.estimatedDuration.weeks} weeks (${proposal.summary.estimatedDuration.months} months)\n\n`;
    md += `**Total Effort:** ${proposal.summary.totalHours} hours\n\n`;
    md += `---\n\n`;

    // Cost Breakdown
    md += `## Cost Breakdown\n\n`;
    md += `| Component | Amount (₹) | Percentage |\n`;
    md += `|-----------|------------|------------|\n`;
    
    const total = proposal.summary.totalCost;
    md += `| Development | ${proposal.summary.developmentCost.toLocaleString('en-IN')} | ${Math.round(proposal.summary.developmentCost / total * 100)}% |\n`;
    md += `| Overhead (EPF, ESI, etc.) | ${proposal.summary.overheadCost.toLocaleString('en-IN')} | ${Math.round(proposal.summary.overheadCost / total * 100)}% |\n`;
    md += `| Management | ${proposal.summary.managementCost.toLocaleString('en-IN')} | ${Math.round(proposal.summary.managementCost / total * 100)}% |\n`;
    md += `| Testing & QA | ${proposal.summary.testingCost.toLocaleString('en-IN')} | ${Math.round(proposal.summary.testingCost / total * 100)}% |\n`;
    md += `| Deployment & Training | ${proposal.summary.deploymentCost.toLocaleString('en-IN')} | ${Math.round(proposal.summary.deploymentCost / total * 100)}% |\n`;
    md += `| Buffer/Contingency | ${proposal.summary.bufferCost.toLocaleString('en-IN')} | ${Math.round(proposal.summary.bufferCost / total * 100)}% |\n`;
    md += `| **Total** | **₹${proposal.summary.totalCost.toLocaleString('en-IN')}** | **100%** |\n\n`;
    md += `---\n\n`;

    // Development Breakdown
    md += `## Development Cost Breakdown\n\n`;
    md += `| Module | Resource | Hours | Rate (₹/hour) | Cost (₹) |\n`;
    md += `|--------|----------|-------|---------------|----------|\n`;
    
    for (const item of proposal.breakdown.development.breakdown) {
      md += `| ${item.module} | ${item.resource} | ${item.hours} | ${item.rate} | ${item.cost.toLocaleString('en-IN')} |\n`;
    }
    
    md += `| **Total** | | **${proposal.summary.totalHours}** | | **₹${proposal.summary.developmentCost.toLocaleString('en-IN')}** |\n\n`;
    md += `---\n\n`;

    // Overhead Breakdown
    md += `## Overhead Breakdown\n\n`;
    md += `| Component | Amount (₹) |\n`;
    md += `|-----------|------------|\n`;
    md += `| EPF (12%) | ${proposal.breakdown.overhead.epf.toLocaleString('en-IN')} |\n`;
    md += `| ESI (3.25%) | ${proposal.breakdown.overhead.esi.toLocaleString('en-IN')} |\n`;
    md += `| Gratuity (4.81%) | ${proposal.breakdown.overhead.gratuity.toLocaleString('en-IN')} |\n`;
    md += `| Leave Provision (8%) | ${proposal.breakdown.overhead.leave.toLocaleString('en-IN')} |\n`;
    md += `| Infrastructure (18%) | ${proposal.breakdown.overhead.infrastructure.toLocaleString('en-IN')} |\n`;
    md += `| **Total** | **₹${proposal.breakdown.overhead.total.toLocaleString('en-IN')}** |\n\n`;
    md += `---\n\n`;

    // Timeline
    md += `## Project Timeline\n\n`;
    md += `| Phase | Hours | Percentage |\n`;
    md += `|-------|-------|------------|\n`;
    
    for (const phase of proposal.timeline) {
      md += `| ${phase.phase} | ${phase.hours} | ${phase.percentage} |\n`;
    }
    
    md += `\n**Total Duration:** ${proposal.summary.estimatedDuration.weeks} weeks\n\n`;
    md += `---\n\n`;

    // Assumptions
    md += `## Assumptions\n\n`;
    for (let i = 0; i < proposal.assumptions.length; i++) {
      md += `${i + 1}. ${proposal.assumptions[i]}\n`;
    }
    md += `\n---\n\n`;
    md += `**Proposal valid for:** 30 days from date of issue\n\n`;
    md += `*All amounts in Indian Rupees (₹)*\n`;

    return md;
  }
}

module.exports = CostProposalGenerator;

