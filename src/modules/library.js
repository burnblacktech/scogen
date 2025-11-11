const fs = require('fs');
const path = require('path');

class ProprietaryLibrary {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
    
    this.baselines = this.loadBaselines();
    this.moduleAliases = this.buildModuleAliases();
    
    this.initializeDatabase();
    
    this.logger.info('Library initialized', { 
      domains: Object.keys(this.baselines).length 
    });
  }

  loadBaselines() {
    try {
      const baselinePath = path.join(__dirname, '../../data/baseline.json');
      const data = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      return data;
    } catch (error) {
      this.logger.error('Failed to load baselines', { error: error.message });
      throw new Error('Cannot load baseline data');
    }
  }

  initializeDatabase() {
    // Seed database with hardcoded baselines
    Object.values(this.baselines).forEach(baseline => {
      const existing = this.db.getBaseline(baseline.domain);
      
      if (!existing) {
        this.db.saveBaseline(baseline);
        this.logger.debug('Baseline seeded', { domain: baseline.domain });
      }
    });
  }

  buildModuleAliases() {
    return {
      // Auth variations
      'login': 'Auth',
      'authentication': 'Auth',
      'signin': 'Auth',
      'signup': 'Auth',
      'sign in': 'Auth',
      'sign up': 'Auth',
      'user accounts': 'Auth',
      'user management': 'UserManagement',
      
      // Dashboard variations
      'dashboard': 'Dashboard',
      'admin panel': 'Dashboard',
      'admin': 'Admin',
      'control panel': 'Dashboard',
      
      // Retail-specific
      'hours': 'HoursTracking',
      'hours tracking': 'HoursTracking',
      'time tracking': 'HoursTracking',
      'timesheet': 'HoursTracking',
      'time': 'HoursTracking',
      'tips': 'TipCalculation',
      'tip calc': 'TipCalculation',
      'tip calculation': 'TipCalculation',
      'payroll': 'PayrollEngine',
      'pay': 'PayrollEngine',
      'inventory': 'Inventory',
      'pos': 'POS',
      'point of sale': 'POS',
      
      // Generic
      'reports': 'Reports',
      'reporting': 'Reports',
      'analytics': 'Analytics',
      'payments': 'Payments',
      'billing': 'Billing',
      'subscriptions': 'Subscriptions',
      'notifications': 'Notifications',
      'search': 'Search',
      'api': 'API',
      'chat': 'Chat',
      'messaging': 'Chat',
      'email': 'EmailService',
      'calendar': 'Calendar',
      'scheduling': 'Calendar',
      'comments': 'Comments',
      'tags': 'Tagging'
    };
  }

  getBaseline(industry) {
    // Try database first (may have been tuned)
    const dbBaseline = this.db.getBaseline(industry);
    
    if (dbBaseline) {
      return dbBaseline;
    }

    // Fallback to hardcoded
    if (this.baselines[industry]) {
      return this.baselines[industry];
    }

    // Ultimate fallback: generic
    this.logger.warn('Unknown industry, using generic', { industry });
    return this.baselines.generic;
  }

  getModuleEffort(moduleName, industry = 'generic') {
    const baseline = this.getBaseline(industry);
    
    if (baseline.module_efforts[moduleName]) {
      return baseline.module_efforts[moduleName];
    }

    // Unknown module: default to medium complexity
    this.logger.debug('Unknown module, using default', { moduleName });
    return 2.0;
  }

  getHourlyRate(industry = 'generic') {
    const baseline = this.getBaseline(industry);
    return baseline.hourly_rate;
  }

  getComplexityMultiplier(complexity, industry = 'generic') {
    const baseline = this.getBaseline(industry);
    return baseline.complexity_multipliers[complexity] || 2.0;
  }

  getPersonaBuffer(persona, industry = 'generic') {
    const baseline = this.getBaseline(industry);
    return baseline.persona_buffers[persona] || 0;
  }

  normalizeModuleName(userInput) {
    const normalized = userInput.toLowerCase().trim();
    
    // Direct match
    if (this.moduleAliases[normalized]) {
      return this.moduleAliases[normalized];
    }

    // Fuzzy match (contains)
    for (const [alias, canonical] of Object.entries(this.moduleAliases)) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return canonical;
      }
    }

    // No match: return original (title case)
    return userInput
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  getReusableModule(moduleName, industry) {
    // For MVP: Simplified reuse logic
    // In future: Load from separate reuse.json
    
    const reusableModules = {
      'Auth': { effort: 1.5, confidence: 0.95, savings: 0.5 },
      'Dashboard': { effort: 2.0, confidence: 0.9, savings: 0.3 },
      'Payments': { effort: 3.0, confidence: 0.85, savings: 0.4 },
      'Notifications': { effort: 1.0, confidence: 0.95, savings: 0.5 }
    };

    if (reusableModules[moduleName]) {
      return {
        ...reusableModules[moduleName],
        available: true,
        module: moduleName
      };
    }

    return {
      module: moduleName,
      available: false,
      effort: this.getModuleEffort(moduleName, industry),
      confidence: 0.7,
      savings: 0
    };
  }
}

module.exports = ProprietaryLibrary;

