/**
 * Runtime Chain Flow Test
 * 
 * Tests the actual execution flow to catch runtime errors
 */

const path = require('path');

// Mock minimal dependencies
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

const mockConfig = {};
const mockDb = {};
const mockLibrary = {
  normalizeModuleName: (name) => name
};

async function testChainFlow() {
  console.log('🧪 Testing Chain Execution Flow...\n');
  
  const errors = [];
  const ChainExecutor = require(path.join(__dirname, '../src/modules/chain-executor'));
  
  try {
    // Initialize executor
    console.log('1. Initializing ChainExecutor...');
    const executor = new ChainExecutor(mockConfig, mockLogger, mockDb, mockLibrary);
    console.log('   ✅ Initialized successfully');
    
    // Check for required methods
    console.log('\n2. Checking required methods...');
    const requiredMethods = [
      'execute',
      'stepInputAnalysis',
      'stepConversation',
      'stepRequirementsEnrichment',
      'stepProfiler',
      'stepParser',
      'stepRefiner',
      'stepGenerator',
      'stepEstimator',
      'stepAuditor',
      'stepTranslator'
    ];
    
    requiredMethods.forEach(method => {
      if (typeof executor[method] !== 'function') {
        errors.push(`Missing method: ${method}`);
      }
    });
    
    if (errors.length === 0) {
      console.log('   ✅ All required methods present');
    }
    
    // Check for required modules
    console.log('\n3. Checking required modules...');
    const requiredModules = [
      'parser',
      'profiler',
      'refiner',
      'generator',
      'estimator',
      'auditor',
      'translator',
      'requirementsEnricher',
      'hiddenCostCalculator'
    ];
    
    requiredModules.forEach(module => {
      if (!executor[module]) {
        errors.push(`Missing module: ${module}`);
      }
    });
    
    if (errors.length === 0) {
      console.log('   ✅ All required modules initialized');
    }
    
    // Test stepRequirementsEnrichment with mock data
    console.log('\n4. Testing stepRequirementsEnrichment...');
    try {
      const mockConversation = {
        extractedIntent: {
          modules: ['Dashboard', 'Reports']
        },
        domainContext: {}
      };
      
      const enriched = await executor.stepRequirementsEnrichment(
        mockConversation.extractedIntent.modules,
        mockConversation.domainContext,
        {}
      );
      
      if (enriched && Array.isArray(enriched.modules)) {
        console.log('   ✅ stepRequirementsEnrichment works');
      } else {
        errors.push('stepRequirementsEnrichment returned invalid structure');
      }
    } catch (error) {
      errors.push(`stepRequirementsEnrichment failed: ${error.message}`);
    }
    
    // Test stepParser with mock data
    console.log('\n5. Testing stepParser...');
    try {
      const mockConversation = {
        extractedIntent: {
          modules: ['Dashboard'],
          industry: 'generic',
          useCase: 'application'
        },
        domainContext: {}
      };
      
      const mockEnriched = {
        modules: ['Dashboard', 'Auth']
      };
      
      const parsed = await executor.stepParser(mockConversation, mockEnriched);
      
      if (parsed && parsed.modules) {
        console.log('   ✅ stepParser works');
      } else {
        errors.push('stepParser returned invalid structure');
      }
    } catch (error) {
      errors.push(`stepParser failed: ${error.message}`);
    }
    
    // Test hiddenCosts calculation
    console.log('\n6. Testing hiddenCosts calculation...');
    try {
      const mockEstimate = {
        estimate: {
          cost: 100000,
          complexity: 'medium',
          timeline: { days: 60 }
        }
      };
      
      const mockClientProfile = {
        riskLevel: 'medium',
        techSavvy: 'medium'
      };
      
      const mockRefined = {
        refinedScope: {
          modules: []
        }
      };
      
      if (executor.hiddenCostCalculator) {
        const hiddenCosts = executor.hiddenCostCalculator.calculateHiddenCosts(
          100000,
          mockClientProfile,
          { modules: [], complexity: 'medium' },
          {}
        );
        
        if (hiddenCosts && hiddenCosts.total !== undefined) {
          console.log('   ✅ hiddenCosts calculation works');
        } else {
          errors.push('hiddenCosts calculation returned invalid structure');
        }
      } else {
        errors.push('hiddenCostCalculator not initialized');
      }
    } catch (error) {
      errors.push(`hiddenCosts calculation failed: ${error.message}`);
    }
    
  } catch (error) {
    errors.push(`Initialization failed: ${error.message}`);
    console.error('   ❌', error.message);
  }
  
  console.log('\n📊 Test Results:\n');
  
  if (errors.length === 0) {
    console.log('✅ All tests passed!');
    return 0;
  } else {
    console.log(`❌ Found ${errors.length} error(s):\n`);
    errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
    return 1;
  }
}

// Run test
testChainFlow()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });

