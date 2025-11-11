#!/usr/bin/env node

const readline = require('readline');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { initializeSystem } = require('./index');
const ChainExecutor = require('./modules/chain-executor');

class CLI {
  constructor() {
    this.executor = null;
    this.rl = null;
    this.idleTimeout = null;
    this.db = null;
    this.projectService = null;
    this.shutdownHandlers = [];
    this.state = {
      phase: 'init',
      sessionId: null
    };
  }

  async start(args = []) {
    try {
      // Parse CLI flags
      const flags = this.parseFlags(args);

      // Show help if requested
      if (flags.help) {
        this.showHelp();
        return process.exit(0);
      }

      // Initialize system
      console.log(chalk.blue.bold('\n🚀 Scogen - Freeze Your Idea\n'));
      console.log(chalk.gray('Type "help" anytime for commands, "exit" to quit\n'));

      const { config, logger, db, library } = initializeSystem();
      this.db = db;
      this.executor = new ChainExecutor(config, logger, db, library);
      
      // Get project service reference for cleanup
      try {
        const { getProjectService } = require('./services/project-service');
        this.projectService = getProjectService();
      } catch (error) {
        // Project service may not be available, that's okay
      }

      // Setup Ctrl+C handler with cleanup
      const sigIntHandler = () => this.handleExit();
      this.shutdownHandlers.push({ event: 'SIGINT', handler: sigIntHandler });
      process.on('SIGINT', sigIntHandler);

      // Setup idle timeout (10 minutes)
      this.resetIdleTimeout();

      // Get initial input
      const input = await this.getInput(flags);

      if (!input || input.trim().length < 3) {
        console.log(chalk.yellow('\n⚠️  Input too short. Example: "payroll app for coffee shops"\n'));
        return this.start(args);
      }

      // Execute chain
      console.log(chalk.green('\n⏳ Freezing scope...\n'));

      const options = {
        sessionId: flags.sessionId || null,
        includeReview: flags.includeReview
      };

      // Add spec generation options if requested
      if (flags.specs) {
        options.generateSpecs = true;
        options.specLevel = flags.specLevel || 'standard';
        console.log(chalk.blue(`📋 Generating technical specs (level: ${options.specLevel})...\n`));
      }

      // Add cost proposal options if requested
      if (flags.costProposal) {
        options.generateCostProposal = true;
        options.rateTier = flags.rateTier || 'avg';
        console.log(chalk.blue(`💰 Generating cost proposal (rate tier: ${options.rateTier})...\n`));
      }

      const result = await this.executor.execute(input, options);

      this.state.sessionId = result.sessionId;

      // Display output
      console.log(result.output.formatted.cli);

      // Display review summary if enabled
      if (result.scopeReview) {
        const review = result.scopeReview;
        console.log(chalk.blue.bold('\n🔍 Scope Review Summary:'));
        console.log(chalk.white(`   Completeness: ${review.scores.completeness}%`));
        console.log(chalk.white(`   Accuracy: ${review.scores.accuracy}%`));
        console.log(chalk.white(`   Risk Level: ${review.scores.riskLevel.toUpperCase()}`));
        
        if (review.requiresReview) {
          console.log(chalk.yellow(`   ⚠️  Human review recommended`));
        }
        
        if (review.adjustedEstimate) {
          const adj = review.adjustedEstimate;
          if (adj.cost.delta !== 0 || adj.timeline.delta !== 0) {
            console.log(chalk.yellow(`   Adjusted: +₹${adj.cost.delta.toLocaleString('en-IN')}, +${adj.timeline.delta} days`));
          }
        }
      }

      // Display specs info if generated
      if (result.specs && result.specs.outputDir) {
        console.log(chalk.blue.bold('\n📁 Technical specs saved to:'));
        console.log(chalk.cyan(`   ${result.specs.outputDir}`));
        console.log(chalk.gray(`   Files generated: ${result.specs.filesWritten?.length || 0}`));
      }

      // Display cost proposal if generated
      if (result.costProposal) {
        const proposal = result.costProposal;
        console.log(chalk.blue.bold('\n💰 Cost Proposal Summary:'));
        console.log(chalk.white(`   Total Cost: ₹${proposal.summary.totalCost.toLocaleString('en-IN')}`));
        console.log(chalk.white(`   Duration: ${proposal.summary.estimatedDuration.weeks} weeks`));
        console.log(chalk.white(`   Total Hours: ${proposal.summary.totalHours}`));
        
        // Save proposal markdown
        const CostProposalGenerator = require('./modules/cost-proposal');
        const proposalGen = new CostProposalGenerator(this.executor.logger, this.executor.config);
        const markdown = proposalGen.formatProposalMarkdown(proposal, 'Project Proposal');
        
        const proposalPath = path.join(os.homedir(), 'Desktop', `cost-proposal-${Date.now()}.md`);
        fs.writeFileSync(proposalPath, markdown);
        console.log(chalk.green(`\n📄 Cost proposal saved: ${proposalPath}`));
      }

      // Save files
      await this.saveFiles(result, flags);

      // Success message
      console.log(chalk.green.bold('\n✅ Scope frozen successfully!\n'));

      // Cleanup
      this.cleanup();
      process.exit(0);

    } catch (error) {
      this.handleError(error);
    }
  }

