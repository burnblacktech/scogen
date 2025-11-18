/**
 * Scope Verifier
 * 
 * Extracts modules from input and verifies completeness before locking scope.
 * This ensures NO module is ever lost during document generation.
 */

const crypto = require('crypto');

class ScopeVerifier {
  constructor(parser, logger) {
    this.parser = parser;
    this.logger = logger || console;
  }

  /**
   * Extract and verify scope from input
   * @param {string} input - User input (text, parsed from PDF/Excel)
   * @param {string} inputType - 'text', 'pdf', 'excel'
   * @param {Object} domainContext - Domain context
   * @returns {Object} Extracted scope with modules for verification
   */
  async extractAndVerifyScope(input, inputType, domainContext = {}) {
    this.logger.info('Extracting scope from input', { inputType, inputLength: input.length });

    // Use parser to extract modules
    const extractedIntent = await this.parser.extractIntent?.(input, {}, domainContext) || 
                           this.extractModulesFromText(input, domainContext);

    // Extract modules
    const modules = this.extractModules(extractedIntent, domainContext);
    
    // Group by category
    const categories = this.groupByCategory(modules);
    
    // Calculate completeness
    const completeness = this.calculateCompleteness(modules, input);

    // Return for user verification
    return {
      modules: modules,
      categories: categories,
      completeness: completeness,
      needsVerification: true,
      extractedAt: new Date().toISOString(),
      inputPreview: input.substring(0, 200) + (input.length > 200 ? '...' : '')
    };
  }

  /**
   * Extract modules from text input (fallback if parser doesn't have extractIntent)
   */
  extractModulesFromText(input, domainContext) {
    // Simple extraction - in production, this would use LLM
    const lines = input.split('\n').filter(l => l.trim());
    const modules = [];
    
    // Look for module patterns
    const modulePatterns = [
      /(?:module|feature|component|system):\s*(.+)/i,
      /^([A-Z][a-zA-Z\s]+)\s*\((\d+)\s*(?:features?|requirements?|modules?)\)/i,
      /^(\d+)\.\s*([A-Z][a-zA-Z\s]+)/i
    ];

    lines.forEach(line => {
      for (const pattern of modulePatterns) {
        const match = line.match(pattern);
        if (match) {
          const moduleName = match[1] || match[2];
          const count = match[2] ? parseInt(match[2]) : null;
          
          if (moduleName && moduleName.length > 2) {
            modules.push({
              name: moduleName.trim(),
              count: count,
              source: 'extracted'
            });
          }
        }
      }
    });

    return {
      modules: modules.map(m => m.name),
      industry: domainContext.industry || 'generic',
      useCase: domainContext.useCase || 'application',
      confidence: modules.length > 0 ? 0.7 : 0.3
    };
  }

  /**
   * Extract modules from parsed intent
   */
  extractModules(extractedIntent, domainContext) {
    const modules = [];
    
    if (extractedIntent.modules && Array.isArray(extractedIntent.modules)) {
      extractedIntent.modules.forEach((module, index) => {
        const moduleObj = typeof module === 'string' 
          ? { name: module, id: `module-${index + 1}` }
          : { ...module, id: module.id || `module-${index + 1}` };

        modules.push({
          id: moduleObj.id,
          name: moduleObj.name || moduleObj.displayName || `Module ${index + 1}`,
          description: moduleObj.description || '',
          category: this.categorizeModule(moduleObj.name, domainContext),
          priority: moduleObj.priority || 'medium',
          complexity: moduleObj.complexity || this.inferComplexity(moduleObj.name),
          features: moduleObj.features || [],
          source: 'extracted'
        });
      });
    }

    return modules;
  }

  /**
   * Categorize module by name
   */
  categorizeModule(moduleName, domainContext) {
    const name = (moduleName || '').toLowerCase();
    
    if (name.includes('auth') || name.includes('login') || name.includes('user')) {
      return 'Authentication';
    } else if (name.includes('payroll') || name.includes('salary') || name.includes('hr')) {
      return 'HRMS';
    } else if (name.includes('payment') || name.includes('billing') || name.includes('invoice')) {
      return 'Payment';
    } else if (name.includes('dashboard') || name.includes('analytics') || name.includes('report')) {
      return 'Analytics';
    } else if (name.includes('admin') || name.includes('management')) {
      return 'Admin';
    } else {
      return 'General';
    }
  }

  /**
   * Infer complexity from module name
   */
  inferComplexity(moduleName) {
    const name = (moduleName || '').toLowerCase();
    
    if (name.includes('simple') || name.includes('basic') || name.includes('crud')) {
      return 'low';
    } else if (name.includes('complex') || name.includes('advanced') || name.includes('enterprise')) {
      return 'high';
    } else {
      return 'medium';
    }
  }

  /**
   * Group modules by category
   */
  groupByCategory(modules) {
    const categories = {};
    
    modules.forEach(module => {
      const category = module.category || 'General';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(module);
    });

    return categories;
  }

