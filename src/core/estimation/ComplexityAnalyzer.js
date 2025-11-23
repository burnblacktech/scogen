// src/core/estimation/ComplexityAnalyzer.js
// Dynamic Complexity Analysis Engine

class ComplexityAnalyzer {
  constructor() {
    // Domain-specific complexity factors
    this.domainFactors = {
      fintech: {
        compliance: 1.5,     // RBI regulations, KYC, AML
        security: 1.4,       // High security needs
        accuracy: 1.6,       // Zero-error tolerance
        integration: 1.3,    // Banking APIs, payment gateways
        audit: 1.2           // Audit trails required
      },
      ecommerce: {
        scale: 1.3,          // High traffic handling
        inventory: 1.2,      // Complex inventory management
        payment: 1.1,        // Multiple payment gateways
        logistics: 1.3,      // Shipping complexity
        catalog: 1.1         // Product catalog management
      },
      healthcare: {
        compliance: 1.7,     // HIPAA, medical standards
        accuracy: 1.5,       // Life-critical accuracy
        integration: 1.4,    // Medical devices, EHR systems
        security: 1.5,       // Patient data protection
        reporting: 1.2       // Regulatory reporting
      },
      hrms: {
        compliance: 1.3,     // Labor laws, tax compliance
        reporting: 1.2,      // Payroll, attendance reports
        integration: 1.1,    // HRIS integrations
        workflow: 1.2        // Approval workflows
      },
      generic: {
        default: 1.0
      }
    };

    // Technical complexity indicators
    this.technicalComplexityIndicators = {
      realTime: 1.3,         // Real-time processing
      async: 1.2,            // Async operations
      distributed: 1.4,      // Distributed systems
      microservices: 1.3,    // Microservices architecture
      caching: 1.1,          // Caching requirements
      queue: 1.2,            // Message queues
      websocket: 1.2,        // WebSocket connections
      graphql: 1.1,          // GraphQL API
      rest: 1.0              // Standard REST API
    };
  }

  /**
   * Analyze overall complexity of a module
   * @param {Object} module - Module object with name, dependencies, etc.
   * @param {Object} projectContext - Project context (domain, scale, etc.)
   * @returns {Object} Complexity analysis result
   */
  analyze(module, projectContext = {}) {
    const analysis = {
      inherent: this.getInherentComplexity(module),
      integration: this.getIntegrationComplexity(module),
      domain: this.getDomainComplexity(module, projectContext),
      technical: this.getTechnicalComplexity(module),
      uncertainty: this.getUncertaintyFactor(module, projectContext),
      data: this.getDataComplexity(module),
      business: this.getBusinessLogicComplexity(module)
    };

    // Calculate weighted overall complexity score (1-5 scale)
    analysis.overall = this.calculateOverallComplexity(analysis);

    // Generate complexity breakdown
    analysis.breakdown = this.generateBreakdown(analysis);

    // Calculate confidence in complexity assessment
    analysis.confidence = this.calculateConfidence(module, analysis);

    return analysis;
  }

  /**
   * Get inherent complexity based on module type and features
   * Enhanced with functional complexity analysis
   */
  getInherentComplexity(module) {
    return this.analyzeFunctionalComplexity(module);
  }

