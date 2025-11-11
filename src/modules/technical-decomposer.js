// src/modules/technical-decomposer.js
// Technical Decomposition with Resource-Based Costing

class TechnicalDecomposer {
  constructor() {
    // Resource types and their deliverables with costs
    this.resourceTypes = {
      backend_developer: {
        title: 'Backend Developer',
        deliverables: {
          api_endpoint: {
            name: 'API Endpoint',
            basePrice: 2000,
            unit: 'endpoint',
            complexity: { simple: 1500, standard: 2000, complex: 3500 }
          },
          business_logic: {
            name: 'Business Logic Function',
            basePrice: 1500,
            unit: 'function',
            complexity: { simple: 1000, standard: 1500, complex: 2500 }
          },
          database_table: {
            name: 'Database Table',
            basePrice: 1000,
            unit: 'table',
            complexity: { simple: 800, standard: 1000, complex: 1500 }
          },
          integration: {
            name: 'Third-party Integration',
            basePrice: 5000,
            unit: 'integration',
            complexity: { simple: 3000, standard: 5000, complex: 8000 }
          },
          background_job: {
            name: 'Background Job',
            basePrice: 2000,
            unit: 'job',
            complexity: { simple: 1500, standard: 2000, complex: 3000 }
          },
          data_migration: {
            name: 'Data Migration Script',
            basePrice: 1500,
            unit: 'script',
            complexity: { simple: 1000, standard: 1500, complex: 2500 }
          }
        }
      },

      frontend_developer: {
        title: 'Frontend Developer',
        deliverables: {
          simple_page: { 
            name: 'Simple Page', 
            basePrice: 3000, 
            unit: 'page',
            complexity: { simple: 2500, standard: 3000, complex: 4000 }
          },
          complex_dashboard: { 
            name: 'Complex Dashboard', 
            basePrice: 8000, 
            unit: 'dashboard',
            complexity: { simple: 6000, standard: 8000, complex: 12000 }
          },
          form: { 
            name: 'Interactive Form', 
            basePrice: 2500, 
            unit: 'form',
            complexity: { simple: 1500, standard: 2500, complex: 4000 }
          },
          data_table: { 
            name: 'Data Table/Grid', 
            basePrice: 3500, 
            unit: 'table',
            complexity: { simple: 2500, standard: 3500, complex: 5000 }
          },
          chart_visualization: { 
            name: 'Chart/Visualization', 
            basePrice: 3000, 
            unit: 'chart',
            complexity: { simple: 2000, standard: 3000, complex: 4500 }
          },
          responsive_component: { 
            name: 'Responsive Component', 
            basePrice: 2000, 
            unit: 'component',
            complexity: { simple: 1500, standard: 2000, complex: 3000 }
          }
        }
      },
      
      mobile_developer: {
        title: 'Mobile Developer',
        deliverables: {
          mobile_screen: { 
            name: 'Mobile Screen', 
            basePrice: 4000, 
            unit: 'screen',
            complexity: { simple: 3000, standard: 4000, complex: 6000 }
          },
          native_feature: { 
            name: 'Native Feature', 
            basePrice: 5000, 
            unit: 'feature',
            complexity: { simple: 3500, standard: 5000, complex: 8000 }
          },
          push_notification: { 
            name: 'Push Notification', 
            basePrice: 3000, 
            unit: 'notification',
            complexity: { simple: 2000, standard: 3000, complex: 4000 }
          }
        }
      },
      
      ui_designer: {
        title: 'UI/UX Designer',
        deliverables: {
          wireframe: { 
            name: 'Wireframe', 
            basePrice: 1500, 
            unit: 'screen',
            complexity: { simple: 1000, standard: 1500, complex: 2000 }
          },
          mockup: { 
            name: 'High-fidelity Mockup', 
            basePrice: 3000, 
            unit: 'screen',
            complexity: { simple: 2000, standard: 3000, complex: 4500 }
          },
          design_system: { 
            name: 'Design System', 
            basePrice: 50000, 
            unit: 'system',
            complexity: { simple: 30000, standard: 50000, complex: 80000 }
          },
          logo_design: { 
            name: 'Logo Design', 
            basePrice: 25000, 
            unit: 'logo',
            complexity: { simple: 15000, standard: 25000, complex: 40000 }
          },
          prototype: { 
            name: 'Interactive Prototype', 
            basePrice: 5000, 
            unit: 'prototype',
            complexity: { simple: 3000, standard: 5000, complex: 8000 }
          }
        }
      },
      
      qa_engineer: {
        title: 'QA Engineer',
        deliverables: {
          test_case: { 
            name: 'Test Case', 
            basePrice: 350, 
            unit: 'case',
            complexity: { simple: 250, standard: 350, complex: 500 }
          },
          automation_script: { 
            name: 'Automation Script', 
            basePrice: 1500, 
            unit: 'script',
            complexity: { simple: 1000, standard: 1500, complex: 2500 }
          },
          performance_test: { 
            name: 'Performance Test', 
            basePrice: 3000, 
            unit: 'test',
            complexity: { simple: 2000, standard: 3000, complex: 5000 }
          },
          security_audit: { 
            name: 'Security Audit', 
            basePrice: 8000, 
            unit: 'audit',
            complexity: { simple: 5000, standard: 8000, complex: 15000 }
          },
          test_report: { 
            name: 'Test Report', 
            basePrice: 1000, 
            unit: 'report',
            complexity: { simple: 500, standard: 1000, complex: 2000 }
          }
        }
      },
      
      devops_engineer: {
        title: 'DevOps Engineer',
        deliverables: {
          server_setup: { 
            name: 'Server Setup', 
            basePrice: 5000, 
            unit: 'server',
            complexity: { simple: 3000, standard: 5000, complex: 8000 }
          },
          ci_cd_pipeline: { 
            name: 'CI/CD Pipeline', 
            basePrice: 8000, 
            unit: 'pipeline',
            complexity: { simple: 5000, standard: 8000, complex: 12000 }
          },
          containerization: { 
            name: 'Docker/Container Setup', 
            basePrice: 4000, 
            unit: 'container',
            complexity: { simple: 3000, standard: 4000, complex: 6000 }
          },
          monitoring: { 
            name: 'Monitoring Setup', 
            basePrice: 3000, 
            unit: 'system',
            complexity: { simple: 2000, standard: 3000, complex: 5000 }
          },
          backup_system: { 
            name: 'Backup System', 
            basePrice: 3000, 
            unit: 'system',
            complexity: { simple: 2000, standard: 3000, complex: 4000 }
          }
        }
      },
      
      project_manager: {
        title: 'Project Manager',
        deliverables: {
          project_plan: { 
            name: 'Project Plan', 
            basePrice: 5000, 
            unit: 'plan',
            complexity: { simple: 3000, standard: 5000, complex: 8000 }
          },
          documentation: { 
            name: 'Documentation', 
            basePrice: 2000, 
            unit: 'document',
            complexity: { simple: 1500, standard: 2000, complex: 3000 }
          },
          client_coordination: { 
            name: 'Client Coordination', 
            basePrice: 1000, 
            unit: 'hour',
            complexity: { simple: 800, standard: 1000, complex: 1500 }
          },
          status_report: { 
            name: 'Status Report', 
            basePrice: 500, 
            unit: 'report',
            complexity: { simple: 300, standard: 500, complex: 800 }
          }
        }
      }
    };

    // Decomposition patterns for common modules
    this.decompositionPatterns = {
      'user_authentication': {
        backend: [
          { type: 'api_endpoint', count: 5, items: ['register', 'login', 'logout', 'verify', 'refresh'] },
          { type: 'business_logic', count: 3, items: ['validateUser', 'hashPassword', 'generateToken'] },
          { type: 'database_table', count: 2, items: ['users', 'sessions'] }
        ],
        frontend: [
          { type: 'form', count: 3, items: ['login', 'register', 'forgot_password'] },
          { type: 'simple_page', count: 2, items: ['login_page', 'register_page'] }
        ],
        qa: [
          { type: 'test_case', count: 15 },
          { type: 'automation_script', count: 3 }
        ]
      },
      
      'payment_gateway': {
        backend: [
          { type: 'api_endpoint', count: 6, items: ['initiate', 'verify', 'refund', 'status', 'webhook', 'history'] },
          { type: 'business_logic', count: 5, items: ['calculateAmount', 'validatePayment', 'processRefund', 'reconcile', 'handleWebhook'] },
          { type: 'database_table', count: 3, items: ['transactions', 'payment_methods', 'refunds'] },
          { type: 'integration', count: 1, items: ['payment_gateway'], complexity: 'complex' }
        ],
        frontend: [
          { type: 'form', count: 1, items: ['payment_form'], complexity: 'complex' },
          { type: 'simple_page', count: 3, items: ['payment', 'success', 'failure'] }
        ],
        qa: [
          { type: 'test_case', count: 25 },
          { type: 'automation_script', count: 5 },
          { type: 'security_audit', count: 1 }
        ]
      },
      
      'product_catalog': {
        backend: [
          { type: 'api_endpoint', count: 8, items: ['list', 'detail', 'create', 'update', 'delete', 'search', 'filter', 'categories'] },
          { type: 'business_logic', count: 4, items: ['searchProducts', 'filterProducts', 'calculatePrice', 'manageInventory'] },
          { type: 'database_table', count: 4, items: ['products', 'categories', 'product_images', 'inventory'] }
        ],
        frontend: [
          { type: 'simple_page', count: 2, items: ['product_list', 'product_detail'] },
          { type: 'data_table', count: 1, items: ['product_grid'] },
          { type: 'form', count: 2, items: ['product_filter', 'product_search'] }
        ],
        ui: [
          { type: 'mockup', count: 4, items: ['product_list', 'product_detail', 'category', 'search'] }
        ],
        qa: [
          { type: 'test_case', count: 20 },
          { type: 'automation_script', count: 4 },
          { type: 'performance_test', count: 1 }
        ]
      },
      
      'admin_dashboard': {
        backend: [
          { type: 'api_endpoint', count: 10, items: ['stats', 'users', 'orders', 'products', 'reports'] },
          { type: 'business_logic', count: 6, items: ['generateReports', 'calculateMetrics', 'exportData'] },
          { type: 'database_table', count: 2, items: ['admin_logs', 'reports'] }
        ],
        frontend: [
          { type: 'complex_dashboard', count: 1, items: ['main_dashboard'], complexity: 'complex' },
          { type: 'data_table', count: 4, items: ['users', 'orders', 'products', 'transactions'] },
          { type: 'chart_visualization', count: 3, items: ['sales_chart', 'user_chart', 'product_chart'] }
        ],
        qa: [
          { type: 'test_case', count: 30 },
          { type: 'automation_script', count: 5 }
        ]
      }
    };

    // Complexity assessment rules
    this.complexityRules = {
      simple: ['basic', 'standard', 'common', 'typical'],
      complex: ['advanced', 'custom', 'complex', 'sophisticated', 'realtime', 'ml', 'ai'],
      factors: {
        integrations: { none: 0, few: 0.2, many: 0.4 },
        data_volume: { low: 0, medium: 0.1, high: 0.3 },
        security: { basic: 0, standard: 0.1, high: 0.2 },
        performance: { normal: 0, optimized: 0.2, critical: 0.3 }
      }
    };
  }

