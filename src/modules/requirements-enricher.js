/**
 * Requirements Enricher Module
 * 
 * Purpose: Add domain-specific implicit requirements and edge cases
 * Philosophy: Automatically add what's typically needed but not explicitly stated
 * Enhanced: Comprehensive pattern-based enrichment with AI capability
 */

class RequirementsEnricher {
  constructor(logger) {
    this.logger = logger;
    this.universalImplicits = this.loadUniversalImplicits();
    this.domainImplicits = this.loadDomainImplicits();
    this.edgeCasePatterns = this.loadEdgeCasePatterns();
    this.compliancePatterns = this.loadCompliancePatterns();
    
    // Track enrichment statistics
    this.stats = {
      patternsApplied: 0,
      aiCallsMade: 0,
      totalCost: 0,
      averageConfidence: 0
    };
  }

  /**
   * Main enrichment method (Enhanced version)
   * @param {Array|Object} extractedRequirements - Modules extracted by LLM or enriched requirements
   * @param {Object} context - Context object with domain, market, complexity, etc.
   * @returns {Object} Comprehensive enrichment result
   */
  async enrich(extractedRequirements, context = {}) {
    console.log('🔧 Starting Requirements Enrichment...');
    
    const enrichmentResult = {
      original: extractedRequirements,
      enriched: {
        explicit: [],
        implicit: [],
        domainSpecific: [],
        edgeCases: [],
        compliance: [],
        technical: []
      },
      stats: {
        originalCount: 0,
        enrichedCount: 0,
        patternsUsed: 0,
        aiEnhanced: false,
        confidence: 0,
        cost: 0
      },
      recommendations: [],
      warnings: []
    };

    // Step 1: Process explicit requirements
    enrichmentResult.enriched.explicit = this.processExplicitRequirements(extractedRequirements);
    enrichmentResult.stats.originalCount = enrichmentResult.enriched.explicit.length;

    // Step 2: Apply pattern-based enrichment (free and instant)
    const patternResult = this.applyPatternEnrichment(enrichmentResult.enriched.explicit, context);
    enrichmentResult.enriched.implicit = patternResult.implicit;
    enrichmentResult.enriched.domainSpecific = patternResult.domainSpecific;
    enrichmentResult.enriched.edgeCases = patternResult.edgeCases;
    enrichmentResult.enriched.compliance = patternResult.compliance;
    enrichmentResult.stats.patternsUsed = patternResult.patternsApplied;
    enrichmentResult.stats.confidence = patternResult.confidence;

    // Step 3: Decide if AI enhancement is needed
    const needsAI = this.shouldUseAI(
      enrichmentResult.stats.confidence,
      context.complexity,
      context.novelty,
      context.clientValue
    );

    if (needsAI && context.enableAI !== false) {
      // Step 4: AI Enhancement (costs money but adds value)
      const aiResult = await this.enhanceWithAI(enrichmentResult, context);
      if (aiResult.success) {
        this.mergeAIEnhancements(enrichmentResult, aiResult);
        enrichmentResult.stats.aiEnhanced = true;
        enrichmentResult.stats.cost = aiResult.cost;
        
        // Learn from AI discoveries
        await this.learnFromAI(aiResult, context);
      }
    }

    // Step 5: Generate technical requirements
    enrichmentResult.enriched.technical = this.generateTechnicalRequirements(enrichmentResult.enriched);

    // Step 6: Calculate final stats
    enrichmentResult.stats.enrichedCount = this.countAllRequirements(enrichmentResult.enriched);
    enrichmentResult.stats.enrichmentRatio = 
      (enrichmentResult.stats.enrichedCount / Math.max(enrichmentResult.stats.originalCount, 1)).toFixed(2);

    // Step 7: Generate recommendations and warnings
    enrichmentResult.recommendations = this.generateRecommendations(enrichmentResult, context);
    enrichmentResult.warnings = this.generateWarnings(enrichmentResult, context);

    console.log(`✅ Enrichment Complete: ${enrichmentResult.stats.originalCount} → ${enrichmentResult.stats.enrichedCount} requirements`);
    console.log(`   Pattern Coverage: ${enrichmentResult.stats.confidence}%`);
    console.log(`   AI Enhanced: ${enrichmentResult.stats.aiEnhanced}`);
    console.log(`   Cost: ₹${enrichmentResult.stats.cost}`);

    return enrichmentResult;
  }

  /**
   * Process explicit requirements from extraction (backward compatible)
   * @param {Array|Object} extracted - Extracted requirements in various formats
   * @returns {Array} Processed explicit requirements
   */
  processExplicitRequirements(extracted) {
    if (!extracted) return [];
    
    // Handle different extraction formats
    if (Array.isArray(extracted)) {
      return extracted.map(item => typeof item === 'string' ? item : item.name || item);
    } else if (extracted.modules) {
      return Array.isArray(extracted.modules) 
        ? extracted.modules.map(m => typeof m === 'string' ? m : m.name || m)
        : [extracted.modules];
    } else if (typeof extracted === 'string') {
      return [extracted];
    }
    
    return [];
  }

  /**
   * Detect domain from input and context
   */
  detectDomain(modules, domainContext, projectDetails) {
    // Ensure modules is an array
    if (!Array.isArray(modules)) {
      return 'generic';
    }
    
    // Check project details first
    if (projectDetails?.marketRegion === 'India' || projectDetails?.marketRegion === 'india') {
      // Check for e-commerce indicators
      const ecommerceKeywords = ['product', 'order', 'cart', 'checkout', 'payment', 'inventory'];
      const hasEcommerce = modules.some(m => {
        const mStr = typeof m === 'string' ? m : (m.name || m.module || String(m));
        return ecommerceKeywords.some(kw => 
          mStr.toLowerCase().includes(kw)
        );
      });
      if (hasEcommerce) {
        return 'ecommerce-india';
      }

      // Check for SaaS indicators
      const saasKeywords = ['subscription', 'billing', 'tenant', 'user', 'plan'];
      const hasSaas = modules.some(m => {
        const mStr = typeof m === 'string' ? m : (m.name || m.module || String(m));
        return saasKeywords.some(kw => 
          mStr.toLowerCase().includes(kw)
        );
      });
      if (hasSaas) {
        return 'saas-india';
      }
    }

    // Check domain context
    if (domainContext?.platformType) {
      const platform = String(domainContext.platformType).toLowerCase();
      if (platform.includes('ecommerce') || platform.includes('e-commerce')) {
        return 'ecommerce-india';
      }
      if (platform.includes('saas')) {
        return 'saas-india';
      }
    }

    // Check for internal tool indicators
    const internalKeywords = ['admin', 'dashboard', 'report', 'audit', 'log'];
    const hasInternal = modules.some(m => {
      const mStr = typeof m === 'string' ? m : (m.name || m.module || String(m));
      return internalKeywords.some(kw => 
        mStr.toLowerCase().includes(kw)
      );
    });
    if (hasInternal && !projectDetails.marketRegion) {
      return 'internal-tool';
    }

    // Default
    return 'generic';
  }

  /**
   * Add domain-specific implicit modules
   */
  addDomainImplicits(modules, domain, projectDetails) {
    const added = [];
    
    // Ensure modules is an array
    if (!Array.isArray(modules)) {
      this.logger?.warn('addDomainImplicits received non-array modules', { 
        type: typeof modules 
      });
      return added;
    }
    
    const moduleNames = modules.map(m => 
      typeof m === 'string' ? m.toLowerCase() : m.name?.toLowerCase() || ''
    );

    const implicits = this.domainImplicits[domain];
    if (!implicits) {
      return added;
    }

    // Add always-required modules
    if (implicits.always) {
      implicits.always.forEach(moduleName => {
        if (!moduleNames.includes(moduleName.toLowerCase())) {
          added.push({
            name: moduleName,
            source: 'domain-implicit',
            priority: 'high',
            reason: `Required for ${domain} platform`
          });
        }
      });
    }

    // Add conditional modules
    if (implicits.conditional) {
      Object.keys(implicits.conditional).forEach(condition => {
        if (this.checkCondition(condition, modules, projectDetails)) {
          implicits.conditional[condition].forEach(moduleName => {
            if (!moduleNames.includes(moduleName.toLowerCase())) {
              added.push({
                name: moduleName,
                source: 'domain-implicit',
                priority: 'medium',
                reason: `Required for ${condition} in ${domain}`
              });
            }
          });
        }
      });
    }

    return added;
  }

