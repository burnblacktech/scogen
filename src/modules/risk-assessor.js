// src/modules/risk-assessor.js
// Comprehensive Risk Assessment & Mitigation Engine

class RiskAssessor {
  constructor() {
    // Risk patterns based on historical project data
    this.riskPatterns = {
      technical: {
        integration_complexity: {
          trigger: 'Multiple third-party integrations',
          probability: 0.7,
          impact: 'high',
          timeImpact: 1.3,  // 30% time increase
          costImpact: 1.2,   // 20% cost increase
          mitigation: [
            'Create integration test environment early',
            'Document API contracts thoroughly',
            'Build fallback mechanisms'
          ]
        },
        
        new_technology: {
          trigger: 'Team unfamiliar with tech stack',
          probability: 0.6,
          impact: 'medium',
          timeImpact: 1.25,
          costImpact: 1.15,
          mitigation: [
            'Allocate learning time',
            'Bring in expert consultant',
            'Create POC first'
          ]
        },
        
        performance_requirements: {
          trigger: 'High performance needs (>1000 concurrent users)',
          probability: 0.5,
          impact: 'high',
          timeImpact: 1.2,
          costImpact: 1.3,
          mitigation: [
            'Performance testing from day 1',
            'Architecture review by expert',
            'Load testing environment'
          ]
        },
        
        data_migration: {
          trigger: 'Existing system data migration',
          probability: 0.8,
          impact: 'high',
          timeImpact: 1.4,
          costImpact: 1.25,
          mitigation: [
            'Data audit upfront',
            'Migration dry runs',
            'Rollback plan'
          ]
        },
        
        security_compliance: {
          trigger: 'Financial or healthcare domain',
          probability: 0.9,
          impact: 'high',
          timeImpact: 1.3,
          costImpact: 1.4,
          mitigation: [
            'Security audit in phases',
            'Compliance checklist',
            'Expert review'
          ]
        }
      },
      
      business: {
        scope_creep: {
          trigger: 'Vague requirements or ambitious client',
          probability: 0.8,
          impact: 'high',
          timeImpact: 1.4,
          costImpact: 1.35,
          mitigation: [
            'Detailed scope document',
            'Change request process',
            'Weekly scope reviews'
          ]
        },
        
        stakeholder_alignment: {
          trigger: 'Multiple stakeholders or committee decision',
          probability: 0.7,
          impact: 'medium',
          timeImpact: 1.25,
          costImpact: 1.1,
          mitigation: [
            'Stakeholder matrix',
            'Regular alignment meetings',
            'Single point of contact'
          ]
        },
        
        payment_delays: {
          trigger: 'First-time client or budget concerns',
          probability: 0.4,
          impact: 'medium',
          timeImpact: 1.0,
          costImpact: 1.05,
          mitigation: [
            'Milestone-based payments',
            'Advance payment',
            'Shorter payment cycles'
          ]
        },
        
        communication_gaps: {
          trigger: 'Non-technical client or remote team',
          probability: 0.6,
          impact: 'medium',
          timeImpact: 1.2,
          costImpact: 1.1,
          mitigation: [
            'Weekly demos',
            'Visual progress reports',
            'Dedicated coordinator'
          ]
        }
      },
      
      resource: {
        team_availability: {
          trigger: 'Specialized skills needed',
          probability: 0.5,
          impact: 'medium',
          timeImpact: 1.3,
          costImpact: 1.2,
          mitigation: [
            'Resource booking in advance',
            'Backup resources identified',
            'Knowledge documentation'
          ]
        },
        
        dependency_delays: {
          trigger: 'External dependencies (client assets, APIs)',
          probability: 0.7,
          impact: 'medium',
          timeImpact: 1.35,
          costImpact: 1.1,
          mitigation: [
            'Dependency checklist upfront',
            'Mock data/services',
            'Parallel work tracks'
          ]
        },
        
        quality_issues: {
          trigger: 'Compressed timeline or junior team',
          probability: 0.5,
          impact: 'high',
          timeImpact: 1.25,
          costImpact: 1.3,
          mitigation: [
            'Code reviews mandatory',
            'Automated testing',
            'Senior developer oversight'
          ]
        }
      },
      
      domain_specific: {
        ecommerce: {
          payment_gateway_issues: {
            probability: 0.6,
            impact: 'high',
            timeImpact: 1.2,
            costImpact: 1.15,
            mitigation: ['Test with sandbox early', 'Multiple gateway support']
          },
          inventory_complexity: {
            probability: 0.5,
            impact: 'medium',
            timeImpact: 1.15,
            costImpact: 1.1,
            mitigation: ['Clear inventory rules', 'Edge case documentation']
          }
        },
        
        fintech: {
          regulatory_changes: {
            probability: 0.7,
            impact: 'high',
            timeImpact: 1.3,
            costImpact: 1.4,
            mitigation: ['Compliance buffer', 'Regular regulatory review']
          },
          security_requirements: {
            probability: 0.9,
            impact: 'high',
            timeImpact: 1.4,
            costImpact: 1.5,
            mitigation: ['Security-first architecture', 'Penetration testing']
          }
        },
        
        healthcare: {
          data_privacy: {
            probability: 0.9,
            impact: 'high',
            timeImpact: 1.3,
            costImpact: 1.35,
            mitigation: ['Privacy by design', 'HIPAA compliance checklist']
          },
          integration_standards: {
            probability: 0.7,
            impact: 'medium',
            timeImpact: 1.25,
            costImpact: 1.2,
            mitigation: ['HL7/FHIR compliance', 'Standard protocols']
          }
        }
      }
    };

    // Risk scoring weights
    this.weights = {
      probability: 0.4,
      impact: 0.6
    };

    // Impact multipliers
    this.impactMultipliers = {
      low: 1.05,
      medium: 1.15,
      high: 1.3,
      critical: 1.5
    };

    // Client risk factors
    this.clientRiskFactors = {
      first_time_builder: 1.2,
      burned_before: 1.3,
      committee_decision: 1.15,
      urgent_timeline: 1.25,
      fixed_budget: 1.1,
      international: 1.2
    };
  }

  // Main risk assessment method
  async assessRisks(decomposition, enrichedRequirements, clientProfile, context = {}) {
    console.log('⚠️ Starting Risk Assessment...');
    
    const assessment = {
      identifiedRisks: [],
      riskScore: 0,
      totalProbability: 0,
      recommendedBuffers: {
        time: 1.0,
        cost: 1.0
      },
      mitigationPlan: [],
      contingencyReserve: 0,
      confidence: 0,
      priority: 'medium'
    };

    // Step 1: Identify technical risks
    const technicalRisks = this.assessTechnicalRisks(decomposition, context);
    assessment.identifiedRisks.push(...technicalRisks);

    // Step 2: Identify business risks
    const businessRisks = this.assessBusinessRisks(clientProfile, enrichedRequirements);
    assessment.identifiedRisks.push(...businessRisks);

    // Step 3: Identify resource risks
    const resourceRisks = this.assessResourceRisks(decomposition, context);
    assessment.identifiedRisks.push(...resourceRisks);

    // Step 4: Identify domain-specific risks
    const domainRisks = this.assessDomainRisks(context.domain, enrichedRequirements);
    assessment.identifiedRisks.push(...domainRisks);

    // Step 5: Calculate overall risk score
    assessment.riskScore = this.calculateOverallRiskScore(assessment.identifiedRisks);
    
    // Step 6: Determine risk level
    assessment.level = this.determineRiskLevel(assessment.riskScore);
    assessment.priority = this.determineRiskPriority(assessment.level);

    // Step 7: Calculate recommended buffers
    assessment.recommendedBuffers = this.calculateBuffers(assessment.identifiedRisks);

    // Step 8: Generate mitigation plan
    assessment.mitigationPlan = this.generateMitigationPlan(assessment.identifiedRisks);

    // Step 9: Calculate contingency reserve
    assessment.contingencyReserve = this.calculateContingency(
      decomposition.totalCost,
      assessment.riskScore
    );

    // Step 10: Calculate confidence level
    assessment.confidence = this.calculateConfidence(assessment);

    // Step 11: Generate risk matrix
    assessment.riskMatrix = this.generateRiskMatrix(assessment.identifiedRisks);

    // Step 12: Create risk register
    assessment.riskRegister = this.createRiskRegister(assessment.identifiedRisks);

    console.log(`✅ Risk Assessment Complete: ${assessment.identifiedRisks.length} risks identified`);
    console.log(`   Risk Level: ${assessment.level}`);
    console.log(`   Recommended Buffer: ${((assessment.recommendedBuffers.cost - 1) * 100).toFixed(0)}%`);
    
    return assessment;
  }

