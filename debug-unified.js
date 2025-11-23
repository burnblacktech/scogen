// Debug UnifiedProcessor initialization
console.log('Testing UnifiedProcessor imports...');

try {
  console.log('1. Testing RequirementExtractor...');
  const RequirementExtractor = require('./src/modules/requirement-extractor');
  console.log('✓ RequirementExtractor OK');

  console.log('2. Testing Parser...');
  const Parser = require('./src/modules/parser');
  console.log('✓ Parser OK');

  console.log('3. Testing SmartExpander...');
  const SmartExpander = require('./src/core/expansion/SmartExpander');
  console.log('✓ SmartExpander OK');

  console.log('4. Testing TechnicalDecomposer...');
  const TechnicalDecomposer = require('./src/modules/technical-decomposer');
  console.log('✓ TechnicalDecomposer OK');

  console.log('5. Testing DynamicCostCalculator...');
  const DynamicCostCalculator = require('./src/core/estimation/DynamicCostCalculator');
  console.log('✓ DynamicCostCalculator OK');

  console.log('6. Testing ScopeReviewer...');
  const ScopeReviewer = require('./src/core/unified/ScopeReviewer');
  console.log('✓ ScopeReviewer OK');

  console.log('7. Testing FeatureSuggestionEngine...');
  const FeatureSuggestionEngine = require('./src/core/intelligence/FeatureSuggestionEngine');
  console.log('✓ FeatureSuggestionEngine OK');

  console.log('All imports successful!');

} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Stack:', error.stack);
}