  /**
   * Check if condition is met
   */
  checkCondition(condition, modules, projectDetails) {
    // Ensure modules is an array
    if (!Array.isArray(modules)) {
      return false;
    }
    
    const moduleNames = modules.map(m => 
      typeof m === 'string' ? m.toLowerCase() : m.name?.toLowerCase() || ''
    ).join(' ');

    if (condition === 'if_b2b') {
      return moduleNames.includes('b2b') || 
             projectDetails.businessModel === 'B2B' ||
             moduleNames.includes('vendor') || 
             moduleNames.includes('supplier');
    }

    if (condition === 'if_b2c') {
      return moduleNames.includes('b2c') || 
             projectDetails.businessModel === 'B2C' ||
             moduleNames.includes('customer') || 
             moduleNames.includes('consumer');
    }

    if (condition === 'if_fashion') {
      return moduleNames.includes('fashion') || 
             moduleNames.includes('clothing') ||
             moduleNames.includes('apparel');
    }

    if (condition === 'if_food') {
      return moduleNames.includes('food') || 
             moduleNames.includes('restaurant') ||
             moduleNames.includes('delivery');
    }

    if (condition === 'if_enterprise') {
      return projectDetails.projectScale === 'enterprise' ||
             moduleNames.includes('enterprise') ||
             moduleNames.includes('sso') ||
             moduleNames.includes('saml');
    }

    if (condition === 'if_approval_flow') {
      return moduleNames.includes('approval') ||
             moduleNames.includes('workflow') ||
             moduleNames.includes('approve');
    }

    if (condition === 'if_reports') {
      return moduleNames.includes('report') ||
             moduleNames.includes('analytics') ||
             moduleNames.includes('dashboard');
    }

    return false;
  }

  /**
   * Add edge cases based on module patterns
   */
  addEdgeCases(modules) {
    const edgeCases = [];
    
    // Ensure modules is an array
    if (!Array.isArray(modules)) {
      this.logger?.warn('addEdgeCases received non-array modules', { 
        type: typeof modules 
      });
      return edgeCases;
    }
    
    const moduleNames = modules.map(m => 
      typeof m === 'string' ? m.toLowerCase() : m.name?.toLowerCase() || ''
    ).join(' ');

    // Payment edge cases
    if (moduleNames.includes('payment') || moduleNames.includes('checkout')) {
      edgeCases.push(...this.edgeCasePatterns.payment);
    }

    // Inventory edge cases
    if (moduleNames.includes('inventory') || moduleNames.includes('stock')) {
      edgeCases.push(...this.edgeCasePatterns.inventory);
    }

    // User auth edge cases
    if (moduleNames.includes('auth') || moduleNames.includes('login') || moduleNames.includes('user')) {
      edgeCases.push(...this.edgeCasePatterns.user_auth);
    }

    return edgeCases;
  }