  // Assess technical risks
  assessTechnicalRisks(decomposition, context) {
    const risks = [];
    
    // Check for integration complexity
    const integrations = decomposition.deliverables.filter(d => d.type === 'integration');
    if (integrations.length >= 3) {
      risks.push(this.createRisk(
        'technical',
        'integration_complexity',
        `${integrations.length} integrations increase complexity`,
        this.riskPatterns.technical.integration_complexity
      ));
    }

    // Check for new technology
    if (context.newTechnology || context.complexity === 'complex') {
      risks.push(this.createRisk(
        'technical',
        'new_technology',
        'Team may need learning time for new technology',
        this.riskPatterns.technical.new_technology
      ));
    }

    // Check for performance requirements
    if (context.scale === 'enterprise' || context.users > 1000) {
      risks.push(this.createRisk(
        'technical',
        'performance_requirements',
        'High performance requirements add complexity',
        this.riskPatterns.technical.performance_requirements
      ));
    }

    // Check for data migration
    if (context.existingSystem || decomposition.deliverables.find(d => d.name?.includes('migration'))) {
      risks.push(this.createRisk(
        'technical',
        'data_migration',
        'Data migration from existing system is complex',
        this.riskPatterns.technical.data_migration
      ));
    }

    // Check module complexity
    const complexModules = decomposition.modules.filter(m => m.complexity === 'complex');
    if (complexModules.length > 2) {
      risks.push({
        category: 'technical',
        type: 'module_complexity',
        description: `${complexModules.length} complex modules require senior expertise`,
        probability: 0.6,
        impact: 'high',
        timeImpact: 1.2,
        costImpact: 1.25,
        mitigation: ['Assign senior developers', 'Extra review cycles', 'POC for complex modules'],
        score: this.calculateRiskScore(0.6, 'high')
      });
    }

    return risks;
  }

  // Assess business risks
  assessBusinessRisks(clientProfile, enrichedRequirements) {
    const risks = [];

    // Scope creep risk
    if (clientProfile?.techSavvy === 'low' || 
        enrichedRequirements?.stats?.enrichmentRatio > 3) {
      risks.push(this.createRisk(
        'business',
        'scope_creep',
        'High probability of scope changes',
        this.riskPatterns.business.scope_creep
      ));
    }

    // Stakeholder alignment
    if (clientProfile?.committeeDecision || clientProfile?.decisionMaker === false) {
      risks.push(this.createRisk(
        'business',
        'stakeholder_alignment',
        'Multiple stakeholders may cause delays',
        this.riskPatterns.business.stakeholder_alignment
      ));
    }

    // Payment risk
    if (clientProfile?.budgetClarity === 'vague' || 
        clientProfile?.riskLevel === 'high') {
      risks.push(this.createRisk(
        'business',
        'payment_delays',
        'Payment delays possible',
        this.riskPatterns.business.payment_delays
      ));
    }

    // Communication risk
    if (clientProfile?.techSavvy === 'low' || clientProfile?.handHoldingNeeded) {
      risks.push(this.createRisk(
        'business',
        'communication_gaps',
        'Extra communication effort needed',
        this.riskPatterns.business.communication_gaps
      ));
    }

    // Trust issues
    if (clientProfile?.hadFailure) {
      risks.push({
        category: 'business',
        type: 'trust_deficit',
        description: 'Client had bad experience before, trust building needed',
        probability: 0.8,
        impact: 'medium',
        timeImpact: 1.2,
        costImpact: 1.15,
        mitigation: ['Weekly demos', 'Detailed documentation', 'Milestone-based delivery'],
        score: this.calculateRiskScore(0.8, 'medium')
      });
    }

    return risks;
  }

