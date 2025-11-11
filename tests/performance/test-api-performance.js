// tests/performance/test-api-performance.js
// Performance Test Suite for API

const http = require('http');
const { performance } = require('perf_hooks');

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
      },
      timeout: 120000 // 2 minute timeout for performance tests
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Test cases with different input sizes
 */
const performanceTestCases = [
  {
    name: 'Small Input (1KB)',
    input: {
      input: 'I need a simple website with contact form and about page.',
      projectDetails: { projectScale: 'startup' }
    },
    expectedMaxTime: 15000 // 15 seconds
  },
  {
    name: 'Medium Input (10KB)',
    input: {
      input: 'E-commerce platform for electronics. ' + 
             'Features: user registration, product catalog with categories, shopping cart, ' +
             'payment gateway integration (Razorpay), order management, admin dashboard. ' +
             'Budget: ₹3,00,000. Timeline: 8 weeks. Expected users: 1000+'.repeat(50),
      projectDetails: {
        projectScale: 'sme',
        marketRegion: 'ecommerce-india'
      },
      maxBudget: 300000,
      targetDeadline: 56
    },
    expectedMaxTime: 30000 // 30 seconds
  },
  {
    name: 'Large Input (100KB)',
    input: {
      input: 'Enterprise workflow management system. ' +
             'Detailed requirements: user management, workflow engine, reporting, ' +
             'integrations, admin portal, analytics, security features. ' +
             'Multiple modules with complex business logic. '.repeat(500),
      projectDetails: {
        projectScale: 'enterprise',
        marketRegion: 'generic'
      },
      maxBudget: 2500000,
      targetDeadline: 180
    },
    expectedMaxTime: 60000 // 60 seconds
  }
];

/**
 * Run a single performance test
 */
async function runPerformanceTest(testCase) {
  console.log(`\n⏱️  Testing: ${testCase.name}`);
  
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  
  try {
    const response = await makeRequest('POST', '/api/scope', testCase.input);
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const duration = endTime - startTime;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    const memoryDeltaMB = (memoryDelta / 1024 / 1024).toFixed(2);
    
    console.log(`  ⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`  💾 Memory: +${memoryDeltaMB}MB`);
    console.log(`  📊 Status: ${response.status}`);
    
    if (duration > testCase.expectedMaxTime) {
      console.log(`  ⚠️  Duration exceeds expected max (${testCase.expectedMaxTime / 1000}s)`);
    } else {
      console.log(`  ✅ Duration within expected range`);
    }
    
    return {
      success: response.status === 200,
      duration,
      memoryDeltaMB: parseFloat(memoryDeltaMB),
      status: response.status,
      withinExpectedTime: duration <= testCase.expectedMaxTime
    };
    
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.error(`  ❌ Test failed: ${error.message}`);
    console.log(`  ⏱️  Duration before failure: ${(duration / 1000).toFixed(2)}s`);
    
    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

/**
 * Test concurrent requests
 */
async function testConcurrentRequests(count = 3) {
  console.log(`\n🔄 Testing ${count} Concurrent Requests`);
  
  const testInput = {
    input: 'E-commerce platform with user auth, product catalog, shopping cart, payment gateway.',
    projectDetails: { projectScale: 'sme' }
  };
  
  const startTime = performance.now();
  
  try {
    const promises = Array(count).fill(null).map(() => 
      makeRequest('POST', '/api/scope', testInput)
    );
    
    const results = await Promise.allSettled(promises);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status !== 200)).length;
    
    console.log(`  ✅ Successful: ${successful}/${count}`);
    console.log(`  ❌ Failed: ${failed}/${count}`);
    console.log(`  ⏱️  Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`  ⏱️  Average per request: ${(duration / count / 1000).toFixed(2)}s`);
    
    return {
      total: count,
      successful,
      failed,
      totalDuration: duration,
      averageDuration: duration / count
    };
    
  } catch (error) {
    console.error(`  ❌ Concurrent test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main performance test runner
 */
async function runPerformanceTests() {
  console.log('🚀 Starting Performance Tests\n');
  console.log('='.repeat(80));
  
  // Set environment variable for full chain
  process.env.ENABLE_FULL_CHAIN = 'true';
  
  try {
    // Wait a bit for server to be ready (assumes server is running)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = [];
    
    // Test different input sizes
    console.log('\n📊 Testing Different Input Sizes:\n');
    for (const testCase of performanceTestCases) {
      const result = await runPerformanceTest(testCase);
      results.push({ testCase: testCase.name, ...result });
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test concurrent requests
    console.log('\n' + '='.repeat(80));
    const concurrentResult = await testConcurrentRequests(3);
    results.push({ testCase: 'Concurrent Requests (3)', ...concurrentResult });
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Performance Test Summary:\n');
    
    results.forEach(result => {
      if (result.success !== false) {
        const icon = result.withinExpectedTime !== false ? '✅' : '⚠️';
        console.log(`  ${icon} ${result.testCase}: ${(result.duration / 1000).toFixed(2)}s`);
        if (result.memoryDeltaMB) {
          console.log(`     Memory: +${result.memoryDeltaMB}MB`);
        }
      } else {
        console.log(`  ❌ ${result.testCase}: Failed - ${result.error || 'Unknown error'}`);
      }
    });
    
    // Performance benchmarks
    console.log('\n📈 Performance Benchmarks:');
    console.log('  Target: <10s for typical request (medium input)');
    console.log('  Target: <60s for large input');
    console.log('  Target: <500MB memory increase per request');
    
    const mediumTest = results.find(r => r.testCase.includes('Medium'));
    if (mediumTest && mediumTest.duration) {
      const meetsTarget = mediumTest.duration < 10000;
      console.log(`\n  ${meetsTarget ? '✅' : '⚠️'} Medium input: ${(mediumTest.duration / 1000).toFixed(2)}s ${meetsTarget ? '(meets target)' : '(exceeds target)'}`);
    }
    
    return results;
    
  } catch (error) {
    console.error('\n❌ Performance test suite error:', error);
    throw error;
  }
}

// Run tests if executed directly
if (require.main === module) {
  runPerformanceTests()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTests, runPerformanceTest, testConcurrentRequests };

