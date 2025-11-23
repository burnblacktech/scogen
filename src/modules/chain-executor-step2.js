/**
 * Chain Executor Step 2: Requirements Enrichment
 * 
 * Extends ChainExecutorEnhanced to add:
 * - Requirements enrichment using pattern library
 * - AI-enhanced enrichment (if enabled)
 * - Domain-specific requirement discovery
 * - Edge case identification
 * - Compliance requirement detection
 * 
 * When to Use:
 * - When you need enriched requirements beyond what user provided
 * - For complex projects requiring domain expertise
 * - When compliance and edge cases are important
 * 
 * Used By:
 * - ChainExecutorStep3 as base class
 * 
 * @see {@link ../../docs/02-modules/chain-executor-variants.md} for variant comparison
 * @extends ChainExecutorEnhanced
 */

const ChainExecutorEnhanced = require('./chain-executor-enhanced');
const RequirementsEnricher = require('./requirements-enricher');
const { getPatternLibrary } = require('./pattern-library');

class ChainExecutorStep2 extends ChainExecutorEnhanced {
  constructor(config, logger, db, library) {
    super(config, logger, db, library);
    
    // Initialize requirements enrichment modules
    this.requirementsEnricher = new RequirementsEnricher(logger);
    this.patternLibrary = null; // Will be initialized when needed
  }

  /**
   * Execute chain with requirements enrichment
   * @param {string} input - User input
   * @param {Object} options - Options including request object for context
   * @returns {Object} Execution results with enrichment information
   */
  async execute(input, options = {}) {
    // Run Steps 0-1 from parent (trust scoring/routing)
    const results = await super.execute(input, options);

    // If earlier steps didn't proceed with full analysis, return
    if (!results.fullAnalysis || results.action !== 'FULL_ANALYSIS') {
      return results;
    }

    // Step 2: Requirements Enrichment
    console.log('\n[STEP 2] Requirements Enrichment...');

    // Initialize pattern library if not already done
    if (!this.patternLibrary) {
      this.patternLibrary = getPatternLibrary();
      await this.patternLibrary.initialize();
    }

    // Extract base requirements from full analysis
    const baseRequirements = this.extractBaseRequirements(results.fullAnalysis);

    // Assess context for enrichment
    const enrichmentContext = {
      domain: results.fullAnalysis.domainContext?.industry || options.projectDetails?.marketRegion || 'generic',
      domainContext: results.fullAnalysis.domainContext || {},
      market: options.projectDetails?.marketRegion || 'india',
      scale: options.projectDetails?.projectScale || 'sme',
      projectDetails: options.projectDetails || {},
      complexity: this.assessComplexity(baseRequirements),
      novelty: this.assessNovelty(results.fullAnalysis.domainContext),
      clientValue: results.analysis?.trust?.score || 50,
      enableAI: process.env.ENABLE_AI_ENRICHMENT === 'true'
    };

    // Perform enrichment
    const enrichmentResult = await this.requirementsEnricher.enrich(
      baseRequirements,
      enrichmentContext
    );

    // Record AI discoveries to pattern library
    if (enrichmentResult.stats.aiEnhanced && enrichmentResult.enriched) {
      await this.recordAIDiscoveries(enrichmentResult, enrichmentContext);
    }

    // Merge enriched requirements into refined scope
    results.requirementsEnrichment = enrichmentResult;
    results.fullAnalysis = this.mergeEnrichedRequirements(results.fullAnalysis, enrichmentResult);

    // Update stats with enrichment metrics
    results.stats = {
      ...(results.stats || {}),
      enrichmentRatio: enrichmentResult.stats.enrichmentRatio,
      patternsUsed: enrichmentResult.stats.patternsUsed,
      aiEnhanced: enrichmentResult.stats.aiEnhanced,
      enrichmentCost: enrichmentResult.stats.cost
    };

    // Log summary
    console.log(`   [OK] Enriched: ${enrichmentResult.stats.originalCount} -> ${enrichmentResult.stats.enrichedCount} requirements`);
    console.log(`   [INFO] Pattern Coverage: ${enrichmentResult.stats.confidence}%`);
    if (enrichmentResult.stats.aiEnhanced) {
      console.log(`   [AI] AI Enhanced: ₹${enrichmentResult.stats.cost}`);
    }

    return results;
  }