  /**
   * Load universal implicit requirements (every system needs)
   */
  loadUniversalImplicits() {
    return {
      any_system: [
        'Error handling and logging',
        'Admin dashboard',
        'Data backup and recovery',
        'Basic security measures',
        'User activity logs'
      ],
      
      user_system: [
        'Forgot password',
        'Email verification',
        'Session management',
        'Account settings',
        'Profile management',
        'Password change',
        'Account deactivation'
      ],
      
      payment_system: [
        'Payment failure handling',
        'Refund management',
        'Payment history',
        'Invoice generation',
        'Payment reconciliation',
        'Transaction logs',
        'Payment method management'
      ],
      
      data_system: [
        'Data import/export',
        'Data validation',
        'Audit trail',
        'Soft deletes',
        'Data archival',
        'Backup strategy'
      ],
      
      communication_system: [
        'Email notifications',
        'SMS alerts (India)',
        'WhatsApp integration (India)',
        'Notification preferences',
        'Email templates'
      ]
    };
  }

  /**
   * Load domain implicits configuration (enhanced)
   */
  loadDomainImplicits() {
    return {
      'ecommerce-india': {
        always: [
          'GSTInvoicing',
          'ShippingZones',
          'CODOption',
          'OrderTracking',
          'ReturnRefund'
        ],
        conditional: {
          'if_b2b': [
            'CreditTerms',
            'BulkPricing',
            'QuoteSystem',
            'PurchaseOrder'
          ],
          'if_fashion': [
            'SizeCharts',
            'ReturnPolicy',
            'Wishlist',
            'ProductReviews'
          ],
          'if_food': [
            'DeliverySlots',
            'MinOrderValue',
            'DeliveryRadius',
            'OrderScheduling'
          ]
        }
      },
      'saas-india': {
        always: [
          'MultiTenant',
          'SubscriptionBilling',
          'GSTOnInvoices',
          'UserManagement',
          'RolePermissions'
        ],
        conditional: {
          'if_b2b': [
            'TeamManagement',
            'AuditLogs',
            'SSO',
            'API Access'
          ],
          'if_enterprise': [
            'SSO',
            'SAML',
            'API Access',
            'SLADashboard',
            'WhiteLabel'
          ]
        }
      },
      'internal-tool': {
        always: [
          'UserManagement',
          'ActivityLogs',
          'DataExport',
          'AccessControl'
        ],
        conditional: {
          'if_approval_flow': [
            'MakerChecker',
            'EscalationMatrix',
            'SLATracking'
          ],
          'if_reports': [
            'ScheduledReports',
            'EmailDelivery',
            'ExcelExport'
          ]
        }
      },
      'generic': {
        always: [],
        conditional: {}
      },
      
      // Additional domain patterns from step2.md
      'fintech-india': {
        always: [
          'KYC verification',
          'PAN card validation',
          'Aadhaar verification (if applicable)',
          'Transaction limits',
          'Suspicious activity detection',
          'RBI compliance',
          'Transaction reports',
          'Settlement reconciliation'
        ],
        conditional: {
          'if_lending': ['Credit scoring', 'EMI calculator', 'Loan agreement generation'],
          'if_investment': ['Risk profiling', 'Portfolio management', 'SEBI compliance'],
          'if_payments': ['UPI integration', 'Bharat QR', 'Standing instructions']
        }
      },
      
      'healthcare-india': {
        always: [
          'Patient privacy (HIPAA-like)',
          'Doctor verification',
          'Prescription management',
          'Appointment scheduling',
          'Medical records management',
          'Emergency contact system'
        ],
        conditional: {
          'if_pharmacy': ['Drug license verification', 'Prescription validation', 'Expiry management'],
          'if_telemedicine': ['Video consultation', 'Digital prescriptions', 'Payment integration'],
          'if_lab': ['Report generation', 'Sample tracking', 'Home collection']
        }
      },
      
      'logistics-india': {
        always: [
          'Real-time tracking',
          'Route optimization',
          'Proof of delivery',
          'E-way bill integration',
          'Vehicle management',
          'Driver management'
        ],
        conditional: {
          'if_lastmile': ['Delivery boy app', 'Cash collection', 'Customer OTP'],
          'if_b2b': ['Freight management', 'Load optimization', 'Multi-modal transport']
        }
      },
      
      'education-india': {
        always: [
          'Student management',
          'Course management',
          'Assignment submission',
          'Progress tracking',
          'Parent portal',
          'Fee management'
        ],
        conditional: {
          'if_online': ['Video lectures', 'Live classes', 'Screen sharing', 'Attendance tracking'],
          'if_certification': ['Certificate generation', 'Verification portal', 'Digital badges']
        }
      }
    };
  }