  /**
   * Analyze functional complexity (user interactions, business rules)
   */
  analyzeFunctionalComplexity(module) {
    let score = 1; // Base score
    const moduleName = (module.name || module.module || '').toLowerCase();
    
    // Base complexity by module type
    const baseComplexity = {
      'authentication': 2,
      'user_authentication': 2,
      'payment': 4,
      'payment_gateway': 4,
      'checkout': 3,
      'product_catalog': 3,
      'inventory': 3,
      'order_management': 3,
      'reporting': 2,
      'dashboard': 2,
      'admin': 2,
      'notifications': 2,
      'search': 2,
      'analytics': 3,
      'crm': 3,
      'hrms': 4,
      'payroll': 4,
      'reporting_export': 2
    };

    score = baseComplexity[moduleName] || 2.5;

    // Count user interactions
    const interactions = this.countUserInteractions(module);
    if (interactions > 5) score += 0.5;
    if (interactions > 10) score += 1;
    if (interactions > 20) score += 1.5;

    // Count business rules
    const rules = this.countBusinessRules(module);
    if (rules > 3) score += 0.5;
    if (rules > 7) score += 1;
    if (rules > 15) score += 1.5;

    // State management complexity
    const features = module.features || [];
    const featuresText = JSON.stringify(features).toLowerCase();
    if (featuresText.includes('real-time') || featuresText.includes('realtime')) score += 1;
    if (featuresText.includes('multi-tenant') || featuresText.includes('multitenant')) score += 1;
    if (featuresText.includes('workflow')) score += 0.8;
    if (featuresText.includes('approval') || featuresText.includes('approval-chain')) score += 0.7;

    // Adjust based on features count
    if (Array.isArray(features)) {
      const featureCount = features.length;
      if (featureCount > 10) score += 0.5;
      if (featureCount > 20) score += 0.5;
    }

    // Adjust based on requirements count
    if (module.requirements && Array.isArray(module.requirements)) {
      const reqCount = module.requirements.length;
      if (reqCount > 15) score += 0.3;
      if (reqCount > 30) score += 0.3;
    }

    return Math.min(5, Math.max(1, score));
  }

  /**
   * Count user interactions in module
   */
  countUserInteractions(module) {
    const requirements = module.requirements || [];
    const reqText = JSON.stringify(requirements).toLowerCase();
    
    const interactionKeywords = ['click', 'button', 'form', 'submit', 'input', 'select', 'upload', 'download', 'view', 'edit', 'delete', 'create'];
    return interactionKeywords.filter(keyword => reqText.includes(keyword)).length;
  }

  /**
   * Count business rules in module
   */
  countBusinessRules(module) {
    const requirements = module.requirements || [];
    const reqText = JSON.stringify(requirements).toLowerCase();
    
    const ruleKeywords = ['rule', 'policy', 'validation', 'condition', 'if', 'when', 'must', 'should', 'require', 'constraint'];
    return ruleKeywords.filter(keyword => reqText.includes(keyword)).length;
  }

  /**
   * Get integration complexity based on actual dependencies
   * Enhanced with integration patterns and Indian market integrations
   */
  getIntegrationComplexity(module) {
    return this.analyzeIntegrationComplexity(module);
  }

  /**
   * Analyze integration complexity with patterns
   */
  analyzeIntegrationComplexity(module) {
    let score = 1; // Base score

    const dependencies = module.dependencies || [];
    const externalIntegrations = module.externalIntegrations || [];
    const externalAPIs = module.external_apis || [];
    const interfaces = module.interfaces || [];
    const requirements = module.requirements || [];
    const reqText = JSON.stringify(requirements).toLowerCase();

    // Internal integration complexity
    const internalIntegrations = dependencies.length;
    if (internalIntegrations > 2) score += 0.5;
    if (internalIntegrations > 5) score += 1;
    if (internalIntegrations > 10) score += 1.5;

    // External API complexity (combine both arrays)
    const allExternal = [...externalIntegrations, ...externalAPIs];
    if (allExternal.length > 0) score += 0.5;
    if (allExternal.length > 2) score += 1;
    if (allExternal.length > 5) score += 1.5;

    // Interface complexity
    if (interfaces.length > 3) score += 0.5;
    if (interfaces.length > 6) score += 0.5;

    // Special integration patterns
    const integrationPatterns = module.integration_patterns || [];
    const patternsText = JSON.stringify(integrationPatterns).toLowerCase() + reqText;
    if (patternsText.includes('event-driven') || patternsText.includes('event driven')) score += 0.8;
    if (patternsText.includes('saga')) score += 1;
    if (patternsText.includes('cqrs')) score += 0.9;

    // Indian market specific integrations
    const integrationsText = JSON.stringify(allExternal).toLowerCase() + reqText;
    if (integrationsText.includes('aadhaar') || integrationsText.includes('aadhar')) score += 0.8;
    if (integrationsText.includes('upi')) score += 0.6;
    if (integrationsText.includes('gst')) score += 0.7;
    if (integrationsText.includes('razorpay')) score += 0.3;
    if (integrationsText.includes('paytm')) score += 0.3;
    if (integrationsText.includes('phonepe')) score += 0.3;

    // Check for circular dependencies (high complexity)
    if (this.hasCircularDependencies(module, dependencies)) {
      score += 1;
    }

    // Data flow complexity
    const dataFlowComplexity = this.analyzeDataFlow(module);
    if (dataFlowComplexity > 3) score += 0.5;
    if (dataFlowComplexity > 5) score += 0.5;

    return Math.min(5, Math.max(1, score));
  }

