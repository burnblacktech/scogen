// src/modules/chain-executor-step5.js
// Chain Executor with Intelligent Scenario Generation (Step 5)

const ChainExecutorStep4 = require('./chain-executor-step4');
const ScenarioGeneratorV2 = require('./scenario-generator-v2');

class ChainExecutorStep5 extends ChainExecutorStep4 {
  constructor(config, logger, db, library) {
    super(config, logger, db, library);
    this.scenarioGenerator = new ScenarioGeneratorV2();
  }

  /**
   * Execute chain with intelligent scenario generation
   * @param {string} input - User input
   * @param {Object} options - Options including request object for context
   * @returns {Object} Execution results with scenario information
   */
  async execute(input, options = {}) {
    const { performance } = require('perf_hooks');
    const stepStartTime = performance.now();
    
    try {
      // Run Steps 0-4 from parent (trust scoring/routing/enrichment/decomposition/risk)
      const results = await super.execute(input, options);
      
      // If earlier steps didn't proceed, return
      if (!results.riskAssessment) {
        this.logger.warn('Step 5 skipped: Risk assessment not available from previous steps');
        return results;
      }

      // Validate required data for scenario generation
      if (!results.technicalDecomposition) {
        const error = new Error('Technical decomposition is required for scenario generation but was not found');
        error.code = 'MISSING_DEPENDENCY';
        error.context = {
          step: 'Step 5: Scenario Generation',
          missing: 'technicalDecomposition',
          available: Object.keys(results).filter(k => k !== 'technicalDecomposition')
        };
        this.logger.error('Step 5 failed: Missing technical decomposition', error.context);
        throw error;
      }

      // Step 5: Intelligent Scenario Generation
      console.log('\n🎯 Step 5: Generating Intelligent Scenarios...');
      this.logger.info('Step 5: Starting scenario generation', {
        hasTechnicalDecomposition: !!results.technicalDecomposition,
        hasRiskAssessment: !!results.riskAssessment,
        hasRequirementsEnrichment: !!results.requirementsEnrichment
      });

      // Extract client profile from trust analysis
      const clientProfile = results.analysis?.trust ? {
        clientSize: results.analysis.trust.clientSize || 'sme',
        budgetClarity: results.analysis.trust.budgetClarity || 'clear',
        committeeDecision: results.analysis.trust.committeeDecision || false,
        hadFailure: results.analysis.trust.hadFailure || false,
        urgency: results.analysis.trust.urgency || 'normal',
        riskTolerance: results.analysis.trust.riskTolerance || 'medium',
        riskLevel: results.analysis.trust.riskLevel || 'low'
      } : results.clientProfile || {};

      // Generate scenarios with full context
      let scenarioResults;
      try {
        scenarioResults = await this.scenarioGenerator.generateScenarios(
          results.technicalDecomposition,
          results.riskAssessment,
          results.requirementsEnrichment,
          clientProfile,
          {
            ...options,
            domain: results.fullAnalysis?.domainContext?.industry || options.projectDetails?.marketRegion || 'generic',
            urgency: this.assessUrgency(options, results)
          }
        );
      } catch (scenarioError) {
        const error = new Error(`Scenario generation failed: ${scenarioError.message}`);
        error.code = 'SCENARIO_GENERATION_FAILED';
        error.context = {
          step: 'Step 5: Scenario Generation',
          originalError: scenarioError.message,
          inputLength: input.length,
          hasTechnicalDecomposition: !!results.technicalDecomposition,
          hasRiskAssessment: !!results.riskAssessment
        };
        this.logger.error('Scenario generation failed', {
          error: scenarioError.message,
          stack: scenarioError.stack,
          context: error.context
        });
        throw error;
      }

      // Validate scenario results
      if (!scenarioResults || !scenarioResults.scenarios) {
        const error = new Error('Scenario generator returned invalid results: missing scenarios array');
        error.code = 'INVALID_SCENARIO_RESULTS';
        error.context = {
          step: 'Step 5: Scenario Generation',
          returnedKeys: scenarioResults ? Object.keys(scenarioResults) : ['null']
        };
        this.logger.error('Invalid scenario results', error.context);
        throw error;
      }

      // Add scenarios to results
      results.scenarios = scenarioResults.scenarios;
      results.baselineEstimate = scenarioResults.baseline;
      results.scenarioRecommendation = scenarioResults.recommendation;

      // Update stats
      results.stats = {
        ...(results.stats || {}),
        scenariosGenerated: scenarioResults.scenarios.length,
        recommendedScenario: scenarioResults.recommendation?.primary || 'unknown'
      };

    // Log summary
    console.log(`   ✅ Generated ${scenarioResults.scenarios.length} scenarios`);
    console.log('\n   Baseline Estimate:');
    console.log(`     Cost: ₹${scenarioResults.baseline.cost.total.toLocaleString('en-IN')}`);
    console.log(`     Timeline: ${scenarioResults.baseline.timeline.withRisk} days`);
    console.log(`     Risk Level: ${scenarioResults.baseline.riskLevel}`);

    console.log('\n   Scenarios Generated:');
    for (const scenario of scenarioResults.scenarios) {
      const budgetFit = scenario.constraintFit?.budget === 'fits' || scenario.constraintFit?.budget === 'perfect' ? '✅' : 
                       scenario.constraintFit?.budget === 'close' ? '⚠️' : '❌';
      const timelineFit = scenario.constraintFit?.timeline === 'fits' || scenario.constraintFit?.timeline === 'perfect' ? '✅' : 
                         scenario.constraintFit?.timeline === 'close' ? '⚠️' : '❌';
      
      console.log(`\n     ${scenario.recommended ? '⭐' : '○'} ${scenario.name}`);
      console.log(`       Cost: ₹${scenario.cost.withContingency.toLocaleString('en-IN')} ${budgetFit}`);
      console.log(`       Timeline: ${scenario.timeline.days} days ${timelineFit}`);
      console.log(`       Modules: ${Array.isArray(scenario.modules) ? scenario.modules.length : (scenario.modules || 0)}`);
      console.log(`       Team Size: ${scenario.resources.totalHeadcount}`);
      console.log(`       Suitability: ${scenario.suitability}%`);
      
      if (scenario.phases && scenario.phases.length > 0) {
        console.log(`       Phases: ${scenario.phases.length}`);
        for (const phase of scenario.phases) {
          console.log(`         - ${phase.name}: ₹${phase.cost.toLocaleString('en-IN')} (${phase.timeline} days)`);
        }
      }
    }

      console.log(`\n   📌 Recommendation: ${scenarioResults.recommendation.primary}`);
      console.log(`      Reason: ${scenarioResults.recommendation.reasoning}`);
      console.log(`      Key Insight: ${scenarioResults.recommendation.keyInsight}`);

      const stepDuration = ((performance.now() - stepStartTime) / 1000).toFixed(2);
      this.logger.info('Step 5 completed successfully', {
        scenariosGenerated: scenarioResults.scenarios.length,
        recommendedScenario: scenarioResults.recommendation.primary,
        duration: `${stepDuration}s`
      });

      // Log if step took too long
      const stepTimeout = this.config?.get?.('performance.stepTimeout') || 30000; // 30 seconds default
      if (performance.now() - stepStartTime > stepTimeout) {
        this.logger.warn('Step 5 took longer than expected', {
          duration: `${stepDuration}s`,
          scenariosCount: scenarioResults.scenarios.length
        });
      }

      return results;
    } catch (error) {
      // Enhance error with context
      if (!error.code) {
        error.code = 'STEP5_EXECUTION_ERROR';
      }
      if (!error.context) {
        error.context = {
          step: 'Step 5: Scenario Generation',
          inputLength: input?.length || 0,
          hasOptions: !!options
        };
      }
      
      this.logger.error('Step 5 execution failed', {
        error: error.message,
        code: error.code,
        context: error.context,
        stack: error.stack
      });
      
      // Re-throw with enhanced context
      throw error;
    }
  }

  // Assess urgency from options and context
  assessUrgency(options, results) {
    if (options.urgency) return options.urgency;
    
    if (options.timeline === 'urgent' || options.targetDeadline) {
      const baseline = results.riskAdjustedEstimate?.total?.timeline || 
                      results.technicalDecomposition?.timeline?.recommendedDays || 60;
      if (options.targetDeadline && options.targetDeadline < baseline * 0.8) {
        return 'high';
      }
    }

    if (results.clientProfile?.urgency === 'high' || results.analysis?.trust?.urgency === 'high') return 'high';

    return 'normal';
  }
}

module.exports = ChainExecutorStep5;