  // Assess resource risks
  assessResourceRisks(decomposition, context) {
    const risks = [];

    // Team availability risk
    const resourceTypes = Object.keys(decomposition.resources).length;
    if (resourceTypes > 4) {
      risks.push(this.createRisk(
        'resource',
        'team_availability',
        `${resourceTypes} different resources needed`,
        this.riskPatterns.resource.team_availability
      ));
    }

    // Dependency risk
    if (context.dependencies?.length > 0 || context.integrations?.length > 2) {
      risks.push(this.createRisk(
        'resource',
        'dependency_delays',
        'External dependencies may cause delays',
        this.riskPatterns.resource.dependency_delays
      ));
    }

    // Quality risk
    if (context.timeline === 'urgent' || decomposition.timeline.recommendedDays < 30) {
      risks.push(this.createRisk(
        'resource',
        'quality_issues',
        'Compressed timeline may affect quality',
        this.riskPatterns.resource.quality_issues
      ));
    }

    // Coordination overhead
    if (decomposition.timeline.parallelDays < decomposition.timeline.sequentialDays * 0.5) {
      risks.push({
        category: 'resource',
        type: 'coordination_overhead',
        description: 'Parallel development requires coordination',
        probability: 0.6,
        impact: 'medium',
        timeImpact: 1.15,
        costImpact: 1.1,
        mitigation: ['Daily standups', 'Clear task allocation', 'Integration points defined'],
        score: this.calculateRiskScore(0.6, 'medium')
      });
    }

    return risks;
  }

  // Assess domain-specific risks
  assessDomainRisks(domain, enrichedRequirements) {
    const risks = [];
    
    if (!domain || !this.riskPatterns.domain_specific[domain]) {
      return risks;
    }

    const domainRisks = this.riskPatterns.domain_specific[domain];
    
    for (const [riskType, riskData] of Object.entries(domainRisks)) {
      // Check if risk applies based on requirements
      const applies = this.checkDomainRiskApplies(riskType, enrichedRequirements);
      
      if (applies) {
        risks.push({
          category: 'domain',
          type: riskType,
          description: `${domain} specific: ${riskType.replace(/_/g, ' ')}`,
          ...riskData,
          score: this.calculateRiskScore(riskData.probability, riskData.impact)
        });
      }
    }

    // India-specific risks
    if (domain === 'ecommerce') {
      risks.push({
        category: 'domain',
        type: 'gst_compliance',
        description: 'GST compliance complexity in India',
        probability: 0.8,
        impact: 'medium',
        timeImpact: 1.1,
        costImpact: 1.15,
        mitigation: ['GST expert consultation', 'Compliance testing'],
        score: this.calculateRiskScore(0.8, 'medium')
      });
    }

    return risks;
  }

  // Check if domain risk applies
  checkDomainRiskApplies(riskType, enrichedRequirements) {
    const requirements = [
      ...enrichedRequirements?.enriched?.explicit || [],
      ...enrichedRequirements?.enriched?.domainSpecific || []
    ].join(' ').toLowerCase();

    const triggers = {
      payment_gateway_issues: ['payment', 'checkout', 'transaction'],
      inventory_complexity: ['inventory', 'stock', 'warehouse'],
      regulatory_changes: ['compliance', 'regulation', 'rbi'],
      security_requirements: ['security', 'encryption', 'pci'],
      data_privacy: ['privacy', 'patient', 'medical'],
      integration_standards: ['hl7', 'fhir', 'integration']
    };

    const keywords = triggers[riskType] || [];
    return keywords.some(keyword => requirements.includes(keyword));
  }

  // Create risk object
  createRisk(category, type, description, pattern) {
    return {
      category,
      type,
      description,
      probability: pattern.probability,
      impact: pattern.impact,
      timeImpact: pattern.timeImpact,
      costImpact: pattern.costImpact,
      mitigation: pattern.mitigation,
      score: this.calculateRiskScore(pattern.probability, pattern.impact)
    };
  }

  // Calculate risk score
  calculateRiskScore(probability, impact) {
    const impactScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const impactScore = impactScores[impact] || 2;
    return probability * impactScore;
  }

  // Calculate overall risk score
  calculateOverallRiskScore(risks) {
    if (risks.length === 0) return 0;
    
    const totalScore = risks.reduce((sum, risk) => sum + (risk.score || 0), 0);
    const maxScore = risks.length * 3; // Maximum score if all risks were high probability and impact
    
    return (totalScore / maxScore) * 100;
  }

