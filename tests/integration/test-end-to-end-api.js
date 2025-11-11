// tests/integration/test-end-to-end-api.js
// Integration Test: Full flow from API request to response

const { initializeSystem } = require('../../src/index');
const ChainExecutorStep5 = require('../../src/modules/chain-executor-step5');

/**
 * Test full end-to-end flow without HTTP layer
 * Tests: Input → ChainExecutorStep5 → Response Structure
 */
async function testEndToEndFlow() {
  console.log('🧪 End-to-End Integration Test\n');
  console.log('='.repeat(80));
  
  // Initialize system
  console.log('\n📦 Initializing system...');
  const system = initializeSystem();
  const { config, logger, db, library } = system;
  
  // Set environment for full chain
  process.env.ENABLE_FULL_CHAIN = 'true';
  
  // Create executor
  console.log('🔧 Creating ChainExecutorStep5...');
  const executor = new ChainExecutorStep5(config, logger, db, library);
  
  // Test input
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
    targetDeadline: 56,
    expectedUsers: 1000
  };
  
  console.log('\n📝 Test Input:');
  console.log(`  Length: ${testInput.length} characters`);
  console.log(`  Options: ${JSON.stringify(options, null, 2)}`);
  
  try {
    console.log('\n🚀 Executing full chain...');
    const startTime = Date.now();
    
    const result = await executor.execute(testInput, options);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Execution complete in ${duration}s\n`);
    
    // Verify result structure
    console.log('='.repeat(80));
    console.log('\n📊 Verifying Response Structure:\n');
    
    const checks = [];
    
    // Check scenarios
    if (result.scenarios && Array.isArray(result.scenarios) && result.scenarios.length > 0) {
      console.log(`✅ Scenarios: ${result.scenarios.length} scenarios generated`);
      checks.push({ name: 'Scenarios array', passed: true });
      
      // Verify scenario structure
      const firstScenario = result.scenarios[0];
      const requiredFields = ['type', 'name', 'cost', 'timeline', 'suitability'];
      const missingFields = requiredFields.filter(field => !(field in firstScenario));
      
      if (missingFields.length === 0) {
        console.log(`  ✅ Scenario structure valid (has: ${requiredFields.join(', ')})`);
        checks.push({ name: 'Scenario structure', passed: true });
      } else {
        console.log(`  ❌ Scenario missing fields: ${missingFields.join(', ')}`);
        checks.push({ name: 'Scenario structure', passed: false });
      }
    } else {
      console.log(`❌ Scenarios: Missing or empty`);
      checks.push({ name: 'Scenarios array', passed: false });
    }
    
    // Check baseline estimate
    if (result.baselineEstimate) {
      console.log(`✅ Baseline Estimate: Present`);
      checks.push({ name: 'Baseline estimate', passed: true });
      
      if (result.baselineEstimate.cost && result.baselineEstimate.timeline) {
        console.log(`  ✅ Has cost and timeline`);
        checks.push({ name: 'Baseline estimate structure', passed: true });
      } else {
        console.log(`  ❌ Missing cost or timeline`);
        checks.push({ name: 'Baseline estimate structure', passed: false });
      }
    } else {
      console.log(`❌ Baseline Estimate: Missing`);
      checks.push({ name: 'Baseline estimate', passed: false });
    }
    
    // Check scenario recommendation
    if (result.scenarioRecommendation) {
      console.log(`✅ Scenario Recommendation: Present`);
      checks.push({ name: 'Scenario recommendation', passed: true });
      
      if (result.scenarioRecommendation.primary) {
        console.log(`  ✅ Primary recommendation: ${result.scenarioRecommendation.primary}`);
        checks.push({ name: 'Recommendation primary', passed: true });
      } else {
        console.log(`  ❌ Missing primary recommendation`);
        checks.push({ name: 'Recommendation primary', passed: false });
      }
    } else {
      console.log(`❌ Scenario Recommendation: Missing`);
      checks.push({ name: 'Scenario recommendation', passed: false });
    }
    
    // Check risk assessment
    if (result.riskAssessment) {
      console.log(`✅ Risk Assessment: Present`);
      checks.push({ name: 'Risk assessment', passed: true });
      
      if (result.riskAssessment.identifiedRisks && Array.isArray(result.riskAssessment.identifiedRisks)) {
        console.log(`  ✅ Has ${result.riskAssessment.identifiedRisks.length} identified risks`);
        checks.push({ name: 'Risk assessment risks', passed: true });
      } else {
        console.log(`  ❌ Missing identifiedRisks array`);
        checks.push({ name: 'Risk assessment risks', passed: false });
      }
    } else {
      console.log(`❌ Risk Assessment: Missing`);
      checks.push({ name: 'Risk assessment', passed: false });
    }
    
    // Check technical decomposition
    if (result.technicalDecomposition) {
      console.log(`✅ Technical Decomposition: Present`);
      checks.push({ name: 'Technical decomposition', passed: true });
      
      if (result.technicalDecomposition.modules && Array.isArray(result.technicalDecomposition.modules)) {
        console.log(`  ✅ Has ${result.technicalDecomposition.modules.length} modules`);
        checks.push({ name: 'Technical decomposition modules', passed: true });
      } else {
        console.log(`  ❌ Missing modules array`);
        checks.push({ name: 'Technical decomposition modules', passed: false });
      }
    } else {
      console.log(`❌ Technical Decomposition: Missing`);
      checks.push({ name: 'Technical decomposition', passed: false });
    }
    
    // Check requirements enrichment
    if (result.requirementsEnrichment) {
      console.log(`✅ Requirements Enrichment: Present`);
      checks.push({ name: 'Requirements enrichment', passed: true });
    } else {
      console.log(`⚠️  Requirements Enrichment: Not present (may be optional)`);
      checks.push({ name: 'Requirements enrichment', passed: true }); // Optional
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Verification Summary:\n');
    
    const passed = checks.filter(c => c.passed).length;
    const failed = checks.filter(c => !c.passed).length;
    
    checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}`);
    });
    
    console.log(`\n  Total: ${checks.length} checks`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    
    // Detailed scenario info
    if (result.scenarios && result.scenarios.length > 0) {
      console.log('\n📋 Generated Scenarios:');
      result.scenarios.forEach((scenario, idx) => {
        console.log(`\n  ${idx + 1}. ${scenario.name} (${scenario.type})`);
        console.log(`     Cost: ₹${scenario.cost?.withContingency?.toLocaleString('en-IN') || 'N/A'}`);
        console.log(`     Timeline: ${scenario.timeline?.days || 'N/A'} days`);
        console.log(`     Suitability: ${scenario.suitability || 'N/A'}%`);
        console.log(`     Recommended: ${scenario.recommended ? 'Yes' : 'No'}`);
      });
    }
    
    return {
      success: failed === 0,
      checks,
      passed,
      failed,
      duration,
      result
    };
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run test if executed directly
if (require.main === module) {
  testEndToEndFlow()
    .then(({ success, failed }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testEndToEndFlow };

