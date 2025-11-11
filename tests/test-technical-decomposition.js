// tests/test-technical-decomposition.js
// Test suite for technical decomposition and resource allocation

const TechnicalDecomposer = require('../src/modules/technical-decomposer');
const ResourcePresenter = require('../src/modules/resource-presenter');

async function testTechnicalDecomposition() {
  console.log('🧪 Testing Technical Decomposition & Resource Allocation\n');
  console.log('='.repeat(70));

  const decomposer = new TechnicalDecomposer();
  const presenter = new ResourcePresenter();

  const testCases = [
    {
      name: '🛒 E-commerce Platform',
      requirements: {
        enriched: {
          explicit: [
            'Product catalog',
            'Shopping cart',
            'Payment gateway',
            'User authentication',
            'Admin dashboard'
          ],
          domainSpecific: [
            'GST invoice generation',
            'Cash on Delivery',
            'Order tracking'
          ]
        }
      },
      context: {
        domain: 'ecommerce',
        scale: 'sme',
        complexity: 'standard'
      }
    },
    {
      name: '💼 SaaS Application',
      requirements: {
        enriched: {
          explicit: [
            'User authentication',
            'Subscription management',
            'Multi-tenant architecture',
            'Analytics dashboard',
            'API access'
          ]
        }
      },
      context: {
        domain: 'saas',
        scale: 'startup',
        complexity: 'complex'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('-'.repeat(70));

    // Decompose requirements
    const decomposition = await decomposer.decompose(
      testCase.requirements,
      testCase.context
    );

    // Display results
    console.log('\n📊 Decomposition Results:');
    console.log(`   Modules: ${decomposition.modules.length}`);
    console.log(`   Total Deliverables: ${decomposition.stats.totalDeliverables}`);
    console.log(`   Total Components: ${decomposition.stats.totalComponents}`);
    console.log(`   Resource Types: ${decomposition.stats.resourceTypes}`);
    console.log(`   Total Cost: ₹${decomposition.totalCost.toLocaleString('en-IN')}`);

    console.log('\n💰 Cost by Resource:');
    for (const [key, data] of Object.entries(decomposition.costByResource)) {
      console.log(`   ${data.title}: ₹${data.cost.toLocaleString('en-IN')} (${data.percentage}%)`);
      console.log(`      Deliverables: ${data.deliverableCount}`);
    }

    console.log('\n⏱️ Timeline Options:');
    console.log(`   Sequential: ${decomposition.timeline.sequentialDays} days (single developer)`);
    console.log(`   Parallel: ${decomposition.timeline.parallelDays} days (full team)`);
    console.log(`   Recommended: ${decomposition.timeline.recommendedDays} days (optimal)`);
    console.log(`   With Buffer: ${decomposition.timeline.withBuffer} days (safe estimate)`);

    // Show module breakdown
    console.log('\n📦 Module Costs:');
    const topModules = decomposition.modules
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    for (const module of topModules) {
      const percentage = ((module.totalCost / decomposition.totalCost) * 100).toFixed(1);
      console.log(`   ${module.module}: ₹${module.totalCost.toLocaleString('en-IN')} (${percentage}%)`);
      console.log(`      Complexity: ${module.complexity}`);
      console.log(`      Deliverables: ${module.deliverables.length}`);
    }

    // Show recommendations
    if (decomposition.recommendations && decomposition.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      for (const rec of decomposition.recommendations) {
        console.log(`   [${rec.type}] ${rec.message}`);
      }
    }

    // Test presenter - Executive Summary
    console.log('\n📋 Executive Presentation:');
    const executive = presenter.present(decomposition, 'executive');
    console.log(`   ${executive.message}`);

    // Test presenter - Summary with insights
    const summary = presenter.present(decomposition, 'summary');
    console.log('\n🎯 Key Insights:');
    for (const insight of summary.insights) {
      console.log(`   • ${insight}`);
    }

    // Show sample deliverables
    console.log('\n📝 Sample Deliverables:');
    const sampleDeliverables = decomposition.deliverables.slice(0, 5);
    for (const deliverable of sampleDeliverables) {
      console.log(`   • ${deliverable.name}`);
      console.log(`     Resource: ${deliverable.resource}`);
      console.log(`     Quantity: ${deliverable.quantity || 1}`);
      console.log(`     Cost: ₹${deliverable.cost.toLocaleString('en-IN')}`);
    }

    console.log('\n' + '='.repeat(70));
  }

  console.log('\n✅ Technical decomposition test complete!');
  console.log('\n📊 Summary:');
  console.log(' • Requirements broken down into specific deliverables');
  console.log(' • Each deliverable has a resource and cost');
  console.log(' • Timeline calculated based on resource availability');
  console.log(' • Multiple presentation levels for different audiences');
}

// Run tests
testTechnicalDecomposition().catch(console.error);