  /**
   * Load compliance patterns
   */
  loadCompliancePatterns() {
    return {
      india: {
        data_protection: [
          'User consent mechanisms',
          'Data deletion rights',
          'Data portability',
          'Privacy policy acceptance',
          'Cookie consent'
        ],
        financial: [
          'GST compliance',
          'TDS deduction (if applicable)',
          'Digital signature for invoices',
          'Financial audit trails'
        ],
        accessibility: [
          'Multi-language support (Hindi + English minimum)',
          'Mobile-responsive design',
          'Low bandwidth optimization'
        ]
      }
    };
  }

  /**
   * Load edge case patterns
   */
  loadEdgeCasePatterns() {
    return {
      'payment': [
        {
          description: 'Payment drops after deduction',
          impact: 'User charged but order not confirmed',
          mitigation: 'Implement idempotency and payment verification webhook'
        },
        {
          description: 'Double payment by user',
          impact: 'User charged twice for same order',
          mitigation: 'Add payment deduplication and idempotency checks'
        },
        {
          description: 'Refund after settlement',
          impact: 'Refund processed after payment settled with gateway',
          mitigation: 'Handle post-settlement refunds with gateway API'
        },
        {
          description: 'GST on cancelled orders',
          impact: 'GST calculation for cancelled/refunded orders',
          mitigation: 'Reverse GST entries on cancellation'
        },
        {
          description: 'Payment gateway down',
          impact: 'Service unavailable during checkout',
          mitigation: 'Implement fallback gateway or queue payment attempts'
        }
      ],
      'inventory': [
        {
          description: 'Stock allocated but order cancelled',
          impact: 'Inventory locked but order never completes',
          mitigation: 'Implement stock reservation timeout and auto-release'
        },
        {
          description: 'Concurrent orders for last item',
          impact: 'Multiple users order same last item',
          mitigation: 'Use database locks or optimistic locking for stock updates'
        },
        {
          description: 'Return item quality check',
          impact: 'Returned items may be damaged or used',
          mitigation: 'Implement quality check workflow before restocking'
        },
        {
          description: 'Stock across multiple warehouses',
          impact: 'Inventory split across locations',
          mitigation: 'Implement multi-warehouse inventory management'
        },
        {
          description: 'Damaged goods process',
          impact: 'Items damaged in transit or storage',
          mitigation: 'Add damaged goods tracking and write-off process'
        }
      ],
      'user_auth': [
        {
          description: 'Account locked scenarios',
          impact: 'User locked out after failed attempts',
          mitigation: 'Implement lockout policy and recovery mechanism'
        },
        {
          description: 'Session timeout handling',
          impact: 'User session expires during active use',
          mitigation: 'Implement session refresh and graceful timeout warnings'
        },
        {
          description: 'Multiple device login',
          impact: 'User logged in from multiple devices simultaneously',
          mitigation: 'Implement device management and concurrent session limits'
        },
        {
          description: 'Password reset abuse',
          impact: 'Spam password reset requests',
          mitigation: 'Rate limit password reset and add CAPTCHA'
        },
        {
          description: 'Social login email conflicts',
          impact: 'User has account with email but tries social login',
          mitigation: 'Implement account linking and email verification'
        }
      ]
    };
  }

