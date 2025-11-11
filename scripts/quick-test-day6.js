const chalk = require('chalk');
const { initializeSystem } = require('../src/index');
const ChainExecutor = require('../src/modules/chain-executor');

console.log(chalk.blue.bold('\n🚀 Scogen Day 6 Test - Chain Integration\n'));

async function testDay6() {
  try {
    // Initialize system
    console.log('Initializing system...');
    const { config, logger, db, library } = initializeSystem();
    
    // Create chain executor
    const executor = new ChainExecutor(config, logger, db, library);
    console.log(chalk.green('✓ Chain executor initialized'));

    // Test full chain execution
    console.log('\nExecuting full chain...');
    const testInput = 'payroll app for my 3 coffee shops with tips';
    
    console.log(chalk.gray(`Input: "${testInput}"\n`));

    const result = await executor.execute(testInput, {
      sessionId: 'test-session-' + Date.now()
    });

    console.log(chalk.green('✓ Chain execution complete'));

    // Display results
    console.log(chalk.blue('\n📊 Execution Results:'));
    console.log(`  Session ID: ${result.sessionId}`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Industry: ${result.technical.plan.overview.summary.split(':')[0]}`);
    console.log(`  Timeline: ${result.technical.estimate.timeline.weeks} weeks`);
    console.log(`  Cost: $${result.technical.estimate.cost.total}`);
    console.log(`  Confidence: ${Math.round(result.technical.estimate.confidence.overall * 100)}%`);

    // Display conversational summary
    console.log(chalk.blue('\n📝 Conversational Summary:\n'));
    console.log(chalk.white(result.output.summary));

    // Display CLI output preview
    console.log(chalk.blue('\n📄 CLI Output Preview:\n'));
    const cliLines = result.output.formatted.cli.split('\n').slice(0, 15);
    console.log(cliLines.join('\n'));
    console.log(chalk.gray('... (truncated)'));

    // Test session management
    console.log(chalk.blue('\n🔍 Session Management Test:'));
    const history = executor.getConversationHistory();
    console.log(`  Conversation history entries: ${history.length}`);
    console.log(`  First entry: ${history[0]?.role}: ${history[0]?.content?.substring(0, 50)}...`);

    // Test reset
    executor.reset();
    console.log(chalk.green('✓ Executor reset successful'));

    console.log(chalk.green.bold('\n✅ Day 6 Complete! Chain integration working.\n'));
    
    db.close();
    process.exit(0);

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Day 6 Test Failed\n'));
    console.error(chalk.red(error.message));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

testDay6();