  // Main decomposition method
  async decompose(enrichedRequirements, context = {}) {
    console.log('🔧 Starting Technical Decomposition...');

    const decomposition = {
      modules: [],
      resources: {},
      deliverables: [],
      totalCost: 0,
      costByResource: {},
      timeline: {},
      stats: {
        totalDeliverables: 0,
        totalComponents: 0,
        resourceTypes: 0
      }
    };

    // Process each requirement/module
    const modules = this.extractModules(enrichedRequirements);

    for (const module of modules) {
      const moduleDecomposition = this.decomposeModule(module, context);
      decomposition.modules.push(moduleDecomposition);
      
      // Aggregate deliverables by resource
      this.aggregateDeliverables(decomposition, moduleDecomposition);
    }

    // Calculate costs
    decomposition.totalCost = this.calculateTotalCost(decomposition);
    decomposition.costByResource = this.calculateCostByResource(decomposition);

    // Calculate timeline
    decomposition.timeline = this.calculateTimeline(decomposition, context);

    // Generate statistics
    decomposition.stats = this.generateStats(decomposition);

    // Add recommendations
    decomposition.recommendations = this.generateRecommendations(decomposition, context);

    console.log(`✅ Decomposition Complete: ${decomposition.stats.totalDeliverables} deliverables identified`);

    return decomposition;
  }

  // Extract modules from enriched requirements
  extractModules(enrichedRequirements) {
    const modules = [];

    // Handle different input formats
    if (enrichedRequirements.enriched) {
      // From requirements enricher
      modules.push(...enrichedRequirements.enriched.explicit || []);
      modules.push(...enrichedRequirements.enriched.implicit || []);
      modules.push(...enrichedRequirements.enriched.domainSpecific || []);
    } else if (Array.isArray(enrichedRequirements)) {
      modules.push(...enrichedRequirements);
    } else if (enrichedRequirements.modules) {
      modules.push(...enrichedRequirements.modules);
    }

    // Normalize module names
    return modules.map(m => {
      if (typeof m === 'string') {
        return { name: m, type: 'requirement' };
      }
      return m;
    });
  }

  // Decompose a single module
  decomposeModule(module, context) {
    const moduleName = module.name || module;
    const normalizedName = this.normalizeModuleName(moduleName);

    // Check if we have a pattern for this module
    const pattern = this.decompositionPatterns[normalizedName];

    let deliverables = [];

    if (pattern) {
      // Use pattern-based decomposition
      deliverables = this.applyPattern(pattern, context);
    } else {
      // Generate generic decomposition
      deliverables = this.generateGenericDecomposition(moduleName, context);
    }

    // Assess complexity
    const complexity = this.assessComplexity(moduleName, context);

    // Apply complexity to pricing
    deliverables = this.applyComplexityPricing(deliverables, complexity);

    return {
      module: moduleName,
      complexity,
      deliverables,
      totalCost: deliverables.reduce((sum, d) => sum + d.cost, 0)
    };
  }