  // Determine risk level
  determineRiskLevel(riskScore) {
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  // Determine risk priority
  determineRiskPriority(level) {
    const priorities = {
      critical: 'immediate',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };
    return priorities[level] || 'medium';
  }

  // Calculate recommended buffers
  calculateBuffers(risks) {
    let timeBuffer = 1.0;
    let costBuffer = 1.0;

    for (const risk of risks) {
      // Apply buffers based on probability
      const probabilityFactor = risk.probability || 0.5;
      
      if (risk.timeImpact) {
        const timeIncrease = (risk.timeImpact - 1) * probabilityFactor;
        timeBuffer = Math.max(timeBuffer, 1 + timeIncrease);
      }
      
      if (risk.costImpact) {
        const costIncrease = (risk.costImpact - 1) * probabilityFactor;
        costBuffer = Math.max(costBuffer, 1 + costIncrease);
      }
    }

    // Compound multiple risks
    if (risks.length > 5) {
      timeBuffer *= 1.1;
      costBuffer *= 1.1;
    }

    return {
      time: Math.min(timeBuffer, 1.5), // Cap at 50% buffer
      cost: Math.min(costBuffer, 1.4)   // Cap at 40% buffer
    };
  }

  // Generate mitigation plan
  generateMitigationPlan(risks) {
    const plan = {
      immediate: [],
      shortTerm: [],
      ongoing: [],
      contingency: []
    };

    // Sort risks by score
    const sortedRisks = risks.sort((a, b) => (b.score || 0) - (a.score || 0));

    for (const risk of sortedRisks.slice(0, 10)) { // Top 10 risks
      const mitigationItems = risk.mitigation || [];
      
      const mitigationEntry = {
        risk: risk.description,
        riskLevel: risk.impact,
        actions: mitigationItems,
        owner: this.assignOwner(risk.category),
        timeline: this.assignTimeline(risk.impact)
      };

      // Categorize by timeline
      if (risk.score >= 2) {
        plan.immediate.push(mitigationEntry);
      } else if (risk.score >= 1) {
        plan.shortTerm.push(mitigationEntry);
      } else {
        plan.ongoing.push(mitigationEntry);
      }
    }

    // Add general contingencies
    plan.contingency = [
      'Maintain 15% budget reserve',
      'Weekly risk review meetings',
      'Escalation path defined',
      'Alternative vendors identified'
    ];

    return plan;
  }

  // Calculate contingency reserve
  calculateContingency(baseCost, riskScore) {
    // Based on risk score, calculate contingency percentage
    const contingencyPercentage = Math.min(riskScore / 100 * 0.25, 0.25); // Max 25%
    return Math.round(baseCost * contingencyPercentage);
  }

  // Calculate confidence level
  calculateConfidence(assessment) {
    // Higher risk = lower confidence
    const baseConfidence = 90;
    const riskPenalty = assessment.riskScore * 0.5; // 0.5% reduction per risk score point
    
    return Math.max(50, Math.round(baseConfidence - riskPenalty));
  }

  // Generate risk matrix
  generateRiskMatrix(risks) {
    const matrix = {
      high_high: [],      // High probability, high impact
      high_medium: [],    
      high_low: [],
      medium_high: [],
      medium_medium: [],
      medium_low: [],
      low_high: [],
      low_medium: [],
      low_low: []
    };

    for (const risk of risks) {
      const probability = risk.probability >= 0.7 ? 'high' : 
                         risk.probability >= 0.4 ? 'medium' : 'low';
      const impact = risk.impact || 'medium';
      
      const key = `${probability}_${impact}`;
      if (matrix[key]) {
        matrix[key].push({
          type: risk.type,
          description: risk.description.substring(0, 50)
        });
      }
    }

    return matrix;
  }

  // Create risk register
  createRiskRegister(risks) {
    return risks.map((risk, index) => ({
      id: `RISK-${String(index + 1).padStart(3, '0')}`,
      category: risk.category,
      type: risk.type,
      description: risk.description,
      probability: `${(risk.probability * 100).toFixed(0)}%`,
      impact: risk.impact,
      score: risk.score?.toFixed(2),
      timeImpact: `+${((risk.timeImpact - 1) * 100).toFixed(0)}%`,
      costImpact: `+${((risk.costImpact - 1) * 100).toFixed(0)}%`,
      mitigation: risk.mitigation?.join('; '),
      status: 'identified',
      owner: this.assignOwner(risk.category),
      reviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
  }

  // Assign owner based on risk category
  assignOwner(category) {
    const owners = {
      technical: 'Tech Lead',
      business: 'Project Manager',
      resource: 'Resource Manager',
      domain: 'Domain Expert'
    };
    return owners[category] || 'Project Manager';
  }

  // Assign timeline based on impact
  assignTimeline(impact) {
    const timelines = {
      critical: 'Immediate',
      high: 'Within 1 week',
      medium: 'Within 2 weeks',
      low: 'Ongoing'
    };
    return timelines[impact] || 'Within 2 weeks';
  }
}

module.exports = RiskAssessor;

