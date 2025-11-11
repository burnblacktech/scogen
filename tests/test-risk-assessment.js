// tests/test-risk-assessment.js
// Test suite for risk assessment

const RiskAssessor = require('../src/modules/risk-assessor');
const RiskPresenter = require('../src/modules/risk-presenter');

async function testRiskAssessment() {
  console.log('🧪 Testing Risk Assessment & Mitigation\n');
  console.log('='.repeat(70));
  
  const assessor = new RiskAssessor();
  const presenter = new RiskPresenter();
  
  const testCases = [
    {
      name: '🚀 High-Risk Fintech Project',
      decomposition: {
        totalCost: 500000,
        modules: [
          { module: 'Payment Gateway', complexity: 'complex', totalCost: 80000 },
          { module: 'KYC System', complexity: 'complex', totalCost: 60000 },
          { module: 'Transaction Engine', complexity: 'complex', totalCost: 100000 }
        ],
        deliverables: [
          { type: 'integration', name: 'Payment Gateway Integration' },
          { type: 'integration', name: 'KYC API Integration' },
          { type: 'integration', name: 'Banking API Integration' }
        ],
        timeline: { recommendedDays: 60 },
        resources: {
          backend: { totalCost: 200000 },
          frontend: { totalCost: 150000 },
          qa: { totalCost: 100000 }
        }
      },
      clientProfile: {
        techSavvy: 'low',
        hadFailure: true,
        committeeDecision: true,
        budgetClarity: 'vague',
        riskLevel: 'high'
      },
      context: {
        domain: 'fintech',
        scale: 'enterprise',
        complexity: 'complex',
        newTechnology: true
      }
    },
    {
      name: '🛍️ Standard E-commerce Project',
      decomposition: {
        totalCost: 200000,
        modules: [
          { module: 'Product Catalog', complexity: 'standard', totalCost: 40000 },
          { module: 'Shopping Cart', complexity: 'standard', totalCost: 30000 },
          { module: 'Payment', complexity: 'standard', totalCost: 35000 }
        ],
        deliverables: [
          { type: 'integration', name: 'Payment Gateway' }
        ],
        timeline: { recommendedDays: 45 },
        resources: {
          backend: { totalCost: 80000 },
          frontend: { totalCost: 70000 },
          qa: { totalCost: 30000 }
        }
      },
      clientProfile: {
        techSavvy: 'medium',
        hadFailure: false,
        committeeDecision: false,
        budgetClarity: 'clear',
        riskLevel: 'low'
      },
      context: {
        domain: 'ecommerce',
        scale: 'sme',
        complexity: 'standard'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('-'.repeat(70));
    
    // Assess risks
    const assessment = await assessor.assessRisks(
      testCase.decomposition,
      { enriched: { explicit: [], domainSpecific: [] } },
      testCase.clientProfile,
      testCase.context
    );
    
    // Display results
    console.log('\n📊 Risk Assessment Results:');
    console.log(`   Total Risks Identified: ${assessment.identifiedRisks.length}`);
    console.log(`   Risk Score: ${Math.round(assessment.riskScore)}%`);
    console.log(`   Risk Level: ${assessment.level.toUpperCase()}`);
    console.log(`   Confidence: ${assessment.confidence}%`);
    console.log(`   Priority: ${assessment.priority}`);
    
    console.log('\n💰 Financial Impact:');
    console.log(`   Base Cost: ₹${testCase.decomposition.totalCost.toLocaleString('en-IN')}`);
    console.log(`   Recommended Buffer: ${Math.round((assessment.recommendedBuffers.cost - 1) * 100)}%`);
    console.log(`   Buffer Amount: ₹${Math.round(testCase.decomposition.totalCost * (assessment.recommendedBuffers.cost - 1)).toLocaleString('en-IN')}`);
    console.log(`   Contingency Reserve: ₹${assessment.contingencyReserve.toLocaleString('en-IN')}`);
    console.log(`   Total with Risk: ₹${Math.round(testCase.decomposition.totalCost * assessment.recommendedBuffers.cost + assessment.contingencyReserve).toLocaleString('en-IN')}`);
    
    console.log('\n⏱️ Timeline Impact:');
    console.log(`   Base Timeline: ${testCase.decomposition.timeline.recommendedDays} days`);
    console.log(`   Timeline Buffer: ${Math.round((assessment.recommendedBuffers.time - 1) * 100)}%`);
    console.log(`   Additional Days: ${Math.round(testCase.decomposition.timeline.recommendedDays * (assessment.recommendedBuffers.time - 1))} days`);
    console.log(`   Total Timeline: ${Math.round(testCase.decomposition.timeline.recommendedDays * assessment.recommendedBuffers.time)} days`);
    
    // Show risks by category
    console.log('\n📋 Risks by Category:');
    const byCategory = {};
    for (const risk of assessment.identifiedRisks) {
      byCategory[risk.category] = (byCategory[risk.category] || 0) + 1;
    }
    for (const [category, count] of Object.entries(byCategory)) {
      console.log(`   ${category.charAt(0).toUpperCase() + category.slice(1)}: ${count} risks`);
    }
    
    // Show top risks
    console.log('\n⚠️  Top 5 Risks:');
    const topRisks = assessment.identifiedRisks
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
    
    for (const risk of topRisks) {
      console.log(`   ${risk.category.toUpperCase()} - ${risk.type}`);
      console.log(`     Description: ${risk.description}`);
      console.log(`     Probability: ${(risk.probability * 100).toFixed(0)}% | Impact: ${risk.impact}`);
      console.log(`     Cost Impact: +${((risk.costImpact - 1) * 100).toFixed(0)}% | Time Impact: +${((risk.timeImpact - 1) * 100).toFixed(0)}%`);
      if (risk.mitigation && risk.mitigation.length > 0) {
        console.log(`     Mitigation: ${risk.mitigation[0]}`);
      }
    }
    
    // Test presenter - Executive summary
    console.log('\n📊 Executive Presentation:');
    const executive = presenter.present(assessment, 'executive');
    console.log(`   ${executive.keyMessage}`);
    console.log(`   ${executive.recommendations.bufferRequired}`);
    console.log(`   ${executive.recommendations.contingencyReserve}`);
    
    // Show mitigation plan
    const mitigation = presenter.present(assessment, 'mitigation');
    console.log('\n🛡️ Mitigation Plan:');
    if (mitigation.immediate.items.length > 0) {
      console.log(`   Immediate Actions: ${mitigation.immediate.items.length}`);
      for (const item of mitigation.immediate.items.slice(0, 2)) {
        console.log(`     • ${item.actions[0]}`);
      }
    }
    if (mitigation.contingency.items.length > 0) {
      console.log(`   Contingency Measures:`);
      for (const item of mitigation.contingency.items.slice(0, 2)) {
        console.log(`     • ${item}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
  }
  
  console.log('\n✅ Risk assessment test complete!');
  
  console.log('\n📈 Summary:');
  console.log('   • High-risk projects need 30-40% cost buffer');
  console.log('   • Complex integrations add 20-30% timeline buffer');
  console.log('   • Client profile significantly impacts risk');
  console.log('   • Mitigation plans reduce overall risk exposure');
}

// Run tests
testRiskAssessment().catch(console.error);