  // Normalize module names for pattern matching
  normalizeModuleName(name) {
    const mappings = {
      'authentication': 'user_authentication',
      'auth': 'user_authentication',
      'login': 'user_authentication',
      'user management': 'user_authentication',
      'payment': 'payment_gateway',
      'checkout': 'payment_gateway',
      'billing': 'payment_gateway',
      'products': 'product_catalog',
      'catalog': 'product_catalog',
      'inventory': 'product_catalog',
      'admin': 'admin_dashboard',
      'dashboard': 'admin_dashboard',
      'analytics': 'admin_dashboard'
    };

    const lower = name.toLowerCase();
    for (const [key, value] of Object.entries(mappings)) {
      if (lower.includes(key)) {
        return value;
      }
    }

    return lower.replace(/\s+/g, '_');
  }

  // Apply a decomposition pattern
  applyPattern(pattern, context) {
    const deliverables = [];

    for (const [resource, items] of Object.entries(pattern)) {
      const resourceType = this.getResourceType(resource);
      if (!resourceType) continue;
      
      for (const item of items) {
        const deliverableType = resourceType.deliverables[item.type];
        if (!deliverableType) continue;
        
        const complexity = item.complexity || 'standard';
        const unitPrice = deliverableType.complexity[complexity] || deliverableType.basePrice;
        
        if (item.items) {
          // Specific items listed
          for (const specificItem of item.items) {
            deliverables.push({
              resource,
              type: item.type,
              name: `${deliverableType.name}: ${specificItem}`,
              quantity: 1,
              unitPrice,
              cost: unitPrice,
              complexity
            });
          }
        } else {
          // Generic count
          deliverables.push({
            resource,
            type: item.type,
            name: deliverableType.name,
            quantity: item.count,
            unitPrice,
            cost: unitPrice * item.count,
            complexity
          });
        }
      }
    }

    return deliverables;
  }

  // Generate generic decomposition for unknown modules
  generateGenericDecomposition(moduleName, context) {
    const deliverables = [];

    // Backend components (always needed)
    deliverables.push({
      resource: 'backend',
      type: 'api_endpoint',
      name: `API Endpoints for ${moduleName}`,
      quantity: 4,
      unitPrice: 2000,
      cost: 8000,
      complexity: 'standard'
    });

    deliverables.push({
      resource: 'backend',
      type: 'business_logic',
      name: `Business Logic for ${moduleName}`,
      quantity: 3,
      unitPrice: 1500,
      cost: 4500,
      complexity: 'standard'
    });

    deliverables.push({
      resource: 'backend',
      type: 'database_table',
      name: `Database Tables for ${moduleName}`,
      quantity: 2,
      unitPrice: 1000,
      cost: 2000,
      complexity: 'standard'
    });

    // Frontend components
    deliverables.push({
      resource: 'frontend',
      type: 'simple_page',
      name: `Pages for ${moduleName}`,
      quantity: 2,
      unitPrice: 3000,
      cost: 6000,
      complexity: 'standard'
    });

    // QA components
    deliverables.push({
      resource: 'qa',
      type: 'test_case',
      name: `Test Cases for ${moduleName}`,
      quantity: 10,
      unitPrice: 350,
      cost: 3500,
      complexity: 'standard'
    });

    return deliverables;
  }

