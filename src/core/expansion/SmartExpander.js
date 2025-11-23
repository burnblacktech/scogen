/**
 * Smart Expander
 * 
 * Expands minimal user input (10%) to complete feature set (100%)
 * Uses domain templates, pattern library, and requirements enrichment
 */

const RequirementsEnricher = require('../../modules/requirements-enricher');
const { getPatternLibrary } = require('../../modules/pattern-library');
const PrescriptiveEngine = require('../../modules/prescriptive-engine');
const DomainFeatureTemplates = require('../templates/DomainFeatureTemplates');

class SmartExpander {
  constructor(logger, library) {
    this.logger = logger || console;
    this.library = library;
    this.requirementsEnricher = new RequirementsEnricher(logger);
    this.prescriptiveEngine = new PrescriptiveEngine(logger);
    this.patternLibrary = null;
  }

  /**
   * Expand parsed input to 100% complete feature set
   * @param {Object} parsed - Parsed intent from Parser
   * @returns {Promise<Object>} Complete expanded scope
   */
  async expandToComplete(parsed) {
    try {
      this.logger.info('Starting smart expansion', {
        modules: parsed.modules?.length || 0,
        industry: parsed.industry || 'generic'
      });

      // Initialize pattern library if needed
      if (!this.patternLibrary) {
        this.patternLibrary = getPatternLibrary();
        await this.patternLibrary.initialize();
      }

      // Step 1: Detect domain from parsed input
      const domain = this.detectDomain(parsed);
      
      // Step 2: Load feature template (new feature-level templates)
      const featureTemplate = DomainFeatureTemplates.getTemplate(domain);
      
      // Step 2b: Load domain template from prescriptive engine (for architecture)
      const domainTemplate = this.prescriptiveEngine.getTemplate(domain) || 
                           this.prescriptiveEngine.getTemplate('generic');

      // Step 3: Extract base requirements from parsed input
      const baseRequirements = this.extractBaseRequirements(parsed);
      
      // Step 3b: Get original input text for feature matching (if available)
      const originalInput = parsed.originalInput || parsed.input || '';

      // Step 4: Prepare enrichment context
      const enrichmentContext = {
        domain: domain,
        domainContext: {
          industry: parsed.industry || domain,
          useCase: parsed.useCase || 'application'
        },
        market: 'india',
        scale: 'sme',
        complexity: this.assessComplexity(baseRequirements),
        novelty: this.assessNovelty(domain),
        enableAI: process.env.ENABLE_AI_ENRICHMENT === 'true'
      };

      // Step 5: Enrich requirements using RequirementsEnricher
      const enrichmentResult = await this.requirementsEnricher.enrich(
        baseRequirements,
        enrichmentContext
      );

      // Step 6: Apply feature template if available
      let templateFeatures = [];
      if (featureTemplate) {
        const matchedFeatures = DomainFeatureTemplates.matchFeatures(originalInput, featureTemplate);
        templateFeatures = this.applyFeatureTemplate(matchedFeatures, originalInput);
        this.logger.info('Feature template applied', {
          domain: featureTemplate.domain,
          essential: matchedFeatures.essential.length,
          recommended: matchedFeatures.recommended.filter(f => f.included).length,
          optional: matchedFeatures.optional.filter(f => f.included).length
        });
      }

      // Step 7: Merge enriched requirements with domain template and feature template
      const expanded = this.mergeWithTemplate(
        parsed,
        enrichmentResult,
        domainTemplate,
        templateFeatures
      );

      this.logger.info('Smart expansion complete', {
        originalModules: baseRequirements.length,
        enrichedModules: expanded.modules?.length || 0,
        expansionRatio: expanded.modules?.length / baseRequirements.length || 1
      });

      return expanded;

    } catch (error) {
      this.logger.error('Smart expansion failed', { error: error.message });
      // Return original parsed input if expansion fails
      return parsed;
    }
  }

