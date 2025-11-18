/**
 * Load Testing Script
 * Tests API performance under load
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS || '10', 10);
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || '100', 10);

const testInput = {
  input: 'I need a web application for managing inventory with user authentication, reporting, and payment processing features.',
  projectDetails: {
    projectScale: 'startup',
    marketRegion: 'India'
  }
};

function makeRequest() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const postData = JSON.stringify(testInput);

    const options = {
      hostname: new URL(API_URL).hostname,
      port: new URL(API_URL).port || 3000,
      path: '/api/scope',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 120000 // 2 minute timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          duration,
          success: res.statusCode === 200,
          size: data.length
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function runLoadTest() {
  console.log('🚀 Starting Load Test');
  console.log(`API URL: ${API_URL}`);
  console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`Total Requests: ${TOTAL_REQUESTS}\n`);

  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    durations: [],
    errors: []
  };

  // Run in batches
  const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENT_REQUESTS);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - results.total);
    const promises = [];

    console.log(`Batch ${batch + 1}/${batches} (${batchSize} requests)...`);

    for (let i = 0; i < batchSize; i++) {
      promises.push(
        makeRequest()
          .then((result) => {
            results.total++;
            if (result.success) {
              results.successful++;
            } else {
              results.failed++;
            }
            results.durations.push(result.duration);
            return result;
          })
          .catch((error) => {
            results.total++;
            results.failed++;
            results.errors.push(error.message);
            return { error: error.message };
          })
      );
    }

    await Promise.all(promises);
    
    // Brief pause between batches
    if (batch < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Calculate statistics
  const durations = results.durations.filter(d => d > 0);
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const sortedDurations = durations.sort((a, b) => a - b);
  const p95Duration = sortedDurations.length > 0
    ? sortedDurations[Math.floor(sortedDurations.length * 0.95)]
    : 0;
  const p99Duration = sortedDurations.length > 0
    ? sortedDurations[Math.floor(sortedDurations.length * 0.99)]
    : 0;

  // Print results
  console.log('\n📊 Load Test Results');
  console.log('='.repeat(50));
  console.log(`Total Requests: ${results.total}`);
  console.log(`Successful: ${results.successful} (${((results.successful / results.total) * 100).toFixed(2)}%)`);
  console.log(`Failed: ${results.failed} (${((results.failed / results.total) * 100).toFixed(2)}%)`);
  console.log('\n⏱️  Response Times:');
  console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Min: ${minDuration.toFixed(2)}ms`);
  console.log(`  Max: ${maxDuration.toFixed(2)}ms`);
  console.log(`  P95: ${p95Duration.toFixed(2)}ms`);
  console.log(`  P99: ${p99Duration.toFixed(2)}ms`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    const errorCounts = {};
    results.errors.forEach(error => {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`  ${error}: ${count}`);
    });
  }

  console.log('\n✅ Load test complete');
}

// Run if executed directly
if (require.main === module) {
  runLoadTest().catch(console.error);
}

module.exports = { runLoadTest, makeRequest };