  /**
   * Get domain-specific complexity
   */
  getDomainComplexity(module, projectContext) {
    const domain = projectContext.domain || projectContext.industry || 'generic';
    const factors = this.domainFactors[domain] || this.domainFactors.generic;

    let score = 2; // Base domain complexity

    // Apply domain factors based on module type
    const moduleName = (module.name || module.module || '').toLowerCase();

    if (moduleName.includes('payment') || moduleName.includes('billing')) {
      score *= factors.payment || 1.0;
    }

    if (moduleName.includes('reporting') || moduleName.includes('analytics')) {
      score *= factors.reporting || 1.0;
    }

    if (moduleName.includes('compliance') || moduleName.includes('audit')) {
      score *= factors.compliance || 1.0;
    }

    if (moduleName.includes('security') || moduleName.includes('auth')) {
      score *= factors.security || 1.0;
    }

    // Scale adjustment
    const scale = projectContext.scale || 'sme';
    if (scale === 'enterprise') score *= 1.2;
    if (scale === 'startup') score *= 0.9;

    return Math.min(5, Math.max(1, score));
  }

  /**
   * Get technical complexity based on technical requirements
   * Enhanced with performance and security factors
   */
  getTechnicalComplexity(module) {
    return this.analyzeTechnicalComplexity(module, {});
  }

  /**
   * Analyze technical complexity with context
   */
  analyzeTechnicalComplexity(module, projectContext) {
    let score = 1;

    const requirements = module.requirements || [];
    const reqText = JSON.stringify(requirements).toLowerCase();
    const moduleName = (module.name || module.module || '').toLowerCase();

    // Technology factors
    const techFactors = {
      'microservices': 1.3,
      'distributed': 1.4,
      'real-time': 1.2,
      'realtime': 1.2,
      'blockchain': 1.8,
      'ai-ml': 1.6,
      'ai': 1.6,
      'ml': 1.6,
      'iot': 1.5,
      'legacy-integration': 1.7,
      'legacy': 1.7
    };

    // Check which technical challenges exist
    Object.keys(techFactors).forEach(tech => {
      if (reqText.includes(tech) || moduleName.includes(tech) ||
          (projectContext.techStack && JSON.stringify(projectContext.techStack).toLowerCase().includes(tech))) {
        score *= techFactors[tech];
      }
    });

    // Performance requirements
    if (projectContext.performance) {
      if (projectContext.performance.concurrent_users > 1000) score += 0.8;
      if (projectContext.performance.response_time && projectContext.performance.response_time < 100) score += 0.6;
      if (projectContext.performance.availability && projectContext.performance.availability > 99.9) score += 1;
    }

    // Security requirements
    const securityText = reqText + JSON.stringify(projectContext.security || {}).toLowerCase();
    if (securityText.includes('pci')) score += 1;
    if (securityText.includes('hipaa')) score += 1.2;
    if (securityText.includes('gdpr')) score += 0.8;
    if (projectContext.domain === 'fintech') score += 1;

    // Standard technical indicators
    if (reqText.includes('real-time') || reqText.includes('realtime')) {
      score += this.technicalComplexityIndicators.realTime - 1;
    }

    if (reqText.includes('async') || reqText.includes('asynchronous')) {
      score += this.technicalComplexityIndicators.async - 1;
    }

    if (reqText.includes('distributed') || reqText.includes('microservice')) {
      score += this.technicalComplexityIndicators.distributed - 1;
    }

    if (reqText.includes('websocket') || reqText.includes('socket')) {
      score += this.technicalComplexityIndicators.websocket - 1;
    }

    if (reqText.includes('graphql')) {
      score += this.technicalComplexityIndicators.graphql - 1;
    }

    // Database complexity
    if (reqText.includes('transaction') || reqText.includes('acid')) {
      score += 0.3;
    }

    if (reqText.includes('cache') || reqText.includes('redis')) {
      score += this.technicalComplexityIndicators.caching - 1;
    }

    return Math.min(5, Math.max(1, score));
  }

