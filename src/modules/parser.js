const { v4: uuidv4 } = require('uuid');

/**
 * Parser Module
 * 
 * Converts extracted intent into technical modules and edges.
 * Handles module normalization, complexity inference, and dependency detection.
 * 
 * @class Parser
 */
class Parser {
  /**
   * Create a Parser instance
   * @param {Object} library - Library instance for module normalization
   * @param {Object} logger - Logger instance
   */
  constructor(library, logger) {
    this.library = library;
    this.logger = logger;
  }

  /**
   * Parse extracted intent into technical modules and edges
   * 
   * @param {Object} extractedIntent - Extracted intent from input analysis
   * @param {Array<string>} extractedIntent.modules - User-mentioned modules
   * @param {Array} extractedIntent.edges - User-mentioned edges (optional)
   * @param {string} extractedIntent.industry - Industry context (optional)
   * @param {string} extractedIntent.useCase - Use case type (optional)
   * @param {Object} domainContext - Domain context with hidden edges (optional)
   * @returns {Object} Parsed scope with modules, edges, and intent
   */
  parse(extractedIntent, domainContext) {
    const modules = [];
    const edges = [];

    // Validate input with defensive defaults
    if (!extractedIntent) {
      this.logger.warn('Parser received undefined extractedIntent, using defaults');
      extractedIntent = { modules: [], industry: 'generic', useCase: 'application' };
    }
    
    // Ensure modules is an array
    if (!Array.isArray(extractedIntent.modules)) {
      this.logger.warn('Parser received non-array modules, converting to array');
      extractedIntent.modules = [];
    }

    // Step 1: Normalize user-mentioned modules
    const modulesToNormalize = Array.isArray(extractedIntent.modules) 
      ? extractedIntent.modules 
      : [];
    const normalized = this.normalizeModules(modulesToNormalize);

    // Step 2: Map to technical modules
    normalized.forEach(userModule => {
      const module = this.createModule(
        userModule.canonical,
        this.inferComplexity(userModule.canonical),
        [],
        userModule.confidence,
        'extracted'
      );
      modules.push(module);
    });

    // Step 3: Auto-add critical dependencies (e.g., Auth)
    const withDeps = this.addCriticalDeps(modules);

    // Step 4: Extract edges from user input
    const userEdges = this.extractEdges(extractedIntent.edges || []);
    edges.push(...userEdges);

    // Step 5: Add domain hidden edges
    if (domainContext && domainContext.hiddenEdges) {
      edges.push(...domainContext.hiddenEdges);
    }

    this.logger.info('Parsing complete', {
      modulesDetected: withDeps.length,
      edgesDetected: edges.length
    });

    return {
      modules: withDeps,
      edges: edges,
      intent: {
        b2b: this.detectB2B(extractedIntent),
        b2c: this.detectB2C(extractedIntent),
        industry: extractedIntent.industry || 'generic',
        useCase: extractedIntent.useCase || 'application'
      }
    };
  }

  normalizeModules(rawModules) {
    const { normalizeModuleArray } = require('../utils/module-utils');
    
    // Use centralized array validation
    const modules = normalizeModuleArray(rawModules, this.logger);
    
    return modules.map(raw => {
      // Handle different input types
      const moduleName = typeof raw === 'string' ? raw : (raw.name || raw.module || String(raw));
      const canonical = this.library.normalizeModuleName(moduleName);
      const confidence = canonical === moduleName ? 0.5 : 0.9; // Lower confidence if no match
      
      return { canonical, original: moduleName, confidence };
    });
  }

  createModule(name, complexity, deps, confidence, source) {
    return {
      id: uuidv4(),
      name,
      displayName: this.humanizeName(name),
      complexity,
      deps,
      confidence,
      source,
      priority: 'medium',
      phase: 1
    };
  }

  humanizeName(canonical) {
    return canonical
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, str => str.toUpperCase());
  }

  inferComplexity(moduleName) {
    const complexityMap = {
      'Auth': 'med',
      'Dashboard': 'med',
      'HoursTracking': 'med',
      'TipCalculation': 'high',
      'PayrollEngine': 'high',
      'Reports': 'med',
      'Analytics': 'high',
      'Notifications': 'low',
      'Search': 'low',
      'API': 'med',
      'Payment': 'high',
      'Billing': 'high',
      'Integration': 'high',
      'Reporting': 'med',
      'Admin': 'med',
      'User': 'low',
      'Settings': 'low'
    };

    // Check if module name contains complexity indicators
    const nameLower = moduleName.toLowerCase();
    if (nameLower.includes('engine') || nameLower.includes('calculation') || nameLower.includes('analytics')) {
      return 'high';
    }
    if (nameLower.includes('notification') || nameLower.includes('search') || nameLower.includes('settings')) {
      return 'low';
    }

    return complexityMap[moduleName] || 'med';
  }

  addCriticalDeps(modules) {
    const needsAuth = modules.some(m => 
      ['PayrollEngine', 'Dashboard', 'Reports'].includes(m.name)
    );

    if (needsAuth && !modules.find(m => m.name === 'Auth')) {
      modules.unshift(this.createModule(
        'Auth',
        'med',
        [],
        1.0,
        'auto_added'
      ));
    }

    // Assign dependencies
    modules.forEach(mod => {
      if (mod.name === 'PayrollEngine') mod.deps.push('Auth');
      if (mod.name === 'Dashboard') mod.deps.push('Auth');
      if (mod.name === 'Reports') mod.deps.push('Dashboard');
    });

    return modules;
  }

  extractEdges(userEdges) {
    // Ensure userEdges is an array
    if (!Array.isArray(userEdges)) {
      this.logger.warn('extractEdges received non-array input', { 
        type: typeof userEdges,
        value: userEdges 
      });
      return [];
    }
    
    const edgeMap = {
      'daily': { desc: 'Daily tracking = more data volume', score: 5 },
      'multiple locations': { desc: 'Multi-location = architecture complexity', score: 7 },
      'real-time': { desc: 'Real-time updates = infrastructure cost', score: 6 },
      'mobile': { desc: 'Mobile app = separate build', score: 6 }
    };

    return userEdges.map(edge => {
      const edgeStr = typeof edge === 'string' ? edge : (edge.desc || edge.description || String(edge));
      const normalized = edgeStr.toLowerCase();
      for (let [key, value] of Object.entries(edgeMap)) {
        if (normalized.includes(key)) {
          return { ...value, source: 'user_mentioned' };
        }
      }
      return { desc: edgeStr, score: 3, source: 'user_mentioned' };
    });
  }

  detectB2B(intent) {
    const b2bSignals = ['business', 'enterprise', 'shops', 'clients', 'companies'];
    const text = JSON.stringify(intent).toLowerCase();
    return b2bSignals.some(signal => text.includes(signal));
  }

  detectB2C(intent) {
    const b2cSignals = ['consumer', 'customer', 'users', 'people'];
    const text = JSON.stringify(intent).toLowerCase();
    return b2cSignals.some(signal => text.includes(signal));
  }
}

module.exports = Parser;

