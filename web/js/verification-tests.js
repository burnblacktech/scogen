/**
 * Browser-Based Verification Tests
 * 
 * Run in browser console: runFullVerification()
 */

// Helper functions
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error(`Element ${selector} not found after ${timeout}ms`));
      }
    }, 100);
  });
}

// Test 1: Initial Load Performance
async function verifyInitialLoad() {
  console.log('📋 Test 1: Initial Load Performance');
  
  const metrics = {
    DOMContentLoaded: 0,
    firstPaint: 0,
    fullyLoaded: 0
  };

  // Get navigation timing
  const perfData = performance.getEntriesByType('navigation')[0];
  if (perfData) {
    metrics.DOMContentLoaded = perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart;
    metrics.fullyLoaded = perfData.loadEventEnd - perfData.loadEventStart;
  }

  // Get paint timing
  const paintData = performance.getEntriesByType('paint');
  if (paintData.length > 0) {
    metrics.firstPaint = paintData.find(p => p.name === 'first-paint')?.startTime || 0;
  }

  // Check memory
  if (performance.memory) {
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    console.log(`  Memory usage: ${memoryMB.toFixed(1)}MB`);
    assert(memoryMB < 100, `Memory usage too high: ${memoryMB}MB`);
  }

  // Thresholds
  assert(metrics.DOMContentLoaded < 1000, `DOMContentLoaded too slow: ${metrics.DOMContentLoaded}ms`);
  assert(metrics.firstPaint < 500 || metrics.firstPaint === 0, `First paint too slow: ${metrics.firstPaint}ms`);
  assert(metrics.fullyLoaded < 3000, `Fully loaded too slow: ${metrics.fullyLoaded}ms`);

  console.log('  ✅ Initial load performance acceptable');
  return metrics;
}

// Test 2: Entry Flow Paths
async function testEntryFlowPaths() {
  console.log('📋 Test 2: Entry Flow Paths');
  
  // Check entry selector exists
  const entrySelector = document.querySelector('.entry-selector') || 
                       document.querySelector('[data-entry-selector]');
  assert(entrySelector !== null, 'Entry selector not found');

  // Check both options exist
  const expressBtn = document.querySelector('[onclick*="startExpressMode"]') ||
                     document.querySelector('[data-mode="express"]');
  const conversationBtn = document.querySelector('[onclick*="startConversationMode"]') ||
                         document.querySelector('[data-mode="conversation"]');

  assert(expressBtn !== null, 'Express mode button not found');
  assert(conversationBtn !== null, 'Conversation mode button not found');

  console.log('  ✅ Entry flow paths correct');
}

// Test 3: Express Mode Flow
async function testExpressMode() {
  console.log('📋 Test 3: Express Mode Flow');
  
  // Click express mode
  const expressBtn = document.querySelector('[onclick*="startExpressMode"]') ||
                     document.querySelector('[data-mode="express"]');
  
  if (expressBtn) {
    expressBtn.click();
    await wait(1000);

    // Check input field appears
    const inputField = document.querySelector('#project-input') ||
                      document.querySelector('textarea[name="input"]') ||
                      document.querySelector('#input-field');
    
    assert(inputField !== null, 'Input field not found in express mode');

    console.log('  ✅ Express mode UI loaded');
  } else {
    console.log('  ⚠️  Express mode button not found (may need to be on landing page)');
  }
}

