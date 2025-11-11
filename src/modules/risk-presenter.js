// src/modules/risk-presenter.js
// Risk Presentation for Different Stakeholders

class RiskPresenter {
  constructor() {
    this.riskColors = {
      critical: '#DC2626',  // Red
      high: '#EA580C',      // Orange
      medium: '#F59E0B',    // Amber
      low: '#10B981'        // Green
    };

    this.impactIcons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
  }

  // Present risks at different levels
  present(assessment, level = 'executive') {
    const presentations = {
      executive: this.presentExecutive(assessment),
      detailed: this.presentDetailed(assessment),
      technical: this.presentTechnical(assessment),
      mitigation: this.presentMitigation(assessment)
    };
    
    return presentations[level] || presentations.executive;
  }

  // Executive summary - high level
  presentExecutive(assessment) {
    const bufferPercentage = Math.round((assessment.recommendedBuffers.cost - 1) * 100);
    const contingencyAmount = this.formatCurrency(assessment.contingencyReserve);
    
    return {
      level: 'executive',
      title: 'Risk Assessment Summary',
      
      overview: {
        riskLevel: assessment.level,
        riskScore: `${Math.round(assessment.riskScore)}%`,
        confidence: `${assessment.confidence}%`,
        totalRisks: assessment.identifiedRisks.length,
        priority: assessment.priority
      },
      
      keyMessage: this.getExecutiveMessage(assessment),
      
      recommendations: {
        bufferRequired: `${bufferPercentage}% buffer recommended`,
        contingencyReserve: `${contingencyAmount} contingency reserve`,
        timelineAdjustment: `${Math.round((assessment.recommendedBuffers.time - 1) * 100)}% timeline buffer`,
        priority: assessment.priority === 'immediate' ? 
          'Immediate risk mitigation required' : 
          'Standard risk management sufficient'
      },
      
      topRisks: this.getTopRisks(assessment.identifiedRisks, 3),
      
      visualization: this.generateRiskChart(assessment)
    };
  }

  // Detailed view for project managers
  presentDetailed(assessment) {
    return {
      level: 'detailed',
      title: 'Detailed Risk Analysis',
      
      summary: {
        totalRisks: assessment.identifiedRisks.length,
        byCategory: this.groupRisksByCategory(assessment.identifiedRisks),
        byImpact: this.groupRisksByImpact(assessment.identifiedRisks),
        riskLevel: assessment.level
      },
      
      riskMatrix: this.formatRiskMatrix(assessment.riskMatrix),
      
      risks: assessment.identifiedRisks.map(risk => ({
        category: risk.category,
        type: risk.type,
        description: risk.description,
        probability: `${(risk.probability * 100).toFixed(0)}%`,
        impact: this.impactIcons[risk.impact] + ' ' + risk.impact,
        score: risk.score?.toFixed(1),
        effects: {
          timeline: `+${((risk.timeImpact - 1) * 100).toFixed(0)}%`,
          cost: `+${((risk.costImpact - 1) * 100).toFixed(0)}%`
        }
      })),
      
      buffers: {
        timeline: {
          percentage: `${Math.round((assessment.recommendedBuffers.time - 1) * 100)}%`,
          explanation: 'Additional time needed for risk mitigation'
        },
        cost: {
          percentage: `${Math.round((assessment.recommendedBuffers.cost - 1) * 100)}%`,
          amount: this.formatCurrency(assessment.contingencyReserve),
          explanation: 'Reserve for handling identified risks'
        }
      }
    };
  }

