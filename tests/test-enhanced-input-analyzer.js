/**
 * Test Enhanced Input Analyzer
 */

const InputAnalyzer = require('../src/modules/input-analyzer');
const Logger = require('../src/utils/logger');

function testEnhancedAnalyzer() {
  console.log('🧪 Testing Enhanced Input Analyzer...\n');
  
  const logger = new Logger();
  const analyzer = new InputAnalyzer(logger);
  
  // Enable quality analysis
  process.env.USE_QUALITY_ANALYSIS = 'true';
  
  const testCases = [
    {
      name: 'Vague input',
      input: 'I need a website',
      expectedFeasibility: 'too-vague'
    },
    {
      name: 'Medium quality input',
      input: `I need an e-commerce website with:
        - Product catalog
        - Shopping cart
        - Payment integration
        Budget: 5-10 lakhs
        Timeline: 3 months`,
      expectedFeasibility: 'needs-clarification'
    },
    {
      name: 'Good quality input',
      input: `E-commerce platform requirements:
        - Product catalog with 1000+ products
        - Shopping cart and checkout
        - Payment gateway (Razorpay)
        - Admin panel for inventory
        - Customer accounts
        - Order tracking
        - Mobile responsive web app
        Users: 100-500 daily
        Budget: ₹8-12 lakhs
        Timeline: 3-4 months
        Platform: Web (React + Node.js preferred)`,
      expectedFeasibility: 'ready'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log('Input:', testCase.input.substring(0, 50) + '...');
    
    try {
      const analysis = analyzer.analyze(testCase.input, { useQualityAnalysis: true });
      
      console.log('Results:');
      console.log(`  Completeness: ${analysis.completeness?.toFixed(1) || 'N/A'}%`);
      console.log(`  Specificity: ${analysis.specificity?.toFixed(1) || 'N/A'}%`);
      console.log(`  Clarity: ${analysis.clarity?.toFixed(1) || 'N/A'}%`);
      console.log(`  Feasibility: ${analysis.feasibility || 'N/A'}`);
      console.log(`  Confidence: ${analysis.confidence?.toFixed(1) || 'N/A'}%`);
      console.log(`  Missing Critical: ${analysis.missingCritical?.join(', ') || 'None'}`);
      console.log(`  Recommendations: ${analysis.recommendations?.length || 0} items`);
      
      const testPassed = analysis.feasibility === testCase.expectedFeasibility;
      if (testPassed) {
        console.log(`  Test: ✅ PASSED`);
        passed++;
      } else {
        console.log(`  Test: ❌ FAILED (expected ${testCase.expectedFeasibility}, got ${analysis.feasibility})`);
        failed++;
      }
    } catch (error) {
      console.error(`  Test: ❌ ERROR - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n\nTest Summary:`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Total: ${passed + failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

testEnhancedAnalyzer();