  // Get resource type definition
  getResourceType(resource) {
    const mapping = {
      'backend': this.resourceTypes.backend_developer,
      'frontend': this.resourceTypes.frontend_developer,
      'mobile': this.resourceTypes.mobile_developer,
      'ui': this.resourceTypes.ui_designer,
      'qa': this.resourceTypes.qa_engineer,
      'devops': this.resourceTypes.devops_engineer,
      'pm': this.resourceTypes.project_manager
    };

    return mapping[resource];
  }

  // Assess module complexity
  assessComplexity(moduleName, context) {
    let complexityScore = 0;

    const moduleText = moduleName.toLowerCase();

    // Check for complexity keywords
    for (const keyword of this.complexityRules.simple) {
      if (moduleText.includes(keyword)) complexityScore -= 1;
    }

    for (const keyword of this.complexityRules.complex) {
      if (moduleText.includes(keyword)) complexityScore += 2;
    }

    // Context-based complexity
    if (context.integrations && context.integrations.length > 3) complexityScore += 1;
    if (context.scale === 'enterprise') complexityScore += 1;
    if (context.security === 'high') complexityScore += 1;

    // Return complexity level
    if (complexityScore <= -1) return 'simple';
    if (complexityScore >= 2) return 'complex';
    return 'standard';
  }

  // Apply complexity-based pricing
  applyComplexityPricing(deliverables, complexity) {
    const multipliers = {
      simple: 0.8,
      standard: 1.0,
      complex: 1.5
    };

    const multiplier = multipliers[complexity] || 1.0;

    return deliverables.map(d => ({
      ...d,
      cost: Math.round(d.cost * multiplier)
    }));
  }

  // Aggregate deliverables by resource
  aggregateDeliverables(decomposition, moduleDecomposition) {
    for (const deliverable of moduleDecomposition.deliverables) {
      const resourceKey = deliverable.resource;

      if (!decomposition.resources[resourceKey]) {
        decomposition.resources[resourceKey] = {
          title: this.getResourceTitle(resourceKey),
          deliverables: [],
          totalCost: 0
        };
      }
      
      decomposition.resources[resourceKey].deliverables.push({
        module: moduleDecomposition.module,
        ...deliverable
      });
      
      decomposition.resources[resourceKey].totalCost += deliverable.cost;
      decomposition.deliverables.push(deliverable);
    }
  }

  // Get resource title
  getResourceTitle(resourceKey) {
    const titles = {
      'backend': 'Backend Developer',
      'frontend': 'Frontend Developer',
      'mobile': 'Mobile Developer',
      'ui': 'UI/UX Designer',
      'qa': 'QA Engineer',
      'devops': 'DevOps Engineer',
      'pm': 'Project Manager'
    };

    return titles[resourceKey] || resourceKey;
  }

  // Calculate total cost
  calculateTotalCost(decomposition) {
    return decomposition.deliverables.reduce((sum, d) => sum + d.cost, 0);
  }

  // Calculate cost by resource
  calculateCostByResource(decomposition) {
    const costByResource = {};

    for (const [resource, data] of Object.entries(decomposition.resources)) {
      costByResource[resource] = {
        title: data.title,
        cost: data.totalCost,
        percentage: ((data.totalCost / decomposition.totalCost) * 100).toFixed(1),
        deliverableCount: data.deliverables.length
      };
    }

    return costByResource;
  }

  // Calculate timeline based on resources
  calculateTimeline(decomposition, context) {
    const timeline = {
      sequential: 0,
      parallel: 0,
      recommended: 0
    };

    // Calculate work hours per resource
    const hoursPerResource = {};

    for (const [resource, data] of Object.entries(decomposition.resources)) {
      const hours = this.calculateHours(data.deliverables);
      hoursPerResource[resource] = hours;
      timeline.sequential += hours;
    }

    // Parallel timeline (longest resource path)
    timeline.parallel = Math.max(...Object.values(hoursPerResource), 0);

    // Recommended timeline (hybrid approach)
    // Backend first, then frontend parallel with QA
    const backendHours = hoursPerResource.backend || 0;
    const frontendHours = hoursPerResource.frontend || 0;
    const qaHours = hoursPerResource.qa || 0;

    timeline.recommended = backendHours + Math.max(frontendHours, qaHours * 0.5);

    // Convert to days (8 hours/day)
    timeline.sequentialDays = Math.ceil(timeline.sequential / 8);
    timeline.parallelDays = Math.ceil(timeline.parallel / 8);
    timeline.recommendedDays = Math.ceil(timeline.recommended / 8);

    // Add buffer based on complexity
    const bufferPercentage = context.complexity === 'high' || context.complexity === 'complex' ? 0.3 : 0.2;
    timeline.withBuffer = Math.ceil(timeline.recommendedDays * (1 + bufferPercentage));

    return timeline;
  }

