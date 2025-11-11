// src/modules/resource-presenter.js
// Resource-based presentation for clients

class ResourcePresenter {
  constructor() {
    this.presentationLevels = {
      executive: 1, // Just totals
      summary: 2, // Resource breakdown
      detailed: 3, // All deliverables
      technical: 4 // Full technical details
    };
  }

  // Present decomposition at different levels
  present(decomposition, level = 'summary') {
    const presentations = {
      executive: this.presentExecutive(decomposition),
      summary: this.presentSummary(decomposition),
      detailed: this.presentDetailed(decomposition),
      technical: this.presentTechnical(decomposition)
    };

    return presentations[level] || presentations.summary;
  }

  // Executive level - just the numbers
  presentExecutive(decomposition) {
    return {
      level: 'executive',
      title: 'Project Investment Summary',
      totalInvestment: this.formatCurrency(decomposition.totalCost),
      timeline: `${decomposition.timeline.withBuffer} days`,
      teamSize: Object.keys(decomposition.resources).length,
      deliverables: decomposition.stats.totalComponents,
      message: `Your project requires ${decomposition.stats.totalComponents} deliverables from ${Object.keys(decomposition.resources).length} specialists, totaling ${this.formatCurrency(decomposition.totalCost)}`
    };
  }

  // Summary level - resource breakdown
  presentSummary(decomposition) {
    const resourceSummary = [];

    for (const [key, data] of Object.entries(decomposition.costByResource)) {
      resourceSummary.push({
        resource: data.title,
        deliverables: data.deliverableCount,
        investment: this.formatCurrency(data.cost),
        percentage: `${data.percentage}%`,
        description: this.getResourceDescription(key)
      });
    }

    return {
      level: 'summary',
      title: 'Resource Allocation Breakdown',
      totalInvestment: this.formatCurrency(decomposition.totalCost),
      timeline: {
        recommended: `${decomposition.timeline.recommendedDays} days`,
        withBuffer: `${decomposition.timeline.withBuffer} days`
      },
      resources: resourceSummary.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)),
      insights: this.generateInsights(decomposition),
      visualization: this.generateVisualization(decomposition)
    };
  }

  // Detailed level - all deliverables grouped
  presentDetailed(decomposition) {
    const detailedBreakdown = {};

    for (const [resource, data] of Object.entries(decomposition.resources)) {
      detailedBreakdown[data.title] = {
        totalCost: this.formatCurrency(data.totalCost),
        deliverables: this.groupDeliverables(data.deliverables),
        summary: `${data.deliverables.length} deliverables totaling ${this.formatCurrency(data.totalCost)}`
      };
    }

    return {
      level: 'detailed',
      title: 'Detailed Deliverables Breakdown',
      totalInvestment: this.formatCurrency(decomposition.totalCost),
      breakdown: detailedBreakdown,
      modules: this.presentModules(decomposition),
      timeline: this.presentTimeline(decomposition.timeline),
      recommendations: decomposition.recommendations
    };
  }

  // Technical level - full details
  presentTechnical(decomposition) {
    return {
      level: 'technical',
      title: 'Complete Technical Breakdown',
      raw: decomposition,
      deliverablesList: this.presentAllDeliverables(decomposition),
      technicalSpecs: this.generateTechnicalSpecs(decomposition),
      architecture: this.suggestArchitecture(decomposition),
      risks: this.identifyTechnicalRisks(decomposition)
    };
  }

  // Group deliverables by type
  groupDeliverables(deliverables) {
    const grouped = {};

    for (const deliverable of deliverables) {
      const type = deliverable.name.split(':')[0] || deliverable.type;
      
      if (!grouped[type]) {
        grouped[type] = {
          items: [],
          count: 0,
          cost: 0
        };
      }
      
      grouped[type].items.push({
        name: deliverable.name,
        cost: this.formatCurrency(deliverable.cost),
        complexity: deliverable.complexity
      });
      
      grouped[type].count += deliverable.quantity || 1;
      grouped[type].cost += deliverable.cost;
    }

    // Format for presentation
    const formatted = [];
    for (const [type, data] of Object.entries(grouped)) {
      formatted.push({
        type,
        count: data.count,
        totalCost: this.formatCurrency(data.cost),
        items: data.items.slice(0, 3), // Show first 3
        hasMore: data.items.length > 3
      });
    }

    return formatted;
  }

  // Present modules with costs
  presentModules(decomposition) {
    return decomposition.modules.map(module => ({
      name: module.module,
      complexity: module.complexity,
      cost: this.formatCurrency(module.totalCost),
      percentage: ((module.totalCost / decomposition.totalCost) * 100).toFixed(1) + '%',
      deliverableCount: module.deliverables.length,
      totalCost: module.totalCost // For sorting
    })).sort((a, b) => b.totalCost - a.totalCost);
  }

  // Present timeline options
  presentTimeline(timeline) {
    return {
      sequential: {
        days: timeline.sequentialDays,
        description: 'Single developer working sequentially'
      },
      parallel: {
        days: timeline.parallelDays,
        description: 'Full team working in parallel'
      },
      recommended: {
        days: timeline.recommendedDays,
        description: 'Optimal team with some parallel work'
      },
      withBuffer: {
        days: timeline.withBuffer,
        description: 'Recommended with risk buffer'
      }
    };
  }

  // Present all deliverables in a list
  presentAllDeliverables(decomposition) {
    const list = [];

    for (const deliverable of decomposition.deliverables) {
      list.push({
        resource: this.getResourceTitle(deliverable.resource),
        type: deliverable.type,
        name: deliverable.name,
        quantity: deliverable.quantity || 1,
        unitPrice: this.formatCurrency(deliverable.unitPrice),
        totalCost: this.formatCurrency(deliverable.cost),
        complexity: deliverable.complexity,
        cost: deliverable.cost // For sorting
      });
    }

    return list.sort((a, b) => b.cost - a.cost);
  }

  // Generate insights from decomposition
  generateInsights(decomposition) {
    const insights = [];
    const stats = decomposition.stats;

    // Cost distribution insight
    if (decomposition.totalCost > 0) {
      const devPercent = ((stats.costBreakdown.development / decomposition.totalCost) * 100).toFixed(0);
      insights.push(`Development represents ${devPercent}% of total investment`);
    }

    // Testing coverage
    if (decomposition.totalCost > 0) {
      const testPercent = ((stats.costBreakdown.testing / decomposition.totalCost) * 100).toFixed(0);
      if (testPercent < 15) {
        insights.push(`Testing at ${testPercent}% - consider increasing for better quality`);
      } else {
        insights.push(`Good testing coverage at ${testPercent}% of budget`);
      }
    }

    // Timeline optimization
    if (decomposition.timeline.parallelDays < decomposition.timeline.sequentialDays * 0.5) {
      insights.push('Significant time savings possible with parallel development');
    }

    // Module complexity
    const complexModules = decomposition.modules.filter(m => m.complexity === 'complex').length;
    if (complexModules > 0) {
      insights.push(`${complexModules} complex modules require senior developers`);
    }

    return insights;
  }

  // Generate visualization data
  generateVisualization(decomposition) {
    return {
      type: 'pie_chart',
      title: 'Investment Distribution',
      data: Object.entries(decomposition.costByResource).map(([key, data]) => ({
        label: data.title,
        value: data.cost,
        percentage: parseFloat(data.percentage)
      })),
      colors: {
        'Backend Developer': '#4F46E5',
        'Frontend Developer': '#7C3AED',
        'UI/UX Designer': '#EC4899',
        'QA Engineer': '#F59E0B',
        'DevOps Engineer': '#10B981',
        'Project Manager': '#6B7280'
      }
    };
  }

  // Generate technical specifications
  generateTechnicalSpecs(decomposition) {
    const specs = {
      backend: [],
      frontend: [],
      database: [],
      infrastructure: []
    };

    // Extract technical details from deliverables
    for (const deliverable of decomposition.deliverables) {
      if (deliverable.type === 'api_endpoint') {
        specs.backend.push(`${deliverable.quantity || 1} API endpoints`);
      } else if (deliverable.type === 'database_table') {
        specs.database.push(`${deliverable.quantity || 1} database tables`);
      } else if (deliverable.type === 'simple_page' || deliverable.type === 'complex_dashboard') {
        specs.frontend.push(`${deliverable.quantity || 1} ${deliverable.type.replace('_', ' ')}`);
      } else if (deliverable.type === 'server_setup' || deliverable.type === 'ci_cd_pipeline' || deliverable.type === 'containerization') {
        specs.infrastructure.push(deliverable.name);
      }
    }

    return specs;
  }

  // Suggest architecture based on components
  suggestArchitecture(decomposition) {
    const hasBackend = decomposition.resources.backend;
    const hasFrontend = decomposition.resources.frontend;
    const hasMobile = decomposition.resources.mobile;

    if (hasBackend && hasFrontend && hasMobile) {
      return {
        type: 'Full-stack with Mobile',
        suggestion: 'Microservices architecture with separate mobile apps',
        stack: 'Node.js + React + React Native'
      };
    } else if (hasBackend && hasFrontend) {
      return {
        type: 'Full-stack Web',
        suggestion: 'Monolithic or microservices based on scale',
        stack: 'Node.js + React/Vue'
      };
    } else {
      return {
        type: 'Custom',
        suggestion: 'Architecture depends on specific requirements',
        stack: 'To be determined'
      };
    }
  }

  // Identify technical risks
  identifyTechnicalRisks(decomposition) {
    const risks = [];

    // Check for integration complexity
    const integrations = decomposition.deliverables.filter(d => d.type === 'integration');
    if (integrations.length > 3) {
      risks.push({
        type: 'integration',
        message: `${integrations.length} integrations increase complexity`,
        mitigation: 'Allocate extra testing and documentation time'
      });
    }

    // Check for resource dependencies
    if (decomposition.resources.backend && decomposition.resources.frontend) {
      risks.push({
        type: 'coordination',
        message: 'Frontend-backend coordination critical',
        mitigation: 'Define API contracts early'
      });
    }

    // Check for complex modules
    const complexModules = decomposition.modules.filter(m => m.complexity === 'complex');
    if (complexModules.length > 2) {
      risks.push({
        type: 'complexity',
        message: `${complexModules.length} complex modules require experienced team`,
        mitigation: 'Assign senior developers to complex modules'
      });
    }

    return risks;
  }

  // Helper methods
  formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN');
  }

  getResourceTitle(key) {
    const titles = {
      'backend': 'Backend Developer',
      'frontend': 'Frontend Developer',
      'mobile': 'Mobile Developer',
      'ui': 'UI/UX Designer',
      'qa': 'QA Engineer',
      'devops': 'DevOps Engineer',
      'pm': 'Project Manager'
    };

    return titles[key] || key;
  }

  getResourceDescription(key) {
    const descriptions = {
      'backend': 'APIs, business logic, database design',
      'frontend': 'User interfaces, interactions, responsive design',
      'mobile': 'Native mobile applications',
      'ui': 'Visual design, user experience, prototypes',
      'qa': 'Testing, quality assurance, bug detection',
      'devops': 'Server setup, deployment, monitoring',
      'pm': 'Project coordination, documentation, reporting'
    };

    return descriptions[key] || '';
  }
}

module.exports = ResourcePresenter;

