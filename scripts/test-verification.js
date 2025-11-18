/**
 * SCOGEN Platform Verification Script
 * 
 * Quick verification that all backend capabilities are accessible
 * Run: node scripts/test-verification.js
 */

const http = require('http');

const API_BASE = 'http://localhost:3000/api';

// Test colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
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
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testEndpoint(name, method, path, data = null, expectedStatus = 200) {
  try {
    log(`Testing ${name}...`, 'blue');
    const result = await makeRequest(method, path, data);
    
    if (result.status === expectedStatus || (expectedStatus === 'any' && result.status < 500)) {
      log(`  ✅ ${name} - Status: ${result.status}`, 'green');
      return { success: true, result };
    } else {
      log(`  ❌ ${name} - Expected ${expectedStatus}, got ${result.status}`, 'red');
      return { success: false, result };
    }
  } catch (error) {
    log(`  ❌ ${name} - Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runVerification() {
  log('\n🔍 SCOGEN Platform Verification\n', 'blue');
  log('='.repeat(50), 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test Conversation Endpoints
  log('\n📝 Conversation Endpoints', 'yellow');
  log('-'.repeat(50));
  
  let test = await testEndpoint('Start Conversation', 'POST', '/conversation/start', {}, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;
  
  const conversationId = test.result?.data?.conversationId || 'test-id';
  
  test = await testEndpoint('Get Conversation State', 'GET', `/conversation/${conversationId}/state`, null, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;
  
  test = await testEndpoint('Get Conversation Preview', 'GET', `/conversation/${conversationId}/preview`, null, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;
  
  test = await testEndpoint('Save Conversation', 'POST', `/conversation/${conversationId}/save`, {}, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;
  
  test = await testEndpoint('Resume Conversation', 'GET', `/conversation/${conversationId}/resume`, null, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;

  // Test Prescription Endpoint
  log('\n💊 Prescription Endpoint', 'yellow');
  log('-'.repeat(50));
  
  test = await testEndpoint('Get Prescription', 'POST', '/prescribe', {
    domain: 'ecommerce',
    requirements: {}
  }, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;

  // Test Blueprint Endpoints
  log('\n📐 Blueprint Endpoints', 'yellow');
  log('-'.repeat(50));
  
  test = await testEndpoint('Generate Blueprint', 'POST', '/blueprint/generate', {
    project: {
      technicalBreakdown: { technicalBreakdowns: [] },
      refinedScope: { modules: [] }
    },
    depth: 'detailed'
  }, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;
  
  test = await testEndpoint('Get Blueprint', 'GET', '/blueprint/1', null, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;

  // Test Sprint Planning Endpoints
  log('\n🏃 Sprint Planning Endpoints', 'yellow');
  log('-'.repeat(50));
  
  test = await testEndpoint('Generate Sprint Plan', 'POST', '/sprint/generate', {
    project: {
      technicalBreakdown: { technicalBreakdowns: [] },
      refinedScope: { modules: [] }
    },
    teamSize: 5
  }, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;
  
  test = await testEndpoint('Get Sprint Plan', 'GET', '/sprint/1', null, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;

  // Test Checkpoint Endpoints
  log('\n⏸️  Checkpoint Endpoints', 'yellow');
  log('-'.repeat(50));
  
  test = await testEndpoint('Save Checkpoint Decision', 'POST', '/scope/checkpoint', {
    sessionId: 'test-session',
    checkpointId: 'cp1_prescription',
    decisionType: 'approve',
    decisionData: {}
  }, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;
  
  test = await testEndpoint('Get Checkpoint State', 'GET', '/scope/checkpoint/test-session', null, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;
  
  test = await testEndpoint('Resume from Checkpoint', 'POST', '/scope/resume', {
    sessionId: 'test-session',
    checkpointId: 'cp1_prescription'
  }, 'any');
  results.total++;
  if (test.success) results.passed++; else results.failed++;

  // Summary
  log('\n' + '='.repeat(50), 'blue');
  log('\n📊 Verification Summary', 'blue');
  log('-'.repeat(50));
  log(`Total Tests: ${results.total}`, 'blue');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
      results.passed === results.total ? 'green' : 'yellow');
  
  if (results.failed === 0) {
    log('\n🎉 All endpoints are accessible!', 'green');
    log('Platform is ready for testing!', 'green');
  } else {
    log('\n⚠️  Some endpoints failed. Check server logs.', 'yellow');
    log('Make sure the server is running: npm start', 'yellow');
  }
  
  log('\n');
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Check if server is running first
makeRequest('GET', '/testing/stats')
  .then(() => {
    log('✅ Server is running\n', 'green');
    runVerification();
  })
  .catch((error) => {
    log('❌ Server is not running!', 'red');
    log('Please start the server first: npm start', 'yellow');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  });

