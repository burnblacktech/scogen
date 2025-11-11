const chalk = require('chalk');
const { initializeSystem } = require('../src/index');
const Parser = require('../src/modules/parser');
const PsychologicalProfiler = require('../src/modules/psychological-profiler');
const PromptManager = require('../src/utils/prompt-manager');
const LLMConversation = require('../src/modules/llm-conversation');
const Refiner = require('../src/modules/refiner');
const Generator = require('../src/modules/generator');
const Estimator = require('../src/modules/estimator');
const Auditor = require('../src/modules/auditor');
const OutputTranslator = require('../src/modules/output-translator');

console.log(chalk.blue.bold('\n🚀 Scogen Day 5 Test - Real LLM Integration\n'));

async function testDay5() {
  try {
    // Initialize all modules
    console.log('Initializing system...');
    const { config, logger, db, library } = initializeSystem();
    
    const parser = new Parser(library, logger);
    const profiler = new PsychologicalProfiler(logger);
    const promptManager = new PromptManager(config, logger);
    const llm = new LLMConversation(library, promptManager, logger, config);
    const refiner = new Refiner(library, logger);
    const generator = new Generator(library, logger);
    const estimator = new Estimator(library, logger);
    const auditor = new Auditor(library, logger);
    const translator = new OutputTranslator(library, logger);
    
    console.log(chalk.green('✓ All modules initialized'));

    // Check if API key is set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-key-here') {
      console.log(chalk.yellow('\n⚠️  OPENAI_API_KEY not set or using placeholder'));
      console.log(chalk.yellow('   Will use fallback mode (same as MockLLM)'));
      console.log(chalk.yellow('   Set OPENAI_API_KEY in .env to test real API\n'));
    } else {
      console.log(chalk.green('✓ OpenAI API key detected\n'));
    }

    // Run full chain with real LLM
    console.log('Running full chain with LLM...');
    const testInput = 'payroll app for my 3 coffee shops with tips';
    
    console.log(chalk.gray(`Input: "${testInput}"\n`));
    
    const conversation = await llm.startConversation(testInput);
    console.log(chalk.green('✓ Conversation started'));
    
    const profile = profiler.classify(
      conversation.analysis.personaSignals,
      conversation.analysis.conversationTone,
      []
    );
    console.log(chalk.green(`✓ Persona detected: ${profile.primaryPersona} (${(profile.confidence * 100).toFixed(0)}%)`));

    const parsed = parser.parse(
      conversation.extractedIntent,
      conversation.domainContext
    );
    console.log(chalk.green(`✓ Parsed ${parsed.modules.length} modules`));

    const budgetTier = conversation.extractedIntent.budget || 'moderate';
    const refined = refiner.refine(
      parsed,
      profile,
      budgetTier,
      conversation.domainContext
    );
    console.log(chalk.green(`✓ Refined to ${refined.refinedScope.modules.filter(m => m.priority !== 'deferred').length} active modules`));

    const plan = generator.generate(
      refined.refinedScope,
      budgetTier,
      profile,
      conversation.domainContext
    );
    console.log(chalk.green(`✓ Generated plan with ${plan.plan.steps.length} steps`));

    const estimate = estimator.estimate(
      refined.refinedScope,
      budgetTier,
      profile,
      conversation.domainContext,
      plan
    );
    console.log(chalk.green(`✓ Estimated: ${estimate.estimate.timeline.days} days, $${estimate.estimate.cost.total}`));

    const audited = auditor.audit(
      refined.refinedScope,
      conversation.domainContext,
      estimate.estimate,
      budgetTier,
      profile
    );
    console.log(chalk.green(`✓ Audited: ${audited.auditedScope.auditSummary.autoFixed} fixes applied`));

    // Test Output Translator
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

    // Show results
    console.log(chalk.blue('\n📊 Final Results:'));
    console.log(`  Industry: ${parsed.intent.industry}`);
    console.log(`  Use Case: ${parsed.intent.useCase}`);
    console.log(`  Persona: ${profile.primaryPersona} (${(profile.confidence * 100).toFixed(0)}%)`);
    console.log(`  Active Modules: ${refined.refinedScope.modules.filter(m => m.priority !== 'deferred').map(m => m.displayName).join(', ')}`);
    console.log(`  Timeline: ${estimate.estimate.timeline.weeks} weeks (${estimate.estimate.timeline.days} days)`);
    console.log(`  Cost: $${estimate.estimate.cost.total}`);
    console.log(`  Confidence: ${(estimate.estimate.confidence.overall * 100).toFixed(0)}%`);

    // Show conversational summary
    console.log(chalk.blue('\n📝 Conversational Summary:\n'));
    console.log(chalk.white(translated.conversationalOutput.summary));

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-key-here') {
      console.log(chalk.green.bold('\n✅ Day 5 Complete! Real LLM integration working.\n'));
    } else {
      console.log(chalk.yellow.bold('\n✅ Day 5 Complete! Fallback mode working (set OPENAI_API_KEY for real API).\n'));
    }
    
    db.close();
    process.exit(0);

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Day 5 Test Failed\n'));
    console.error(chalk.red(error.message));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

testDay5();

