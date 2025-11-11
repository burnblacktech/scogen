// tests/test-end-to-end.js
// End-to-end test for full chain (Steps 1-5)

const { initializeSystem } = require('../src/index');
const ChainExecutorStep5 = require('../src/modules/chain-executor-step5');

async function testEndToEnd() {
  console.log('🧪 Testing End-to-End Flow (Steps 1-5)\n');
  console.log('='.repeat(80));
  
  // Initialize system components (same as server)
  const system = initializeSystem();
  const { config, logger, db, library } = system;
  
  // Create Step 5 executor
  const executor = new ChainExecutorStep5(config, logger, db, library);
  
  // Test case: E-commerce platform
  const testInput = `
    I need an e-commerce platform for selling electronics in India.
    Features needed:
    - User registration and login
    - Product catalog with categories
    - Shopping cart
    - Payment gateway integration (Razorpay)
    - Order management
    - Admin dashboard
    
    Budget: ₹3,00,000
    Timeline: 8 weeks
    Expected users: 1000+
  `;
  
  const options = {
    projectDetails: {
      projectScale: 'sme',
      marketRegion: 'ecommerce-india',
      businessModel: 'b2c'
    },
    maxBudget: 300000,
    targetDeadline: 56, // 8 weeks in days
    expectedUsers: 1000
  };
  
  console.log('\n📝 Input:');
  console.log(testInput);
  console.log('\n⚙️  Options:', JSON.stringify(options, null, 2));
  
  try {
    console.log('\n🚀 Executing Full Chain (Steps 1-5)...\n');
    const startTime = Date.now();
    
    const result = await executor.execute(testInput, options);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Execution Complete (${duration}s)\n`);
    console.log('='.repeat(80));
    
    // Display results summary
    console.log('\n📊 Results Summary:');
    console.log(`   Action: ${result.action || 'FULL_ANALYSIS'}`);
    console.log(`   Trust Score: ${result.analysis?.trust?.score || 'N/A'}`);
    console.log(`   Routing: ${result.routing?.path || 'N/A'}`);
    
    // Step 2: Requirements Enrichment
    if (result.requirementsEnrichment) {
      console.log(`\n📋 Step 2: Requirements Enrichment`);
      console.log(`   Original Requirements: ${result.requirementsEnrichment.stats?.originalCount || 0}`);
      console.log(`   Enriched Requirements: ${result.requirementsEnrichment.stats?.enrichedCount || 0}`);
      console.log(`   Enrichment Ratio: ${result.requirementsEnrichment.stats?.enrichmentRatio?.toFixed(1) || 0}x`);
    }
    
    // Step 3: Technical Decomposition
    if (result.technicalDecomposition) {
      console.log(`\n🔨 Step 3: Technical Decomposition`);
      console.log(`   Total Modules: ${result.technicalDecomposition.modules.length}`);
      console.log(`   Total Deliverables: ${result.technicalDecomposition.stats.totalDeliverables}`);
      console.log(`   Total Cost: ₹${result.technicalDecomposition.totalCost.toLocaleString('en-IN')}`);
      console.log(`   Timeline: ${result.technicalDecomposition.timeline.recommendedDays} days`);
    }
    
    // Step 4: Risk Assessment
    if (result.riskAssessment) {
      console.log(`\n⚠️  Step 4: Risk Assessment`);
      console.log(`   Risks Identified: ${result.riskAssessment.identifiedRisks.length}`);
      console.log(`   Risk Level: ${result.riskAssessment.level.toUpperCase()}`);
      console.log(`   Risk Score: ${Math.round(result.riskAssessment.riskScore)}%`);
      console.log(`   Confidence: ${result.riskAssessment.confidence}%`);
      console.log(`   Cost Buffer: ${Math.round((result.riskAssessment.recommendedBuffers.cost - 1) * 100)}%`);
      console.log(`   Time Buffer: ${Math.round((result.riskAssessment.recommendedBuffers.time - 1) * 100)}%`);
    }
    
    // Step 5: Scenario Generation
    if (result.scenarios && result.scenarios.length > 0) {
      console.log(`\n🎯 Step 5: Scenario Generation`);
      console.log(`   Scenarios Generated: ${result.scenarios.length}`);
      console.log(`   Recommended: ${result.scenarioRecommendation?.primary || 'N/A'}`);
      
      console.log(`\n   Scenarios:`);
      for (const scenario of result.scenarios) {
        const budgetFit = scenario.constraintFit?.budget === 'fits' || scenario.constraintFit?.budget === 'perfect' ? '✅' : 
                         scenario.constraintFit?.budget === 'close' ? '⚠️' : '❌';
        const timelineFit = scenario.constraintFit?.timeline === 'fits' || scenario.constraintFit?.timeline === 'perfect' ? '✅' : 
                           scenario.constraintFit?.timeline === 'close' ? '⚠️' : '❌';
        
        console.log(`\n     ${scenario.recommended ? '⭐' : '○'} ${scenario.name}`);
        console.log(`       Cost: ₹${scenario.cost.withContingency.toLocaleString('en-IN')} ${budgetFit}`);
        console.log(`       Timeline: ${scenario.timeline.days} days ${timelineFit}`);
        console.log(`       Modules: ${Array.isArray(scenario.modules) ? scenario.modules.length : 0}`);
        console.log(`       Suitability: ${scenario.suitability}%`);
        
        if (scenario.phases && scenario.phases.length > 0) {
          console.log(`       Phases: ${scenario.phases.length}`);
          for (const phase of scenario.phases) {
            console.log(`         - ${phase.name}: ₹${phase.cost.toLocaleString('en-IN')} (${phase.timeline} days)`);
          }
        }
      }
      
      console.log(`\n   Recommendation:`);
      console.log(`     Primary: ${result.scenarioRecommendation?.primary || 'N/A'}`);
      console.log(`     Reasoning: ${result.scenarioRecommendation?.reasoning || 'N/A'}`);
      console.log(`     Key Insight: ${result.scenarioRecommendation?.keyInsight || 'N/A'}`);
    }
    
    // Baseline Estimate
    if (result.baselineEstimate) {
      console.log(`\n📈 Baseline Estimate:`);
      console.log(`   Cost: ₹${result.baselineEstimate.cost.total.toLocaleString('en-IN')}`);
      console.log(`   Timeline: ${result.baselineEstimate.timeline.withRisk} days`);
      console.log(`   Risk Level: ${result.baselineEstimate.riskLevel}`);
    }
    
    // Stats
    if (result.stats) {
      console.log(`\n📊 Overall Stats:`);
      console.log(`   ${JSON.stringify(result.stats, null, 2)}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ End-to-end test complete!');
    
    // Validation
    const hasAllSteps = result.requirementsEnrichment && 
                       result.technicalDecomposition && 
                       result.riskAssessment && 
                       result.scenarios;
    
    if (hasAllSteps) {
      console.log('\n✅ All 5 steps executed successfully!');
      console.log('   ✅ Step 1: Trust Scoring & Routing');
      console.log('   ✅ Step 2: Requirements Enrichment');
      console.log('   ✅ Step 3: Technical Decomposition');
      console.log('   ✅ Step 4: Risk Assessment');
      console.log('   ✅ Step 5: Scenario Generation');
    } else {
      console.log('\n⚠️  Some steps may be missing:');
      if (!result.requirementsEnrichment) console.log('   ❌ Step 2: Requirements Enrichment');
      if (!result.technicalDecomposition) console.log('   ❌ Step 3: Technical Decomposition');
      if (!result.riskAssessment) console.log('   ❌ Step 4: Risk Assessment');
      if (!result.scenarios) console.log('   ❌ Step 5: Scenario Generation');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testEndToEnd().catch(console.error);

