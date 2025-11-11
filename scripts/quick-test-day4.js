const chalk = require('chalk');
const { initializeSystem } = require('../src/index');
const Parser = require('../src/modules/parser');
const PsychologicalProfiler = require('../src/modules/psychological-profiler');
const PromptManager = require('../src/utils/prompt-manager');
const MockLLM = require('../src/modules/mock-llm');
const Refiner = require('../src/modules/refiner');
const Generator = require('../src/modules/generator');
const Estimator = require('../src/modules/estimator');
const Auditor = require('../src/modules/auditor');
const OutputTranslator = require('../src/modules/output-translator');

console.log(chalk.blue.bold('\n🚀 Scogen Day 4 Test - Output Formatting\n'));

async function testDay4() {
  try {
    // Initialize all modules
    console.log('Initializing system...');
    const { config, logger, db, library } = initializeSystem();
    
    const parser = new Parser(library, logger);
    const profiler = new PsychologicalProfiler(logger);
    const promptManager = new PromptManager(config, logger);
    const mockLLM = new MockLLM(library, promptManager, logger);
    const refiner = new Refiner(library, logger);
    const generator = new Generator(library, logger);
    const estimator = new Estimator(library, logger);
    const auditor = new Auditor(library, logger);
    const translator = new OutputTranslator(library, logger);
    
    console.log(chalk.green('✓ All modules initialized'));

    // Run full chain
    console.log('\nRunning full chain...');
    const testInput = 'payroll app for my 3 coffee shops with tips';
    
    const conversation = await mockLLM.startConversation(testInput);
    const profile = profiler.classify(
      conversation.analysis.personaSignals,
      conversation.analysis.conversationTone,
      []
    );
    const parsed = parser.parse(
      conversation.extractedIntent,
      conversation.domainContext
    );
    const budgetTier = conversation.extractedIntent.budget || 'moderate';
    const refined = refiner.refine(
      parsed,
      profile,
      budgetTier,
      conversation.domainContext
    );
    const plan = generator.generate(
      refined.refinedScope,
      budgetTier,
      profile,
      conversation.domainContext
    );
    const estimate = estimator.estimate(
      refined.refinedScope,
      budgetTier,
      profile,
      conversation.domainContext,
      plan
    );
    const audited = auditor.audit(
      refined.refinedScope,
      conversation.domainContext,
      estimate.estimate,
      budgetTier,
      profile
    );

    console.log(chalk.green('✓ Chain complete'));

    // Test Output Translator
    console.log('\nTesting output formatting...');
    
    const technicalOutput = {
      plan: plan.plan,
      estimate: estimate.estimate,
      auditedScope: audited.auditedScope
    };

    const userContext = {
      conversationTone: conversation.analysis.conversationTone,
      primaryPersona: profile.primaryPersona,
      messagingTone: profile.messagingTone,
      originalInput: testInput
    };

    const translated = translator.translate(
      technicalOutput,
      userContext,
      conversation.domainContext
    );

    console.log(chalk.green('✓ Translation complete'));

    // Display CLI output
    console.log(chalk.blue('\n📄 CLI Output:\n'));
    console.log(translated.conversationalOutput.formatted.cli);

    // Display summary
    console.log(chalk.blue('\n📝 Conversational Summary:\n'));
    console.log(chalk.white(translated.conversationalOutput.summary));

    // Check markdown
    const markdown = translated.conversationalOutput.formatted.markdown;
    console.log(chalk.blue(`\n📄 Markdown Output (${markdown.length} chars):`));
    console.log(chalk.gray(markdown.split('\n').slice(0, 10).join('\n') + '\n... (truncated)'));

    console.log(chalk.green.bold('\n✅ Day 4 Complete! Output formatting working.\n'));
    
    db.close();
    process.exit(0);

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Day 4 Test Failed\n'));
    console.error(chalk.red(error.message));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

testDay4();