  parseFlags(args) {
    const flags = {
      help: false,
      input: null,
      json: false,
      sessionId: null,
      tier: null,
      specs: false,
      specLevel: 'standard',
      costProposal: false,
      rateTier: 'avg',
      includeReview: true
    };

    args.forEach(arg => {
      if (arg === '--help' || arg === '-h') {
        flags.help = true;
      } else if (arg === '--json' || arg === '-j') {
        flags.json = true;
      } else if (arg === '--specs') {
        flags.specs = true;
      } else if (arg === '--cost-proposal') {
        flags.costProposal = true;
      } else if (arg === '--no-review') {
        flags.includeReview = false;
      } else if (arg.startsWith('--input=')) {
        flags.input = arg.split('=')[1];
      } else if (arg.startsWith('--session=')) {
        flags.sessionId = arg.split('=')[1];
      } else if (arg.startsWith('--tier=')) {
        flags.tier = arg.split('=')[1];
      } else if (arg.startsWith('--spec-level=') || arg.startsWith('--specLevel=')) {
        flags.specLevel = arg.split('=')[1];
      } else if (arg.startsWith('--rate-tier=') || arg.startsWith('--rateTier=')) {
        flags.rateTier = arg.split('=')[1];
      } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
        // Positional argument (input)
        flags.input = arg;
      }
    });

