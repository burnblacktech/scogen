/**
 * Chain Executor Step 3: Technical Decomposition
 * 
 * Extends ChainExecutorStep2 to add:
 * - Technical decomposition of requirements
 * - Resource-based cost estimation
 * - Deliverable breakdown
 * - Component-level estimation
 * - Resource allocation
 * 
 * When to Use:
 * - When you need detailed technical breakdown
 * - For resource-based cost estimation
 * - When you need component-level estimates
 * - For detailed project planning
 * 
 * Used By:
 * - ChainExecutorStep4 as base class
 * 
 * @see {@link ../../docs/02-modules/chain-executor-variants.md} for variant comparison
 * @extends ChainExecutorStep2
 */

const ChainExecutorStep2 = require('./chain-executor-step2');
const TechnicalDecomposer = require('./technical-decomposer');
const ResourcePresenter = require('./resource-presenter');

class ChainExecutorStep3 extends ChainExecutorStep2 {
  constructor(config, logger, db, library) {
    super(config, logger, db, library);
    this.technicalDecomposer = new TechnicalDecomposer();
    this.resourcePresenter = new ResourcePresenter();
  }

  /**
   * Execute chain with technical decomposition
   * @param {string} input - User input
   * @param {Object} options - Options including request object for context
   * @returns {Object} Execution results with decomposition information
   */
  async execute(input, options = {}) {
    // Run Steps 0-2 from parent (trust scoring/routing/enrichment)
    const results = await super.execute(input, options);

    // If earlier steps didn't proceed, return
    if (!results.fullAnalysis || !results.requirementsEnrichment) {
      return results;
    }

    // Step 3: Technical Decomposition
    console.log('\n[STEP 3] Technical Decomposition & Resource Allocation...');

    const decompositionContext = {
      domain: results.fullAnalysis.domainContext?.industry || options.projectDetails?.marketRegion || 'generic',
      scale: options.projectDetails?.projectScale || options.scale || 'sme',
      complexity: this.assessOverallComplexity(results),
      integrations: this.extractIntegrations(results),
      security: options.security || 'standard'
    };

    // Decompose into technical components
    const decomposition = await this.technicalDecomposer.decompose(
      results.requirementsEnrichment,
      decompositionContext
    );

    // Add decomposition to results
    results.technicalDecomposition = decomposition;

    // Generate presentations at different levels
    results.presentations = {
      executive: this.resourcePresenter.present(decomposition, 'executive'),
      summary: this.resourcePresenter.present(decomposition, 'summary'),
      detailed: this.resourcePresenter.present(decomposition, 'detailed')
    };

    // Update estimate with resource-based costing
    results.resourceBasedEstimate = {
      cost: decomposition.totalCost,
      costByResource: decomposition.costByResource,
      timeline: decomposition.timeline,
      deliverables: decomposition.stats.totalDeliverables,
      components: decomposition.stats.totalComponents
    };

    // Add to overall stats
    results.stats = {
      ...(results.stats || {}),
      technicalComponents: decomposition.stats.totalComponents,
      resourceTypes: decomposition.stats.resourceTypes,
      decompositionCost: decomposition.totalCost
    };

    // Log summary
    console.log(`   [OK] Decomposed into ${decomposition.stats.totalDeliverables} deliverables`);
    console.log(`   [COST] Total cost: ₹${decomposition.totalCost.toLocaleString('en-IN')}`);
    console.log(`   [TIME] Timeline: ${decomposition.timeline.withBuffer} days`);
    console.log(`   [TEAM] Resources needed: ${decomposition.stats.resourceTypes} types`);

    // Cost breakdown
    console.log('\n   Resource Breakdown:');
    for (const [key, data] of Object.entries(decomposition.costByResource)) {
      console.log(`     ${data.title}: ₹${data.cost.toLocaleString('en-IN')} (${data.percentage}%)`);
    }

    return results;
  }

  /**
   * Assess overall project complexity
   */
  assessOverallComplexity(results) {
    let complexity = 'standard';

    // Check enrichment results
    if (results.requirementsEnrichment) {
      const edgeCases = results.requirementsEnrichment.enriched?.edgeCases?.length || 0;
      const compliance = results.requirementsEnrichment.enriched?.compliance?.length || 0;
      
      if (edgeCases > 10 || compliance > 5) {
        complexity = 'complex';
      }
    }

    // Check module count
    const totalModules = results.fullAnalysis?.refinedScope?.totalModules || 
                        results.fullAnalysis?.refinedScope?.enrichedModules?.length ||
                        results.requirementsEnrichment?.stats?.enrichedCount || 0;
    
    if (totalModules > 15) {
      complexity = 'complex';
    }

    return complexity;
  }

  /**
   * Extract integrations from requirements
   */
  extractIntegrations(results) {
    const integrations = [];

    if (results.requirementsEnrichment?.enriched) {
      const allRequirements = [
        ...(results.requirementsEnrichment.enriched.explicit || []),
        ...(results.requirementsEnrichment.enriched.domainSpecific || [])
      ];
      
      const text = allRequirements.join(' ').toLowerCase();
      
      // Common integrations
      if (text.includes('payment')) integrations.push('payment_gateway');
      if (text.includes('sms')) integrations.push('sms_gateway');
      if (text.includes('email')) integrations.push('email_service');
      if (text.includes('whatsapp')) integrations.push('whatsapp');
      if (text.includes('map') || text.includes('location')) integrations.push('maps');
      if (text.includes('social')) integrations.push('social_login');
    }

    return integrations;
  }
}

module.exports = ChainExecutorStep3;