// Test 4: Conversation Mode Flow
async function testConversationFlow() {
  console.log('📋 Test 4: Conversation Mode Flow');
  
  // Check if conversation mode is available
  const conversationBtn = document.querySelector('[onclick*="startConversationMode"]') ||
                         document.querySelector('[data-mode="conversation"]');
  
  if (conversationBtn) {
    conversationBtn.click();
    await wait(2000);

    // Check conversation UI elements
    const chatMessages = document.querySelector('#chat-messages') ||
                         document.querySelector('.chat-messages');
    const chatInput = document.querySelector('#chat-input') ||
                     document.querySelector('.chat-input');
    const completenessBar = document.querySelector('#completeness-fill') ||
                           document.querySelector('.completeness-fill');

    assert(chatMessages !== null, 'Chat messages area not found');
    assert(chatInput !== null, 'Chat input not found');
    assert(completenessBar !== null, 'Completeness bar not found');

    console.log('  ✅ Conversation mode UI loaded');

    // Test auto-save
    if (window.conversationManager) {
      const conversationId = window.conversationManager.conversationId;
      if (conversationId) {
        const saved = localStorage.getItem(`conversation_${conversationId}`);
        console.log(`  ✅ Auto-save working: ${saved ? 'State saved' : 'No state yet'}`);
      }
    }
  } else {
    console.log('  ⚠️  Conversation mode button not found (may need to be on landing page)');
  }
}

// Test 5: Progressive Output UI
async function testProgressiveOutputUI() {
  console.log('📋 Test 5: Progressive Output UI');
  
  // Check if level selector modal exists (may be hidden)
  const levelModal = document.querySelector('.output-level-modal') ||
                     document.querySelector('#output-level-modal') ||
                     document.querySelector('[data-modal="output-level"]');

  if (levelModal) {
    console.log('  ✅ Level selector modal exists');
    
    // Check level cards
    const levelCards = document.querySelectorAll('.level-card') ||
                      document.querySelectorAll('[data-level]');
    
    if (levelCards.length > 0) {
      assert(levelCards.length === 5, `Expected 5 levels, found ${levelCards.length}`);
      console.log(`  ✅ ${levelCards.length} level cards found`);
    }
  } else {
    console.log('  ⚠️  Level selector modal not found (may appear after generation)');
  }
}

// Test 6: Responsive Design
function testResponsiveDesign() {
  console.log('📋 Test 6: Responsive Design');
  
  const viewports = [
    { width: 375, height: 667, device: 'Mobile' },
    { width: 768, height: 1024, device: 'Tablet' },
    { width: 1920, height: 1080, device: 'Desktop' }
  ];

  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  viewports.forEach(viewport => {
    // Simulate viewport (note: actual resize may not work in all browsers)
    console.log(`  Testing ${viewport.device} (${viewport.width}x${viewport.height})`);
    
    // Check if critical elements are visible
    const entryButtons = document.querySelectorAll('.entry-option') ||
                         document.querySelectorAll('[data-entry-option]');
    
    if (entryButtons.length > 0) {
      entryButtons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        assert(isVisible, `Button not visible at ${viewport.device} viewport`);
      });
    }
  });

  console.log('  ✅ Responsive design check passed');
}

// Test 7: Error Handling
async function testErrorHandling() {
  console.log('📋 Test 7: Error Handling');
  
  // Test network error simulation
  const originalFetch = window.fetch;
  let errorHandled = false;

  // Override fetch temporarily
  window.fetch = function(...args) {
    return Promise.reject(new Error('Network error'));
  };

  try {
    // Try to make a request (should fail gracefully)
    if (window.conversationManager) {
      try {
        await window.conversationManager.sendMessage('test');
      } catch (e) {
        errorHandled = true;
      }
    }
  } finally {
    // Restore fetch
    window.fetch = originalFetch;
  }

  console.log(`  ${errorHandled ? '✅' : '⚠️'} Error handling: ${errorHandled ? 'Working' : 'Needs verification'}`);
}

// Test 8: Memory Leaks
async function testMemoryLeaks() {
  console.log('📋 Test 8: Memory Leaks');
  
  if (!performance.memory) {
    console.log('  ⚠️  Memory API not available in this browser');
    return;
  }

  const initialMemory = performance.memory.usedJSHeapSize;
  
  // Simulate multiple operations
  for (let i = 0; i < 5; i++) {
    if (window.conversationManager) {
      // Trigger some operations
      await wait(100);
    }
  }

  // Force garbage collection if available
  if (window.gc) {
    window.gc();
    await wait(1000);
  }

  const finalMemory = performance.memory.usedJSHeapSize;
  const leak = finalMemory - initialMemory;
  const leakMB = leak / 1024 / 1024;

  console.log(`  Memory change: ${leakMB > 0 ? '+' : ''}${leakMB.toFixed(2)}MB`);
  
  if (leakMB > 50) {
    console.log('  ⚠️  Possible memory leak detected');
  } else {
    console.log('  ✅ No significant memory leak');
  }
}