    return flags;
  }

  showHelp() {
    console.log(chalk.blue.bold('\n📖 Scogen Help\n'));
    console.log(chalk.white('Usage:'));
    console.log(chalk.gray('  npm start                    # Interactive mode'));
    console.log(chalk.gray('  npm start "your idea"        # Quick mode with input'));
    console.log(chalk.gray('  npm start --json             # Show JSON output'));
    console.log(chalk.gray('  npm start --help             # Show this help\n'));
    console.log(chalk.white('Commands (during conversation):'));
    console.log(chalk.gray('  help                         # Show help'));
    console.log(chalk.gray('  exit                         # Exit program'));
    console.log(chalk.gray('  freeze                       # Skip remaining questions\n'));
    console.log(chalk.white('Flags:'));
    console.log(chalk.gray('  --input="text"               # Provide input directly'));
    console.log(chalk.gray('  --json                       # Show JSON output'));
    console.log(chalk.gray('  --session=id                # Use specific session ID'));
    console.log(chalk.gray('  --tier=tight|moderate|flexible # Budget tier'));
    console.log(chalk.gray('  --specs                     # Generate technical specs'));
    console.log(chalk.gray('  --spec-level=level          # Spec level: jugaad|standard|enterprise'));
    console.log(chalk.gray('  --cost-proposal             # Generate cost proposal (Indian rates)'));
    console.log(chalk.gray('  --rate-tier=min|avg|max     # Cost proposal rate tier (default: avg)'));
    console.log(chalk.gray('  --no-review                 # Skip scope review (default: enabled)\n'));
    console.log(chalk.white('Examples:'));
    console.log(chalk.gray('  npm start "payroll app for coffee shops"'));
    console.log(chalk.gray('  npm start --input="dashboard app" --json'));
    console.log(chalk.gray('  npm start "payroll app" --specs --spec-level=enterprise'));
    console.log(chalk.gray('  npm start "payroll app" --cost-proposal --rate-tier=avg\n'));
  }

  async getInput(flags) {
    // If input provided via flags
    if (flags.input) {
      console.log(chalk.gray(`Using input: "${flags.input}"\n`));
      return flags.input;
    }

    // Interactive prompt
    return new Promise((resolve) => {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      this.rl.question(chalk.white('What\'s your idea? (rough is fine)\n> '), (answer) => {
        this.rl.close();
        this.rl = null;

        const lower = answer.toLowerCase().trim();

        if (lower === 'help') {
          this.showHelp();
          process.exit(0);
        }

        if (lower === 'exit') {
          console.log(chalk.gray('\nExiting...\n'));
          process.exit(0);
        }

        resolve(answer);
      });
    });
  }

  async saveFiles(result, flags) {
    try {
      const timestamp = Date.now();
      const baseFilename = `scope-${timestamp}`;
      const desktopPath = path.join(os.homedir(), 'Desktop');

      // Ensure Desktop directory exists
      if (!fs.existsSync(desktopPath)) {
        // Fallback to current directory
        const fallbackPath = path.join(process.cwd(), 'output');
        if (!fs.existsSync(fallbackPath)) {
          fs.mkdirSync(fallbackPath, { recursive: true });
        }
        await this.saveToPath(result, fallbackPath, baseFilename, flags);
        return;
      }

      await this.saveToPath(result, desktopPath, baseFilename, flags);

    } catch (error) {
      // Fallback to temp directory
      const tempPath = os.tmpdir();
      const baseFilename = `scope-${Date.now()}`;
      console.log(chalk.yellow(`\n⚠️  Desktop save failed—saving to temp directory\n`));
      await this.saveToPath(result, tempPath, baseFilename, flags);
    }
  }

  async saveToPath(result, dirPath, baseFilename, flags) {
    try {
      // Save JSON
      const jsonPath = path.join(dirPath, `${baseFilename}.json`);
      const jsonData = {
        sessionId: result.sessionId,
        timestamp: new Date().toISOString(),
        ...result.technical
      };
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
      console.log(chalk.green(`📄 Saved JSON: ${jsonPath}`));

      // Save Markdown
      const mdPath = path.join(dirPath, `${baseFilename}.md`);
      fs.writeFileSync(mdPath, result.output.formatted.markdown);
      console.log(chalk.green(`📄 Saved Markdown: ${mdPath}`));

      // Show JSON if flag
      if (flags.json) {
        console.log(chalk.gray('\n=== JSON Output ==='));
        console.log(JSON.stringify(jsonData, null, 2));
      }

    } catch (error) {
      console.log(chalk.yellow(`⚠️  Failed to save files: ${error.message}`));
    }
  }

  resetIdleTimeout() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    this.idleTimeout = setTimeout(() => {
      console.log(chalk.yellow('\n⏱️  Idle timeout (10 minutes)—exiting\n'));
      this.cleanup();
      process.exit(2);
    }, 600000); // 10 minutes
  }

  handleExit() {
    console.log(chalk.gray('\n\nExiting...\n'));
    this.cleanup();
    process.exit(0);
  }

  handleError(error) {
    console.error(chalk.red.bold('\n❌ Error occurred\n'));
    console.error(chalk.red(error.message));
    
    if (process.env.NODE_ENV === 'development') {
      console.error(chalk.gray(error.stack));
    } else {
      console.error(chalk.gray('Check logs/scogen.log for details'));
    }

    this.cleanup();
    process.exit(1);
  }

  cleanup() {
    // Clear timers
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
    
    // Close readline interface
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    
    // Close database connections
    if (this.db) {
      try {
        this.db.close();
        console.log(chalk.gray('Database connection closed'));
      } catch (error) {
        console.warn(chalk.yellow('Error closing database connection:', error.message));
      }
    }
    
    // Close project service database connections
    if (this.projectService) {
      try {
        this.projectService.close();
        console.log(chalk.gray('Project service connections closed'));
      } catch (error) {
        console.warn(chalk.yellow('Error closing project service:', error.message));
      }
    }
    
    // Remove all event listeners
    this.shutdownHandlers.forEach(({ event, handler }) => {
      process.removeListener(event, handler);
    });
    this.shutdownHandlers = [];
  }
}

// Main entry point
if (require.main === module) {
  const cli = new CLI();
  cli.start(process.argv.slice(2));
}

module.exports = CLI;

