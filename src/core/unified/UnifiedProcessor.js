/**
 * Unified Processor
 * 
 * Single entry point that processes any input and generates complete scope
 * Combines all chain executors into one simple flow
 */

const Parser = require('../../modules/parser');
const SmartExpander = require('../expansion/SmartExpander');
const TechnicalDecomposer = require('../../modules/technical-decomposer');
const DynamicCostCalculator = require('../estimation/DynamicCostCalculator');
const RequirementExtractor = require('../../modules/requirement-extractor');
const ScopeReviewer = require('./ScopeReviewer');
const FeatureSuggestionEngine = require('../intelligence/FeatureSuggestionEngine');
const { v4: uuidv4 } = require('uuid');

class UnifiedProcessor {
  constructor(library, logger, db) {
    this.library = library;
    this.logger = logger || console;
    this.db = db;

    // Initialize core modules
    this.requirementExtractor = new RequirementExtractor(logger);
    this.parser = new Parser(library, logger);
    this.expander = new SmartExpander(logger, library);
    this.decomposer = new TechnicalDecomposer();
    this.costCalculator = new DynamicCostCalculator(db, logger);
    
    // Initialize ScopeReviewer
    this.scopeReviewer = new ScopeReviewer(logger, this.costCalculator);
    
    // Initialize FeatureSuggestionEngine (LLM optional)
    let llmConversation = null;
    try {
      // Try to get LLM conversation if available
      const LLMConversation = require('../../modules/llm-conversation');
      if (LLMConversation) {
        llmConversation = new LLMConversation(logger);
      }
    } catch (error) {
      this.logger.debug('LLM conversation not available for suggestions', {
        error: error.message
      });
    }
    this.suggestionEngine = new FeatureSuggestionEngine(llmConversation, logger);
    
    // Initialize DocumentFactory
    try {
      const DocumentFactory = require('../documents/DocumentFactory');
      this.documentFactory = new DocumentFactory(logger);
    } catch (error) {
      this.logger.warn('DocumentFactory not available', { error: error.message });
      this.documentFactory = null;
    }

    // Scope storage (in-memory Map)
    // Key: scopeId, Value: { scope, technical, cost, metadata, createdAt }
    this.scopeStorage = new Map();
    
    // Cleanup expired scopes every hour (24 hour expiry)
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredScopes();
    }, 60 * 60 * 1000);
  }

  /**
   * Cleanup expired scopes (older than 24 hours)
   */
  cleanupExpiredScopes() {
    const now = Date.now();
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
    
    let cleaned = 0;
    for (const [scopeId, data] of this.scopeStorage.entries()) {
      if (now - data.createdAt > expiryTime) {
        this.scopeStorage.delete(scopeId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.info('Cleaned up expired scopes', { cleaned });
    }
  }

  /**
   * Get scope from storage
   * @param {string} scopeId - Scope ID
   * @returns {Object|null} Stored scope data or null if not found
   */
  getScope(scopeId) {
    return this.scopeStorage.get(scopeId) || null;
  }

  /**
   * Store scope in memory
   * @param {string} scopeId - Scope ID
   * @param {Object} data - Scope data to store
   */
  storeScope(scopeId, data) {
    // Store original scope in metadata for comparison (only on first store)
    const existing = this.scopeStorage.get(scopeId);
    const originalScope = existing?.metadata?.originalScope || JSON.parse(JSON.stringify(data.scope)); // Deep copy
    
    this.scopeStorage.set(scopeId, {
      ...data,
      createdAt: Date.now(),
      metadata: {
        ...data.metadata,
        originalScope: originalScope
      }
    });
  }

  /**
   * Expand scope from raw input (NO PDF generation)
   * Returns expanded scope for review
   * @param {string} rawInput - Raw user input text
   * @param {Object} options - Optional processing options
   * @returns {Promise<Object>} Expanded scope with review data
   */
  async expandScope(rawInput, options = {}) {
    try {
      this.logger.info('Expanding scope', {
        inputLength: rawInput.length
      });

      // Step 1: Extract requirements from raw input
      const extracted = await this.requirementExtractor.extractFromText(rawInput);
      
      // Convert to extractedIntent format for parser
      const extractedIntent = {
        modules: extracted.features || [],
        industry: extracted.domain || 'generic',
        useCase: 'application',
        edges: []
      };

      const domainContext = {
        industry: extracted.domain || 'generic',
        useCase: 'application'
      };

      const parsed = this.parser.parse(extractedIntent, domainContext);
      
      // Add original input to parsed for feature matching in SmartExpander
      parsed.originalInput = rawInput;
      
      this.logger.info('Parsing complete', {
        modules: parsed.modules?.length || 0
      });

      // Step 2: Expand to 100% (new SmartExpander)
      const expanded = await this.expander.expandToComplete(parsed);
      
      this.logger.info('Expansion complete', {
        modules: expanded.modules?.length || 0,
        expansionRatio: expanded.enrichment?.ratio || 1
      });

      // Step 3: Technical breakdown
      const technical = await this.decomposeTechnical(expanded);
      
      this.logger.info('Technical decomposition complete', {
        components: technical.components?.length || 0
      });

      // Step 4: Calculate costs
      const costed = await this.calculateCosts(expanded, technical);
      
      this.logger.info('Cost calculation complete', {
        totalCost: costed.totalCost
      });

      // Generate scope ID
      const scopeId = uuidv4();

      // Format for review
      const reviewData = this.scopeReviewer.formatForReview(expanded);

      // Store scope data
      this.storeScope(scopeId, {
        scope: expanded,
        technical: technical,
        cost: costed,
        input: rawInput,
        metadata: {
          processedAt: new Date().toISOString(),
          expansionRatio: expanded.enrichment?.ratio || 1,
          totalModules: expanded.modules?.length || 0
        }
      });

      // Use actual calculated cost, fallback to simple estimate if calculation failed
      const finalCost = costed.totalCost > 0 ? costed.totalCost : reviewData.estimatedCost;
      const finalTimeline = technical.totalEffort > 0 ? technical.totalEffort : reviewData.estimatedTimeline;

      return {
        scopeId: scopeId,
        scope: expanded,
        technical: technical,
        cost: costed,
        editable: true,
        features: reviewData.features,
        estimatedCost: finalCost,
        estimatedTimeline: finalTimeline,
        metadata: {
          processedAt: new Date().toISOString(),
          expansionRatio: expanded.enrichment?.ratio || 1,
          totalModules: expanded.modules?.length || 0
        }
      };

    } catch (error) {
      this.logger.error('Scope expansion failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update scope with user changes
   * @param {string} scopeId - Scope ID
   * @param {Object} changes - Changes object with features, add, remove arrays
   * @returns {Promise<Object>} Updated scope with recalculated costs
   */
  async updateScope(scopeId, changes) {
    try {
      this.logger.info('Updating scope', { scopeId });

      // Get stored scope data
      const storedData = this.getScope(scopeId);
      if (!storedData) {
        throw new Error(`Scope not found: ${scopeId}`);
      }

      // Format current scope for review
      const currentReview = this.scopeReviewer.formatForReview(storedData.scope);

      // Apply changes
      const updatedReview = this.scopeReviewer.applyChanges(scopeId, changes, currentReview);

      // Recalculate costs with updated scope
      const recalculated = await this.scopeReviewer.recalculateCosts(scopeId, updatedReview);

      // Update stored scope (update modules based on changes)
      const updatedModules = storedData.scope.modules.map(module => {
        const moduleName = module.name || module.moduleName || module;
        const feature = updatedReview.features.find(f => f.name === moduleName);
        
        if (feature && !feature.included) {
          // Mark as excluded
          return { ...module, excluded: true };
        }
        return module;
      });

      // Add new modules
      if (changes.add) {
        for (const newFeature of changes.add) {
          updatedModules.push({
            name: newFeature.name,
            category: newFeature.category,
            hours: newFeature.hours,
            complexity: newFeature.complexity,
            description: newFeature.description
          });
        }
      }

      // Update stored data
      const updatedScope = {
        ...storedData.scope,
        modules: updatedModules.filter(m => !m.excluded)
      };

      this.storeScope(scopeId, {
        ...storedData,
        scope: updatedScope
      });

      return {
        success: true,
        scopeId: scopeId,
        updatedScope: updatedReview,
        newCost: recalculated.totalCost,
        newTimeline: recalculated.estimatedTimeline,
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Scope update failed', {
        scopeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get comparison between original and current scope
   * @param {string} scopeId - Scope ID
   * @returns {Object|null} Comparison data or null if not available
   */
  getComparison(scopeId) {
    try {
      const storedData = this.getScope(scopeId);
      if (!storedData) {
        throw new Error(`Scope not found: ${scopeId}`);
      }

      // Get original scope from metadata
      const originalScope = storedData.metadata?.originalScope || storedData.scope;
      const currentScope = storedData.scope;

      // Get comparison
      return this.scopeReviewer.getComparison(scopeId, originalScope, currentScope);

    } catch (error) {
      this.logger.error('Failed to get comparison', {
        scopeId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get feature suggestions for a scope
   * @param {string} scopeId - Scope ID
   * @returns {Promise<Array>} Array of suggested features
   */
  async getSuggestions(scopeId) {
    try {
      const storedData = this.getScope(scopeId);
      if (!storedData) {
        throw new Error(`Scope not found: ${scopeId}`);
      }

      // Format scope for review to get features
      const reviewData = this.scopeReviewer.formatForReview(storedData.scope);
      const allFeatures = reviewData.features || [];
      const selectedFeatures = allFeatures.filter(f => f.included);

      // Get domain from scope metadata
      const domain = storedData.scope.domain || storedData.metadata?.domain || 'generic';

      // Get suggestions
      const suggestions = await this.suggestionEngine.suggestFeatures(
        selectedFeatures,
        allFeatures,
        domain
      );

      return suggestions;

    } catch (error) {
      this.logger.error('Failed to get suggestions', {
        scopeId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Generate selected documents only
   * @param {string} scopeId - Scope ID from expandScope
   * @param {Array} selections - Array of {type, level} objects
   * @param {Object} options - Options including includeAMC
   * @returns {Promise<Object>} Generated documents
   */
  async generateSelected(scopeId, selections, options = {}) {
    try {
      this.logger.info('Generating selected documents', {
        scopeId,
        selectionCount: selections.length
      });

      // Get stored scope data
      const storedData = this.getScope(scopeId);
      if (!storedData) {
        throw new Error(`Scope not found: ${scopeId}`);
      }

      const { scope, technical, cost } = storedData;

      // Prepare data for document generation
      const documentData = {
        projectName: scope.projectName || 'Project',
        scope: scope,
        technical: technical,
        cost: cost
      };

      // Generate only selected documents
      if (!this.documentFactory) {
        throw new Error('DocumentFactory not available');
      }

      const documents = await this.documentFactory.generateSelected(
        documentData,
        selections,
        {
          includeAMC: options.includeAMC || false
        }
      );

      this.logger.info('Selected documents generated', {
        scopeId,
        documentCount: selections.length
      });

      return {
        scopeId: scopeId,
        documents: documents,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Selected document generation failed', {
        scopeId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Process any input and generate complete scope with all outputs
   * @deprecated Use expandScope + generateSelected instead
   * @param {string} rawInput - Raw user input text
   * @param {Object} options - Optional processing options
   * @returns {Promise<Object>} Complete result with scope, technical breakdown, costs, and outputs
   */
  async processInput(rawInput, options = {}) {
    try {
      this.logger.info('Unified processing started', {
        inputLength: rawInput.length,
        hasOptions: !!options
      });

      // Step 1: Extract requirements from raw input
      const extracted = await this.requirementExtractor.extractFromText(rawInput);
      
      // Convert to extractedIntent format for parser
      const extractedIntent = {
        modules: extracted.features || [],
        industry: extracted.domain || 'generic',
        useCase: 'application',
        edges: []
      };

      const domainContext = {
        industry: extracted.domain || 'generic',
        useCase: 'application'
      };

      const parsed = this.parser.parse(extractedIntent, domainContext);
      
      this.logger.info('Parsing complete', {
        modules: parsed.modules?.length || 0
      });

      // Step 2: Expand to 100% (new SmartExpander)
      const expanded = await this.expander.expandToComplete(parsed);
      
      this.logger.info('Expansion complete', {
        modules: expanded.modules?.length || 0,
        expansionRatio: expanded.enrichment?.ratio || 1
      });

      // Step 3: Technical breakdown (reuse existing)
      const technical = await this.decomposeTechnical(expanded);
      
      this.logger.info('Technical decomposition complete', {
        components: technical.components?.length || 0
      });

      // Step 4: Calculate costs (reuse existing)
      const costed = await this.calculateCosts(expanded, technical);
      
      this.logger.info('Cost calculation complete', {
        totalCost: costed.totalCost
      });

      // Step 5: Generate all outputs (legacy method - kept for backward compatibility)
      const outputs = await this.generateAllOutputs(expanded, technical, costed, options);
      
      this.logger.info('Output generation complete', {
        documentCount: Object.keys(outputs.documents || {}).length
      });

      return {
        input: rawInput,
        scope: expanded,
        technical: technical,
        cost: costed,
        outputs: outputs,
        metadata: {
          processedAt: new Date().toISOString(),
          expansionRatio: expanded.enrichment?.ratio || 1,
          totalModules: expanded.modules?.length || 0
        }
      };

    } catch (error) {
      this.logger.error('Unified processing failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }


  /**
   * Decompose technical components
   */
  async decomposeTechnical(expanded) {
    try {
      const context = {
        domain: expanded.industry || 'generic',
        scale: 'sme',
        complexity: expanded.enrichment?.complexity || 'standard'
      };

      // Use decompose method which takes enriched requirements
      const enrichedRequirements = {
        explicit: expanded.modules || [],
        implicit: expanded.enrichment?.implicit || [],
        domainSpecific: expanded.enrichment?.domainSpecific || []
      };

      const decomposition = await this.decomposer.decompose(enrichedRequirements, context);

      return {
        modules: decomposition.modules || [],
        components: decomposition.deliverables || [],
        totalCost: decomposition.totalCost || 0,
        totalEffort: decomposition.timeline?.recommendedDays || 0,
        costByResource: decomposition.costByResource || {},
        timeline: decomposition.timeline || {}
      };
    } catch (error) {
      this.logger.error('Technical decomposition failed', { error: error.message });
      return {
        modules: [],
        components: [],
        totalCost: 0,
        totalEffort: 0,
        costByResource: {},
        timeline: {}
      };
    }
  }

  /**
   * Calculate costs
   */
  async calculateCosts(expanded, technical) {
    try {
      const projectContext = {
        industry: expanded.industry || 'generic',
        requiresGST: true,
        marketRegion: 'india'
      };

      let totalCost = 0;
      const moduleCosts = [];

      // Log for debugging
      this.logger.info('Calculating costs', {
        moduleCount: technical.modules?.length || 0,
        hasModules: !!technical.modules,
        modules: technical.modules?.map(m => m.name || m.module || 'Unknown')
      });

      // Calculate cost for each module
      const modulesToProcess = technical.modules || expanded.modules || [];
      
      if (modulesToProcess.length === 0) {
        this.logger.warn('No modules found for cost calculation, using simple estimate', {
          technicalModules: technical.modules?.length || 0,
          expandedModules: expanded.modules?.length || 0,
          expandedKeys: Object.keys(expanded || {})
        });
        
        // Fallback: Use simple calculation based on features
        const features = Array.isArray(expanded.modules) ? expanded.modules : [];
        let simpleCost = 0;
        
        if (features.length > 0) {
          for (const feature of features) {
            if (!feature || typeof feature !== 'object') continue;
            const hours = feature.hours || feature.estimatedHours || 25;
            const complexityMultiplier = feature.complexity || 2;
            const baseRate = 2000; // ₹2000/hour
            simpleCost += hours * baseRate * (complexityMultiplier / 2);
          }
          simpleCost *= 1.2; // Add 20% overhead
        } else {
          // If no features, use minimum cost estimate
          simpleCost = 50000; // ₹50,000 minimum
        }
        
        const finalCost = Math.round(simpleCost) || 50000; // Ensure never null/0
        
        return {
          totalCost: finalCost,
          moduleCosts: [],
          breakdown: {
            development: finalCost * 0.7,
            testing: finalCost * 0.15,
            projectManagement: finalCost * 0.10,
            buffer: finalCost * 0.05
          },
          currency: 'INR',
          source: 'simple_estimate'
        };
      }

      for (const module of modulesToProcess) {
        const moduleCost = await this.costCalculator.calculateModuleCost(
          module,
          projectContext
        );
        const moduleTotalCost = moduleCost.cost?.total || 0;
        moduleCosts.push({
          module: module.name || module.module || 'Unknown',
          cost: moduleTotalCost,
          breakdown: moduleCost
        });
        totalCost += moduleTotalCost;
      }

      // Ensure totalCost is never null or undefined
      const finalTotalCost = (totalCost && totalCost > 0) ? totalCost : 
                            (moduleCosts.length > 0 ? moduleCosts.reduce((sum, m) => sum + (m.cost || 0), 0) : 50000);

      this.logger.info('Cost calculation complete', {
        totalCost: finalTotalCost,
        moduleCount: moduleCosts.length,
        calculatedTotal: totalCost
      });

      return {
        totalCost: finalTotalCost,
        moduleCosts: moduleCosts,
        breakdown: {
          development: finalTotalCost * 0.7,
          testing: finalTotalCost * 0.15,
          projectManagement: finalTotalCost * 0.10,
          buffer: finalTotalCost * 0.05
        },
        currency: 'INR',
        source: 'dynamic_calculator'
      };
    } catch (error) {
      this.logger.error('Cost calculation failed', { error: error.message, stack: error.stack });
      
      // Fallback: Calculate simple cost from expanded modules
      let fallbackCost = 50000; // Minimum
      try {
        const features = expanded.modules || [];
        if (Array.isArray(features) && features.length > 0) {
          let simpleCost = 0;
          for (const feature of features) {
            if (!feature || typeof feature !== 'object') continue;
            const hours = feature.hours || feature.estimatedHours || 25;
            const complexityMultiplier = feature.complexity || 2;
            simpleCost += hours * 2000 * (complexityMultiplier / 2);
          }
          fallbackCost = Math.round(simpleCost * 1.2) || 50000;
        }
      } catch (fallbackError) {
        this.logger.warn('Fallback cost calculation also failed', { error: fallbackError.message });
      }
      
      return {
        totalCost: fallbackCost,
        moduleCosts: [],
        breakdown: {
          development: fallbackCost * 0.7,
          testing: fallbackCost * 0.15,
          projectManagement: fallbackCost * 0.10,
          buffer: fallbackCost * 0.05
        },
        currency: 'INR',
        source: 'error_fallback'
      };
    }
  }

  /**
   * Generate all outputs (3 types × 5 levels)
   */
  async generateAllOutputs(expanded, technical, costed, options = {}) {
    try {
      let documents = {};
      
      if (!this.documentFactory) {
        // DocumentFactory not available - return placeholder structure
        this.logger.warn('DocumentFactory not available, returning placeholder structure');
        
        const types = ['cost', 'business', 'technical'];
        const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
        
        documents = {};
        types.forEach(type => {
          documents[type] = {};
          levels.forEach(level => {
            documents[type][level] = {
              status: 'pending',
              message: 'PDF generation not available'
            };
          });
        });
      } else {
        // Prepare data for document generation
        const documentData = {
          projectName: expanded.projectName || 'Project',
          scope: expanded,
          technical: technical,
          cost: costed
        };

        // Generate all documents
        documents = await this.documentFactory.generateAll(documentData, {
          includeAMC: options.includeAMC || false
        });
      }

      return {
        documents: documents,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Output generation failed', { error: error.message });
      // Return empty outputs if generation fails
      return {
        documents: {},
        generatedAt: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

module.exports = UnifiedProcessor;

