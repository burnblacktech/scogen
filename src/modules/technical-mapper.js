const fs = require('fs');
const path = require('path');

class TechnicalMapper {
  constructor(library, logger, config) {
    this.library = library;
    this.logger = logger;
    this.config = config;
    this.domainKnowledge = this.loadDomainKnowledge();
  }

  /**
   * Load domain knowledge from JSON files
   */
  loadDomainKnowledge() {
    const knowledgeBase = {};
    const knowledgeDir = path.join(__dirname, '../../data/domain-knowledge');
    
    try {
      if (fs.existsSync(knowledgeDir)) {
        const files = fs.readdirSync(knowledgeDir);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            try {
              const filePath = path.join(knowledgeDir, file);
              const content = fs.readFileSync(filePath, 'utf8');
              const knowledge = JSON.parse(content);
              knowledgeBase[knowledge.domain] = knowledge;
              if (knowledge.platformType) {
                knowledgeBase[knowledge.platformType] = knowledge; // Also index by platformType
              }
            } catch (error) {
              this.logger.warn('Failed to parse domain knowledge file', { file, error: error.message });
            }
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to load domain knowledge', { error: error.message });
    }
    
    return knowledgeBase;
  }

  /**
   * Reload domain knowledge (useful after updates)
   */
  reloadDomainKnowledge() {
    this.domainKnowledge = this.loadDomainKnowledge();
    this.logger.info('Domain knowledge reloaded', {
      domains: Object.keys(this.domainKnowledge).length
    });
  }

  /**
   * Main decomposition method - breaks business module into technical components
   */
  async decomposeModule(businessModule, domainContext, platformType) {
    this.logger.info('Decomposing business module', {
      module: businessModule.name,
      platformType: platformType || 'generic'
    });

    // Get domain knowledge for this platform/domain
    const domainKnowledge = this.getDomainKnowledge(domainContext, platformType);
    
    // Identify which technical pattern matches this business module
    const pattern = this.identifyPattern(businessModule, domainKnowledge);
    
    if (!pattern) {
      // Fallback to generic pattern
      return this.decomposeGeneric(businessModule, domainContext);
    }

    // Decompose using identified pattern
    const technicalComponents = this.generateComponentsFromPattern(
      pattern,
      businessModule,
      domainContext
    );

    // Calculate efforts
    const totalEffort = this.calculateTotalEffort(technicalComponents, domainContext);
    const totalCost = this.calculateTotalCost(totalEffort, domainContext);

    // Identify dependencies and integration points
    const dependencies = this.identifyDependencies(technicalComponents);
    const integrationPoints = this.extractIntegrationPoints(pattern, technicalComponents);
    const edgeCases = this.extractEdgeCases(pattern, technicalComponents);

    return {
      businessModule: businessModule.name,
      displayName: businessModule.displayName || businessModule.name,
      technicalComponents: technicalComponents,
      totalEffort: totalEffort,
      totalCost: totalCost,
      dependencies: dependencies,
      integrationPoints: integrationPoints,
      edgeCases: edgeCases,
      architectureNotes: this.getArchitectureNotes(domainKnowledge)
    };
  }

  /**
   * Get domain knowledge for given context
   */
  getDomainKnowledge(domainContext, platformType) {
    // Try platformType first, then domain, then generic
    if (platformType && this.domainKnowledge[platformType]) {
      return this.domainKnowledge[platformType];
    }
    if (domainContext && domainContext.industry && this.domainKnowledge[domainContext.industry]) {
      return this.domainKnowledge[domainContext.industry];
    }
    return this.domainKnowledge['generic'] || {};
  }

  /**
   * Identify which technical pattern matches the business module
   */
  identifyPattern(businessModule, domainKnowledge) {
    const moduleName = (businessModule.name || '').toLowerCase();
    const patterns = domainKnowledge.technicalPatterns || {};

    // Try exact match first
    for (const [patternName, pattern] of Object.entries(patterns)) {
      if (moduleName.includes(patternName.replace('_', '')) || 
          patternName.replace('_', '').includes(moduleName)) {
        return { name: patternName, ...pattern };
      }
    }

    // Try keyword matching
    const keywords = {
      'salary': 'salary_structure',
      'payroll': 'payroll_processing',
      'compliance': 'statutory_compliance',
      'pf': 'statutory_compliance',
      'esi': 'statutory_compliance',
      'tds': 'statutory_compliance',
      'onboarding': 'employee_onboarding',
      'auth': 'authentication',
      'login': 'authentication',
      'dashboard': 'dashboard'
    };

    for (const [keyword, patternName] of Object.entries(keywords)) {
      if (moduleName.includes(keyword) && patterns[patternName]) {
        return { name: patternName, ...patterns[patternName] };
      }
    }

    return null;
  }

  /**
   * Generate technical components from pattern
   */
  generateComponentsFromPattern(pattern, businessModule, domainContext) {
    const components = [];
    const complexity = this.determineComplexity(businessModule, pattern);

    if (pattern.components && Array.isArray(pattern.components)) {
      pattern.components.forEach(patternComponent => {
        const component = {
          layer: patternComponent.layer,
          component: patternComponent.component,
          files: [...(patternComponent.requiredFiles || [])],
          functions: [...(patternComponent.requiredFunctions || [])],
          complexity: this.mapComplexity(complexity),
          baseEffort: this.getBaselineEffort(patternComponent, complexity),
          dependencies: [],
          edgeCases: []
        };

        // Apply complexity factors
        if (patternComponent.complexityFactors) {
          component.effortMultiplier = this.calculateComplexityMultiplier(
            patternComponent.complexityFactors,
            businessModule,
            domainContext
          );
          component.adjustedEffort = component.baseEffort * (component.effortMultiplier || 1.0);
        } else {
          component.adjustedEffort = component.baseEffort;
        }

        // Add edge cases from pattern
        if (this.config.get('technicalDecomposition.includeEdgeCases')) {
          component.edgeCases = this.extractComponentEdgeCases(pattern, patternComponent);
        }

        components.push(component);
      });
    }

    return components;
  }

  /**
   * Determine complexity level (simple/custom/complex)
   */
  determineComplexity(businessModule, pattern) {
    const moduleComplexity = businessModule.complexity || 'med';
    
    // Map module complexity to pattern complexity
    if (moduleComplexity === 'low') return 'simple';
    if (moduleComplexity === 'med') return 'custom';
    if (moduleComplexity === 'high') return 'complex';
    
    return 'custom'; // default
  }

  /**
   * Map complexity string to standard format
   */
  mapComplexity(complexity) {
    const mapping = {
      'simple': 'low',
      'custom': 'medium',
      'complex': 'high',
      'low': 'low',
      'med': 'medium',
      'medium': 'medium',
      'high': 'high'
    };
    return mapping[complexity] || 'medium';
  }

  /**
   * Get baseline effort from pattern component
   */
  getBaselineEffort(patternComponent, complexity) {
    const baseline = patternComponent.baselineEffort || {};
    
    // Try exact match first
    if (baseline[complexity]) {
      return baseline[complexity];
    }
    
    // Fallback to standard or average
    if (baseline.standard) return baseline.standard;
    if (baseline.custom) return baseline.custom;
    
    // Calculate average
    const values = Object.values(baseline);
    if (values.length > 0) {
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    return 2; // Default fallback
  }

  /**
   * Calculate complexity multiplier based on factors
   */
  calculateComplexityMultiplier(complexityFactors, businessModule, domainContext) {
    let multiplier = 1.0;
    
    // Check if any complexity factors apply
    // This is a simplified version - in production, would analyze requirements more deeply
    const moduleName = (businessModule.name || '').toLowerCase();
    const requirements = JSON.stringify(businessModule).toLowerCase();
    
    for (const [factor, factorMultiplier] of Object.entries(complexityFactors)) {
      if (moduleName.includes(factor.toLowerCase()) || 
          requirements.includes(factor.toLowerCase())) {
        multiplier *= factorMultiplier;
      }
    }
    
    return Math.max(1.0, Math.min(multiplier, 3.0)); // Cap between 1.0 and 3.0
  }

  /**
   * Extract edge cases for component
   */
  extractComponentEdgeCases(pattern, patternComponent) {
    const edgeCases = [];
    
    // Add pattern-level known risks as edge cases
    if (pattern.knownRisks && Array.isArray(pattern.knownRisks)) {
      pattern.knownRisks.forEach(risk => {
        edgeCases.push({
          description: risk.risk,
          impact: risk.impact,
          mitigation: risk.effortBuffer ? `Add ${risk.effortBuffer} days buffer` : 'Review required'
        });
      });
    }
    
    return edgeCases;
  }

  /**
   * Calculate total effort from components
   */
  calculateTotalEffort(components, domainContext) {
    const effortMultiplier = this.config.get('technicalDecomposition.effortMultiplier') || 1.0;
    
    const total = components.reduce((sum, component) => {
      return sum + (component.adjustedEffort || component.baseEffort);
    }, 0);
    
    return Math.round(total * effortMultiplier * 10) / 10; // Round to 1 decimal
  }

  /**
   * Calculate total cost from effort
   */
  calculateTotalCost(totalEffort, domainContext) {
    const industry = domainContext?.industry || 'generic';
    const hourlyRate = this.library.getHourlyRate(industry);
    const dailyRate = hourlyRate * 8; // 8 hours per day
    
    return Math.round(totalEffort * dailyRate);
  }

  /**
   * Identify dependencies between components
   */
  identifyDependencies(components) {
    const dependencies = [];
    const componentNames = components.map(c => c.component);
    
    components.forEach(component => {
      // Check if component functions reference other components
      component.functions.forEach(func => {
        componentNames.forEach(otherComponent => {
          if (otherComponent !== component.component && 
              func.includes(otherComponent)) {
            if (!dependencies.find(d => 
              d.from === component.component && d.to === otherComponent)) {
              dependencies.push({
                from: component.component,
                to: otherComponent,
                type: 'functional'
              });
            }
          }
        });
      });
    });
    
    return dependencies;
  }

  /**
   * Extract integration points from pattern
   */
  extractIntegrationPoints(pattern, components) {
    const integrationPoints = [];
    
    if (pattern.integrationPoints && Array.isArray(pattern.integrationPoints)) {
      pattern.integrationPoints.forEach(point => {
        integrationPoints.push({
          service: point,
          type: 'external',
          description: `Integration with ${point}`
        });
      });
    }
    
    // Add internal integration points between components
    components.forEach(component => {
      if (component.layer === 'api' || component.layer === 'business_logic') {
        components.forEach(otherComponent => {
          if (otherComponent !== component && 
              (otherComponent.layer === 'data' || otherComponent.layer === 'business_logic')) {
            if (component.functions.some(f => f.includes(otherComponent.component))) {
              integrationPoints.push({
                service: otherComponent.component,
                type: 'internal',
                description: `${component.component} uses ${otherComponent.component}`
              });
            }
          }
        });
      }
    });
    
    return integrationPoints;
  }

  /**
   * Extract edge cases from pattern
   */
  extractEdgeCases(pattern, components) {
    const edgeCases = [];
    
    if (pattern.knownRisks && Array.isArray(pattern.knownRisks)) {
      pattern.knownRisks.forEach(risk => {
        edgeCases.push({
          type: 'risk',
          description: risk.risk,
          impact: risk.impact,
          effortBuffer: risk.effortBuffer || 0,
          mitigation: `Add ${risk.effortBuffer || 1} day buffer for ${risk.risk}`
        });
      });
    }
    
    // Add component-level edge cases
    components.forEach(component => {
      if (component.edgeCases && component.edgeCases.length > 0) {
        edgeCases.push(...component.edgeCases);
      }
    });
    
    return edgeCases;
  }

  /**
   * Get architecture notes from domain knowledge
   */
  getArchitectureNotes(domainKnowledge) {
    const defaults = domainKnowledge.architectureDefaults || {};
    const notes = [];
    
    if (defaults.pattern) {
      notes.push(`Architecture pattern: ${defaults.pattern}`);
    }
    if (defaults.database) {
      notes.push(`Database: ${defaults.database}`);
    }
    if (defaults.apiStyle) {
      notes.push(`API style: ${defaults.apiStyle}`);
    }
    if (defaults.frontend) {
      notes.push(`Frontend: ${defaults.frontend}`);
    }
    
    return notes.join(', ');
  }

  /**
   * Fallback generic decomposition when no pattern matches
   */
  decomposeGeneric(businessModule, domainContext) {
    this.logger.warn('No pattern found, using generic decomposition', {
      module: businessModule.name
    });

    const genericKnowledge = this.domainKnowledge['generic'] || {};
    const genericPattern = genericKnowledge.technicalPatterns?.dashboard || 
                          genericKnowledge.technicalPatterns?.authentication;

    if (!genericPattern) {
      // Ultimate fallback - create basic structure
      return {
        businessModule: businessModule.name,
        displayName: businessModule.displayName || businessModule.name,
        technicalComponents: [
          {
            layer: 'data',
            component: `${businessModule.name}Model`,
            files: [`models/${businessModule.name}.js`],
            functions: [`${businessModule.name}.create(data)`, `${businessModule.name}.findById(id)`],
            complexity: this.mapComplexity(businessModule.complexity || 'med'),
            baseEffort: 1.5,
            adjustedEffort: 1.5,
            dependencies: [],
            edgeCases: []
          },
          {
            layer: 'business_logic',
            component: `${businessModule.name}Service`,
            files: [`services/${businessModule.name.toLowerCase()}-service.js`],
            functions: [`process(data)`, `validate(data)`],
            complexity: this.mapComplexity(businessModule.complexity || 'med'),
            baseEffort: 2,
            adjustedEffort: 2,
            dependencies: [],
            edgeCases: []
          },
          {
            layer: 'api',
            component: `${businessModule.name}API`,
            files: [`routes/${businessModule.name.toLowerCase()}.js`],
            functions: [`POST /api/${businessModule.name.toLowerCase()}`, `GET /api/${businessModule.name.toLowerCase()}`],
            complexity: 'low',
            baseEffort: 1.5,
            adjustedEffort: 1.5,
            dependencies: [],
            edgeCases: []
          }
        ],
        totalEffort: 5,
        totalCost: this.calculateTotalCost(5, domainContext),
        dependencies: [],
        integrationPoints: [],
        edgeCases: [],
        architectureNotes: 'Generic architecture pattern'
      };
    }

    const technicalComponents = this.generateComponentsFromPattern(
      genericPattern,
      businessModule,
      domainContext
    );

    const totalEffort = this.calculateTotalEffort(technicalComponents, domainContext);
    const totalCost = this.calculateTotalCost(totalEffort, domainContext);

    return {
      businessModule: businessModule.name,
      displayName: businessModule.displayName || businessModule.name,
      technicalComponents: technicalComponents,
      totalEffort: totalEffort,
      totalCost: totalCost,
      dependencies: this.identifyDependencies(technicalComponents),
      integrationPoints: this.extractIntegrationPoints(genericPattern, technicalComponents),
      edgeCases: this.extractEdgeCases(genericPattern, technicalComponents),
      architectureNotes: this.getArchitectureNotes(genericKnowledge)
    };
  }

  /**
   * Identify which technical layers are needed for a module
   */
  identifyTechnicalLayers(moduleName, requirements) {
    const layers = [];
    const reqText = JSON.stringify(requirements).toLowerCase();
    
    // Data layer needed if storing data
    if (reqText.includes('store') || reqText.includes('save') || reqText.includes('database')) {
      layers.push('data');
    }
    
    // Business logic needed for processing
    if (reqText.includes('calculate') || reqText.includes('process') || reqText.includes('validate')) {
      layers.push('business_logic');
    }
    
    // API needed for external access
    if (reqText.includes('api') || reqText.includes('endpoint') || reqText.includes('rest')) {
      layers.push('api');
    }
    
    // Frontend needed for user interface
    if (reqText.includes('ui') || reqText.includes('interface') || reqText.includes('page') || reqText.includes('component')) {
      layers.push('frontend');
    }
    
    // Default to all layers if nothing specific
    if (layers.length === 0) {
      layers.push('data', 'business_logic', 'api', 'frontend');
    }
    
    return layers;
  }
}

module.exports = TechnicalMapper;

