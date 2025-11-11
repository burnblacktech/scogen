const Parser = require('./parser');
const PsychologicalProfiler = require('./psychological-profiler');
const PromptManager = require('../utils/prompt-manager');
const LLMConversation = require('./llm-conversation');
const Refiner = require('./refiner');
const Generator = require('./generator');
const Estimator = require('./estimator');
const Auditor = require('./auditor');
const OutputTranslator = require('./output-translator');
const ScenarioGenerator = require('./scenario-generator');
const AssumptionTracker = require('./assumption-tracker');
const InputAnalyzer = require('./input-analyzer');
const ClarificationDocGenerator = require('./clarification-doc-generator');
const RequirementsEnricher = require('./requirements-enricher');
const ClientProfiler = require('./client-profiler');
const HiddenCostCalculator = require('./hidden-cost-calculator');
const { getProjectService } = require('../services/project-service');

class ChainExecutor {
  constructor(config, logger, db, library) {
    this.config = config;
    this.logger = logger;
    this.db = db;
    this.library = library;

    // Initialize all modules
    this.parser = new Parser(library, logger);
    this.profiler = new PsychologicalProfiler(logger);
    this.promptManager = new PromptManager(config, logger);
    this.llm = new LLMConversation(library, this.promptManager, logger, config);
    this.refiner = new Refiner(library, logger);
    this.generator = new Generator(library, logger);
    this.estimator = new Estimator(library, logger);
    this.auditor = new Auditor(library, logger);
    this.translator = new OutputTranslator(library, logger);
    this.scenarioGenerator = new ScenarioGenerator(this.estimator, this.refiner, logger);
    this.assumptionTracker = new AssumptionTracker(logger);
    this.inputAnalyzer = new InputAnalyzer(logger);
    this.clarificationDocGenerator = new ClarificationDocGenerator(logger);
    this.requirementsEnricher = new RequirementsEnricher(logger);
    this.clientProfiler = new ClientProfiler(logger);
    this.hiddenCostCalculator = new HiddenCostCalculator(logger);
    this.projectService = getProjectService();

    this.sessionId = null;
    this.conversationHistory = [];
  }

