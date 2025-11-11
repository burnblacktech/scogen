#!/usr/bin/env node

/**
 * End-to-end test: Full chain execution with technical decomposition
 * Simulates a real scenario with EOR India platform
 */

const { initializeSystem } = require('../src/index');
const ChainExecutor = require('../src/modules/chain-executor');

async function testFullChain() {
  console.log('\n🧪 Testing Full Chain with Technical Decomposition\n');
  console.log('='.repeat(60));

  try {
    // Initialize system
    const system = initializeSystem();
    const { config, logger, db, library } = system;

    // Create chain executor
    const executor = new ChainExecutor(config, logger, db, library);

    // Test input - EOR India platform requirements
    const testInput = `EOR (Employer of Record) platform for India. 
    Need payroll processing with PF, ESI, PT, TDS compliance.
    Employee onboarding, salary structure management, payslip generation.
    Admin dashboard for employers, employee self-service portal.
    Multi-tenant architecture for multiple clients.`;

    console.log('\n📝 Input:');
    console.log(testInput);
    console.log('\n');

    // Execute chain with technical decomposition enabled
    const options = {
      platformType: 'eor-india',
      includeReview: true
    };

    console.log('⚙️  Executing chain...\n');

    const result = await executor.execute(testInput, options);

    // Display results
    console.log('='.repeat(60));
    console.log('\n✅ Chain Execution Complete!\n');

    // Technical breakdown summary
    if (result.technical && result.technical.technicalBreakdown) {
      const breakdown = result.technical.technicalBreakdown;
      console.log('🔧 Technical Breakdown Summary:');
      console.log(`   Business Modules: ${breakdown.businessModules?.length || 0}`);
      console.log(`   Total Components: ${breakdown.totalComponents || 0}`);
      console.log(`   Total Effort: ${breakdown.totalEffort?.toFixed(1) || 0} days`);
      console.log(`   Total Cost: ₹${(breakdown.totalCost || 0).toLocaleString('en-IN')}`);

      if (breakdown.codeStructure) {
        console.log('\n   Code Structure:');
        Object.entries(breakdown.codeStructure).forEach(([dir, files]) => {
          if (files.length > 0) {
            console.log(`   ${dir}: ${files.length} files`);
          }
        });
      }

      // Show component breakdown for first module
      if (breakdown.technicalBreakdowns && breakdown.technicalBreakdowns.length > 0) {
        const firstModule = breakdown.technicalBreakdowns[0];
        console.log(`\n   Example: ${firstModule.businessModule}`);
        console.log(`   Components: ${firstModule.technicalComponents?.length || 0}`);
        if (firstModule.technicalComponents && firstModule.technicalComponents.length > 0) {
          firstModule.technicalComponents.forEach((comp, idx) => {
            console.log(`     ${idx + 1}. ${comp.component} (${comp.layer}) - ${comp.adjustedEffort || comp.baseEffort} days`);
          });
        }
      }
    }

    // Estimate summary
    if (result.technical && result.technical.estimate) {
      const estimate = result.technical.estimate;
      console.log('\n💰 Estimate Summary:');
      console.log(`   Method: ${estimate.method || 'module-level'}`);
      if (estimate.method === 'technical_breakdown') {
        console.log(`   Component Count: ${estimate.componentCount || 0}`);
        console.log(`   Component-Level Effort: ${estimate.effort?.total || 0} days`);
      }
      console.log(`   Timeline: ${estimate.timeline?.weeks || 0} weeks (${estimate.timeline?.days || 0} days)`);
      console.log(`   Cost: ₹${(estimate.cost?.total || 0).toLocaleString('en-IN')}`);
      console.log(`   Confidence: ${Math.round((estimate.confidence?.overall || 0) * 100)}%`);
    }

    // Plan summary
    if (result.technical && result.technical.plan) {
      const plan = result.technical.plan;
      console.log('\n📋 Plan Summary:');
      console.log(`   ${plan.overview?.summary || 'N/A'}`);
      console.log(`   Modules: ${plan.modules?.length || 0}`);
      console.log(`   Timeline: ${plan.timeline?.totalWeeks || 0} weeks`);
    }

    // Output summary
    if (result.output) {
      console.log('\n📄 Output Generated:');
      console.log(`   CLI: ${result.output.formatted?.cli ? '✅' : '❌'}`);
      console.log(`   Markdown: ${result.output.formatted?.markdown ? '✅' : '❌'}`);
      console.log(`   JSON: ${result.output.formatted?.json ? '✅' : '❌'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Full Chain Test Complete!\n');

    // Validation checks
    let allPassed = true;
    const checks = [];

    if (result.technical && result.technical.technicalBreakdown) {
      checks.push({ name: 'Technical breakdown generated', passed: true });
    } else {
      checks.push({ name: 'Technical breakdown generated', passed: false });
      allPassed = false;
    }

    if (result.technical && result.technical.estimate) {
      checks.push({ name: 'Estimate generated', passed: true });
    } else {
      checks.push({ name: 'Estimate generated', passed: false });
      allPassed = false;
    }

    if (result.technical && result.technical.plan) {
      checks.push({ name: 'Plan generated', passed: true });
    } else {
      checks.push({ name: 'Plan generated', passed: false });
      allPassed = false;
    }

    if (result.output && result.output.formatted) {
      checks.push({ name: 'Output formatted', passed: true });
    } else {
      checks.push({ name: 'Output formatted', passed: false });
      allPassed = false;
    }

    console.log('Validation Checks:');
    checks.forEach(check => {
      console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}`);
    });

    if (allPassed) {
      console.log('\n🎉 All validation checks passed!\n');
    } else {
      console.log('\n⚠️  Some validation checks failed\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testFullChain().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testFullChain };

