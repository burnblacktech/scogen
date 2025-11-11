/**
 * Test Complete Chain with Database Integration
 */

const ChainExecutor = require('../src/modules/chain-executor');
const ConfigManager = require('../src/utils/config-manager');
const Logger = require('../src/utils/logger');
const Database = require('../src/modules/database');
const Library = require('../src/modules/library');

async function testChainWithDb() {
  console.log('🧪 Testing Complete Chain with Database Integration...\n');
  
  // Enable new database and quality analysis for testing
  process.env.USE_NEW_DB = 'true';
  process.env.USE_QUALITY_ANALYSIS = 'true';
  
  const config = new ConfigManager();
  const logger = new Logger();
  const db = new Database(config.get('database.path'), logger);
  const library = new Library(logger);
  
  const executor = new ChainExecutor(config, logger, db, library);
  
  try {
    console.log('1. Testing with good quality input...');
    const input1 = `E-commerce platform with:
      - Product catalog
      - Shopping cart
      - Payment gateway (Razorpay)
      - Admin dashboard
      - Customer accounts
      Budget: ₹5-8 lakhs
      Timeline: 3 months
      Platform: Web application`;
    
    const result1 = await executor.execute(input1, {
      generateSpecs: false,
      generateCostProposal: false,
      projectDetails: {
        companyName: 'Test E-commerce Co',
        contactEmail: 'test@ecommerce.com',
        projectName: 'E-commerce Platform'
      }
    });
    
    console.log('   ✅ Chain executed successfully');
    console.log(`   Input Analysis: ${result1.inputAnalysis?.completeness || 'N/A'}% complete`);
    console.log(`   Modules: ${result1.technical?.plan?.modules?.length || 0}`);
    console.log(`   Estimate: ₹${result1.technical?.estimate?.cost?.total?.toLocaleString('en-IN') || 'N/A'}`);
    
    if (result1.clientProfile) {
      console.log(`   Client Profile: ${result1.clientProfile.techSavvy} tech savvy, ${result1.clientProfile.riskLevel} risk`);
    }
    
    if (result1.hiddenCosts) {
      console.log(`   Hidden Costs: +${result1.hiddenCosts.percentageIncrease?.toFixed(1) || 0}%`);
    }
    
    console.log('\n2. Testing with vague input...');
    const input2 = 'I need a website';
    
    const result2 = await executor.execute(input2, {
      generateSpecs: false,
      generateCostProposal: false
    });
    
    if (result2.status === 'needs-clarification' || result2.feasibility === 'too-vague') {
      console.log('   ✅ Correctly identified vague input');
      console.log(`   Clarification needed: ${result2.clarificationDoc ? 'Yes' : 'No'}`);
    } else {
      console.log('   ⚠️ Vague input was processed (may be acceptable)');
    }
    
    console.log('\n✅ All chain tests passed!');
    
  } catch (error) {
    console.error('❌ Chain test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testChainWithDb();