  async execute(input, options = {}) {
    try {
      this.sessionId = options.sessionId || this.generateSessionId();
      this.logger.info('Chain execution started', { sessionId: this.sessionId, input });

      // Step 0: Input Quality Analysis (enhanced with quality metrics if enabled)
      const inputAnalysis = await this.stepInputAnalysis(input, options);
      
      // Step 0.5: Client Profiling (NEW)
      const clientProfile = await this.stepClientProfiling(input, options);
      
      // Handle different quality paths (use client profile for better messaging)
      if (inputAnalysis.feasibility === 'too-vague') {
        // Extract partial scope and return clarification doc
        return await this.handleLowQualityInput(input, inputAnalysis, options, clientProfile);
      } else if (inputAnalysis.feasibility === 'needs-clarification') {
        // For medium quality, we'll continue but could show warnings
        // User can proceed with defaults or fill quick form
        this.logger.info('Medium quality input - continuing with warnings', {
          completeness: inputAnalysis.completeness,
          techSavvy: clientProfile.techSavvy
        });
      }
      // High quality (70%+) - continue normally

      // Step 1: LLM Conversation (persona detection + intent extraction)
      const conversation = await this.stepConversation(input, options);
      this.conversationHistory.push({ role: 'user', content: input });

      // Step 2: Requirements Enrichment (add domain implicits and edge cases)
      const extractedModules = conversation?.extractedIntent?.modules || [];
      const enriched = await this.stepRequirementsEnrichment(
        Array.isArray(extractedModules) ? extractedModules : [],
        conversation?.domainContext || {},
        options.projectDetails || {}
      );

      // Step 3: Psychological Profiler
      const profile = await this.stepProfiler(conversation);

      // Step 4: Parser (use enriched modules)
      const parsed = await this.stepParser(conversation, enriched);

      // Step 5: Refiner
      // Budget tier: Calculate from scope, not predetermined
      // Use 'moderate' as default for backward compatibility, but don't cap based on it
      const budgetTier = conversation.extractedIntent.budget || 'moderate';
      const refined = await this.stepRefiner(parsed, profile, budgetTier, conversation.domainContext, options);

      // Step 6: Generator
      const plan = await this.stepGenerator(refined, budgetTier, profile, conversation.domainContext);

      // Step 6.5: Spec Generation (OPTIONAL - only if requested)
      let specs = null;
      if (options.generateSpecs) {
        specs = await this.stepSpecGeneration(
          plan,
          parsed,
          conversation.domainContext,
          options.specLevel || 'standard'
        );
      }

      // Step 6.6: Technical Decomposition (if enabled)
      let technicalBreakdown = null;
      if (this.config.get('technicalDecomposition.enabled') !== false) {
        technicalBreakdown = await this.stepTechnicalDecomposition(
          refined.refinedScope.modules,
          plan,
          conversation.domainContext,
          options
        );
      }

      // Step 7: Estimator (pass technical breakdown if available)
      const estimate = await this.stepEstimator(
        refined, 
        budgetTier, 
        profile, 
        conversation.domainContext, 
        plan,
        technicalBreakdown
      );

      // Track assumptions after estimation
      this.assumptionTracker.reset(); // Clear previous assumptions
      if (options.projectDetails) {
        this.assumptionTracker.trackFromProjectDetails(options.projectDetails, estimate.estimate);
      }

      // Step 7.5: Scope Review (OPTIONAL, default: enabled)
      let scopeReview = null;
      if (options.includeReview !== false) {
        scopeReview = await this.stepScopeReview(refined, estimate, conversation.domainContext, options);
      }

      // Step 7.7: Cost Proposal (OPTIONAL - only if requested)
      let costProposal = null;
      if (options.generateCostProposal) {
        // Use reviewed scope if available, otherwise original
        const scopeForProposal = scopeReview?.adjustedEstimate ? 
          { ...refined, adjustedEstimate: scopeReview.adjustedEstimate } : 
          refined;
        costProposal = await this.stepCostProposal(scopeForProposal, estimate, options);
      }

      // Step 7.8: Scenario Generation (NEW - Possibility Enabler)
      let scenarios = null;
      if (options.generateScenarios !== false) { // Default: enabled
        scenarios = await this.stepScenarioGeneration(
          refined,
          estimate,
          options,
          clientProfile // Pass client profile
        );
      }

      // Step 7.9: Hidden Costs Calculation (NEW)
      let hiddenCosts = null;
      if (clientProfile && estimate?.estimate?.cost) {
        try {
          const developmentCost = typeof estimate.estimate.cost === 'object' 
            ? estimate.estimate.cost.total || estimate.estimate.cost
            : estimate.estimate.cost;
          
          const projectScope = {
            modules: refined.refinedScope?.modules || [],
            complexity: estimate.estimate.complexity || 'medium',
            timeline: estimate.estimate.timeline || {}
          };
          
          hiddenCosts = this.hiddenCostCalculator.calculateHiddenCosts(
            developmentCost,
            clientProfile,
            projectScope,
            options
          );
        } catch (error) {
          this.logger.warn('Hidden costs calculation failed (non-fatal)', { error: error.message });
          hiddenCosts = null;
        }
      }

      // Step 8: Auditor
      const audited = await this.stepAuditor(refined, conversation.domainContext, estimate, budgetTier, profile);

      // Step 9: Output Translator
      const output = await this.stepTranslator(plan, estimate, audited, conversation, profile, input, technicalBreakdown, scenarios, clientProfile, hiddenCosts);

      // Step 10: Save to database
      await this.saveScope({
        technical: {
          plan: plan.plan,
          estimate: estimate.estimate,
          auditedScope: audited.auditedScope
        },
        conversationalOutput: output.conversationalOutput
      }, conversation, profile, specs);

      this.logger.info('Chain execution complete', { sessionId: this.sessionId });

      return {
        success: true,
        sessionId: this.sessionId,
        output: output.conversationalOutput,
        technical: {
          plan: plan.plan,
          estimate: estimate.estimate,
          auditedScope: audited.auditedScope,
          technicalBreakdown: technicalBreakdown || null // Only present if enabled
        },
        specs: specs || null, // Only present if generated
        scopeReview: scopeReview || null, // Only present if review enabled
        costProposal: costProposal || null, // Only present if generated
        scenarios: scenarios || null, // Only present if scenario generation enabled
        assumptions: this.assumptionTracker.formatForDisplay(), // Always present
        clientProfile: clientProfile || null, // Client profile (NEW)
        hiddenCosts: hiddenCosts || null // Hidden costs breakdown (NEW)
      };

    } catch (error) {
      this.logger.error('Chain execution failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async stepInputAnalysis(input, options = {}) {
    this.logger.debug('Step 0: Input Analysis');
    try {
      const inputType = options.inputType || 'text';
      const analysis = await this.inputAnalyzer.analyze(input, inputType);
      return analysis;
    } catch (error) {
      this.logger.error('Input analysis failed', { error: error.message });
      // Non-fatal: continue with default analysis
      return {
        completeness: 50,
        specificity: 50,
        feasibility: 'needs-clarification',
        missingCritical: [],
        missingImportant: [],
        missingNiceToHave: [],
        clarificationsNeeded: []
      };
    }
  }

  async stepClientProfiling(input, options) {
    this.logger.debug('Step 0.5: Client Profiling');
    try {
      const profile = await this.clientProfiler.profileClient(input, this.conversationHistory);
      return profile;
    } catch (error) {
      this.logger.error('Client profiling failed', { error: error.message });
      // Non-fatal: return default profile
      return this.clientProfiler.getDefaultProfile();
    }
  }

  async handleLowQualityInput(input, inputAnalysis, options, clientProfile = null) {
    this.logger.info('Handling low-quality input', { 
      completeness: inputAnalysis.completeness,
      feasibility: inputAnalysis.feasibility 
    });

    try {
      // Try to extract partial scope using LLM (lightweight extraction)
      let partialScope = null;
      try {
        const conversation = await this.stepConversation(input, options);
        partialScope = {
          industry: conversation.domainContext?.industry || 'generic',
          useCase: conversation.extractedIntent?.useCase || 'application',
          platformType: conversation.domainContext?.platformType || 'web-app',
          modules: conversation.extractedIntent?.modules || [],
          scale: 'Not specified'
        };
      } catch (error) {
        this.logger.warn('Failed to extract partial scope', { error: error.message });
        partialScope = {
          industry: 'generic',
          useCase: 'application',
          platformType: 'web-app',
          modules: [],
          scale: 'Not specified'
        };
      }

      // Generate assumptions based on what we detected
      const assumptions = this.generateAssumptionsFromInput(input, partialScope);

      // Suggest template
      const suggestedTemplate = this.inputAnalyzer.suggestTemplate(
        inputAnalysis.checks,
        input
      );

      // Generate clarification document
      const clarificationDoc = this.clarificationDocGenerator.generate(
        partialScope,
        {
          critical: inputAnalysis.missingCritical,
          important: inputAnalysis.missingImportant,
          niceToHave: inputAnalysis.missingNiceToHave
        },
        assumptions,
        suggestedTemplate
      );

      return {
        success: true,
        status: 'needs-clarification',
        quality: inputAnalysis.completeness,
        partialScope,
        clarificationDoc,
        suggestedTemplate,
        missingItems: {
          critical: inputAnalysis.missingCritical,
          important: inputAnalysis.missingImportant,
          niceToHave: inputAnalysis.missingNiceToHave
        },
        clarificationsNeeded: inputAnalysis.clarificationsNeeded
      };
    } catch (error) {
      this.logger.error('Failed to handle low-quality input', { error: error.message });
      throw error;
    }
  }

  async handleMediumQualityInput(input, inputAnalysis, options) {
    this.logger.info('Handling medium-quality input', { 
      completeness: inputAnalysis.completeness,
      feasibility: inputAnalysis.feasibility 
    });

    try {
      // Extract what we can
      const conversation = await this.stepConversation(input, options);
      const extractedScope = {
        industry: conversation.domainContext?.industry,
        useCase: conversation.extractedIntent?.useCase,
        platformType: conversation.domainContext?.platformType,
        modules: conversation.extractedIntent?.modules || []
      };

      // Generate quick form
      const quickForm = this.clarificationDocGenerator.generateQuickForm(
        {
          critical: inputAnalysis.missingCritical,
          important: inputAnalysis.missingImportant,
          niceToHave: inputAnalysis.missingNiceToHave
        },
        inputAnalysis
      );

      return {
        success: true,
        status: 'needs-quick-clarification',
        quality: inputAnalysis.completeness,
        extractedScope,
        missingItems: {
          critical: inputAnalysis.missingCritical,
          important: inputAnalysis.missingImportant,
          niceToHave: inputAnalysis.missingNiceToHave
        },
        quickForm,
        clarificationsNeeded: inputAnalysis.clarificationsNeeded
      };
    } catch (error) {
      this.logger.error('Failed to handle medium-quality input', { error: error.message });
      throw error;
    }
  }

  generateAssumptionsFromInput(input, partialScope) {
    const assumptions = {};
    const lowerInput = input.toLowerCase();

    // Platform assumption
    if (!partialScope.platformType || partialScope.platformType === 'web-app') {
      if (lowerInput.includes('mobile') || lowerInput.includes('app')) {
        assumptions.platform = 'Mobile app or responsive web';
      } else {
        assumptions.platform = 'Web application';
      }
    } else {
      assumptions.platform = partialScope.platformType;
    }

    // Scale assumption
    if (partialScope.scale === 'Not specified') {
      assumptions.scale = 'Medium scale (100-1000 users)';
    } else {
      assumptions.scale = partialScope.scale;
    }

    // Business model assumption
    if (lowerInput.includes('ecommerce') || lowerInput.includes('shop')) {
      assumptions.businessModel = 'B2C e-commerce';
    } else if (lowerInput.includes('saas') || lowerInput.includes('subscription')) {
      assumptions.businessModel = 'SaaS subscription model';
    } else {
      assumptions.businessModel = 'Standard web application';
    }

    // User types assumption
    if (partialScope.modules && partialScope.modules.length > 0) {
      const hasAuth = partialScope.modules.some(m => 
        m.toLowerCase().includes('auth') || m.toLowerCase().includes('user')
      );
      if (hasAuth) {
        assumptions.userTypes = ['Admin', 'User'];
      }
    }

    return assumptions;
  }

  async stepConversation(input, options = {}) {
    this.logger.debug('Step 1: Conversation', { 
      platformType: options.platformType,
      hasProjectDetails: !!options.projectDetails 
    });
    try {
      // Extract user context from options and projectDetails
      const userContext = {
        platformType: options.platformType,
        projectDetails: options.projectDetails // Pass structured details
      };
      const conversation = await this.llm.startConversation(input, userContext);
      this.conversationHistory.push({ role: 'assistant', content: 'Analysis complete' });
      return conversation;
    } catch (error) {
      this.logger.error('Conversation step failed', { error: error.message });
      throw new Error(`Conversation failed: ${error.message}`);
    }
  }

  async stepProfiler(conversation) {
    this.logger.debug('Step 2: Profiler');
    try {
      const profile = this.profiler.classify(
        conversation.analysis.personaSignals,
        conversation.analysis.conversationTone,
        []
      );
      return profile;
    } catch (error) {
      this.logger.error('Profiler step failed', { error: error.message });
      throw new Error(`Profiling failed: ${error.message}`);
    }
  }

  async stepRequirementsEnrichment(extractedModules, domainContext, projectDetails) {
    this.logger.debug('Step 2: Requirements Enrichment');
    try {
      // Build context for enrichment
      const enrichmentContext = {
        domainContext: domainContext || {},
        projectDetails: projectDetails || {},
        market: projectDetails?.marketRegion || 'india',
        scale: projectDetails?.projectScale || 'sme',
        complexity: 'standard',
        novelty: 30,
        clientValue: 50,
        enableAI: process.env.ENABLE_AI_ENRICHMENT === 'true'
      };
      
      const enrichedResult = await this.requirementsEnricher.enrich(
        extractedModules,
        enrichmentContext
      );
      
      // Convert new structure to old structure for backward compatibility
      const allModules = [
        ...(enrichedResult.enriched?.explicit || []),
        ...(enrichedResult.enriched?.implicit || []),
        ...(enrichedResult.enriched?.domainSpecific || [])
      ].map(item => typeof item === 'string' ? item : item.name || item);
      
      return {
        modules: allModules,
        addedModules: enrichedResult.enriched?.implicit || [],
        edgeCases: enrichedResult.enriched?.edgeCases || [],
        domain: enrichmentContext.domainContext?.industry || 'generic',
        // Also return full enrichment result for new chain executors
        fullEnrichment: enrichedResult
      };
    } catch (error) {
      this.logger.error('Requirements enrichment failed', { error: error.message });
      // Non-fatal: continue with original modules
      return {
        modules: Array.isArray(extractedModules) ? extractedModules : [],
        addedModules: [],
        edgeCases: [],
        domain: 'generic'
      };
    }
  }

  async stepParser(conversation, enriched = null) {
    this.logger.debug('Step 4: Parser');
    try {
      // Use enriched modules if available, otherwise use original
      let modulesToParse = conversation.extractedIntent?.modules || [];
      
      if (enriched && enriched.modules) {
        // Ensure modules is an array
        modulesToParse = Array.isArray(enriched.modules) 
          ? enriched.modules.map(m => typeof m === 'string' ? m : (m.name || m))
          : [];
      }
      
      // Ensure extractedIntent exists
      const baseIntent = conversation?.extractedIntent || {
        modules: [],
        industry: 'generic',
        useCase: 'application'
      };
      
      const intentToParse = {
        ...baseIntent,
        modules: modulesToParse
      };

      const parsed = this.parser.parse(
        intentToParse,
        conversation?.domainContext || {}
      );

      // Add edge cases to parsed scope if available
      if (enriched && enriched.edgeCases && enriched.edgeCases.length > 0) {
        if (!parsed.edgeCases) {
          parsed.edgeCases = [];
        }
        parsed.edgeCases.push(...enriched.edgeCases);
      }

      return parsed;
    } catch (error) {
      this.logger.error('Parser step failed', { error: error.message });
      throw new Error(`Parsing failed: ${error.message}`);
    }
  }

  async stepRefiner(parsed, profile, budgetTier, domainContext) {
    this.logger.debug('Step 5: Refiner');
    try {
      const refined = this.refiner.refine(
        parsed,
        profile,
        budgetTier,
        domainContext
      );
      return refined;
    } catch (error) {
      this.logger.error('Refiner step failed', { error: error.message });
      throw new Error(`Refinement failed: ${error.message}`);
    }
  }

  async stepGenerator(refined, budgetTier, profile, domainContext) {
    this.logger.debug('Step 5: Generator');
    try {
      const plan = this.generator.generate(
        refined.refinedScope,
        budgetTier,
        profile,
        domainContext
      );
      return plan;
    } catch (error) {
      this.logger.error('Generator step failed', { error: error.message });
      throw new Error(`Plan generation failed: ${error.message}`);
    }
  }

  async stepSpecGeneration(plan, parsed, domainContext, level) {
    this.logger.debug('Step 5.5: Spec Generation');
    try {
      const SpecGenerator = require('./specs/spec-generator');
      const specGenerator = new SpecGenerator(this.library, this.logger);

      const specs = await specGenerator.generate(
        plan,
        parsed.modules,
        domainContext,
        level
      );

      if (specs) {
        this.logger.info('Spec generation complete', {
          outputDir: specs.outputDir,
          filesGenerated: specs.filesWritten?.length || 0
        });
      }

      return specs;
    } catch (error) {
      this.logger.error('Spec generation failed (non-fatal)', { error: error.message });
      // Don't throw - spec generation is optional, let chain continue
      return null;
    }
  }

  async stepTechnicalDecomposition(modules, plan, domainContext, options) {
    this.logger.debug('Step 5.6: Technical Decomposition');
    try {
      const TechnicalMapper = require('./technical-mapper');
      const mapper = new TechnicalMapper(this.library, this.logger, this.config);
      
      const breakdowns = [];
      for (const module of modules) {
        try {
          const breakdown = await mapper.decomposeModule(
            module,
            domainContext,
            options.platformType
          );
          breakdowns.push(breakdown);
        } catch (error) {
          this.logger.warn('Failed to decompose module', {
            module: module.name,
            error: error.message
          });
          // Continue with other modules even if one fails
        }
      }
      
      const totalComponents = breakdowns.reduce((sum, b) => sum + (b.technicalComponents?.length || 0), 0);
      const totalEffort = breakdowns.reduce((sum, b) => sum + (b.totalEffort || 0), 0);
      const totalCost = breakdowns.reduce((sum, b) => sum + (b.totalCost || 0), 0);
      
      // Build code structure summary
      const codeStructure = this.buildCodeStructure(breakdowns);
      
      this.logger.info('Technical decomposition complete', {
        modulesProcessed: breakdowns.length,
        totalComponents: totalComponents,
        totalEffort: totalEffort
      });
      
      return {
        businessModules: modules,
        technicalBreakdowns: breakdowns,
        totalComponents: totalComponents,
        totalEffort: totalEffort,
        totalCost: totalCost,
        codeStructure: codeStructure
      };
    } catch (error) {
      this.logger.error('Technical decomposition failed (non-fatal)', { error: error.message });
      // Don't throw - technical decomposition is optional, let chain continue
      return null;
    }
  }

  buildCodeStructure(breakdowns) {
    const structure = {
      'models/': [],
      'services/': [],
      'api/routes/': [],
      'api/controllers/': [],
      'components/': [],
      'pages/': [],
      'migrations/': []
    };
    
    breakdowns.forEach(breakdown => {
      if (breakdown.technicalComponents) {
        breakdown.technicalComponents.forEach(component => {
          if (component.files) {
            component.files.forEach(file => {
              if (file.includes('models/')) {
                const fileName = file.split('/').pop();
                if (!structure['models/'].includes(fileName)) {
                  structure['models/'].push(fileName);
                }
              } else if (file.includes('services/')) {
                const fileName = file.split('/').pop();
                if (!structure['services/'].includes(fileName)) {
                  structure['services/'].push(fileName);
                }
              } else if (file.includes('routes/')) {
                const fileName = file.split('/').pop();
                if (!structure['api/routes/'].includes(fileName)) {
                  structure['api/routes/'].push(fileName);
                }
              } else if (file.includes('controllers/')) {
                const fileName = file.split('/').pop();
                if (!structure['api/controllers/'].includes(fileName)) {
                  structure['api/controllers/'].push(fileName);
                }
              } else if (file.includes('components/')) {
                const fileName = file.split('/').pop();
                if (!structure['components/'].includes(fileName)) {
                  structure['components/'].push(fileName);
                }
              } else if (file.includes('pages/')) {
                const fileName = file.split('/').pop();
                if (!structure['pages/'].includes(fileName)) {
                  structure['pages/'].push(fileName);
                }
              } else if (file.includes('migrations/')) {
                const fileName = file.split('/').pop();
                if (!structure['migrations/'].includes(fileName)) {
                  structure['migrations/'].push(fileName);
                }
              }
            });
          }
        });
      }
    });
    
    return structure;
  }

  async stepScopeReview(refined, estimate, domainContext, options) {
    this.logger.debug('Step 6.5: Scope Review');
    try {
      const ScopeReviewer = require('./scope-reviewer');
      const reviewer = new ScopeReviewer(this.library, this.db, this.logger);

      // Ensure we have the correct structure
      const scopeToReview = refined.refinedScope || refined;
      const estimateToReview = estimate.estimate || estimate;

      const review = await reviewer.reviewScope(
        scopeToReview,
        estimateToReview,
        domainContext
      );

      this.logger.info('Scope review complete', {
        completeness: review.scores.completeness,
        accuracy: review.scores.accuracy,
        riskLevel: review.scores.riskLevel,
        requiresReview: review.requiresReview
      });

      return review;
    } catch (error) {
      this.logger.error('Scope review failed (non-fatal)', { 
        error: error.message,
        stack: error.stack 
      });
      // Don't throw - review is optional, let chain continue
      return null;
    }
  }

  async stepCostProposal(refined, estimate, options) {
    this.logger.debug('Step 6.6: Cost Proposal Generation');
    try {
      const CostProposalGenerator = require('./cost-proposal');
      const proposalGen = new CostProposalGenerator(this.logger, this.config);

      // Ensure we have the correct structure
      const scopeForProposal = refined.refinedScope ? refined : { refinedScope: refined };
      const estimateForProposal = estimate.estimate || estimate;

      this.logger.debug('Generating cost proposal', {
        modulesCount: scopeForProposal.refinedScope?.modules?.length || 0,
        hasEstimate: !!estimateForProposal
      });

      const proposal = proposalGen.generateProposal(
        scopeForProposal,
        estimateForProposal,
        {
          rateTier: options.rateTier || 'avg',
          includeOverhead: options.includeOverhead !== false,
          includeManagement: options.includeManagement !== false,
          includeBuffer: options.includeBuffer !== false
        }
      );

      this.logger.info('Cost proposal generated', {
        totalCost: proposal.summary.totalCost,
        duration: proposal.summary.estimatedDuration.weeks
      });

      return proposal;
    } catch (error) {
      this.logger.error('Cost proposal generation failed (non-fatal)', { 
        error: error.message,
        stack: error.stack 
      });
      // Don't throw - cost proposal is optional, let chain continue
      return null;
    }
  }

  async stepEstimator(refined, budgetTier, profile, domainContext, plan, technicalBreakdown = null) {
    this.logger.debug('Step 6: Estimator');
    try {
      const estimate = this.estimator.estimate(
        refined.refinedScope,
        budgetTier,
        profile,
        domainContext,
        plan,
        technicalBreakdown
      );
      return estimate;
    } catch (error) {
      this.logger.error('Estimator step failed', { error: error.message });
      throw new Error(`Estimation failed: ${error.message}`);
    }
  }

  async stepAuditor(refined, domainContext, estimate, budgetTier, profile) {
    this.logger.debug('Step 7: Auditor');
    try {
      const audited = this.auditor.audit(
        refined.refinedScope,
        domainContext,
        estimate.estimate,
        budgetTier,
        profile
      );
      return audited;
    } catch (error) {
      this.logger.error('Auditor step failed', { error: error.message });
      // Non-fatal: continue with unaudited scope
      this.logger.warn('Continuing without audit');
      return {
        auditedScope: refined.refinedScope,
        auditSummary: { totalEdges: 0, autoFixed: 0, flagged: 0 }
      };
    }
  }

  async stepTranslator(plan, estimate, audited, conversation, profile, input, technicalBreakdown = null, scenarios = null) {
    this.logger.debug('Step 8: Translator');
    try {
      const technicalOutput = {
        plan: plan.plan,
        estimate: estimate.estimate,
        auditedScope: audited.auditedScope
      };

      const userContext = {
        conversationTone: conversation.analysis.conversationTone,
        primaryPersona: profile.primaryPersona,
        messagingTone: profile.messagingTone,
        originalInput: input
      };

      const translated = this.translator.translate(
        technicalOutput,
        userContext,
        conversation.domainContext,
        technicalBreakdown,
        scenarios
      );

      return translated;
    } catch (error) {
      this.logger.error('Translator step failed', { error: error.message });
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Save to enhanced database (new system)
   */
  async saveToEnhancedDatabase(allResults, options = {}) {
    try {
      if (!this.projectService || !this.projectService.useNewDb) {
        // New database not enabled, skip silently
        return;
      }

      // Extract client info from options or results
      const clientInfo = {
        email: options.clientInfo?.email || options.projectDetails?.contactEmail,
        phone: options.clientInfo?.phone || options.projectDetails?.contactPhone,
        company_name: options.clientInfo?.company || options.projectDetails?.companyName,
        contact_name: options.clientInfo?.name || options.projectDetails?.contactName,
        projectName: options.projectDetails?.projectName || 'Untitled Project'
      };

      // Prepare project data
      const projectData = {
        input: allResults.input,
        client: clientInfo,
        clientProfile: allResults.clientProfile,
        domainContext: allResults.conversation?.domainContext,
        extractedIntent: allResults.conversation?.extractedIntent,
        refinedScope: allResults.refined?.refinedScope,
        technicalBreakdown: allResults.technicalBreakdown,
        edgeCases: allResults.enriched?.edgeCases || [],
        assumptions: allResults.assumptions || {},
        estimate: allResults.estimate?.estimate,
        hiddenCosts: allResults.hiddenCosts,
        scenarios: allResults.scenarios,
        inputAnalysis: allResults.inputAnalysis,
        inputType: options.inputType || 'text'
      };

      // Save via project service (handles dual-write)
      const result = await this.projectService.saveProject(projectData);
      
      if (result.newDb && result.newDb.project_code) {
        this.logger.info('Saved to enhanced database', {
          project_code: result.newDb.project_code
        });
      }
    } catch (error) {
      // Non-fatal: log but don't fail the chain
      this.logger.warn('Enhanced database save failed (non-blocking)', {
        error: error.message
      });
    }
  }

  async saveScope(output, conversation, profile, specs = null) {
    try {
      // Get technical data for saving
      const technical = output.technical || {
        plan: {},
        estimate: { timeline: { days: 0 }, cost: { total: 0 }, confidence: { overall: 0.8 } }
      };

      const scope = {
        input_raw: this.conversationHistory[0]?.content || '',
        industry: conversation.domainContext.industry || 'generic',
        use_case: conversation.extractedIntent.useCase || 'application',
        persona: profile.primaryPersona,
        estimated_days: technical.estimate.timeline.days || 0,
        estimated_cost: technical.estimate.cost.total || 0,
        confidence: technical.estimate.confidence.overall || 0.8,
        modules: JSON.stringify(technical.plan.modules || []),
        risks: JSON.stringify(technical.plan.risks || []),
        plan: JSON.stringify(technical.plan),
        output_full: JSON.stringify(output),
        status: 'completed'
      };

      // Add specs path if generated
      if (specs && specs.outputDir) {
        scope.specs_path = specs.outputDir;
      }

      const saved = this.db.saveScope(scope);
      this.logger.info('Scope saved to database', { scopeId: this.sessionId });
      return saved;
    } catch (error) {
      this.logger.warn('Failed to save scope', { error: error.message });
      // Non-fatal: continue without saving
      return { success: false };
    }
  }

  async stepScenarioGeneration(refined, estimate, options) {
    this.logger.debug('Step 6.7: Scenario Generation');
    try {
      // Extract constraints from options
      const constraints = {
        maxBudget: options.projectDetails?.maxBudget ? 
          this.parseBudget(options.projectDetails.maxBudget) : null,
        targetDeadline: options.projectDetails?.targetDeadline || null
      };

      // Extract user preferences
      const userPrefs = {
        priorityMode: options.priorityMode || 'balanced', // mvp, balanced, complete
        riskTolerance: options.riskTolerance || 'medium', // low, medium, high
        deliveryMode: options.deliveryMode || 'single' // single, phased, iterative
      };

      // Generate scenarios
      const scenarios = this.scenarioGenerator.generateScenarios(
        refined.refinedScope,
        estimate.estimate,
        constraints,
        userPrefs
      );

      return scenarios;
    } catch (error) {
      this.logger.error('Scenario generation failed (non-fatal)', { error: error.message });
      // Don't throw - scenario generation is optional, let chain continue
      return null;
    }
  }

  parseBudget(budgetStr) {
    if (!budgetStr) return null;
    
    const str = budgetStr.toLowerCase().trim();
    let amount = 0;
    
    // Parse Indian number format (₹5L, ₹2Cr, etc.)
    if (str.includes('cr') || str.includes('crore')) {
      const num = parseFloat(str.replace(/[^0-9.]/g, ''));
      amount = num * 10000000; // 1 crore = 10M
    } else if (str.includes('l') || str.includes('lakh')) {
      const num = parseFloat(str.replace(/[^0-9.]/g, ''));
      amount = num * 100000; // 1 lakh = 100K
    } else {
      // Try to extract number
      const num = parseFloat(str.replace(/[^0-9.]/g, ''));
      amount = num;
    }
    
    return amount > 0 ? amount : null;
  }

  generateSessionId() {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  reset() {
    this.sessionId = null;
    this.conversationHistory = [];
  }
}

module.exports = ChainExecutor;

