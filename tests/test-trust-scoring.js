/**
 * Test suite for Trust Scoring & Smart Routing
 * 
 * Tests trust signal analysis, intent detection, and routing decisions
 */

const InputAnalyzerEnhanced = require('../src/modules/input-analyzer-enhanced');
const SmartRouter = require('../src/modules/smart-router');
const Logger = require('../src/utils/logger');
const ConfigManager = require('../src/utils/config-manager');

async function testTrustScoring() {
  console.log('🧪 Testing Trust Scoring & Smart Routing\n');
  console.log('='.repeat(60));
  
  // Initialize logger
  const config = new ConfigManager();
  const logger = new Logger(config);
  
  const analyzer = new InputAnalyzerEnhanced(logger);
  const router = new SmartRouter();
  
  const testCases = [
    {
      name: '✅ Serious Client',
      input: `We need an e-commerce platform for our retail business.
              Currently using Excel for inventory management.
              Need to handle 500-1000 products initially.
              Budget: 8-10 lakhs
              Timeline: 3 months
              Platform: Web (React preferred), Mobile apps later`,
      expectedTrust: 'high',
      expectedRoute: 'FULL_ANALYSIS'
    },
    {
      name: '⚠️ Price Shopper',
      input: `Need rough estimate for online store.
              Just checking prices for comparison.
              Basic e-commerce features needed.`,
      expectedTrust: 'low',
      expectedRoute: 'GUIDED_CLARIFICATION'
    },
    {
      name: '🚩 Equity Dreamer',
      input: `Revolutionary platform like Amazon but better!
              Can offer equity instead of payment.
              This will be next unicorn.
              Need everything ASAP.`,
      expectedTrust: 'very_low',
      expectedRoute: 'EDUCATIONAL'
    },
    {
      name: '📄 Tender Filler',
      input: `Required technical and commercial proposal for RFP.
              E-governance portal development.
              Tender submission deadline tomorrow.
              Need detailed technical specifications for L1 pricing.`,
      expectedTrust: 'low',
      expectedRoute: 'TEMPLATE_ONLY'
    },
    {
      name: '🎓 Student Project',
      input: `College final year project.
              Social media app with AI features.
              Learning purpose only.
              Can you guide us?`,
      expectedTrust: 'very_low',
      expectedRoute: 'EDUCATIONAL'
    },
    {
      name: '✔️ Validator Client',
      input: `We have a quote from another vendor for 15 lakhs.
              Want to validate if the pricing is fair.
              Project is inventory management system with 20 modules.
              Can you review and provide second opinion?`,
      expectedTrust: 'medium',
      expectedRoute: 'VALIDATION_FLOW'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('-'.repeat(50));
    
    try {
      // Analyze input
      const analysis = await analyzer.analyze(testCase.input);
      
      // Display results
      console.log(`Input: "${testCase.input.substring(0, 60)}..."`);
      console.log(`\n📊 Analysis Results:`);
      console.log(`   Quality Score: ${analysis.confidence || analysis.completeness}%`);
      console.log(`   Trust Score: ${analysis.trust?.score || 0}%`);
      console.log(`   Trust Level: ${analysis.trust?.confidence || 'N/A'}`);
      console.log(`   Client Intent: ${analysis.intent?.primary || 'unknown'}`);
      console.log(`   Routing: ${analysis.routing?.path || 'UNKNOWN'}`);
      
      // Show signals
      if (analysis.trust?.signals?.positive?.length > 0) {
        console.log(`   ✅ Positive: ${analysis.trust.signals.positive.join(', ')}`);
      }
      if (analysis.trust?.signals?.negative?.length > 0) {
        console.log(`   ❌ Negative: ${analysis.trust.signals.negative.join(', ')}`);
      }
      
      // Show flags
      if (analysis.trust?.flags?.length > 0) {
        console.log(`   ⚠️ Flags:`);
        analysis.trust.flags.forEach(flag => {
          console.log(`      - ${flag.message} (${flag.severity})`);
        });
      }
      
      // Test routing
      const routingResult = await router.route(analysis, testCase.input);
      console.log(`\n🚦 Routing Decision:`);
      console.log(`   Path: ${routingResult.routing?.path || 'UNKNOWN'}`);
      console.log(`   Proceed: ${routingResult.proceed}`);
      console.log(`   Message: ${routingResult.message}`);
      
      // Validate expectations
      const trustScore = analysis.trust?.score || 0;
      const trustMatch = 
        (testCase.expectedTrust === 'high' && trustScore >= 70) ||
        (testCase.expectedTrust === 'medium' && trustScore >= 40 && trustScore < 70) ||
        (testCase.expectedTrust === 'low' && trustScore >= 20 && trustScore < 40) ||
        (testCase.expectedTrust === 'very_low' && trustScore < 20);
        
      const routeMatch = analysis.routing?.path === testCase.expectedRoute;
      
      const testPassed = trustMatch && routeMatch;
      if (testPassed) {
        passed++;
        console.log(`\n✓ Trust Expectation: ✅ PASS`);
        console.log(`✓ Route Expectation: ✅ PASS`);
      } else {
        failed++;
        console.log(`\n✓ Trust Expectation: ${trustMatch ? '✅ PASS' : '❌ FAIL'} (Expected: ${testCase.expectedTrust}, Got: ${trustScore})`);
        console.log(`✓ Route Expectation: ${routeMatch ? '✅ PASS' : '❌ FAIL'} (Expected: ${testCase.expectedRoute}, Got: ${analysis.routing?.path})`);
      }
      
    } catch (error) {
      failed++;
      console.error(`\n❌ Test failed with error: ${error.message}`);
      console.error(error.stack);
    }
    
    console.log('='.repeat(50));
  }
  
  // Summary
  console.log('\n📈 Test Summary:');
  console.log(`   Total Tests: ${testCases.length}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n📊 Trust Scoring Summary:`);
  console.log('- High trust clients get full analysis');
  console.log('- Medium trust clients get clarification questions');
  console.log('- Low trust clients get educational content');
  console.log('- Tender/RFP requests get templates only');
  console.log('- Quote validation gets different flow');
  
  if (failed === 0) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log(`\n⚠️ ${failed} test(s) failed. Review the output above.`);
  }
  
  return { passed, failed, total: testCases.length };
}

// Run tests if executed directly
if (require.main === module) {
  testTrustScoring()
    .then(({ passed, failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testTrustScoring };

