const chalk = require('chalk');
const CLI = require('../src/cli');

console.log(chalk.blue.bold('\n🚀 Scogen Day 7 Test - CLI Interface\n'));

async function testDay7() {
  try {
    console.log('Testing CLI with direct input...\n');

    // Simulate CLI args
    const args = ['--input="payroll app for my 3 coffee shops with tips"'];

    // Create CLI instance
    const cli = new CLI();

    // Mock console.log to capture output
    let output = '';
    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
      originalLog(...args);
    };

    // Run CLI
    await cli.start(args);

    // Restore console.log
    console.log = originalLog;

    console.log(chalk.green.bold('\n✅ Day 7 Complete! CLI interface working.\n'));

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Day 7 Test Failed\n'));
    console.error(chalk.red(error.message));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  testDay7();
}

module.exports = { testDay7 };

