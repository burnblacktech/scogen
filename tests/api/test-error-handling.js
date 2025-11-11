// tests/api/test-error-handling.js
// Test Error Scenarios for API

const http = require('http');

const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

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
 * Test cases for error scenarios
 */
const errorTestCases = [
  {
    name: 'Empty Input',
    input: {},
    expectedStatus: 400,
    expectedError: 'No input provided'
  },
  {
    name: 'Missing Input Field',
    input: {
      projectDetails: { projectScale: 'sme' }
    },
    expectedStatus: 400,
    expectedError: 'No input provided'
  },
  {
    name: 'Invalid JSON',
    input: 'not json',
    skipJson: true, // Send as raw string
    expectedStatus: 400
  },
  {
    name: 'Very Large Input (>50MB)',
    input: {
      input: 'x'.repeat(60 * 1024 * 1024) // 60MB
    },
    expectedStatus: 400,
    expectedError: 'too large'
  },
  {
    name: 'Invalid Project Details Structure',
    input: {
      input: 'Test input',
      projectDetails: 'invalid' // Should be object
    },
    expectedStatus: 200, // May still process, but should handle gracefully
    shouldHaveError: false
  },
  {
    name: 'Missing Required Options',
    input: {
      input: 'Test input',
      projectDetails: null
    },
    expectedStatus: 200, // Should still work with defaults
    shouldHaveError: false
  },
  {
    name: 'Invalid Budget Value',
    input: {
      input: 'Test input',
      maxBudget: 'not a number'
    },
    expectedStatus: 200, // Should handle gracefully
    shouldHaveError: false
  },
  {
    name: 'Negative Budget',
    input: {
      input: 'Test input',
      maxBudget: -1000
    },
    expectedStatus: 200, // Should handle gracefully
    shouldHaveError: false
  }
];

/**
 * Run a single error test case
 */
async function runErrorTestCase(testCase) {
  console.log(`\n🧪 Testing Error: ${testCase.name}`);
  
  try {
    let response;
    
    if (testCase.skipJson) {
      // Send as raw string for invalid JSON test
      const url = new URL('/api/scope', BASE_URL);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };
      
      response = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              resolve({ status: res.statusCode, data: parsed });
            } catch (e) {
              resolve({ status: res.statusCode, data: body });
            }
          });
        });
        req.on('error', reject);
        req.write(testCase.input);
        req.end();
      });
    } else {
      response = await makeRequest('POST', '/api/scope', testCase.input);
    }
    
    // Check status code
    if (testCase.expectedStatus) {
      if (response.status !== testCase.expectedStatus) {
        throw new Error(`Expected status ${testCase.expectedStatus}, got ${response.status}`);
      }
      console.log(`  ✅ Status: ${response.status} (expected ${testCase.expectedStatus})`);
    }
    
    // Check error message
    if (testCase.expectedError) {
      const errorText = JSON.stringify(response.data).toLowerCase();
      if (!errorText.includes(testCase.expectedError.toLowerCase())) {
        throw new Error(`Expected error message containing "${testCase.expectedError}", got: ${JSON.stringify(response.data)}`);
      }
      console.log(`  ✅ Error message contains: "${testCase.expectedError}"`);
    }
    
    // Check if should have error
    if (testCase.shouldHaveError === false) {
      if (response.data.error) {
        console.log(`  ⚠️  Has error but shouldn't: ${response.data.error}`);
      } else {
        console.log(`  ✅ No error (as expected)`);
      }
    }
    
    // Verify error response structure
    if (response.status >= 400) {
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Error response should be a JSON object');
      }
      if (!response.data.success === false && !response.data.error) {
        console.log(`  ⚠️  Error response missing 'error' field, but has: ${Object.keys(response.data).join(', ')}`);
      } else {
        console.log(`  ✅ Error response structure valid`);
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error(`  ❌ Test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runErrorTests() {
  console.log('🚀 Starting Error Handling Tests\n');
  console.log('='.repeat(80));
  
  // Set environment variable for full chain
  process.env.ENABLE_FULL_CHAIN = 'true';
  
  try {
    // Note: Server should be started by test runner
    // This assumes server is already running on TEST_PORT
    
    // Wait a bit for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run test cases
    const results = [];
    for (const testCase of errorTestCases) {
      const result = await runErrorTestCase(testCase);
      results.push({ testCase: testCase.name, ...result });
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Error Test Summary:');
    
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
    
    return { passed, failed, total: results.length };
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    throw error;
  }
}

// Run tests if executed directly
if (require.main === module) {
  runErrorTests()
    .then(({ passed, failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runErrorTests, runErrorTestCase };