  /**
   * Apply pattern-based enrichment (free and instant)
   * @param {Array} explicitRequirements - Processed explicit requirements
   * @param {Object} context - Context with domain, market, etc.
   * @returns {Object} Pattern enrichment result
   */
  applyPatternEnrichment(explicitRequirements, context) {
    const result = {
      implicit: [],
      domainSpecific: [],
      edgeCases: [],
      compliance: [],
      patternsApplied: 0,
      confidence: 0
    };

    // Ensure explicitRequirements is an array
    if (!Array.isArray(explicitRequirements)) {
      this.logger?.warn('applyPatternEnrichment received non-array requirements', { 
        type: typeof explicitRequirements 
      });
      return result;
    }

    // Detect domain
    const domain = this.detectDomain(explicitRequirements, context.domainContext || {}, context.projectDetails || {});
    
    // Add universal implicits
    explicitRequirements.forEach(req => {
      const reqLower = (typeof req === 'string' ? req : req.name || '').toLowerCase();
      
      // User system implicits
      if (reqLower.includes('user') || reqLower.includes('auth') || reqLower.includes('login')) {
        result.implicit.push(...this.universalImplicits.user_system.map(item => ({
          name: item,
          source: 'universal-implicit',
          priority: 'high'
        })));
        result.patternsApplied++;
      }
      
      // Payment system implicits
      if (reqLower.includes('payment') || reqLower.includes('checkout') || reqLower.includes('order')) {
        result.implicit.push(...this.universalImplicits.payment_system.map(item => ({
          name: item,
          source: 'universal-implicit',
          priority: 'high'
        })));
        result.patternsApplied++;
      }
      
      // Data system implicits
      if (reqLower.includes('data') || reqLower.includes('database') || reqLower.includes('storage')) {
        result.implicit.push(...this.universalImplicits.data_system.map(item => ({
          name: item,
          source: 'universal-implicit',
          priority: 'medium'
        })));
        result.patternsApplied++;
      }
      
      // Communication system implicits
      if (reqLower.includes('email') || reqLower.includes('notification') || reqLower.includes('sms')) {
        result.implicit.push(...this.universalImplicits.communication_system.map(item => ({
          name: item,
          source: 'universal-implicit',
          priority: 'medium'
        })));
        result.patternsApplied++;
      }
    });

    // Add any system implicits (always)
    result.implicit.push(...this.universalImplicits.any_system.map(item => ({
      name: item,
      source: 'universal-implicit',
      priority: 'high'
    })));
    result.patternsApplied++;

    // Add domain-specific implicits
    const domainImplicits = this.addDomainImplicits(explicitRequirements, domain, context.projectDetails || {});
    result.domainSpecific = domainImplicits;
    result.patternsApplied += domainImplicits.length;

    // Add edge cases
    result.edgeCases = this.addEdgeCases(explicitRequirements);
    result.patternsApplied += result.edgeCases.length;

    // Add compliance requirements
    if (context.market === 'india' || context.projectDetails?.marketRegion === 'india') {
      const compliance = this.compliancePatterns.india;
      result.compliance = [
        ...compliance.data_protection.map(item => ({ name: item, source: 'compliance', priority: 'high' })),
        ...compliance.financial.map(item => ({ name: item, source: 'compliance', priority: 'high' })),
        ...compliance.accessibility.map(item => ({ name: item, source: 'compliance', priority: 'medium' }))
      ];
      result.patternsApplied += result.compliance.length;
    }

    // Calculate confidence based on pattern coverage
    const totalPossiblePatterns = 20; // Approximate baseline
    result.confidence = Math.min(95, Math.round((result.patternsApplied / totalPossiblePatterns) * 100));

    return result;
  }

  /**
   * Decide if AI enhancement is needed
   */
  shouldUseAI(confidence, complexity, novelty, clientValue) {
    // Use AI if:
    // - Confidence is low (< 60%)
    // - Complexity is high
    // - Novelty is high (new domain/patterns)
    // - Client value is high (worth the cost)
    
    if (confidence >= 80 && complexity !== 'high' && novelty !== 'high') {
      return false; // Patterns cover it well
    }
    
    if (clientValue < 30) {
      return false; // Low value client, skip AI
    }
    
    return confidence < 70 || complexity === 'high' || novelty === 'high';
  }

  /**
   * Enhance with AI (placeholder - would call LLM)
   */
  async enhanceWithAI(enrichmentResult, context) {
    // Placeholder - in production this would call LLM
    this.logger?.info('AI enhancement skipped (not implemented)');
    return {
      success: false,
      cost: 0,
      enhancements: []
    };
  }