  /**
   * Calculate completeness score
   */
  calculateCompleteness(modules, input) {
    const moduleCount = modules.length;
    const inputLength = input.length;
    
    // Basic heuristics
    let score = 0;
    
    // Module count score (more modules = higher completeness)
    if (moduleCount >= 50) score += 40;
    else if (moduleCount >= 20) score += 30;
    else if (moduleCount >= 10) score += 20;
    else if (moduleCount >= 5) score += 10;
    
    // Input length score
    if (inputLength >= 5000) score += 30;
    else if (inputLength >= 2000) score += 20;
    else if (inputLength >= 500) score += 10;
    
    // Module detail score (modules with descriptions)
    const detailedModules = modules.filter(m => m.description && m.description.length > 20).length;
    if (detailedModules > 0) {
      score += Math.min(30, (detailedModules / moduleCount) * 30);
    }

    return {
      score: Math.min(100, score),
      moduleCount: moduleCount,
      inputLength: inputLength,
      detailedModules: detailedModules
    };
  }

  /**
   * Lock scope after user verification
   * @param {Array} verifiedModules - User-verified modules
   * @param {Object} metadata - Additional metadata
   * @param {Object} db - Database instance (optional, for stale detection)
   * @param {string} projectId - Project ID (optional, for stale detection)
   * @returns {Object} Locked scope object
   */
  async lockScope(verifiedModules, metadata = {}, db = null, projectId = null) {
    this.logger.info('Locking scope', { moduleCount: verifiedModules.length });

    // Generate checksum for new scope
    const newChecksum = this.generateChecksum(verifiedModules);
    
    // Check if scope has changed (if db and projectId provided)
    let staleLevels = [];
    if (db && projectId) {
      try {
        const project = db.db.prepare('SELECT scope_checksum, generated_levels FROM projects WHERE id = ? OR project_code = ?').get(projectId, projectId);
        if (project && project.scope_checksum && project.scope_checksum !== newChecksum) {
          // Scope has changed - mark all existing levels as stale
          const generatedLevels = project.generated_levels ? JSON.parse(project.generated_levels) : [];
          staleLevels = generatedLevels;
          
          this.logger.warn('Scope changed - marking levels as stale', { 
            projectId, 
            oldChecksum: project.scope_checksum, 
            newChecksum,
            staleLevels 
          });
          
          // Update stale_levels in database
          const updateStmt = db.db.prepare('UPDATE projects SET stale_levels = ? WHERE id = ? OR project_code = ?');
          updateStmt.run(JSON.stringify(staleLevels), projectId, projectId);
        }
      } catch (error) {
        this.logger.warn('Failed to check for stale levels', { error: error.message });
      }
    }

    // Create immutable scope object
    const lockedScope = {
      modules: verifiedModules.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description || '',
        category: m.category,
        priority: m.priority || 'medium',
        complexity: m.complexity || 'medium',
        features: m.features || []
      })),
      categories: this.groupByCategory(verifiedModules),
      metadata: {
        ...metadata,
        lockedAt: new Date().toISOString(),
        totalModules: verifiedModules.length,
        totalCategories: Object.keys(this.groupByCategory(verifiedModules)).length,
        staleLevels: staleLevels
      },
      locked: true,
      checksum: newChecksum
    };

    return lockedScope;
  }

  /**
   * Generate checksum for scope integrity
   */
  generateChecksum(modules) {
    const scopeString = JSON.stringify(modules.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category
    })).sort((a, b) => a.id.localeCompare(b.id)));

    return crypto.createHash('sha256').update(scopeString).digest('hex');
  }

  /**
   * Verify scope integrity using checksum
   */
  verifyScopeIntegrity(lockedScope) {
    const currentChecksum = this.generateChecksum(lockedScope.modules);
    return currentChecksum === lockedScope.checksum;
  }

  /**
   * Add missing module to scope
   */
  addModule(lockedScope, module) {
    if (lockedScope.locked) {
      throw new Error('Cannot modify locked scope. Unlock first or create new scope.');
    }

    const newModule = {
      id: module.id || `module-${lockedScope.modules.length + 1}`,
      name: module.name,
      description: module.description || '',
      category: module.category || 'General',
      priority: module.priority || 'medium',
      complexity: module.complexity || 'medium',
      features: module.features || []
    };

    lockedScope.modules.push(newModule);
    lockedScope.categories = this.groupByCategory(lockedScope.modules);
    
    return lockedScope;
  }

  /**
   * Remove module from scope
   */
  removeModule(lockedScope, moduleId) {
    if (lockedScope.locked) {
      throw new Error('Cannot modify locked scope. Unlock first or create new scope.');
    }

    lockedScope.modules = lockedScope.modules.filter(m => m.id !== moduleId);
    lockedScope.categories = this.groupByCategory(lockedScope.modules);
    
    return lockedScope;
  }
}

module.exports = ScopeVerifier;