  /**
   * Detect domain from parsed input
   */
  detectDomain(parsed) {
    const industry = (parsed.industry || '').toLowerCase();
    const modules = (parsed.modules || []).map(m => typeof m === 'string' ? m : m.name || m).join(' ').toLowerCase();
    const originalInput = (parsed.originalInput || parsed.input || '').toLowerCase();
    const text = `${industry} ${modules} ${originalInput}`.toLowerCase();

    // Try DomainFeatureTemplates matching first
    const matchedDomain = DomainFeatureTemplates.matchDomain(text);
    if (matchedDomain) {
      return matchedDomain;
    }

    // Domain detection keywords (enhanced)
    const domains = {
      'ecommerce': ['ecommerce', 'e-commerce', 'online store', 'shopping', 'cart', 'checkout'],
      'saas': ['saas', 'software as a service', 'subscription', 'multi-tenant'],
      'payroll': ['payroll', 'salary', 'wages', 'employee payment', 'payslip', 'form 16'],
      'inventory': ['inventory', 'stock', 'warehouse', 'products', 'stock management'],
      'crm': ['crm', 'customer relationship', 'leads', 'sales', 'customer management'],
      'lms': ['lms', 'learning management', 'e-learning', 'education', 'courses', 'learning platform'],
      'erp': ['erp', 'enterprise resource', 'manufacturing'],
      'healthcare': ['healthcare', 'hospital', 'patient', 'medical'],
      'education': ['education', 'school', 'student'],
      'finance': ['finance', 'banking', 'accounting', 'financial']
    };

    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return domain;
      }
    }

    return parsed.industry || 'generic';
  }

  /**
   * Extract base requirements from parsed input
   */
  extractBaseRequirements(parsed) {
    if (parsed.modules && Array.isArray(parsed.modules)) {
      return parsed.modules.map(m => typeof m === 'string' ? m : m.name || m);
    }
    return [];
  }

  /**
   * Assess complexity of requirements
   */
  assessComplexity(requirements) {
    if (!Array.isArray(requirements) || requirements.length === 0) {
      return 'standard';
    }

    const reqText = requirements.join(' ').toLowerCase();
    const complexKeywords = ['advanced', 'custom', 'complex', 'sophisticated', 'realtime', 'ml', 'ai'];
    const simpleKeywords = ['basic', 'standard', 'common', 'typical', 'simple'];

    let score = 0;
    complexKeywords.forEach(keyword => {
      if (reqText.includes(keyword)) score += 2;
    });
    simpleKeywords.forEach(keyword => {
      if (reqText.includes(keyword)) score -= 1;
    });

    if (requirements.length > 15) score += 1;
    if (requirements.length < 5) score -= 1;

    if (score >= 2) return 'complex';
    if (score <= -1) return 'simple';
    return 'standard';
  }

  /**
   * Assess novelty of domain
   */
  assessNovelty(domain) {
    const commonDomains = ['ecommerce', 'saas', 'crm', 'erp', 'website', 'webapp'];
    if (commonDomains.includes(domain)) {
      return 20; // Low novelty
    }
    return 60; // Medium-high novelty
  }

  /**
   * Apply feature template and convert to module format
   * @param {Object} matchedFeatures - Matched features from DomainFeatureTemplates.matchFeatures()
   * @param {string} inputText - Original input text
   * @returns {Array} Array of module objects
   */
  applyFeatureTemplate(matchedFeatures, inputText) {
    const modules = [];
    
    // Add essential features (always included)
    for (const feature of matchedFeatures.essential || []) {
      modules.push({
        name: feature.name,
        category: feature.category,
        hours: feature.hours,
        complexity: feature.complexity,
        description: feature.description,
        source: 'template',
        included: true
      });
    }
    
    // Add recommended features (if included)
    for (const feature of matchedFeatures.recommended || []) {
      if (feature.included) {
        modules.push({
          name: feature.name,
          category: feature.category,
          hours: feature.hours,
          complexity: feature.complexity,
          description: feature.description,
          source: 'template',
          included: true
        });
      }
    }
    
    // Add optional features (if included)
    for (const feature of matchedFeatures.optional || []) {
      if (feature.included) {
        modules.push({
          name: feature.name,
          category: feature.category,
          hours: feature.hours,
          complexity: feature.complexity,
          description: feature.description,
          source: 'template',
          included: true
        });
      }
    }
    
    return modules;
  }

  /**
   * Merge enriched requirements with domain template and feature template
   */
  mergeWithTemplate(parsed, enrichmentResult, domainTemplate, templateFeatures = []) {
    // Start with parsed input - preserve user's explicit modules
    const userModules = [];
    const userModuleNames = new Set();
    
    // Convert user modules to objects if they're strings
    for (const module of parsed.modules || []) {
      if (typeof module === 'string') {
        userModules.push({
          name: module,
          source: 'user',
          included: true
        });
        userModuleNames.add(module.toLowerCase());
      } else {
        userModules.push({
          ...module,
          source: module.source || 'user',
          included: module.included !== undefined ? module.included : true
        });
        userModuleNames.add((module.name || module).toLowerCase());
      }
    }

    const expanded = {
      ...parsed,
      modules: [...userModules], // Start with user modules
      edges: [...(parsed.edges || [])]
    };

    // Add template features (avoid duplicates with user modules)
    for (const templateModule of templateFeatures) {
      const moduleNameLower = templateModule.name.toLowerCase();
      if (!userModuleNames.has(moduleNameLower)) {
        expanded.modules.push(templateModule);
      } else {
        // User mentioned this feature - preserve user's version but enhance with template data if missing
        const userModuleIndex = expanded.modules.findIndex(m => 
          (m.name || m).toLowerCase() === moduleNameLower
        );
        if (userModuleIndex !== -1) {
          const userModule = expanded.modules[userModuleIndex];
          // Enhance user module with template data if missing
          if (!userModule.hours && templateModule.hours) {
            userModule.hours = templateModule.hours;
          }
          if (!userModule.complexity && templateModule.complexity) {
            userModule.complexity = templateModule.complexity;
          }
          if (!userModule.category && templateModule.category) {
            userModule.category = templateModule.category;
          }
          if (!userModule.description && templateModule.description) {
            userModule.description = templateModule.description;
          }
        }
      }
    }

    // Add enriched modules (from RequirementsEnricher)
    if (enrichmentResult.enriched) {
      const enrichedModules = [
        ...(enrichmentResult.enriched.explicit || []),
        ...(enrichmentResult.enriched.implicit || []),
        ...(enrichmentResult.enriched.domainSpecific || [])
      ];

      // Merge without duplicates
      for (const module of enrichedModules) {
        const moduleName = typeof module === 'string' ? module : module.name || module;
        const moduleNameLower = moduleName.toLowerCase();
        
        // Check if already exists (user or template)
        const exists = userModuleNames.has(moduleNameLower) || 
                      expanded.modules.some(m => (m.name || m).toLowerCase() === moduleNameLower);
        
        if (!exists) {
          expanded.modules.push({
            name: moduleName,
            source: 'enriched',
            included: true,
            ...(typeof module === 'object' ? module : {})
          });
        }
      }

      // Add edge cases and compliance
      if (enrichmentResult.enriched.edgeCases?.length > 0) {
        expanded.edgeCases = enrichmentResult.enriched.edgeCases;
      }
      if (enrichmentResult.enriched.compliance?.length > 0) {
        expanded.compliance = enrichmentResult.enriched.compliance;
      }
    }

    // Add domain template architecture if available
    if (domainTemplate) {
      expanded.architecture = domainTemplate.architecture;
      expanded.techStack = domainTemplate.tech;
      expanded.scale = domainTemplate.scale;
    }

    // Add enrichment metadata
    expanded.enrichment = {
      originalCount: enrichmentResult.stats?.originalCount || parsed.modules?.length || 0,
      enrichedCount: expanded.modules.length,
      ratio: expanded.modules.length / (parsed.modules?.length || 1),
      patternsUsed: enrichmentResult.stats?.patternsUsed || 0,
      confidence: enrichmentResult.stats?.confidence || 0
    };

    return expanded;
  }
}

module.exports = SmartExpander;

