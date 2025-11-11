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

console.log(chalk.blue.bold('\n🚀 Scogen Day 3 Test - Full Chain\n'));

async function testDay3() {
  try {
    // Initialize Day 1-2 modules
    console.log('Initializing core system...');
    const { config, logger, db, library } = initializeSystem();
    console.log(chalk.green('✓ Core initialized'));

    // Initialize Day 2 modules
    const parser = new Parser(library, logger);
    const profiler = new PsychologicalProfiler(logger);
    const promptManager = new PromptManager(config, logger);
    const mockLLM = new MockLLM(library, promptManager, logger);

    // Initialize Day 3 modules
    console.log('\nInitializing Day 3 modules...');
    const refiner = new Refiner(library, logger);
    console.log(chalk.green('✓ Refiner initialized'));

    const generator = new Generator(library, logger);
    console.log(chalk.green('✓ Generator initialized'));

    const estimator = new Estimator(library, logger);
    console.log(chalk.green('✓ Estimator initialized'));

    const auditor = new Auditor(library, logger);
    console.log(chalk.green('✓ Auditor initialized'));

    // Test full chain
    console.log('\nTesting full chain...');
    const testInput = 'payroll app for my 3 coffee shops with tips';
    
    // Step 1: Conversation
    const conversation = await mockLLM.startConversation(testInput);
    console.log(chalk.green('✓ Conversation started'));

    // Step 2: Profiler
    const profile = profiler.classify(
      conversation.analysis.personaSignals,
      conversation.analysis.conversationTone,
      []
    );
    console.log(chalk.green(`✓ Persona detected: ${profile.primaryPersona}`));

    // Step 3: Parser
    const parsed = parser.parse(
      conversation.extractedIntent,
      conversation.domainContext
    );
    console.log(chalk.green(`✓ Parsed ${parsed.modules.length} modules`));

    // Step 4: Refiner
    const budgetTier = conversation.extractedIntent.budget || 'moderate';
    const refined = refiner.refine(
      parsed,
      profile,
      budgetTier,
      conversation.domainContext
    );
    console.log(chalk.green(`✓ Refined to ${refined.refinedScope.modules.filter(m => m.priority !== 'deferred').length} active modules`));

    // Step 5: Generator
    const plan = generator.generate(
      refined.refinedScope,
      budgetTier,
      profile,
      conversation.domainContext
    );
    console.log(chalk.green(`✓ Generated plan with ${plan.plan.steps.length} steps`));

    // Step 6: Estimator
    const estimate = estimator.estimate(
      refined.refinedScope,
      budgetTier,
      profile,
      conversation.domainContext,
      plan
    );
    console.log(chalk.green(`✓ Estimated: ${estimate.estimate.timeline.days} days, $${estimate.estimate.cost.total}`));

    // Step 7: Auditor
    const audited = auditor.audit(
      refined.refinedScope,
      conversation.domainContext,
      estimate.estimate,
      budgetTier,
      profile
    );
    console.log(chalk.green(`✓ Audited: ${audited.auditedScope.auditSummary.autoFixed} fixes applied`));

    // Show results
    console.log(chalk.blue('\n📊 Final Results:'));
    console.log(`  Industry: ${parsed.intent.industry}`);
    console.log(`  Use Case: ${parsed.intent.useCase}`);
    console.log(`  Persona: ${profile.primaryPersona} (${(profile.confidence * 100).toFixed(0)}%)`);
    console.log(`  Active Modules: ${refined.refinedScope.modules.filter(m => m.priority !== 'deferred').map(m => m.displayName).join(', ')}`);
    console.log(`  Timeline: ${estimate.estimate.timeline.weeks} weeks (${estimate.estimate.timeline.days} days)`);
    console.log(`  Cost: $${estimate.estimate.cost.total}`);
    console.log(`  Confidence: ${(estimate.estimate.confidence.overall * 100).toFixed(0)}%`);
    console.log(`  Feasibility: ${(refined.refinedScope.feasibility.score * 100).toFixed(0)}%`);

    console.log(chalk.green.bold('\n✅ Day 3 Complete! Full chain working.\n'));
    
    db.close();
    process.exit(0);

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Day 3 Test Failed\n'));
    console.error(chalk.red(error.message));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

testDay3();