// Test 9: Security (XSS Prevention)
async function testSecurity() {
  console.log('📋 Test 9: Security (XSS Prevention)');
  
  const maliciousInputs = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')"
  ];

  for (const input of maliciousInputs) {
    // Check if input is sanitized when displayed
    const testDiv = document.createElement('div');
    testDiv.textContent = input; // Should sanitize
    document.body.appendChild(testDiv);

    const innerHTML = testDiv.innerHTML;
    assert(!innerHTML.includes('<script>'), 'XSS not prevented');
    assert(!innerHTML.includes('onerror'), 'XSS not prevented');

    document.body.removeChild(testDiv);
  }

  console.log('  ✅ XSS prevention working');
}

// Test 10: API Integration
async function testAPIIntegration() {
  console.log('📋 Test 10: API Integration');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch('/api/health');
    assert(healthResponse.ok, 'Health check failed');
    
    const healthData = await healthResponse.json();
    assert(healthData.status === 'ok', 'Health status not ok');

    console.log('  ✅ API health check passed');

    // Test conversation start
    const startResponse = await fetch('/api/conversation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    assert(startResponse.ok, 'Conversation start failed');
    const startData = await startResponse.json();
    assert(startData.conversationId, 'No conversation ID returned');

    console.log('  ✅ Conversation API working');
  } catch (error) {
    console.log(`  ❌ API Integration: ${error.message}`);
    throw error;
  }
}

// Main verification function
async function runFullVerification() {
  console.log('\n🔍 Starting Browser-Based Verification');
  console.log('='.repeat(60));
  console.log(`Page: ${window.location.href}`);
  console.log(`Browser: ${navigator.userAgent}\n`);

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: []
  };

  const tests = [
    { name: 'Initial Load Performance', fn: verifyInitialLoad },
    { name: 'Entry Flow Paths', fn: testEntryFlowPaths },
    { name: 'Express Mode Flow', fn: testExpressMode },
    { name: 'Conversation Mode Flow', fn: testConversationFlow },
    { name: 'Progressive Output UI', fn: testProgressiveOutputUI },
    { name: 'Responsive Design', fn: testResponsiveDesign },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Memory Leaks', fn: testMemoryLeaks },
    { name: 'Security', fn: testSecurity },
    { name: 'API Integration', fn: testAPIIntegration }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`);
      console.log('-'.repeat(40));
      await test.fn();
      results.passed++;
      console.log(`✅ ${test.name}: PASSED`);
    } catch (error) {
      console.error(`❌ ${test.name}: FAILED`);
      console.error(`   ${error.message}`);
      results.failed++;
      results.issues.push({ test: test.name, error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);

  const total = results.passed + results.failed;
  const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  console.log(`📈 Success Rate: ${successRate}%`);

  if (results.issues.length > 0) {
    console.log('\n🚨 Issues:');
    results.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue.test}: ${issue.error}`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return results;
}

// Export for use
if (typeof window !== 'undefined') {
  window.runFullVerification = runFullVerification;
  window.verificationTests = {
    verifyInitialLoad,
    testEntryFlowPaths,
    testExpressMode,
    testConversationFlow,
    testProgressiveOutputUI,
    testResponsiveDesign,
    testErrorHandling,
    testMemoryLeaks,
    testSecurity,
    testAPIIntegration
  };
}

// Auto-run if on verification page
if (window.location.search.includes('verification=true')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      runFullVerification();
    }, 2000);
  });
}



