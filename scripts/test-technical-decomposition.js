#!/usr/bin/env node

/**
 * Test script for Technical Decomposition System
 * Tests the decomposition of business modules into technical components
 */

const path = require('path');

// Initialize system
const { initializeSystem } = require('../src/index');
const TechnicalMapper = require('../src/modules/technical-mapper');

async function testTechnicalDecomposition() {
  console.log('\n🧪 Testing Technical Decomposition System\n');
  console.log('='.repeat(60));

  try {
    // Initialize system
    const system = initializeSystem();
    const { library, logger, config } = system;

    // Create technical mapper
    const mapper = new TechnicalMapper(library, logger, config);

    // Test 1: EOR India - PayrollHR module
    console.log('\n📋 Test 1: Decomposing "PayrollHR" for EOR India\n');
    const payrollModule = {
      id: 'test-1',
      name: 'PayrollHR',
      displayName: 'Payroll HR',
      complexity: 'high',
      deps: ['Auth'],
      confidence: 0.9,
      source: 'extracted',
      priority: 'critical',
      phase: 1
    };

    const domainContext = {
      industry: 'finance',
      useCase: 'payroll',
      commonModules: [],
      hiddenEdges: [],
      socialProof: null
    };

    const breakdown1 = await mapper.decomposeModule(
      payrollModule,
      domainContext,
      'eor-india'
    );

    console.log('✅ Breakdown Result:');
    console.log(`   Business Module: ${breakdown1.businessModule}`);
    console.log(`   Technical Components: ${breakdown1.technicalComponents.length}`);
    console.log(`   Total Effort: ${breakdown1.totalEffort} days`);
    console.log(`   Total Cost: ₹${breakdown1.totalCost.toLocaleString('en-IN')}`);
    console.log(`   Integration Points: ${breakdown1.integrationPoints.length}`);
    console.log(`   Edge Cases: ${breakdown1.edgeCases.length}`);

    console.log('\n   Components:');
    breakdown1.technicalComponents.forEach((comp, idx) => {
      console.log(`   ${idx + 1}. ${comp.component} (${comp.layer})`);
      console.log(`      Effort: ${comp.adjustedEffort || comp.baseEffort} days`);
      console.log(`      Files: ${comp.files.length}`);
      console.log(`      Functions: ${comp.functions.length}`);
    });

    // Test 2: Generic - Auth module
    console.log('\n📋 Test 2: Decomposing "Auth" (Generic)\n');
    const authModule = {
      id: 'test-2',
      name: 'Auth',
      displayName: 'Authentication',
      complexity: 'med',
      deps: [],
      confidence: 0.95,
      source: 'extracted',
      priority: 'critical',
      phase: 1
    };

    const breakdown2 = await mapper.decomposeModule(
      authModule,
      { industry: 'generic', useCase: 'application' },
      null
    );

    console.log('✅ Breakdown Result:');
    console.log(`   Business Module: ${breakdown2.businessModule}`);
    console.log(`   Technical Components: ${breakdown2.technicalComponents.length}`);
    console.log(`   Total Effort: ${breakdown2.totalEffort} days`);

    // Test 3: EOR India - Statutory Compliance
    console.log('\n📋 Test 3: Decomposing "StatutoryCompliance" for EOR India\n');
    const complianceModule = {
      id: 'test-3',
      name: 'StatutoryCompliance',
      displayName: 'Statutory Compliance',
      complexity: 'high',
      deps: ['PayrollEngine'],
      confidence: 0.9,
      source: 'extracted',
      priority: 'critical',
      phase: 1
    };

    const breakdown3 = await mapper.decomposeModule(
      complianceModule,
      domainContext,
      'eor-india'
    );

    console.log('✅ Breakdown Result:');
    console.log(`   Business Module: ${breakdown3.businessModule}`);
    console.log(`   Technical Components: ${breakdown3.technicalComponents.length}`);
    console.log(`   Total Effort: ${breakdown3.totalEffort} days`);
    console.log(`   Total Cost: ₹${breakdown3.totalCost.toLocaleString('en-IN')}`);

    if (breakdown3.edgeCases.length > 0) {
      console.log('\n   Edge Cases & Risks:');
      breakdown3.edgeCases.slice(0, 3).forEach((ec, idx) => {
        console.log(`   ${idx + 1}. ${ec.description || ec.risk}`);
        console.log(`      Impact: ${ec.impact || ec.mitigation}`);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ All Tests Passed!\n');
    console.log('Summary:');
    console.log(`   Test 1 (PayrollHR): ${breakdown1.technicalComponents.length} components`);
    console.log(`   Test 2 (Auth): ${breakdown2.technicalComponents.length} components`);
    console.log(`   Test 3 (Compliance): ${breakdown3.technicalComponents.length} components`);
    console.log(`\n   Total Components Generated: ${breakdown1.technicalComponents.length + breakdown2.technicalComponents.length + breakdown3.technicalComponents.length}`);
    console.log(`   Total Effort: ${(breakdown1.totalEffort + breakdown2.totalEffort + breakdown3.totalEffort).toFixed(1)} days`);
    console.log(`   Total Cost: ₹${(breakdown1.totalCost + breakdown2.totalCost + breakdown3.totalCost).toLocaleString('en-IN')}\n`);

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testTechnicalDecomposition().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testTechnicalDecomposition };

