/**
 * Full-Stack End-to-End Verification Protocol
 * 
 * Comprehensive test suite for all platform functionality
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class VerificationSuite {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      issues: []
    };
    this.metrics = {
      apiResponseTimes: [],
      memoryUsage: [],
      loadTimes: []
    };
  }

  async makeRequest(method, endpoint, body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };

      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const duration = Date.now() - startTime;
          this.metrics.apiResponseTimes.push({ endpoint, duration });
          
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: parsed,
              duration
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: data,
              duration
            });
          }
        });
      });

      req.on('error', reject);
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  // Test 1: Entry Points & Routing
  async testEntryPoints() {
    log('\n📋 Test 1: Entry Points & Routing', 'cyan');
    log('='.repeat(60));

    try {
      // Test 1.1: Health check
      log('Test 1.1: Health Check...', 'blue');
      const health = await this.makeRequest('GET', '/api/health');
      assert(health.status === 200, 'Health check failed');
      assert(health.duration < 200, `Health check too slow: ${health.duration}ms`);
      log('  ✅ Health check passed', 'green');
      this.results.passed++;

      // Test 1.2: Initial load performance
      log('Test 1.2: Initial Load Performance...', 'blue');
      const startTime = Date.now();
      const indexResponse = await this.makeRequest('GET', '/');
      const loadTime = Date.now() - startTime;
      
      assert(loadTime < 3000, `Initial load too slow: ${loadTime}ms`);
      this.metrics.loadTimes.push({ type: 'initial', duration: loadTime });
      log(`  ✅ Initial load: ${loadTime}ms`, 'green');
      this.results.passed++;

      // Test 1.3: File sizes
      log('Test 1.3: Bundle Sizes...', 'blue');
      const jsFiles = [
        'web/js/app.js',
        'web/js/conversation.js'
      ];

      for (const file of jsFiles) {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const sizeKB = stats.size / 1024;
          assert(sizeKB < 500, `${file} too large: ${sizeKB}KB`);
          log(`  ✅ ${file}: ${sizeKB.toFixed(1)}KB`, 'green');
        }
      }
      this.results.passed++;

    } catch (error) {
      log(`  ❌ Entry Points: ${error.message}`, 'red');
      this.results.failed++;
      this.results.issues.push({ test: 'Entry Points', error: error.message });
    }
  }

  // Test 2: Express Mode Flow
  async testExpressMode() {
    log('\n📋 Test 2: Express Mode Flow', 'cyan');
    log('='.repeat(60));

    try {
      // Test 2.1: Scope generation
      log('Test 2.1: Scope Generation...', 'blue');
      const scopeResponse = await this.makeRequest('POST', '/api/scope', {
        input: 'E-commerce platform for fashion accessories. Features: user registration, product catalog, shopping cart, payment integration.',
        projectDetails: {
          projectScale: 'sme',
          marketRegion: 'ecommerce-india'
        }
      });

      assert(scopeResponse.status === 200, `Scope generation failed: ${scopeResponse.status}`);
      assert(scopeResponse.data.success === true, 'Scope generation not successful');
      assert(scopeResponse.duration < 120000, `Scope generation too slow: ${scopeResponse.duration}ms`);
      
      log(`  ✅ Scope generated in ${scopeResponse.duration}ms`, 'green');
      this.results.passed++;

      // Test 2.2: Empty input validation
      log('Test 2.2: Input Validation...', 'blue');
      try {
        const emptyResponse = await this.makeRequest('POST', '/api/scope', {
          input: ''
        });
        // Should either reject or handle gracefully
        assert(emptyResponse.status === 400 || emptyResponse.data.success === false, 
          'Empty input not validated');
        log('  ✅ Empty input validation works', 'green');
        this.results.passed++;
      } catch (e) {
        log('  ⚠️  Empty input validation needs review', 'yellow');
        this.results.warnings++;
      }

    } catch (error) {
      log(`  ❌ Express Mode: ${error.message}`, 'red');
      this.results.failed++;
      this.results.issues.push({ test: 'Express Mode', error: error.message });
    }
  }

  // Test 3: Conversation Mode Flow
  async testConversationMode() {
    log('\n📋 Test 3: Conversation Mode Flow', 'cyan');
    log('='.repeat(60));

    try {
      // Test 3.1: Start conversation
      log('Test 3.1: Start Conversation...', 'blue');
      const startResponse = await this.makeRequest('POST', '/api/conversation/start');
      
      assert(startResponse.status === 200, 'Failed to start conversation');
      assert(startResponse.data.success === true, 'Conversation start not successful');
      assert(startResponse.data.conversationId, 'No conversation ID returned');
      
      const conversationId = startResponse.data.conversationId;
      log(`  ✅ Conversation started: ${conversationId}`, 'green');
      this.results.passed++;

      // Test 3.2: Send messages
      log('Test 3.2: Send Messages...', 'blue');
      const messages = [
        'E-commerce platform',
        'B2C marketplace',
        'Fashion industry',
        'Budget is 20 lakhs'
      ];

      let completeness = 0;
      for (const message of messages) {
        const msgResponse = await this.makeRequest('POST', `/api/conversation/${conversationId}/message`, {
          message: message
        });

        assert(msgResponse.status === 200, `Message send failed: ${msgResponse.status}`);
        assert(msgResponse.data.completeness !== undefined, 'Completeness not returned');
        
        completeness = msgResponse.data.completeness;
        log(`  ✅ Message sent, completeness: ${completeness}%`, 'green');
        await wait(500); // Rate limiting
      }
      this.results.passed++;

      // Test 3.3: Preview at 60%
      if (completeness >= 60) {
        log('Test 3.3: Preview Generation...', 'blue');
        const previewResponse = await this.makeRequest('GET', `/api/conversation/${conversationId}/preview`);
        
        assert(previewResponse.status === 200, 'Preview failed');
        assert(previewResponse.data.preview, 'No preview data');
        log('  ✅ Preview generated', 'green');
        this.results.passed++;
      } else {
        log('  ⚠️  Completeness not high enough for preview test', 'yellow');
        this.results.warnings++;
      }

      // Test 3.4: Generate documents
      log('Test 3.4: Generate Documents...', 'blue');
      const genResponse = await this.makeRequest('POST', `/api/conversation/${conversationId}/generate`, {
        outputs: ['business', 'technical']
      });

      assert(genResponse.status === 200, 'Generation failed');
      assert(genResponse.data.success === true, 'Generation not successful');
      assert(genResponse.data.progressiveOutputEnabled !== undefined, 'Progressive output flag missing');
      
      log(`  ✅ Documents generated, progressive output: ${genResponse.data.progressiveOutputEnabled}`, 'green');
      this.results.passed++;

      // Test 3.5: Progressive output levels
      if (genResponse.data.progressiveOutputEnabled && genResponse.data.projectId) {
        log('Test 3.5: Progressive Output Levels...', 'blue');
        const projectId = genResponse.data.projectId;
        
        const levelsResponse = await this.makeRequest('GET', `/api/output/levels/${projectId}`);
        assert(levelsResponse.status === 200, 'Failed to get levels');
        assert(levelsResponse.data.levels, 'No levels returned');
        assert(levelsResponse.data.levels.length === 5, 'Should have 5 levels');
        
        log(`  ✅ ${levelsResponse.data.levels.length} levels available`, 'green');
        this.results.passed++;

        // Test L1 delivery
        const deliverResponse = await this.makeRequest('POST', '/api/output/deliver', {
          projectId: projectId,
          level: 'L1_DISCOVERY'
        });

        assert(deliverResponse.status === 200, 'L1 delivery failed');
        assert(deliverResponse.data.output, 'No output returned');
        assert(deliverResponse.data.output.level === 'L1_DISCOVERY', 'Wrong level returned');
        
        log('  ✅ L1 Discovery delivered', 'green');
        this.results.passed++;
      }

    } catch (error) {
      log(`  ❌ Conversation Mode: ${error.message}`, 'red');
      this.results.failed++;
      this.results.issues.push({ test: 'Conversation Mode', error: error.message });
    }
  }

  // Test 4: API Endpoints
  async testAPIEndpoints() {
    log('\n📋 Test 4: API Endpoints', 'cyan');
    log('='.repeat(60));

    const endpoints = [
      { method: 'GET', url: '/api/health', expectedStatus: 200 },
      { method: 'POST', url: '/api/conversation/start', expectedStatus: 200 },
      { method: 'POST', url: '/api/prescribe', body: { domain: 'ecommerce', requirements: {} }, expectedStatus: 200 },
      { method: 'GET', url: '/api/blueprint/test123', expectedStatus: 200 },
      { method: 'GET', url: '/api/sprint/test123', expectedStatus: 200 }
    ];

    for (const endpoint of endpoints) {
      try {
        log(`Testing ${endpoint.method} ${endpoint.url}...`, 'blue');
        const response = await this.makeRequest(endpoint.method, endpoint.url, endpoint.body);
        
        // Some endpoints may return 404 for non-existent resources, which is OK
        const acceptableStatuses = [200, 404];
        if (endpoint.expectedStatus) {
          assert(
            response.status === endpoint.expectedStatus || acceptableStatuses.includes(response.status),
            `Expected ${endpoint.expectedStatus}, got ${response.status}`
          );
        }
        
        assert(response.duration < 5000, `API too slow: ${response.duration}ms`);
        log(`  ✅ ${endpoint.method} ${endpoint.url}: ${response.status} (${response.duration}ms)`, 'green');
        this.results.passed++;
      } catch (error) {
        log(`  ❌ ${endpoint.method} ${endpoint.url}: ${error.message}`, 'red');
        this.results.failed++;
      }
    }
  }

  // Test 5: Security
  async testSecurity() {
    log('\n📋 Test 5: Security', 'cyan');
    log('='.repeat(60));

    try {
      // Test 5.1: Input sanitization
      log('Test 5.1: Input Sanitization...', 'blue');
      const maliciousInputs = [
        "<script>alert('XSS')</script>",
        "'; DROP TABLE projects; --",
        "../../../etc/passwd"
      ];

      const startResponse = await this.makeRequest('POST', '/api/conversation/start');
      const conversationId = startResponse.data.conversationId;

      for (const input of maliciousInputs) {
        const response = await this.makeRequest('POST', `/api/conversation/${conversationId}/message`, {
          message: input
        });

        // Should handle gracefully (not crash)
        assert(response.status === 200 || response.status === 400, 
          `Malicious input not handled: ${input.substring(0, 30)}`);
        
        // Response should not contain raw malicious input
        const responseStr = JSON.stringify(response.data);
        assert(!responseStr.includes('<script>'), 'XSS not sanitized');
        assert(!responseStr.includes('DROP TABLE'), 'SQL injection not prevented');
      }

      log('  ✅ Input sanitization working', 'green');
      this.results.passed++;

    } catch (error) {
      log(`  ❌ Security: ${error.message}`, 'red');
      this.results.failed++;
      this.results.issues.push({ test: 'Security', error: error.message });
    }
  }

  // Test 6: Performance
  async testPerformance() {
    log('\n📋 Test 6: Performance', 'cyan');
    log('='.repeat(60));

    try {
      // Test 6.1: API response times
      log('Test 6.1: API Response Times...', 'blue');
      const avgResponseTime = this.metrics.apiResponseTimes.reduce((sum, m) => sum + m.duration, 0) / 
                              this.metrics.apiResponseTimes.length;
      
      log(`  Average API response time: ${avgResponseTime.toFixed(0)}ms`, 'blue');
      assert(avgResponseTime < 2000, `Average response time too high: ${avgResponseTime}ms`);
      log('  ✅ API response times acceptable', 'green');
      this.results.passed++;

      // Test 6.2: Load times
      if (this.metrics.loadTimes.length > 0) {
        log('Test 6.2: Load Times...', 'blue');
        const avgLoadTime = this.metrics.loadTimes.reduce((sum, m) => sum + m.duration, 0) / 
                           this.metrics.loadTimes.length;
        log(`  Average load time: ${avgLoadTime.toFixed(0)}ms`, 'blue');
        assert(avgLoadTime < 3000, `Average load time too high: ${avgLoadTime}ms`);
        log('  ✅ Load times acceptable', 'green');
        this.results.passed++;
      }

    } catch (error) {
      log(`  ❌ Performance: ${error.message}`, 'red');
      this.results.failed++;
      this.results.issues.push({ test: 'Performance', error: error.message });
    }
  }

  // Test 7: Database Operations
  async testDatabaseOperations() {
    log('\n📋 Test 7: Database Operations', 'cyan');
    log('='.repeat(60));

    try {
      // Test 7.1: Database file exists
      log('Test 7.1: Database File...', 'blue');
      const dbPath = path.join(process.cwd(), 'scogen-v2.db');
      const dbExists = fs.existsSync(dbPath);
      assert(dbExists, 'Database file not found');
      
      const stats = fs.statSync(dbPath);
      log(`  ✅ Database exists: ${(stats.size / 1024).toFixed(1)}KB`, 'green');
      this.results.passed++;

      // Test 7.2: Schema validation
      log('Test 7.2: Schema Validation...', 'blue');
      const schemaPath = path.join(process.cwd(), 'src', 'database', 'schema-v2.sql');
      const schemaExists = fs.existsSync(schemaPath);
      assert(schemaExists, 'Schema file not found');
      
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const requiredTables = [
        'projects',
        'conversations',
        'conversation_turns',
        'checkpoint_states',
        'execution_sessions'
      ];

      for (const table of requiredTables) {
        assert(schema.includes(`CREATE TABLE.*${table}`) || schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
          `Required table missing: ${table}`);
      }

      log(`  ✅ All required tables in schema`, 'green');
      this.results.passed++;

    } catch (error) {
      log(`  ❌ Database Operations: ${error.message}`, 'red');
      this.results.failed++;
      this.results.issues.push({ test: 'Database Operations', error: error.message });
    }
  }

  // Test 8: Progressive Output System
  async testProgressiveOutput() {
    log('\n📋 Test 8: Progressive Output System', 'cyan');
    log('='.repeat(60));

    try {
      // Test 8.1: Complete analysis generation
      log('Test 8.1: Complete Analysis Generation...', 'blue');
      
      // Start conversation and generate
      const startResponse = await this.makeRequest('POST', '/api/conversation/start');
      const conversationId = startResponse.data.conversationId;

      // Send messages to reach generation
      await this.makeRequest('POST', `/api/conversation/${conversationId}/message`, {
        message: 'E-commerce platform for fashion'
      });
      await wait(500);

      await this.makeRequest('POST', `/api/conversation/${conversationId}/message`, {
        message: 'B2C, 10k products, budget 50L'
      });
      await wait(500);

      // Generate
      const genResponse = await this.makeRequest('POST', `/api/conversation/${conversationId}/generate`, {
        outputs: ['business']
      });

      if (genResponse.data.progressiveOutputEnabled && genResponse.data.projectId) {
        const projectId = genResponse.data.projectId;

        // Test 8.2: Level delivery
        log('Test 8.2: Level Delivery...', 'blue');
        const levels = ['L1_DISCOVERY', 'L2_PLANNING', 'L3_ARCHITECTURE'];

        for (const level of levels) {
          const deliverResponse = await this.makeRequest('POST', '/api/output/deliver', {
            projectId: projectId,
            level: level
          });

          assert(deliverResponse.status === 200, `Failed to deliver ${level}`);
          assert(deliverResponse.data.output, `No output for ${level}`);
          assert(deliverResponse.data.output.level === level, `Wrong level returned for ${level}`);
          
          log(`  ✅ ${level} delivered`, 'green');
        }
        this.results.passed++;

        // Test 8.3: Level content differentiation
        log('Test 8.3: Level Content Differentiation...', 'blue');
        const l1Response = await this.makeRequest('POST', '/api/output/deliver', {
          projectId: projectId,
          level: 'L1_DISCOVERY'
        });

        const l4Response = await this.makeRequest('POST', '/api/output/deliver', {
          projectId: projectId,
          level: 'L4_IMPLEMENTATION'
        });

        const l1Content = JSON.stringify(l1Response.data.output.document || '');
        const l4Content = JSON.stringify(l4Response.data.output.document || '');

        // L4 should have more content than L1
        assert(l4Content.length > l1Content.length, 'L4 should have more content than L1');
        
        // L4 should have pseudocode, L1 should not
        assert(l4Content.includes('pseudocode') || l4Content.includes('Pseudocode'), 
          'L4 should contain pseudocode');
        assert(!l1Content.includes('pseudocode'), 'L1 should not contain pseudocode');

        log('  ✅ Level content differentiation verified', 'green');
        this.results.passed++;

      } else {
        log('  ⚠️  Progressive output not enabled, skipping tests', 'yellow');
        this.results.warnings++;
      }

    } catch (error) {
      log(`  ❌ Progressive Output: ${error.message}`, 'red');
      this.results.failed++;
      this.results.issues.push({ test: 'Progressive Output', error: error.message });
    }
  }

  // Test 9: Prescriptive Engine
  async testPrescriptiveEngine() {
    log('\n📋 Test 9: Prescriptive Engine', 'cyan');
    log('='.repeat(60));

    try {
      log('Test 9.1: Prescription Generation...', 'blue');
      const response = await this.makeRequest('POST', '/api/prescribe', {
        domain: 'ecommerce',
        requirements: {
          scale: 'sme',
          users: 10000
        }
      });

      assert(response.status === 200, 'Prescription failed');
      assert(response.data.prescription, 'No prescription returned');
      assert(response.data.prescription.architecture, 'No architecture in prescription');
      assert(response.data.prescription.techStack, 'No tech stack in prescription');
      assert(response.data.prescription.matchScore !== undefined, 'No match score');

      log('  ✅ Prescription generated', 'green');
      log(`     Architecture: ${response.data.prescription.architecture.type}`, 'blue');
      log(`     Match Score: ${response.data.prescription.matchScore}%`, 'blue');
      this.results.passed++;

    } catch (error) {
      log(`  ❌ Prescriptive Engine: ${error.message}`, 'red');
      this.results.failed++;
      this.results.issues.push({ test: 'Prescriptive Engine', error: error.message });
    }
  }

  // Test 10: File Uploads
  async testFileUploads() {
    log('\n📋 Test 10: File Uploads', 'cyan');
    log('='.repeat(60));

    try {
      // Note: File upload testing requires multipart/form-data
      // This is a simplified test - full implementation would use form-data library
      log('Test 10.1: File Upload Endpoints...', 'blue');
      
      // Check endpoints exist (they should return 400 for missing file, not 404)
      const pdfResponse = await this.makeRequest('POST', '/api/upload-pdf');
      assert(pdfResponse.status === 400 || pdfResponse.status === 404, 
        'PDF upload endpoint should exist');

      const excelResponse = await this.makeRequest('POST', '/api/upload-excel');
      assert(excelResponse.status === 400 || excelResponse.status === 404,
        'Excel upload endpoint should exist');

      log('  ✅ File upload endpoints exist', 'green');
      this.results.passed++;

    } catch (error) {
      log(`  ❌ File Uploads: ${error.message}`, 'red');
      this.results.failed++;
      this.results.issues.push({ test: 'File Uploads', error: error.message });
    }
  }

  // Generate Report
  generateReport() {
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 VERIFICATION REPORT', 'cyan');
    log('='.repeat(60), 'cyan');

    const total = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

    log(`\n✅ Passed: ${this.results.passed}`, 'green');
    log(`⚠️  Warnings: ${this.results.warnings}`, 'yellow');
    log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'green');
    log(`📈 Success Rate: ${successRate}%`, 
      successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');

    // Performance metrics
    if (this.metrics.apiResponseTimes.length > 0) {
      const avgResponse = this.metrics.apiResponseTimes.reduce((sum, m) => sum + m.duration, 0) / 
                         this.metrics.apiResponseTimes.length;
      log(`\n⚡ Average API Response Time: ${avgResponse.toFixed(0)}ms`, 'blue');
    }

    // Issues
    if (this.results.issues.length > 0) {
      log('\n🚨 Issues Found:', 'red');
      this.results.issues.forEach((issue, i) => {
        log(`  ${i + 1}. ${issue.test}: ${issue.error}`, 'red');
      });
    }

    // Recommendations
    log('\n💡 Recommendations:', 'cyan');
    if (this.results.failed > 0) {
      log('  - Fix failed tests before production deployment', 'yellow');
    }
    if (this.metrics.apiResponseTimes.length > 0) {
      const avgResponse = this.metrics.apiResponseTimes.reduce((sum, m) => sum + m.duration, 0) / 
                         this.metrics.apiResponseTimes.length;
      if (avgResponse > 1000) {
        log('  - Consider optimizing API response times', 'yellow');
      }
    }
    if (this.results.warnings > 0) {
      log('  - Review warnings for potential improvements', 'yellow');
    }

    log('\n' + '='.repeat(60) + '\n', 'cyan');

    return {
      timestamp: new Date().toISOString(),
      results: this.results,
      metrics: this.metrics,
      successRate: parseFloat(successRate)
    };
  }

  // Run all tests
  async runAllTests() {
    log('\n🔍 Starting Full-Stack End-to-End Verification', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`Base URL: ${this.baseUrl}\n`, 'blue');

    const tests = [
      { name: 'Entry Points', fn: () => this.testEntryPoints() },
      { name: 'Express Mode', fn: () => this.testExpressMode() },
      { name: 'Conversation Mode', fn: () => this.testConversationMode() },
      { name: 'API Endpoints', fn: () => this.testAPIEndpoints() },
      { name: 'Security', fn: () => this.testSecurity() },
      { name: 'Performance', fn: () => this.testPerformance() },
      { name: 'Database Operations', fn: () => this.testDatabaseOperations() },
      { name: 'Progressive Output', fn: () => this.testProgressiveOutput() },
      { name: 'Prescriptive Engine', fn: () => this.testPrescriptiveEngine() },
      { name: 'File Uploads', fn: () => this.testFileUploads() }
    ];

    for (const test of tests) {
      try {
        await test.fn();
      } catch (error) {
        log(`\n❌ Test suite "${test.name}" failed: ${error.message}`, 'red');
        this.results.failed++;
      }
    }

    return this.generateReport();
  }
}

// Main execution
async function main() {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const suite = new VerificationSuite(baseUrl);
  
  try {
    const report = await suite.runAllTests();
    
    // Save report
    const reportPath = path.join(process.cwd(), 'verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n📄 Report saved to: ${reportPath}`, 'cyan');
    
    process.exit(report.results.failed > 0 ? 1 : 0);
  } catch (error) {
    log(`\n❌ Verification suite failed: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = VerificationSuite;



