// tests/test-scenario-generation.js
// Test suite for intelligent scenario generation

const ScenarioGeneratorV2 = require('../src/modules/scenario-generator-v2');

async function testScenarioGeneration() {
  console.log('🧪 Testing Intelligent Scenario Generation\n');
  console.log('='.repeat(80));
  
  const generator = new ScenarioGeneratorV2();
  
  const testCases = [
    {
      name: '💰 Budget-Constrained Startup',
      decomposition: {
        totalCost: 500000,
        modules: [
          { module: 'Authentication', complexity: 'standard', totalCost: 50000 },
          { module: 'Product Catalog', complexity: 'standard', totalCost: 80000 },
          { module: 'Shopping Cart', complexity: 'standard', totalCost: 60000 },
          { module: 'Payment Gateway', complexity: 'complex', totalCost: 100000 },
          { module: 'Admin Dashboard', complexity: 'standard', totalCost: 70000 }
        ],
        timeline: { recommendedDays: 60, sequentialDays: 90, parallelDays: 35 },
        costByResource: {
          backend: { cost: 200000, percentage: '40%', deliverableCount: 25 },
          frontend: { cost: 150000, percentage: '30%', deliverableCount: 20 },
          ui: { cost: 50000, percentage: '10%', deliverableCount: 10 },
          qa: { cost: 100000, percentage: '20%', deliverableCount: 30 }
        },
        resources: {
          backend: { totalCost: 200000 },
          frontend: { totalCost: 150000 },
          ui: { totalCost: 50000 },
          qa: { totalCost: 100000 }
        },
        stats: { totalDeliverables: 85, totalComponents: 250 }
      },
      riskAssessment: {
        recommendedBuffers: { time: 1.2, cost: 1.15 },
        contingencyReserve: 50000,
        identifiedRisks: [{ category: 'business', type: 'budget', impact: 'high' }],
        level: 'medium',
        confidence: 70,
        mitigationPlan: { immediate: [] }
      },
      clientProfile: {
        clientSize: 'startup',
        budgetClarity: 'vague',
        techSavvy: 'medium',
        urgency: 'normal'
      },
      options: {
        maxBudget: 300000,
        targetDeadline: 45,
        scale: 'startup'
      }
    },
    {
      name: '🏢 Enterprise with Committee Decision',
      decomposition: {
        totalCost: 2000000,
        modules: [
          { module: 'User Management', complexity: 'complex', totalCost: 200000 },
          { module: 'Workflow Engine', complexity: 'complex', totalCost: 350000 },
          { module: 'Reporting System', complexity: 'complex', totalCost: 300000 },
          { module: 'Integration Layer', complexity: 'complex', totalCost: 400000 },
          { module: 'Admin Portal', complexity: 'standard', totalCost: 250000 },
          { module: 'Analytics Dashboard', complexity: 'complex', totalCost: 300000 },
          { module: 'Security Layer', complexity: 'complex', totalCost: 200000 }
        ],
        timeline: { recommendedDays: 120, sequentialDays: 180, parallelDays: 60 },
        costByResource: {
          backend: { cost: 800000, percentage: '40%', deliverableCount: 50 },
          frontend: { cost: 600000, percentage: '30%', deliverableCount: 40 },
          ui: { cost: 200000, percentage: '10%', deliverableCount: 20 },
          qa: { cost: 400000, percentage: '20%', deliverableCount: 60 }
        },
        resources: {
          backend: { totalCost: 800000 },
          frontend: { totalCost: 600000 },
          ui: { totalCost: 200000 },
          qa: { totalCost: 400000 }
        },
        stats: { totalDeliverables: 170, totalComponents: 500 }
      },
      riskAssessment: {
        recommendedBuffers: { time: 1.3, cost: 1.25 },
        contingencyReserve: 200000,
        identifiedRisks: [{ category: 'business', type: 'stakeholder', impact: 'high' }],
        level: 'high',
        confidence: 65,
        mitigationPlan: { immediate: [] }
      },
      clientProfile: {
        clientSize: 'enterprise',
        committeeDecision: true,
        budgetClarity: 'clear',
        techSavvy: 'high'
      },
      options: {
        maxBudget: 2500000,
        scale: 'enterprise'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('-'.repeat(80));
    
    // Generate scenarios
    const result = await generator.generateScenarios(
      testCase.decomposition,
      testCase.riskAssessment,
      { enriched: { explicit: testCase.decomposition.modules.map(m => m.module) } },
      testCase.clientProfile,
      testCase.options
    );
    
    // Display baseline
    console.log('\n📊 Baseline Analysis:');
    console.log(`   Total Modules: ${result.baseline.modules}`);
    console.log(`   Total Deliverables: ${result.baseline.deliverables}`);
    console.log(`   Base Cost: ₹${result.baseline.cost.base.toLocaleString('en-IN')}`);
    console.log(`   With Risk: ₹${result.baseline.cost.total.toLocaleString('en-IN')}`);
    console.log(`   Timeline: ${result.baseline.timeline.withRisk} days`);
    console.log(`   Risk Level: ${result.baseline.riskLevel}`);
    console.log(`   Confidence: ${result.baseline.confidence}%`);
    
    // Display scenarios
    console.log(`\n🎯 Generated ${result.scenarios.length} Scenarios:`);
    
    for (const scenario of result.scenarios) {
      console.log(`\n   ${scenario.recommended ? '⭐' : '○'} ${scenario.name}`);
      console.log(`      ${scenario.description}`);
      console.log(`      Approach: ${scenario.approach}`);
      console.log(`      Cost: ₹${scenario.cost.base.toLocaleString('en-IN')} (with contingency: ₹${scenario.cost.withContingency.toLocaleString('en-IN')})`);
      console.log(`      Timeline: ${scenario.timeline.days} days (${scenario.timeline.weeks} weeks)`);
      console.log(`      Team Size: ${scenario.resources.totalHeadcount} resources`);
      console.log(`      Deliverables: ${scenario.deliverables.count} (${scenario.deliverables.percentage} of total)`);
      console.log(`      Risk Strategy: ${scenario.riskStrategy.approach}`);
      console.log(`      Suitability: ${scenario.suitability}%`);
      
      // Constraint fit
      console.log(`      Constraint Fit:`);
      if (testCase.options.maxBudget) {
        console.log(`        Budget: ${scenario.constraintFit.budget} ${scenario.constraintFit.budget === 'fits' || scenario.constraintFit.budget === 'perfect' ? '✅' : scenario.constraintFit.budget === 'close' ? '⚠️' : '❌'}`);
      }
      if (testCase.options.targetDeadline) {
        console.log(`        Timeline: ${scenario.constraintFit.timeline} ${scenario.constraintFit.timeline === 'fits' || scenario.constraintFit.timeline === 'perfect' ? '✅' : scenario.constraintFit.timeline === 'close' ? '⚠️' : '❌'}`);
      }
      
      // Trade-offs
      console.log(`      Trade-offs:`);
      console.log(`        Pros: ${scenario.tradeoffs.pros.slice(0, 2).join(', ')}`);
      console.log(`        Cons: ${scenario.tradeoffs.cons.slice(0, 2).join(', ')}`);
      
      // Phases (if applicable)
      if (scenario.phases && scenario.phases.length > 0) {
        console.log(`      Phases:`);
        for (const phase of scenario.phases) {
          console.log(`        ${phase.name}: ₹${phase.cost.toLocaleString('en-IN')} (${phase.timeline} days) - ${phase.modules} modules`);
        }
      }
      
      // ROI Metrics
      console.log(`      ROI Metrics:`);
      console.log(`        Time to Market: ${scenario.roi.timeToMarket} days`);
      console.log(`        Time to Value: ${scenario.roi.timeToValue}`);
      console.log(`        Cost Efficiency: ${scenario.roi.costEfficiency}`);
    }
    
    // Display recommendation
    console.log(`\n📌 Recommendation:`);
    console.log(`   Primary: ${result.recommendation.primary}`);
    console.log(`   Reasoning: ${result.recommendation.reasoning}`);
    console.log(`   Key Insight: ${result.recommendation.keyInsight}`);
    
    if (result.recommendation.alternatives.length > 0) {
      console.log(`   Alternatives to Consider:`);
      for (const alt of result.recommendation.alternatives) {
        console.log(`     • ${alt.name}: ${alt.whenToConsider}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✅ Scenario generation test complete!');
  
  console.log('\n📈 Summary:');
  console.log(' • Budget-constrained projects get MVP and phased options');
  console.log(' • Enterprise projects get phased and premium options');
  console.log(' • Each scenario shows clear trade-offs');
  console.log(' • Recommendations are context-aware');
  console.log(' • ROI metrics help decision-making');
}

// Run tests
testScenarioGeneration().catch(console.error);