  // Technical view for development team
  presentTechnical(assessment) {
    const technicalRisks = assessment.identifiedRisks.filter(r => r.category === 'technical');
    const resourceRisks = assessment.identifiedRisks.filter(r => r.category === 'resource');
    
    return {
      level: 'technical',
      title: 'Technical Risk Assessment',
      
      technicalRisks: technicalRisks.map(risk => ({
        type: risk.type,
        description: risk.description,
        technicalImpact: this.getTechnicalImpact(risk),
        mitigation: risk.mitigation,
        priority: this.calculatePriority(risk),
        owner: 'Tech Lead'
      })),
      
      resourceRisks: resourceRisks.map(risk => ({
        type: risk.type,
        description: risk.description,
        resourceImpact: this.getResourceImpact(risk),
        mitigation: risk.mitigation,
        priority: this.calculatePriority(risk),
        owner: risk.owner || 'Project Manager'
      })),
      
      architectureConsiderations: this.getArchitectureConsiderations(assessment),
      
      qualityMeasures: [
        'Mandatory code reviews for high-risk modules',
        'Automated testing coverage > 80%',
        'Performance testing from sprint 1',
        'Security audit in each phase'
      ],
      
      technicalDebt: this.estimateTechnicalDebt(assessment)
    };
  }

  // Mitigation plan presentation
  presentMitigation(assessment) {
    const plan = assessment.mitigationPlan;
    
    return {
      level: 'mitigation',
      title: 'Risk Mitigation Plan',
      
      immediate: {
        title: 'Immediate Actions (Week 1)',
        items: plan.immediate.map(item => ({
          risk: item.risk,
          level: item.riskLevel,
          actions: item.actions,
          owner: item.owner,
          deadline: '1 week'
        }))
      },
      
      shortTerm: {
        title: 'Short-term Actions (Weeks 2-4)',
        items: plan.shortTerm.map(item => ({
          risk: item.risk,
          actions: item.actions,
          owner: item.owner,
          deadline: '2-4 weeks'
        }))
      },
      
      ongoing: {
        title: 'Ongoing Monitoring',
        items: plan.ongoing.map(item => ({
          risk: item.risk,
          actions: item.actions,
          frequency: 'Weekly review'
        }))
      },
      
      contingency: {
        title: 'Contingency Measures',
        reserve: this.formatCurrency(assessment.contingencyReserve),
        items: plan.contingency
      },
      
      governance: {
        reviewFrequency: 'Weekly',
        escalationPath: ['Project Manager', 'Program Director', 'CTO'],
        decisionAuthority: this.getDecisionAuthority(assessment.level)
      }
    };
  }

  // Helper methods
  getExecutiveMessage(assessment) {
    const messages = {
      critical: 'Project has critical risks requiring immediate attention and significant buffers',
      high: 'Project has high risks requiring careful management and adequate buffers',
      medium: 'Project has moderate risks that are manageable with standard practices',
      low: 'Project has low risks and can proceed with minimal buffers'
    };
    
    return messages[assessment.level] || messages.medium;
  }