  /**
   * Get uncertainty factor based on requirements clarity
   */
  getUncertaintyFactor(module, projectContext) {
    let score = 1; // Base uncertainty

    const requirements = module.requirements || [];
    const reqText = JSON.stringify(requirements).toLowerCase();

    // Check for vague requirements
    const vagueIndicators = ['maybe', 'possibly', 'might', 'could', 'tbd', 'to be determined'];
    const vagueCount = vagueIndicators.filter(indicator => reqText.includes(indicator)).length;
    score += vagueCount * 0.3;

    // Check for missing information
    if (!module.dependencies || module.dependencies.length === 0) {
      // Might be missing dependency information
      // Extract module name from various possible properties
      const moduleName = module.name || module.moduleName || module.module || 
                         (typeof module === 'string' ? module : '');
      const nameStr = String(moduleName).toLowerCase();
      
      if (nameStr.includes('integration') || nameStr.includes('api')) {
        score += 0.5;
      }
    }

    // Client profile uncertainty
    if (projectContext.clientProfile) {
      if (projectContext.clientProfile.budgetClarity === 'vague') score += 0.3;
      if (projectContext.clientProfile.requirementsClarity === 'unclear') score += 0.5;
    }

    return Math.min(3, Math.max(1, score));
  }

  /**
   * Get data complexity
   * Enhanced with data volume and operations analysis
   */
  getDataComplexity(module) {
    return this.analyzeDataComplexity(module);
  }

  /**
   * Analyze data complexity with volume and operations
   */
  analyzeDataComplexity(module) {
    let score = 1;

    const requirements = module.requirements || [];
    const reqText = JSON.stringify(requirements).toLowerCase();
    const moduleData = module.data || {};

    // Data volume
    const estimatedRecords = moduleData.estimated_records || 0;
    if (estimatedRecords > 10000) score += 0.5;
    if (estimatedRecords > 100000) score += 1;
    if (estimatedRecords > 1000000) score += 1.5;

    // Data relationships
    const relationships = moduleData.relationships || 0;
    if (relationships > 5) score += 0.5;
    if (relationships > 10) score += 1;

    // Data volume indicators from requirements
    if (reqText.includes('large') || reqText.includes('bulk') || reqText.includes('batch')) {
      score += 0.5;
    }

    // Data relationships from requirements
    if (reqText.includes('relationship') || reqText.includes('foreign key') || reqText.includes('join')) {
      score += 0.5;
    }

    // Data operations
    const dataOpsText = reqText + JSON.stringify(moduleData).toLowerCase();
    if (dataOpsText.includes('etl')) score += 0.8;
    if (dataOpsText.includes('real-time-sync') || dataOpsText.includes('realtime sync')) score += 1;
    if (dataOpsText.includes('data-warehouse') || dataOpsText.includes('warehouse')) score += 1.2;
    if (dataOpsText.includes('multi-source') || dataOpsText.includes('multiple source')) score += 0.9;

    // Data migration
    if (reqText.includes('migration') || reqText.includes('import') || reqText.includes('export')) {
      score += 0.3;
    }

    return Math.min(5, Math.max(1, score));
  }

  /**
   * Get business logic complexity
   * Enhanced with domain and compliance factors
   */
  getBusinessLogicComplexity(module) {
    return this.analyzeBusinessComplexity(module, {});
  }