  /**
   * Merge AI enhancements into enrichment result
   */
  mergeAIEnhancements(enrichmentResult, aiResult) {
    if (aiResult.enhancements) {
      aiResult.enhancements.forEach(enhancement => {
        if (enhancement.category === 'implicit') {
          enrichmentResult.enriched.implicit.push(enhancement);
        } else if (enhancement.category === 'edgeCase') {
          enrichmentResult.enriched.edgeCases.push(enhancement);
        }
      });
    }
  }

  /**
   * Learn from AI discoveries (placeholder)
   */
  async learnFromAI(aiResult, context) {
    // Placeholder - would save new patterns to pattern library
    this.logger?.info('AI learning skipped (not implemented)');
  }

  /**
   * Generate technical requirements from enriched requirements
   */
  generateTechnicalRequirements(enriched) {
    const technical = [];
    
    // Extract technical requirements from all categories
    const allRequirements = [
      ...enriched.explicit,
      ...enriched.implicit,
      ...enriched.domainSpecific
    ];
    
    allRequirements.forEach(req => {
      const reqName = typeof req === 'string' ? req : req.name || '';
      const reqLower = reqName.toLowerCase();
      
      // API requirements
      if (reqLower.includes('api') || reqLower.includes('integration')) {
        technical.push({
          name: 'REST API endpoints',
          category: 'backend',
          priority: 'high'
        });
      }
      
      // Database requirements
      if (reqLower.includes('data') || reqLower.includes('storage') || reqLower.includes('database')) {
        technical.push({
          name: 'Database schema design',
          category: 'backend',
          priority: 'high'
        });
      }
      
      // Security requirements
      if (reqLower.includes('auth') || reqLower.includes('security') || reqLower.includes('login')) {
        technical.push({
          name: 'Authentication & Authorization',
          category: 'security',
          priority: 'high'
        });
      }
    });
    
    return technical;
  }

  /**
   * Count all requirements across all categories
   */
  countAllRequirements(enriched) {
    return (
      (enriched.explicit?.length || 0) +
      (enriched.implicit?.length || 0) +
      (enriched.domainSpecific?.length || 0) +
      (enriched.edgeCases?.length || 0) +
      (enriched.compliance?.length || 0) +
      (enriched.technical?.length || 0)
    );
  }

  /**
   * Generate recommendations based on enrichment
   */
  generateRecommendations(enrichmentResult, context) {
    const recommendations = [];
    
    if (enrichmentResult.stats.confidence < 60) {
      recommendations.push({
        type: 'warning',
        message: 'Low pattern coverage. Consider providing more domain-specific details.',
        priority: 'medium'
      });
    }
    
    if (enrichmentResult.stats.enrichmentRatio > 3) {
      recommendations.push({
        type: 'info',
        message: 'Significant enrichment applied. Review implicit requirements carefully.',
        priority: 'low'
      });
    }
    
    if (context.complexity === 'high' && !enrichmentResult.stats.aiEnhanced) {
      recommendations.push({
        type: 'suggestion',
        message: 'High complexity detected. Consider AI enhancement for better coverage.',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate warnings based on enrichment
   */
  generateWarnings(enrichmentResult, context) {
    const warnings = [];
    
    if (enrichmentResult.stats.patternsUsed === 0) {
      warnings.push({
        type: 'error',
        message: 'No patterns matched. Domain may be too novel or requirements too vague.',
        priority: 'high'
      });
    }
    
    if (enrichmentResult.enriched.compliance.length === 0 && 
        (context.market === 'india' || context.projectDetails?.marketRegion === 'india')) {
      warnings.push({
        type: 'warning',
        message: 'No compliance requirements added. Verify if compliance is needed.',
        priority: 'medium'
      });
    }
    
    return warnings;
  }
}

module.exports = RequirementsEnricher;

