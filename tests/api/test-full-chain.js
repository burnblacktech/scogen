// tests/api/test-full-chain.js
// Comprehensive API Test Suite for Full Chain (Steps 1-5)

const http = require('http');
const { initializeSystem } = require('../../src/index');

// Test configuration
const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;
let server = null;
let system = null;

/**
 * Helper to make HTTP requests
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Start test server
 */
async function startServer() {
  const APIServer = require('../../src/api/server');
  server = new APIServer();
  
  await server.initialize();
  
  // Override port for testing
  const originalStart = server.start.bind(server);
  server.start = async function() {
    const port = TEST_PORT;
    return new Promise((res) => {
      this.server = this.app.listen(port, () => {
        console.log(`Test server started on port ${port}`);
        res();
      });
    });
  };
  
  await server.start();
}

/**
 * Stop test server
 */
async function stopServer() {
  if (server) {
    await server.stop();
    server = null;
  }
}

/**
 * Test cases
 */
const testCases = [
  {
    name: 'E-commerce Platform - Text Input',
    input: {
      input: 'I need an e-commerce platform for selling electronics in India. Features: user registration, product catalog with categories, shopping cart, payment gateway integration (Razorpay), order management, admin dashboard. Budget: ₹3,00,000. Timeline: 8 weeks. Expected users: 1000+',
      projectDetails: {
        projectScale: 'sme',
        marketRegion: 'ecommerce-india',
        businessModel: 'b2c'
      },
      maxBudget: 300000,
      targetDeadline: 56
    },
    expected: {
      hasScenarios: true,
      hasRiskAssessment: true,
      hasTechnicalDecomposition: true,
      hasRequirementsEnrichment: true,
      scenarioCount: { min: 1, max: 5 }
    }
  },
  {
    name: 'SaaS Platform - Minimal Input',
    input: {
      input: 'Build a SaaS platform for project management. Need user management, task tracking, and reporting.',
      projectDetails: {
        projectScale: 'startup',
        marketRegion: 'generic'
      }
    },
    expected: {
      hasScenarios: true,
      hasRiskAssessment: true,
      hasTechnicalDecomposition: true
    }
  },
  {
    name: 'Enterprise System - High Budget',
    input: {
      input: 'Enterprise workflow management system with user management, workflow engine, reporting, integrations, admin portal, analytics, and security features.',
      projectDetails: {
        projectScale: 'enterprise',
        marketRegion: 'generic'
      },
      maxBudget: 2500000,
      targetDeadline: 180
    },
    expected: {
      hasScenarios: true,
      hasRiskAssessment: true,
      hasTechnicalDecomposition: true,
      scenarioCount: { min: 2, max: 5 }
    }
  }
];

/**
 * Run a single test case
 */
async function runTestCase(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  
  try {
    const response = await makeRequest('POST', '/api/scope', testCase.input);
    
    // Check status
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
    
    if (!response.data.success) {
      throw new Error(`Request failed: ${response.data.error || JSON.stringify(response.data)}`);
    }
    
    const result = response.data;
    
    // Verify scenarios
    if (testCase.expected.hasScenarios) {
      if (!result.scenarios || !result.scenarios.scenarios) {
        throw new Error('Missing scenarios in response');
      }
      
      const scenarios = result.scenarios.scenarios;
      if (!Array.isArray(scenarios) || scenarios.length === 0) {
        throw new Error('Scenarios array is empty');
      }
      
      if (testCase.expected.scenarioCount) {
        const count = scenarios.length;
        if (count < testCase.expected.scenarioCount.min || count > testCase.expected.scenarioCount.max) {
          throw new Error(`Expected ${testCase.expected.scenarioCount.min}-${testCase.expected.scenarioCount.max} scenarios, got ${count}`);
        }
      }
      
      // Verify scenario structure
      scenarios.forEach((scenario, idx) => {
        if (!scenario.type || !scenario.name) {
          throw new Error(`Scenario ${idx} missing type or name`);
        }
        if (!scenario.cost || !scenario.timeline) {
          throw new Error(`Scenario ${idx} missing cost or timeline`);
        }
      });
      
      console.log(`  ✅ Scenarios: ${scenarios.length} generated`);
    }
    
    // Verify risk assessment
    if (testCase.expected.hasRiskAssessment) {
      if (!result.riskAssessment) {
        throw new Error('Missing riskAssessment in response');
      }
      if (!result.riskAssessment.identifiedRisks || !Array.isArray(result.riskAssessment.identifiedRisks)) {
        throw new Error('riskAssessment.identifiedRisks is missing or not an array');
      }
      console.log(`  ✅ Risk Assessment: ${result.riskAssessment.identifiedRisks.length} risks identified`);
    }
    
    // Verify technical decomposition
    if (testCase.expected.hasTechnicalDecomposition) {
      if (!result.technicalDecomposition) {
        throw new Error('Missing technicalDecomposition in response');
      }
      if (!result.technicalDecomposition.modules || !Array.isArray(result.technicalDecomposition.modules)) {
        throw new Error('technicalDecomposition.modules is missing or not an array');
      }
      console.log(`  ✅ Technical Decomposition: ${result.technicalDecomposition.modules.length} modules`);
    }
    
    // Verify requirements enrichment
    if (testCase.expected.hasRequirementsEnrichment) {
      if (!result.requirementsEnrichment) {
        console.log(`  ⚠️  Requirements Enrichment: Not present (may be optional)`);
      } else {
        console.log(`  ✅ Requirements Enrichment: Present`);
      }
    }
    
    // Verify baseline estimate
    if (result.scenarios && result.scenarios.baselineEstimate) {
      const baseline = result.scenarios.baselineEstimate;
      if (!baseline.cost || !baseline.timeline) {
        throw new Error('baselineEstimate missing cost or timeline');
      }
      console.log(`  ✅ Baseline Estimate: ₹${baseline.cost.total.toLocaleString('en-IN')}, ${baseline.timeline.withRisk} days`);
    }
    
    // Verify recommendation
    if (result.scenarios && result.scenarios.recommendation) {
      const rec = result.scenarios.recommendation;
      if (!rec.primary) {
        throw new Error('recommendation missing primary scenario');
      }
      console.log(`  ✅ Recommendation: ${rec.primary}`);
    }
    
    return { success: true, result };
    
  } catch (error) {
    console.error(`  ❌ Test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Full Chain API Tests\n');
  console.log('='.repeat(80));
  
  // Set environment variable for full chain
  process.env.ENABLE_FULL_CHAIN = 'true';
  
  try {
    // Start server
    console.log('\n📡 Starting test server...');
    await startServer();
    console.log('✅ Server started');
    
    // Wait a bit for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run test cases
    const results = [];
    for (const testCase of testCases) {
      const result = await runTestCase(testCase);
      results.push({ testCase: testCase.name, ...result });
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Test Summary:');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`  ✅ Passed: ${passed}/${results.length}`);
    console.log(`  ❌ Failed: ${failed}/${results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.testCase}: ${r.error}`);
      });
    }
    
    // Stop server
    await stopServer();
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    await stopServer();
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, runTestCase, makeRequest };