  // Calculate hours for deliverables
  calculateHours(deliverables) {
    const hoursPerDeliverable = {
      api_endpoint: 4,
      business_logic: 3,
      database_table: 2,
      integration: 8,
      simple_page: 6,
      complex_dashboard: 16,
      form: 4,
      data_table: 6,
      test_case: 0.5,
      automation_script: 3,
      mobile_screen: 8,
      native_feature: 12,
      push_notification: 4,
      wireframe: 2,
      mockup: 4,
      design_system: 40,
      logo_design: 8,
      prototype: 6,
      performance_test: 8,
      security_audit: 16,
      test_report: 2,
      server_setup: 8,
      ci_cd_pipeline: 12,
      containerization: 6,
      monitoring: 4,
      backup_system: 4,
      project_plan: 8,
      documentation: 4,
      client_coordination: 1,
      status_report: 1
    };

    let totalHours = 0;

    for (const deliverable of deliverables) {
      const hours = hoursPerDeliverable[deliverable.type] || 4;
      totalHours += hours * (deliverable.quantity || 1);
    }

    return totalHours;
  }

  // Generate statistics
  generateStats(decomposition) {
    return {
      totalDeliverables: decomposition.deliverables.length,
      totalComponents: decomposition.deliverables.reduce((sum, d) => sum + (d.quantity || 1), 0),
      resourceTypes: Object.keys(decomposition.resources).length,
      moduleCount: decomposition.modules.length,
      averageCostPerModule: decomposition.modules.length > 0 
        ? Math.round(decomposition.totalCost / decomposition.modules.length) 
        : 0,
      costBreakdown: {
        development: this.calculateDevelopmentCost(decomposition),
        design: this.calculateDesignCost(decomposition),
        testing: this.calculateTestingCost(decomposition),
        infrastructure: this.calculateInfraCost(decomposition)
      }
    };
  }

  // Calculate development cost
  calculateDevelopmentCost(decomposition) {
    const devResources = ['backend', 'frontend', 'mobile'];
    let cost = 0;

    for (const resource of devResources) {
      if (decomposition.resources[resource]) {
        cost += decomposition.resources[resource].totalCost;
      }
    }

    return cost;
  }

  // Calculate design cost
  calculateDesignCost(decomposition) {
    return decomposition.resources.ui?.totalCost || 0;
  }

  // Calculate testing cost
  calculateTestingCost(decomposition) {
    return decomposition.resources.qa?.totalCost || 0;
  }

  // Calculate infrastructure cost
  calculateInfraCost(decomposition) {
    return decomposition.resources.devops?.totalCost || 0;
  }

  // Generate recommendations
  generateRecommendations(decomposition, context) {
    const recommendations = [];

    // Resource balance recommendations
    const devCost = this.calculateDevelopmentCost(decomposition);
    const testCost = this.calculateTestingCost(decomposition);
    const testRatio = devCost > 0 ? testCost / devCost : 0;

    if (testRatio < 0.15 && devCost > 0) {
      recommendations.push({
        type: 'testing',
        message: 'Testing budget is low (< 15% of development). Consider adding more test coverage.',
        impact: 'quality'
      });
    }

    // Team size recommendations
    const resourceCount = Object.keys(decomposition.resources).length;
    if (resourceCount > 5 && decomposition.timeline.recommendedDays < 60) {
      recommendations.push({
        type: 'team',
        message: 'Too many resource types for short timeline. Consider dedicated team.',
        impact: 'coordination'
      });
    }

    // Cost optimization opportunities
    if (decomposition.totalCost > 500000) {
      recommendations.push({
        type: 'cost',
        message: 'Consider phased delivery to spread cost and reduce risk.',
        impact: 'budget'
      });
    }

    // Parallel work opportunities
    if (decomposition.timeline.parallelDays < decomposition.timeline.sequentialDays * 0.6) {
      recommendations.push({
        type: 'timeline',
        message: 'Significant parallel work possible. Consider 2-3 developers for faster delivery.',
        impact: 'speed'
      });
    }

    return recommendations;
  }
}

module.exports = TechnicalDecomposer;