  getTopRisks(risks, count) {
    return risks
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, count)
      .map(risk => ({
        description: risk.description,
        impact: this.impactIcons[risk.impact] + ' ' + risk.impact,
        probability: `${(risk.probability * 100).toFixed(0)}%`,
        mitigation: risk.mitigation?.[0] || 'Mitigation plan required'
      }));
  }

  groupRisksByCategory(risks) {
    const grouped = {};
    
    for (const risk of risks) {
      if (!grouped[risk.category]) {
        grouped[risk.category] = 0;
      }
      grouped[risk.category]++;
    }
    
    return Object.entries(grouped).map(([category, count]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      count,
      percentage: `${((count / risks.length) * 100).toFixed(0)}%`
    }));
  }

  groupRisksByImpact(risks) {
    const grouped = {};
    
    for (const risk of risks) {
      const impact = risk.impact || 'medium';
      if (!grouped[impact]) {
        grouped[impact] = 0;
      }
      grouped[impact]++;
    }
    
    return Object.entries(grouped).map(([impact, count]) => ({
      impact: this.impactIcons[impact] + ' ' + impact,
      count,
      percentage: `${((count / risks.length) * 100).toFixed(0)}%`
    }));
  }

  formatRiskMatrix(matrix) {
    const formatted = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    // Prioritize high probability + high impact
    if (matrix.high_high?.length > 0) {
      formatted.critical.push(...matrix.high_high);
    }
    if (matrix.high_medium?.length > 0 || matrix.medium_high?.length > 0) {
      formatted.high.push(...(matrix.high_medium || []), ...(matrix.medium_high || []));
    }
    if (matrix.medium_medium?.length > 0) {
      formatted.medium.push(...matrix.medium_medium);
    }
    if (matrix.low_low?.length > 0 || matrix.low_medium?.length > 0) {
      formatted.low.push(...(matrix.low_low || []), ...(matrix.low_medium || []));
    }
    
    return formatted;
  }

  generateRiskChart(assessment) {
    return {
      type: 'risk_heatmap',
      title: 'Risk Distribution',
      data: {
        byCategory: assessment.identifiedRisks.reduce((acc, risk) => {
          acc[risk.category] = (acc[risk.category] || 0) + 1;
          return acc;
        }, {}),
        byImpact: assessment.identifiedRisks.reduce((acc, risk) => {
          acc[risk.impact || 'medium'] = (acc[risk.impact || 'medium'] || 0) + 1;
          return acc;
        }, {})
      },
      colors: this.riskColors
    };
  }

  getTechnicalImpact(risk) {
    const impacts = [];
    
    if (risk.type === 'integration_complexity') {
      impacts.push('Additional integration testing needed');
      impacts.push('Fallback mechanisms required');
    }
    if (risk.type === 'performance_requirements') {
      impacts.push('Performance testing from day 1');
      impacts.push('Caching and optimization needed');
    }
    if (risk.type === 'new_technology') {
      impacts.push('Learning curve for team');
      impacts.push('POC recommended');
    }
    
    return impacts;
  }

  getResourceImpact(risk) {
    const impacts = [];
    
    if (risk.type === 'team_availability') {
      impacts.push('Need backup resources');
      impacts.push('Knowledge documentation critical');
    }
    if (risk.type === 'coordination_overhead') {
      impacts.push('Daily standups required');
      impacts.push('Clear communication channels');
    }
    
    return impacts;
  }

  getArchitectureConsiderations(assessment) {
    const considerations = [];
    
    if (assessment.identifiedRisks.find(r => r.type === 'performance_requirements')) {
      considerations.push('Design for horizontal scaling');
      considerations.push('Implement caching layer');
    }
    if (assessment.identifiedRisks.find(r => r.type === 'integration_complexity')) {
      considerations.push('Use adapter pattern for integrations');
      considerations.push('Implement circuit breakers');
    }
    if (assessment.identifiedRisks.find(r => r.type === 'data_migration')) {
      considerations.push('Design backward-compatible schema');
      considerations.push('Implement data validation layer');
    }
    
    return considerations;
  }

  estimateTechnicalDebt(assessment) {
    const riskScore = assessment.riskScore;
    
    if (riskScore > 70) {
      return {
        level: 'High',
        description: 'Significant technical debt likely due to risk mitigation shortcuts',
        estimate: '20-30% of development effort'
      };
    } else if (riskScore > 40) {
      return {
        level: 'Medium',
        description: 'Moderate technical debt from balanced risk approach',
        estimate: '10-20% of development effort'
      };
    }
    
    return {
      level: 'Low',
      description: 'Minimal technical debt expected',
      estimate: '<10% of development effort'
    };
  }

  calculatePriority(risk) {
    const score = risk.score || 0;
    
    if (score >= 2) return 'P1 - Critical';
    if (score >= 1.5) return 'P2 - High';
    if (score >= 1) return 'P3 - Medium';
    return 'P4 - Low';
  }

  getDecisionAuthority(riskLevel) {
    const authority = {
      critical: 'CTO/CEO approval required',
      high: 'Program Director approval required',
      medium: 'Project Manager can decide',
      low: 'Tech Lead can decide'
    };
    
    return authority[riskLevel] || authority.medium;
  }

  formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN');
  }
}

module.exports = RiskPresenter;