  /**
   * Extract base requirements from full analysis
   */
  extractBaseRequirements(fullAnalysis) {
    // Try to get modules from various places in the analysis
    if (fullAnalysis.extractedIntent?.modules) {
      return fullAnalysis.extractedIntent.modules;
    }
    if (fullAnalysis.refinedScope?.modules) {
      return fullAnalysis.refinedScope.modules.map(m => typeof m === 'string' ? m : m.name || m);
    }
    if (fullAnalysis.plan?.modules) {
      return fullAnalysis.plan.modules.map(m => typeof m === 'string' ? m : m.name || m);
    }
    
    // Fallback: empty array
    return [];
  }

  /**
   * Assess complexity of requirements
   */
  assessComplexity(requirements) {
    if (!Array.isArray(requirements)) return 'standard';
    
    const reqText = requirements.join(' ').toLowerCase();
    const complexKeywords = ['advanced', 'custom', 'complex', 'sophisticated', 'realtime', 'ml', 'ai', 'machine learning'];
    const simpleKeywords = ['basic', 'standard', 'common', 'typical', 'simple'];
    
    let score = 0;
    for (const keyword of complexKeywords) {
      if (reqText.includes(keyword)) score += 2;
    }
    for (const keyword of simpleKeywords) {
      if (reqText.includes(keyword)) score -= 1;
    }
    
    if (requirements.length > 15) score += 1;
    if (requirements.length < 5) score -= 1;
    
    if (score >= 2) return 'complex';
    if (score <= -1) return 'simple';
    return 'standard';
  }

  /**
   * Assess novelty of domain
   */
  assessNovelty(domainContext) {
    if (!domainContext) return 30; // Default medium novelty
    
    const commonDomains = ['ecommerce', 'saas', 'crm', 'erp', 'website', 'webapp'];
    const domainText = (domainContext.industry || '').toLowerCase();
    
    if (commonDomains.some(d => domainText.includes(d))) {
      return 20; // Low novelty
    }
    
    return 60; // Medium-high novelty
  }

  /**
   * Record AI discoveries to pattern library
   */
  async recordAIDiscoveries(enrichmentResult, context) {
    if (!enrichmentResult.enriched) return;
    
    // Record domain-specific discoveries
    if (enrichmentResult.enriched.domainSpecific?.length > 0) {
      for (const item of enrichmentResult.enriched.domainSpecific) {
        await this.patternLibrary.recordDiscovery('domain', item, context);
      }
    }
    
    // Record edge case discoveries
    if (enrichmentResult.enriched.edgeCases?.length > 0) {
      for (const edgeCase of enrichmentResult.enriched.edgeCases) {
        const caseText = typeof edgeCase === 'string' ? edgeCase : edgeCase.case || edgeCase.description || edgeCase;
        await this.patternLibrary.recordDiscovery('edgeCases', caseText, context);
      }
    }
  }

  /**
   * Merge enriched requirements into refined scope
   */
  mergeEnrichedRequirements(fullAnalysis, enrichmentResult) {
    if (!enrichmentResult.enriched) return fullAnalysis;
    
    // Create enriched modules list
    const enrichedModules = [
      ...enrichmentResult.enriched.explicit || [],
      ...enrichmentResult.enriched.implicit || [],
      ...enrichmentResult.enriched.domainSpecific || []
    ];
    
    // Update refined scope if it exists
    if (fullAnalysis.refinedScope) {
      fullAnalysis.refinedScope.enrichedModules = enrichedModules;
      fullAnalysis.refinedScope.totalModules = enrichedModules.length;
      
      // Add edge cases
      if (enrichmentResult.enriched.edgeCases?.length > 0) {
        fullAnalysis.refinedScope.edgeCases = enrichmentResult.enriched.edgeCases;
      }
      
      // Add compliance requirements
      if (enrichmentResult.enriched.compliance?.length > 0) {
        fullAnalysis.refinedScope.compliance = enrichmentResult.enriched.compliance;
      }
    }
    
    // Add enrichment metadata
    fullAnalysis.enrichment = {
      originalCount: enrichmentResult.stats.originalCount,
      enrichedCount: enrichmentResult.stats.enrichedCount,
      ratio: enrichmentResult.stats.enrichmentRatio,
      patternsUsed: enrichmentResult.stats.patternsUsed,
      aiEnhanced: enrichmentResult.stats.aiEnhanced,
      confidence: enrichmentResult.stats.confidence,
      recommendations: enrichmentResult.recommendations,
      warnings: enrichmentResult.warnings
    };
    
    return fullAnalysis;
  }
}

module.exports = ChainExecutorStep2;