  /**
   * Analyze business complexity with context
   */
  analyzeBusinessComplexity(module, projectContext) {
    let score = 1;

    const requirements = module.requirements || [];
    const reqText = JSON.stringify(requirements).toLowerCase();

    // Domain-specific complexity
    const domainComplexity = {
      'fintech': 1.5,
      'healthcare': 1.6,
      'logistics': 1.3,
      'ecommerce': 1.1,
      'education': 0.9,
      'social': 0.8,
      'hrms': 1.4,
      'generic': 1.0
    };

    const domain = projectContext.domain || projectContext.industry || 'generic';
    score *= domainComplexity[domain] || 1.0;

    // Compliance requirements
    const complianceText = reqText + JSON.stringify(module.compliance || {}).toLowerCase();
    if (complianceText.includes('regulatory') || complianceText.includes('regulation')) score += 1;
    if (complianceText.includes('audit') || complianceText.includes('audit-trail')) score += 0.6;
    if (complianceText.includes('retention') || complianceText.includes('data-retention')) score += 0.4;

    // Business criticality
    if (module.criticality === 'high') score += 0.8;
    if (module.revenue_impact === 'direct' || module.revenueImpact === 'direct') score += 0.7;

    // Business rules complexity
    if (reqText.includes('rule') || reqText.includes('policy') || reqText.includes('workflow')) {
      score += 0.5;
    }

    // Approval workflows
    if (reqText.includes('approval') || reqText.includes('workflow') || reqText.includes('process')) {
      score += 0.5;
    }

    // Calculations
    if (reqText.includes('calculate') || reqText.includes('formula') || reqText.includes('computation')) {
      score += 0.3;
    }

    return Math.min(5, Math.max(1, score));
  }

  /**
   * Calculate overall complexity score (weighted average)
   */
  calculateOverallComplexity(analysis) {
    const weights = {
      inherent: 0.25,
      integration: 0.20,
      domain: 0.15,
      technical: 0.15,
      data: 0.10,
      business: 0.10,
      uncertainty: 0.05
    };

    const weightedSum = 
      analysis.inherent * weights.inherent +
      analysis.integration * weights.integration +
      analysis.domain * weights.domain +
      analysis.technical * weights.technical +
      analysis.data * weights.data +
      analysis.business * weights.business +
      analysis.uncertainty * weights.uncertainty;

    return Math.round(weightedSum * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Analyze data flow complexity
   */
  analyzeDataFlow(module) {
    const dependencies = module.dependencies || [];
    const externalIntegrations = module.externalIntegrations || [];
    
    // Simple heuristic: more dependencies = more complex data flow
    return dependencies.length + externalIntegrations.length * 2;
  }

  /**
   * Check for circular dependencies
   */
  hasCircularDependencies(module, dependencies) {
    // Simple check - in production, use proper graph traversal
    const moduleName = module.name || module.module;
    return dependencies.some(dep => {
      if (typeof dep === 'string') {
        return dep === moduleName;
      }
      return dep.name === moduleName || dep.module === moduleName;
    });
  }

  /**
   * Generate complexity breakdown explanation
   */
  generateBreakdown(analysis) {
    return {
      summary: `Overall complexity: ${analysis.overall.toFixed(2)}/5`,
      factors: {
        inherent: `${analysis.inherent.toFixed(1)}/5 - Module type and feature count`,
        integration: `${analysis.integration.toFixed(1)}/5 - Dependencies and external integrations`,
        domain: `${analysis.domain.toFixed(1)}/5 - Domain-specific requirements`,
        technical: `${analysis.technical.toFixed(1)}/5 - Technical architecture complexity`,
        data: `${analysis.data.toFixed(1)}/5 - Data volume and relationships`,
        business: `${analysis.business.toFixed(1)}/5 - Business logic complexity`,
        uncertainty: `${analysis.uncertainty.toFixed(1)}/3 - Requirements clarity`
      },
      primaryDriver: this.getPrimaryComplexityDriver(analysis)
    };
  }

  /**
   * Get primary complexity driver
   */
  getPrimaryComplexityDriver(analysis) {
    const drivers = [
      { name: 'integration', value: analysis.integration },
      { name: 'domain', value: analysis.domain },
      { name: 'technical', value: analysis.technical },
      { name: 'business', value: analysis.business }
    ];

    drivers.sort((a, b) => b.value - a.value);
    return drivers[0].name;
  }

  /**
   * Calculate confidence in complexity assessment
   */
  calculateConfidence(module, analysis) {
    let confidence = 0.8; // Base confidence

    // Reduce confidence if uncertainty is high
    if (analysis.uncertainty > 2) {
      confidence -= 0.2;
    }

    // Reduce confidence if module info is incomplete
    if (!module.dependencies || module.dependencies.length === 0) {
      confidence -= 0.1;
    }

    if (!module.requirements || module.requirements.length === 0) {
      confidence -= 0.1;
    }

    return Math.max(0.5, Math.min(1.0, confidence));
  }
}

module.exports = ComplexityAnalyzer;

