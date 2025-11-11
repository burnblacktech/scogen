const chalk = require('chalk');
const { initializeSystem } = require('../src/index');
const Parser = require('../src/modules/parser');
const PsychologicalProfiler = require('../src/modules/psychological-profiler');
const PromptManager = require('../src/utils/prompt-manager');
const MockLLM = require('../src/modules/mock-llm');

console.log(chalk.blue.bold('\n🚀 Scogen Day 2 Test\n'));

async function testDay2() {
  try {
    // Initialize Day 1 modules
    console.log('Initializing core system...');
    const { config, logger, db, library } = initializeSystem();
    console.log(chalk.green('✓ Core initialized'));

    // Initialize Day 2 modules
    console.log('\nInitializing Day 2 modules...');
    
    const parser = new Parser(library, logger);
    console.log(chalk.green('✓ Parser initialized'));

    const profiler = new PsychologicalProfiler(logger);
    console.log(chalk.green('✓ Profiler initialized'));

    const promptManager = new PromptManager(config, logger);
    console.log(chalk.green('✓ PromptManager initialized'));

    const mockLLM = new MockLLM(library, promptManager, logger);
    console.log(chalk.green('✓ MockLLM initialized'));

    // Test conversation flow
    console.log('\nTesting conversation flow...');
    const testInput = 'payroll app for my 3 coffee shops with tips';
    
    const conversation = await mockLLM.startConversation(testInput);
    console.log(chalk.green('✓ Conversation started'));

    // Test profiler
    const profile = profiler.classify(
      conversation.analysis.personaSignals,
      conversation.analysis.conversationTone,
      []
    );
    console.log(chalk.green(`✓ Persona detected: ${profile.primaryPersona}`));

    // Test parser
    const parsed = parser.parse(
      conversation.extractedIntent,
      conversation.domainContext
    );
    console.log(chalk.green(`✓ Parsed ${parsed.modules.length} modules`));

    // Show results
    console.log(chalk.blue('\n📊 Test Results:'));
    console.log(`  Industry: ${parsed.intent.industry}`);
    console.log(`  Use Case: ${parsed.intent.useCase}`);
    console.log(`  Modules: ${parsed.modules.map(m => m.displayName).join(', ')}`);
    console.log(`  Persona: ${profile.primaryPersona} (${(profile.confidence * 100).toFixed(0)}%)`);
    console.log(`  Timeline Buffer: ${(profile.psychAdjustments.timelineBuffer * 100).toFixed(0)}%`);

    console.log(chalk.green.bold('\n✅ Day 2 Complete!\n'));
    
    db.close();
    process.exit(0);

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Day 2 Test Failed\n'));
    console.error(chalk.red(error.message));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

testDay2();

