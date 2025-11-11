// src/modules/chain-executor-step4.js
// Chain Executor with Risk Assessment (Step 4)

const ChainExecutorStep3 = require('./chain-executor-step3');
const RiskAssessor = require('./risk-assessor');
const RiskPresenter = require('./risk-presenter');

class ChainExecutorStep4 extends ChainExecutorStep3 {
  constructor(config, logger, db, library) {
    super(config, logger, db, library);
    this.riskAssessor = new RiskAssessor();
    this.riskPresenter = new RiskPresenter();
  }

  /**
   * Execute chain with risk assessment
   * @param {string} input - User input
   * @param {Object} options - Options including request object for context
   * @returns {Object} Execution results with risk assessment information
   */
  async execute(input, options = {}) {
    // Run Steps 0-3 from parent (trust scoring/routing/enrichment/decomposition)
    const results = await super.execute(input, options);
    
    // If earlier steps didn't proceed, return
    if (!results.technicalDecomposition) {
      return results;
    }
    
    // Step 4: Risk Assessment
    console.log('\n⚠️  Step 4: Risk Assessment & Mitigation Planning...');
    
    const riskContext = {
      domain: results.fullAnalysis?.domainContext?.industry || options.projectDetails?.marketRegion || 'generic',
      scale: options.projectDetails?.projectScale || options.scale || 'sme',
      complexity: this.assessOverallComplexity(results),
      timeline: options.timeline,
      existingSystem: this.hasExistingSystem(results),
      integrations: this.extractIntegrations(results),
      dependencies: this.extractDependencies(results),
      users: options.expectedUsers,
      newTechnology: this.hasNewTechnology(results)
    };
    
    // Extract client profile from trust analysis
    const clientProfile = results.analysis?.trust ? {
      techSavvy: results.analysis.trust.techSavvy || 'medium',
      hadFailure: results.analysis.trust.hadFailure || false,
      committeeDecision: results.analysis.trust.committeeDecision || false,
      decisionMaker: results.analysis.trust.decisionMaker !== false,
      budgetClarity: results.analysis.trust.budgetClarity || 'clear',
      riskLevel: results.analysis.trust.riskLevel || 'low',
      handHoldingNeeded: results.analysis.trust.handHoldingNeeded || false
    } : null;
    
    // Assess risks
    const riskAssessment = await this.riskAssessor.assessRisks(
      results.technicalDecomposition,
      results.requirementsEnrichment,
      clientProfile,
      riskContext
    );
    
    // Add risk assessment to results
    results.riskAssessment = riskAssessment;
    
    // Generate risk presentations
    results.riskPresentations = {
      executive: this.riskPresenter.present(riskAssessment, 'executive'),
      detailed: this.riskPresenter.present(riskAssessment, 'detailed'),
      technical: this.riskPresenter.present(riskAssessment, 'technical'),
      mitigation: this.riskPresenter.present(riskAssessment, 'mitigation')
    };
    
    // Update estimates with risk buffers
    results.riskAdjustedEstimate = this.applyRiskBuffers(
      results.resourceBasedEstimate,
      riskAssessment
    );
    
    // Add risk register for tracking
    results.riskRegister = riskAssessment.riskRegister;
    
    // Update overall stats
    results.stats = {
      ...(results.stats || {}),
      identifiedRisks: riskAssessment.identifiedRisks.length,
      riskLevel: riskAssessment.level,
      riskScore: Math.round(riskAssessment.riskScore),
      confidence: riskAssessment.confidence,
      bufferApplied: Math.round((riskAssessment.recommendedBuffers.cost - 1) * 100)
    };
    
    // Log summary
    console.log(`   ✅ Risk assessment complete: ${riskAssessment.identifiedRisks.length} risks identified`);
    console.log(`   📊 Risk level: ${riskAssessment.level.toUpperCase()}`);
    console.log(`   🛡️ Confidence: ${riskAssessment.confidence}%`);
    console.log(`   💰 Recommended buffer: ${Math.round((riskAssessment.recommendedBuffers.cost - 1) * 100)}%`);
    console.log(`   ⏱️ Timeline buffer: ${Math.round((riskAssessment.recommendedBuffers.time - 1) * 100)}%`);
    console.log(`   💵 Contingency reserve: ₹${riskAssessment.contingencyReserve.toLocaleString('en-IN')}`);
    
    // Show top risks
    console.log('\n   Top Risks:');
    const topRisks = riskAssessment.identifiedRisks
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);
    
    for (const risk of topRisks) {
      console.log(`     • ${risk.description}`);
      console.log(`       Impact: ${risk.impact}, Probability: ${(risk.probability * 100).toFixed(0)}%`);
    }
    
    return results;
  }
  
  // Apply risk buffers to estimates
  applyRiskBuffers(baseEstimate, riskAssessment) {
    const buffers = riskAssessment.recommendedBuffers;
    
    return {
      base: {
        cost: baseEstimate.cost,
        timeline: baseEstimate.timeline.recommendedDays
      },
      withRisk: {
        cost: Math.round(baseEstimate.cost * buffers.cost),
        timeline: Math.round(baseEstimate.timeline.recommendedDays * buffers.time)
      },
      buffers: {
        costPercentage: Math.round((buffers.cost - 1) * 100),
        timePercentage: Math.round((buffers.time - 1) * 100),
        costAmount: Math.round(baseEstimate.cost * (buffers.cost - 1)),
        timeDays: Math.round(baseEstimate.timeline.recommendedDays * (buffers.time - 1))
      },
      contingency: riskAssessment.contingencyReserve,
      total: {
        cost: Math.round(baseEstimate.cost * buffers.cost) + riskAssessment.contingencyReserve,
        timeline: Math.round(baseEstimate.timeline.recommendedDays * buffers.time)
      }
    };
  }
  
  // Check if project involves existing system
  hasExistingSystem(results) {
    const requirements = [
      ...(results.requirementsEnrichment?.enriched?.explicit || []),
      ...(results.requirementsEnrichment?.enriched?.domainSpecific || [])
    ].join(' ').toLowerCase();
    
    return requirements.includes('migration') || 
           requirements.includes('existing') || 
           requirements.includes('replace') ||
           requirements.includes('upgrade');
  }
  
  // Check for new technology
  hasNewTechnology(results) {
    const requirements = [
      ...(results.requirementsEnrichment?.enriched?.explicit || []),
      ...(results.requirementsEnrichment?.enriched?.technical || [])
    ].join(' ').toLowerCase();
    
    return requirements.includes('blockchain') || 
           requirements.includes('ai') || 
           requirements.includes('ml') ||
           requirements.includes('machine learning') ||
           requirements.includes('iot') ||
           requirements.includes('web3');
  }
  
  // Extract dependencies
  extractDependencies(results) {
    const dependencies = [];
    
    if (results.requirementsEnrichment?.enriched) {
      const allRequirements = [
        ...(results.requirementsEnrichment.enriched.explicit || []),
        ...(results.requirementsEnrichment.enriched.domainSpecific || [])
      ];
      
      const text = allRequirements.join(' ').toLowerCase();
      
      if (text.includes('third-party')) dependencies.push('third-party APIs');
      if (text.includes('client provide')) dependencies.push('client assets');
      if (text.includes('government')) dependencies.push('government APIs');
      if (text.includes('bank')) dependencies.push('banking APIs');
    }
    
    return dependencies;
  }
}

module.exports = ChainExecutorStep4;

