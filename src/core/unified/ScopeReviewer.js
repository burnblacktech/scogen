/**
 * Scope Reviewer
 * 
 * Handles scope review, editing, and recalculation
 * Converts expanded scope to editable format and manages changes
 */

class ScopeReviewer {
  constructor(logger, costCalculator) {
    this.logger = logger || console;
    this.costCalculator = costCalculator;
  }

  /**
   * Format expanded scope for review
   * Converts expanded scope to editable format with feature checklist
   * @param {Object} expandedScope - Expanded scope from UnifiedProcessor
   * @returns {Object} Formatted scope for review
   */
  formatForReview(expandedScope) {
    try {
      this.logger.info('Formatting scope for review', {
        modules: expandedScope.modules?.length || 0
      });

      const features = [];
      const modules = expandedScope.modules || [];

      // Extract features from modules
      for (const module of modules) {
        const moduleName = module.name || module.moduleName || module;
        const moduleObj = typeof module === 'string' ? { name: moduleName } : module;

        features.push({
          name: moduleName,
          category: moduleObj.category || this.categorizeModule(moduleName),
          included: true,
          hours: moduleObj.hours || moduleObj.estimatedHours || this.estimateHours(moduleName),
          complexity: moduleObj.complexity || this.assessComplexity(moduleName),
          description: moduleObj.description || moduleObj.requirements || '',
          dependencies: moduleObj.dependencies || []
        });
      }

      // Calculate initial estimates
      const estimatedCost = this.calculateEstimatedCost(features);
      const estimatedTimeline = this.calculateEstimatedTimeline(features);

      return {
        features: features,
        estimatedCost: estimatedCost,
        estimatedTimeline: estimatedTimeline,
        editable: true,
        metadata: {
          totalFeatures: features.length,
          categories: [...new Set(features.map(f => f.category))],
          formattedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to format scope for review', { error: error.message });
      throw error;
    }
  }

  /**
   * Apply changes to scope
   * Updates scope based on user edits (add/remove features)
   * @param {string} scopeId - Scope ID
   * @param {Object} changes - Changes object with features, add, remove arrays
   * @param {Object} currentScope - Current scope state
   * @returns {Object} Updated scope
   */
  applyChanges(scopeId, changes, currentScope) {
    try {
      this.logger.info('Applying scope changes', {
        scopeId,
        changesCount: changes.features?.length || 0,
        addCount: changes.add?.length || 0,
        removeCount: changes.remove?.length || 0
      });

      // Validate changes
      this.validateChanges(changes);

      let updatedFeatures = [...(currentScope.features || [])];

      // Update existing features (toggle included status)
      if (changes.features && Array.isArray(changes.features)) {
        for (const change of changes.features) {
          const index = updatedFeatures.findIndex(f => f.name === change.name);
          if (index !== -1) {
            updatedFeatures[index] = {
              ...updatedFeatures[index],
              included: change.included !== undefined ? change.included : updatedFeatures[index].included,
              hours: change.hours !== undefined ? change.hours : updatedFeatures[index].hours,
              complexity: change.complexity !== undefined ? change.complexity : updatedFeatures[index].complexity
            };
          }
        }
      }

      // Add new features
      if (changes.add && Array.isArray(changes.add)) {
        for (const newFeature of changes.add) {
          if (!updatedFeatures.find(f => f.name === newFeature.name)) {
            updatedFeatures.push({
              name: newFeature.name,
              category: newFeature.category || this.categorizeModule(newFeature.name),
              included: true,
              hours: newFeature.hours || this.estimateHours(newFeature.name),
              complexity: newFeature.complexity || this.assessComplexity(newFeature.name),
              description: newFeature.description || '',
              dependencies: newFeature.dependencies || []
            });
          }
        }
      }

      // Remove features
      if (changes.remove && Array.isArray(changes.remove)) {
        updatedFeatures = updatedFeatures.filter(f => !changes.remove.includes(f.name));
      }

      // Recalculate costs and timeline
      const newCost = this.calculateEstimatedCost(updatedFeatures);
      const newTimeline = this.calculateEstimatedTimeline(updatedFeatures);

      return {
        scopeId: scopeId,
        features: updatedFeatures,
        estimatedCost: newCost,
        estimatedTimeline: newTimeline,
        editable: true,
        changesApplied: {
          updated: changes.features?.length || 0,
          added: changes.add?.length || 0,
          removed: changes.remove?.length || 0
        },
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to apply changes', { error: error.message });
      throw error;
    }
  }

  /**
   * Recalculate costs after scope changes
   * @param {string} scopeId - Scope ID
   * @param {Object} updatedScope - Updated scope with new features
   * @returns {Promise<Object>} Recalculated costs and timeline
   */
  async recalculateCosts(scopeId, updatedScope) {
    try {
      this.logger.info('Recalculating costs', { scopeId });

      const features = updatedScope.features || [];
      const includedFeatures = features.filter(f => f.included);

      // Calculate cost using cost calculator if available
      let totalCost = 0;
      if (this.costCalculator) {
        const projectContext = {
          industry: updatedScope.industry || 'generic',
          requiresGST: true,
          marketRegion: 'india'
        };

        for (const feature of includedFeatures) {
          try {
            const moduleCost = await this.costCalculator.calculateModuleCost(feature, projectContext);
            totalCost += moduleCost.totalCost || 0;
          } catch (error) {
            this.logger.warn('Failed to calculate cost for feature', {
              feature: feature.name,
              error: error.message
            });
            // Fallback to estimated hours
            totalCost += (feature.hours || 0) * 2000; // ₹2000/hour default
          }
        }
      } else {
        // Fallback calculation
        totalCost = this.calculateEstimatedCost(includedFeatures);
      }

      // Calculate timeline
      const timeline = this.calculateEstimatedTimeline(includedFeatures);

      return {
        scopeId: scopeId,
        totalCost: totalCost,
        estimatedTimeline: timeline,
        currency: 'INR',
        recalculatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to recalculate costs', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate changes before applying
   * @param {Object} changes - Changes to validate
   * @throws {Error} If validation fails
   */
  validateChanges(changes) {
    if (!changes || typeof changes !== 'object') {
      throw new Error('Invalid changes object');
    }

    // Validate features array
    if (changes.features && !Array.isArray(changes.features)) {
      throw new Error('Features must be an array');
    }

    // Validate add array
    if (changes.add && !Array.isArray(changes.add)) {
      throw new Error('Add must be an array');
    }

    // Validate remove array
    if (changes.remove && !Array.isArray(changes.remove)) {
      throw new Error('Remove must be an array');
    }

    // Validate feature names
    if (changes.features) {
      for (const feature of changes.features) {
        if (!feature.name || typeof feature.name !== 'string') {
          throw new Error('Feature name is required and must be a string');
        }
      }
    }

    if (changes.add) {
      for (const feature of changes.add) {
        if (!feature.name || typeof feature.name !== 'string') {
          throw new Error('Added feature name is required and must be a string');
        }
      }
    }
  }

  /**
   * Categorize module by name
   * @param {string} moduleName - Module name
   * @returns {string} Category
   */
  categorizeModule(moduleName) {
    const name = moduleName.toLowerCase();
    
    if (name.includes('user') || name.includes('auth') || name.includes('login')) {
      return 'Authentication & User Management';
    }
    if (name.includes('payment') || name.includes('billing') || name.includes('invoice')) {
      return 'Payment & Billing';
    }
    if (name.includes('report') || name.includes('analytics') || name.includes('dashboard')) {
      return 'Reporting & Analytics';
    }
    if (name.includes('inventory') || name.includes('stock') || name.includes('warehouse')) {
      return 'Inventory Management';
    }
    if (name.includes('order') || name.includes('cart') || name.includes('checkout')) {
      return 'Order Management';
    }
    if (name.includes('api') || name.includes('integration') || name.includes('webhook')) {
      return 'Integrations';
    }
    
    return 'Core Features';
  }

  /**
   * Estimate hours for a module
   * @param {string} moduleName - Module name
   * @returns {number} Estimated hours
   */
  estimateHours(moduleName) {
    const name = moduleName.toLowerCase();
    
    // Simple estimation based on keywords
    if (name.includes('integration') || name.includes('api')) {
      return 40;
    }
    if (name.includes('payment') || name.includes('billing')) {
      return 60;
    }
    if (name.includes('report') || name.includes('dashboard')) {
      return 30;
    }
    if (name.includes('user') || name.includes('auth')) {
      return 20;
    }
    
    return 25; // Default
  }

  /**
   * Assess complexity of a module
   * @param {string} moduleName - Module name
   * @returns {number} Complexity score (1-5)
   */
  assessComplexity(moduleName) {
    const name = moduleName.toLowerCase();
    
    if (name.includes('integration') || name.includes('payment') || name.includes('api')) {
      return 4; // High complexity
    }
    if (name.includes('report') || name.includes('analytics')) {
      return 3; // Medium complexity
    }
    
    return 2; // Low-medium complexity
  }

  /**
   * Calculate estimated cost from features
   * @param {Array} features - Features array
   * @returns {number} Estimated cost in INR
   */
  calculateEstimatedCost(features) {
    const includedFeatures = features.filter(f => f.included);
    let totalCost = 0;

    for (const feature of includedFeatures) {
      const hours = feature.hours || 25;
      const complexityMultiplier = feature.complexity || 2;
      const baseRate = 2000; // ₹2000/hour
      
      totalCost += hours * baseRate * (complexityMultiplier / 2);
    }

    // Add overhead (20%)
    totalCost *= 1.2;

    return Math.round(totalCost);
  }

  /**
   * Calculate estimated timeline from features
   * @param {Array} features - Features array
   * @returns {number} Estimated timeline in days
   */
  calculateEstimatedTimeline(features) {
    const includedFeatures = features.filter(f => f.included);
    let totalHours = 0;

    for (const feature of includedFeatures) {
      totalHours += feature.hours || 25;
    }

    // Assume 8 hours per day, 5 days per week
    const days = Math.ceil(totalHours / 8);
    
    // Add buffer (20%)
    const bufferedDays = Math.ceil(days * 1.2);

    return bufferedDays;
  }

  /**
   * Get comparison between original and current scope
   * @param {string} scopeId - Scope ID
   * @param {Object} originalScope - Original expanded scope
   * @param {Object} currentScope - Current scope state
   * @returns {Object} Comparison data with changes
   */
  getComparison(scopeId, originalScope, currentScope) {
    try {
      this.logger.info('Generating scope comparison', { scopeId });

      // Format both scopes for comparison
      const originalReview = this.formatForReview(originalScope);
      const currentReview = this.formatForReview(currentScope);

      const originalFeatures = originalReview.features || [];
      const currentFeatures = currentReview.features || [];

      // Find added features
      const added = currentFeatures.filter(cf => 
        !originalFeatures.find(of => of.name === cf.name) && cf.included
      );

      // Find removed features
      const removed = originalFeatures.filter(of => 
        of.included && !currentFeatures.find(cf => cf.name === of.name && cf.included)
      );

      // Find modified features (changed hours/complexity)
      const modified = [];
      originalFeatures.forEach(of => {
        const current = currentFeatures.find(cf => cf.name === of.name);
        if (current && of.included && current.included) {
          if (of.hours !== current.hours || of.complexity !== current.complexity) {
            modified.push({
              name: of.name,
              original: { hours: of.hours, complexity: of.complexity },
              current: { hours: current.hours, complexity: current.complexity }
            });
          }
        }
      });

      // Calculate deltas
      const originalHours = originalFeatures.filter(f => f.included)
        .reduce((sum, f) => sum + (f.hours || 0), 0);
      const currentHours = currentFeatures.filter(f => f.included)
        .reduce((sum, f) => sum + (f.hours || 0), 0);
      const deltaHours = currentHours - originalHours;

      const originalCost = originalReview.estimatedCost || 0;
      const currentCost = currentReview.estimatedCost || 0;
      const deltaCost = currentCost - originalCost;

      const originalTimeline = originalReview.estimatedTimeline || 0;
      const currentTimeline = currentReview.estimatedTimeline || 0;
      const deltaTimeline = currentTimeline - originalTimeline;

      return {
        original: {
          features: originalFeatures,
          totalHours: originalHours,
          totalCost: originalCost,
          timeline: originalTimeline
        },
        current: {
          features: currentFeatures,
          totalHours: currentHours,
          totalCost: currentCost,
          timeline: currentTimeline
        },
        changes: {
          added: added.map(f => ({
            name: f.name,
            hours: f.hours || 0,
            cost: this.calculateFeatureCost(f),
            category: f.category
          })),
          removed: removed.map(f => ({
            name: f.name,
            hours: f.hours || 0,
            cost: this.calculateFeatureCost(f),
            category: f.category
          })),
          modified: modified,
          deltaHours: deltaHours,
          deltaCost: deltaCost,
          deltaTimeline: deltaTimeline
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate comparison', {
        scopeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate cost for a single feature
   * @param {Object} feature - Feature object
   * @returns {number} Feature cost
   */
  calculateFeatureCost(feature) {
    const hours = feature.hours || 0;
    const complexity = feature.complexity || 2;
    const baseRate = 2000; // ₹2000/hour
    return Math.round(hours * baseRate * (complexity / 2) * 1.2); // Include overhead
  }
}

module.exports = ScopeReviewer;

