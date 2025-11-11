/**
 * Test Suite for Database Manager V2
 */

const DatabaseManagerV2 = require('../../src/database/db-manager-v2');
const path = require('path');
const fs = require('fs');

// Use test database
const testDbPath = path.join(__dirname, '../../data/test_v2.db');

// Clean up test database before starting
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

async function testDatabase() {
  console.log('🧪 Testing Database Manager V2...\n');
  
  const db = new DatabaseManagerV2(testDbPath);
  
  try {
    // Test 1: Initialize
    console.log('1. Testing initialization...');
    db.initialize();
    console.log('   ✅ Database initialized\n');
    
    // Test 2: Client Operations
    console.log('2. Testing client operations...');
    
    const clientId1 = db.createOrUpdateClient({
      identifier: 'test@example.com',
      company_name: 'Test Company',
      contact_name: 'John Doe',
      email: 'test@example.com',
      phone: '+911234567890',
      tech_savvy: 'low',
      industry: 'retail',
      client_type: 'sme'
    });
    console.log('   ✅ Client created with ID:', clientId1);
    
    const client = db.getClient('test@example.com');
    if (!client || client.id !== clientId1) {
      throw new Error('Client retrieval failed');
    }
    console.log('   ✅ Client retrieved:', client.company_name);
    
    // Test update
    db.createOrUpdateClient({
      identifier: 'test@example.com',
      company_name: 'Test Company Updated',
      contact_name: 'John Doe Updated',
      email: 'test@example.com',
      phone: '+911234567890'
    });
    const updatedClient = db.getClient('test@example.com');
    if (updatedClient.company_name !== 'Test Company Updated') {
      throw new Error('Client update failed');
    }
    console.log('   ✅ Client updated:', updatedClient.company_name, '\n');
    
    // Test 3: Project Operations
    console.log('3. Testing project operations...');
    
    const project = db.createProject({
      client_id: clientId1,
      project_name: 'Test E-commerce Platform',
      original_input: 'Need an e-commerce website',
      input_type: 'text',
      input_quality_score: 65.5,
      quoted_cost: 500000,
      quoted_timeline_days: 60,
      client_profile: { techSavvy: 'low', riskLevel: 'medium' },
      extracted_modules: ['ShoppingCart', 'Payment'],
      refined_scope: { modules: [{ name: 'ShoppingCart', effort: 3 }] },
      base_estimate: { cost: { total: 500000 }, timeline: { days: 60 } }
    });
    console.log('   ✅ Project created:', project.project_code);
    
    const retrievedProject = db.getProject(project.project_code);
    if (!retrievedProject || retrievedProject.project_code !== project.project_code) {
      throw new Error('Project retrieval failed');
    }
    
    // Verify JSON parsing
    if (typeof retrievedProject.client_profile !== 'object') {
      throw new Error('JSON parsing failed for client_profile');
    }
    if (!Array.isArray(retrievedProject.extracted_modules)) {
      throw new Error('JSON parsing failed for extracted_modules');
    }
    console.log('   ✅ Project retrieved with parsed JSON fields:', retrievedProject.project_name, '\n');
    
    // Test 4: Pattern Learning
    console.log('4. Testing pattern learning...');
    
    db.recordPattern(
      'module_effort',
      'ecommerce',
      'TestModule',
      { typical_days: 5, complexity: 'high' },
      true
    );
    console.log('   ✅ Pattern recorded');
    
    const pattern = db.getPattern('module_effort', 'ecommerce', 'TestModule');
    if (!pattern || pattern.typical_days !== 5) {
      throw new Error('Pattern retrieval failed');
    }
    console.log('   ✅ Pattern retrieved:', pattern, '\n');
    
    // Test 5: Transactions
    console.log('5. Testing transactions...');
    
    const transactionResult = db.transaction(() => {
      const clientId2 = db.createOrUpdateClient({
        identifier: 'transaction@test.com',
        company_name: 'Transaction Test',
        email: 'transaction@test.com'
      });
      
      const project2 = db.createProject({
        client_id: clientId2,
        project_name: 'Transaction Test Project',
        original_input: 'Test'
      });
      
      return { clientId: clientId2, projectCode: project2.project_code };
    });
    
    if (!transactionResult.clientId || !transactionResult.projectCode) {
      throw new Error('Transaction failed');
    }
    console.log('   ✅ Transaction completed:', transactionResult.projectCode, '\n');
    
    // Test 6: Analytics
    console.log('6. Testing analytics...');
    
    const clientStats = db.getClientStats(clientId1);
    if (!clientStats || clientStats.id !== clientId1) {
      throw new Error('Client stats retrieval failed');
    }
    console.log('   ✅ Client stats retrieved:', clientStats.company_name);
    
    const accuracyStats = db.getAccuracyStats();
    console.log('   ✅ Accuracy stats retrieved:', accuracyStats.length, 'records', '\n');
    
    // Cleanup
    db.close();
    
    // Remove test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    console.log('✅ All database tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    db.close();
    
    // Cleanup on error
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    process.exit(1);
  }
}

// Run tests
testDatabase();

