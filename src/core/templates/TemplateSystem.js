// src/core/templates/TemplateSystem.js
// Template System - Industry Templates for Common Projects

class TemplateSystem {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger || console;
    this.componentLibrary = null; // Will be injected
  }

  /**
   * Set component library reference
   */
  setComponentLibrary(componentLibrary) {
    this.componentLibrary = componentLibrary;
  }

  /**
   * Industry templates
   */
  templates = {
    'ecommerce_basic': {
      name: 'Basic E-commerce Platform',
      modules: [
        { name: 'Authentication', category: 'auth', complexity: 2, hours: 16 },
        { name: 'Product Catalog', category: 'catalog', complexity: 3, hours: 32 },
        { name: 'Shopping Cart', category: 'cart', complexity: 2, hours: 16 },
        { name: 'Checkout', category: 'checkout', complexity: 4, hours: 48 },
        { name: 'Order Management', category: 'orders', complexity: 3, hours: 32 },
        { name: 'Payment Gateway', category: 'payment', complexity: 4, hours: 40 },
        { name: 'Notifications', category: 'notification', complexity: 2, hours: 16 }
      ],
      timeline: { weeks: 8, workingDays: 40 },
      cost: { min: 800000, max: 1200000 },
      reusableComponents: ['payment_gateway', 'inventory', 'notifications'],
      compliance: [],
      integrations: ['razorpay', 'shiprocket'],
      domain: 'ecommerce'
    },

    'ecommerce_advanced': {
      name: 'Advanced E-commerce Platform',
      modules: [
        { name: 'Authentication', category: 'auth', complexity: 3, hours: 24 },
        { name: 'Product Catalog', category: 'catalog', complexity: 4, hours: 48 },
        { name: 'Shopping Cart', category: 'cart', complexity: 3, hours: 24 },
        { name: 'Checkout', category: 'checkout', complexity: 5, hours: 64 },
        { name: 'Order Management', category: 'orders', complexity: 4, hours: 48 },
        { name: 'Payment Gateway', category: 'payment', complexity: 5, hours: 56 },
        { name: 'Inventory Management', category: 'inventory', complexity: 4, hours: 48 },
        { name: 'CRM Integration', category: 'crm', complexity: 4, hours: 40 },
        { name: 'Analytics Dashboard', category: 'analytics', complexity: 4, hours: 40 },
        { name: 'Notifications', category: 'notification', complexity: 3, hours: 24 }
      ],
      timeline: { weeks: 14, workingDays: 70 },
      cost: { min: 2000000, max: 3000000 },
      reusableComponents: ['payment_gateway', 'inventory', 'notifications', 'analytics'],
      compliance: ['gst'],
      integrations: ['razorpay', 'shiprocket', 'crm'],
      domain: 'ecommerce'
    },

    'fintech_mvp': {
      name: 'Fintech MVP',
      modules: [
        { name: 'KYC Verification', category: 'kyc', complexity: 5, hours: 64 },
        { name: 'Wallet System', category: 'wallet', complexity: 5, hours: 72 },
        { name: 'Transactions', category: 'transactions', complexity: 5, hours: 64 },
        { name: 'Compliance', category: 'compliance', complexity: 5, hours: 56 },
        { name: 'Reporting', category: 'reporting', complexity: 4, hours: 40 },
        { name: 'Notifications', category: 'notification', complexity: 3, hours: 24 }
      ],
      timeline: { weeks: 12, workingDays: 60 },
      cost: { min: 1500000, max: 2000000 },
      reusableComponents: ['kyc_aadhaar', 'upi_integration', 'gst_invoice'],
      compliance: ['rbi', 'pci_dss'],
      integrations: ['aadhaar', 'upi', 'razorpay'],
      domain: 'fintech'
    },

    'hrms_basic': {
      name: 'Basic HRMS',
      modules: [
        { name: 'Authentication', category: 'auth', complexity: 2, hours: 16 },
        { name: 'Employee Management', category: 'employee', complexity: 3, hours: 32 },
        { name: 'Attendance', category: 'attendance', complexity: 3, hours: 32 },
        { name: 'Payroll', category: 'payroll', complexity: 4, hours: 48 },
        { name: 'Leave Management', category: 'leave', complexity: 2, hours: 24 },
        { name: 'Reporting', category: 'reporting', complexity: 3, hours: 32 }
      ],
      timeline: { weeks: 10, workingDays: 50 },
      cost: { min: 1000000, max: 1500000 },
      reusableComponents: ['payroll_calculator', 'attendance_tracker'],
      compliance: ['gst', 'pf', 'esi'],
      integrations: ['banking'],
      domain: 'hrms'
    },

    'saas_basic': {
      name: 'Basic SaaS Platform',
      modules: [
        { name: 'Authentication', category: 'auth', complexity: 3, hours: 24 },
        { name: 'Multi-tenancy', category: 'multitenant', complexity: 4, hours: 48 },
        { name: 'Subscription Management', category: 'subscription', complexity: 4, hours: 48 },
        { name: 'Billing', category: 'billing', complexity: 4, hours: 40 },
        { name: 'Dashboard', category: 'dashboard', complexity: 3, hours: 32 },
        { name: 'API Gateway', category: 'api', complexity: 4, hours: 40 },
        { name: 'Notifications', category: 'notification', complexity: 2, hours: 16 }
      ],
      timeline: { weeks: 12, workingDays: 60 },
      cost: { min: 1800000, max: 2500000 },
      reusableComponents: ['subscription_engine', 'billing_system'],
      compliance: ['gst'],
      integrations: ['payment_gateway'],
      domain: 'saas'
    }
  };

  /**
   * Create project from template
   */
  async createProjectFromTemplate(templateId, customizations = {}) {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Apply customizations
    const project = {
      ...template,
      modules: this.customizeModules(template.modules, customizations),
      timeline: this.adjustTimeline(template.timeline, customizations),
      cost: this.adjustCost(template.cost, customizations),
      customizations: customizations
    };

    // Add reusable components if component library available
    if (this.componentLibrary) {
      const components = await this.getTemplateComponents(templateId);
      project.reusableComponents = components;
      project.savedHours = components.reduce((sum, c) => sum + (c.average_hours_saved || 0), 0);
    }

    return project;
  }

  /**
   * Customize modules based on requirements
   */
  customizeModules(templateModules, customizations) {
    let modules = [...templateModules];

    // Add custom modules
    if (customizations.addModules && Array.isArray(customizations.addModules)) {
      modules.push(...customizations.addModules);
    }

    // Remove modules
    if (customizations.removeModules && Array.isArray(customizations.removeModules)) {
      modules = modules.filter(m => !customizations.removeModules.includes(m.name));
    }

    // Modify module complexity
    if (customizations.moduleComplexity && typeof customizations.moduleComplexity === 'object') {
      modules = modules.map(m => {
        if (customizations.moduleComplexity[m.name]) {
          return {
            ...m,
            complexity: customizations.moduleComplexity[m.name],
            hours: this.recalculateHours(m, customizations.moduleComplexity[m.name])
          };
        }
        return m;
      });
    }

    return modules;
  }

  /**
   * Recalculate hours based on complexity change
   */
  recalculateHours(module, newComplexity) {
    const complexityRatio = newComplexity / module.complexity;
    return Math.round(module.hours * complexityRatio);
  }

  /**
   * Adjust timeline based on customizations
   */
  adjustTimeline(templateTimeline, customizations) {
    let timeline = { ...templateTimeline };

    // Adjust for team size
    if (customizations.teamSize) {
      const teamMultiplier = customizations.teamSize / 3; // Baseline is 3
      timeline.workingDays = Math.round(timeline.workingDays / teamMultiplier);
      timeline.weeks = Math.ceil(timeline.workingDays / 5);
    }

    // Adjust for urgency
    if (customizations.urgency === 'high') {
      timeline.workingDays = Math.round(timeline.workingDays * 0.8);
      timeline.weeks = Math.ceil(timeline.workingDays / 5);
    }

    return timeline;
  }

  /**
   * Adjust cost based on customizations
   */
  adjustCost(templateCost, customizations) {
    let cost = { ...templateCost };

    // Adjust for team size
    if (customizations.teamSize) {
      const teamMultiplier = customizations.teamSize / 3;
      cost.min = Math.round(cost.min * teamMultiplier);
      cost.max = Math.round(cost.max * teamMultiplier);
    }

    // Adjust for complexity changes
    if (customizations.moduleComplexity) {
      const complexityMultiplier = this.calculateComplexityMultiplier(customizations.moduleComplexity);
      cost.min = Math.round(cost.min * complexityMultiplier);
      cost.max = Math.round(cost.max * complexityMultiplier);
    }

    return cost;
  }

  /**
   * Calculate complexity multiplier
   */
  calculateComplexityMultiplier(moduleComplexity) {
    const values = Object.values(moduleComplexity);
    if (values.length === 0) return 1.0;

    const avgComplexity = values.reduce((sum, c) => sum + c, 0) / values.length;
    return 0.8 + (avgComplexity / 5) * 0.4; // Range: 0.8 to 1.2
  }

  /**
   * Get template components
   */
  async getTemplateComponents(templateId) {
    if (!this.componentLibrary || !this.db) {
      return [];
    }

    try {
      const template = this.templates[templateId];
      if (!template || !template.reusableComponents) {
        return [];
      }

      const components = [];
      for (const compName of template.reusableComponents) {
        const query = 'SELECT * FROM components WHERE component_name = ?';
        const stmt = this.db.prepare(query);
        const component = stmt.get(compName);
        if (component) {
          components.push(component);
        }
      }

      return components;
    } catch (error) {
      this.logger.error('[ERROR] Failed to get template components', error);
      return [];
    }
  }

  /**
   * List available templates
   */
  listTemplates() {
    return Object.keys(this.templates).map(id => ({
      id,
      name: this.templates[id].name,
      domain: this.templates[id].domain,
      timeline: this.templates[id].timeline,
      cost: this.templates[id].cost,
      moduleCount: this.templates[id].modules.length
    }));
  }

  /**
   * Get template details
   */
  getTemplate(templateId) {
    return this.templates[templateId] || null;
  }

  /**
   * Save custom template
   */
  async saveCustomTemplate(template) {
    if (!this.db) {
      this.logger.warn('[WARN] Database not available, cannot save template');
      return null;
    }

    try {
      // Would save to industry_templates table
      const templateId = `custom_${Date.now()}`;
      this.templates[templateId] = template;
      return templateId;
    } catch (error) {
      this.logger.error('[ERROR] Failed to save custom template', error);
      return null;
    }
  }
}

module.exports = TemplateSystem;

