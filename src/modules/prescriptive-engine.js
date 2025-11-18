/**
 * Prescriptive Engine
 * 
 * Provides domain-specific architecture prescriptions based on requirements
 * Includes templates for common domains with confidence scoring
 */

class PrescriptiveEngine {
  constructor(logger) {
    this.logger = logger || console;
    
    // Domain templates with architecture, tech stack, scale, team, and timeline
    this.templates = {
      'ecommerce': {
        architecture: {
          type: 'microservices',
          services: ['auth', 'catalog', 'cart', 'payment', 'order', 'inventory', 'notification'],
          pattern: 'API Gateway + Service Mesh'
        },
        tech: {
          frontend: 'Next.js',
          backend: 'Node.js',
          database: 'PostgreSQL',
          cache: 'Redis',
          search: 'Elasticsearch',
          queue: 'RabbitMQ',
          storage: 'AWS S3'
        },
        scale: {
          users: 10000,
          transactions: 100000,
          peakConcurrent: 1000
        },
        team: 5,
        timeline: '6 months',
        complexity: 'high'
      },
      'saas': {
        architecture: {
          type: 'monolith-first',
          services: ['api', 'auth', 'billing', 'analytics'],
          pattern: 'Modular Monolith'
        },
        tech: {
          frontend: 'React',
          backend: 'Node.js',
          database: 'PostgreSQL',
          cache: 'Redis',
          queue: 'Bull',
          storage: 'Local/S3'
        },
        scale: {
          users: 5000,
          transactions: 50000,
          peakConcurrent: 500
        },
        team: 4,
        timeline: '4 months',
        complexity: 'medium'
      },
      'mobile-app': {
        architecture: {
          type: 'mobile-backend',
          services: ['api', 'auth', 'push', 'analytics'],
          pattern: 'BaaS (Backend as a Service)'
        },
        tech: {
          frontend: 'React Native / Flutter',
          backend: 'Node.js',
          database: 'MongoDB',
          cache: 'Redis',
          push: 'Firebase',
          storage: 'Cloud Storage'
        },
        scale: {
          users: 20000,
          transactions: 200000,
          peakConcurrent: 2000
        },
        team: 6,
        timeline: '5 months',
        complexity: 'high'
      },
      'marketplace': {
        architecture: {
          type: 'microservices',
          services: ['auth', 'listing', 'search', 'messaging', 'payment', 'review', 'notification'],
          pattern: 'Event-Driven Architecture'
        },
        tech: {
          frontend: 'Next.js',
          backend: 'Node.js',
          database: 'PostgreSQL',
          cache: 'Redis',
          search: 'Elasticsearch',
          queue: 'Kafka',
          storage: 'AWS S3'
        },
        scale: {
          users: 50000,
          transactions: 500000,
          peakConcurrent: 5000
        },
        team: 8,
        timeline: '8 months',
        complexity: 'very-high'
      },
      'erp': {
        architecture: {
          type: 'modular-monolith',
          services: ['core', 'finance', 'hr', 'inventory', 'reporting'],
          pattern: 'Domain-Driven Design'
        },
        tech: {
          frontend: 'Angular',
          backend: 'Java/Spring',
          database: 'PostgreSQL',
          cache: 'Hazelcast',
          queue: 'ActiveMQ',
          storage: 'File System'
        },
        scale: {
          users: 1000,
          transactions: 10000,
          peakConcurrent: 100
        },
        team: 10,
        timeline: '12 months',
        complexity: 'very-high'
      },
      'hrms': {
        architecture: {
          type: 'monolith-first',
          services: ['core', 'payroll', 'attendance', 'leave', 'recruitment'],
          pattern: 'Layered Architecture'
        },
        tech: {
          frontend: 'React',
          backend: 'Node.js',
          database: 'PostgreSQL',
          cache: 'Redis',
          queue: 'Bull',
          storage: 'Local/S3'
        },
        scale: {
          users: 2000,
          transactions: 20000,
          peakConcurrent: 200
        },
        team: 6,
        timeline: '6 months',
        complexity: 'high'
      },
      'generic': {
        architecture: {
          type: 'monolith',
          services: ['api', 'auth'],
          pattern: 'MVC'
        },
        tech: {
          frontend: 'React',
          backend: 'Node.js',
          database: 'PostgreSQL',
          cache: 'Redis',
          queue: 'Bull',
          storage: 'Local'
        },
        scale: {
          users: 1000,
          transactions: 10000,
          peakConcurrent: 100
        },
        team: 3,
        timeline: '3 months',
        complexity: 'medium'
      }
    };
  }

  /**
   * Prescribe architecture and tech stack for a domain
   * @param {string} domain - Domain identifier (ecommerce, saas, etc.)
   * @param {Object} requirements - Requirements object with modules, scale, etc.
   * @returns {Object} Prescription with confidence and match score
   */
  prescribe(domain, requirements = {}) {
    const normalizedDomain = this.normalizeDomain(domain);
    const template = this.templates[normalizedDomain] || this.templates['generic'];
    
    // Calculate confidence based on requirements match
    const confidence = this.calculateConfidence(requirements, template);
    
    // Calculate match score
    const matchScore = this.getMatchScore(requirements, template);
    
    // Customize template based on requirements
    const prescription = this.customizeTemplate(template, requirements);
    
    return {
      prescription: {
        domain: normalizedDomain,
        architecture: prescription.architecture,
        tech: prescription.tech,
        scale: prescription.scale,
        team: prescription.team,
        timeline: prescription.timeline,
        complexity: prescription.complexity,
        rationale: this.generateRationale(normalizedDomain, prescription, requirements)
      },
      confidence: confidence,
      matchScore: matchScore,
      alternatives: this.getAlternatives(normalizedDomain, requirements)
    };
  }

  /**
   * Normalize domain name
   * @param {string} domain - Raw domain string
   * @returns {string} Normalized domain
   */
  normalizeDomain(domain) {
    if (!domain) return 'generic';
    
    const normalized = domain.toLowerCase().trim();
    
    // Map variations to standard domains
    const domainMap = {
      'e-commerce': 'ecommerce',
      'ecommerce': 'ecommerce',
      'ecom': 'ecommerce',
      'shop': 'ecommerce',
      'retail': 'ecommerce',
      'saas': 'saas',
      'software-as-a-service': 'saas',
      'mobile': 'mobile-app',
      'mobile-app': 'mobile-app',
      'app': 'mobile-app',
      'ios': 'mobile-app',
      'android': 'mobile-app',
      'marketplace': 'marketplace',
      'platform': 'marketplace',
      'erp': 'erp',
      'enterprise-resource-planning': 'erp',
      'hrms': 'hrms',
      'hrm': 'hrms',
      'hr': 'hrms',
      'payroll': 'hrms',
      'human-resources': 'hrms'
    };
    
    return domainMap[normalized] || normalized || 'generic';
  }

  /**
   * Calculate confidence score (0-1)
   * @param {Object} requirements - Requirements object
   * @param {Object} template - Domain template
   * @returns {number} Confidence score
   */
  calculateConfidence(requirements, template) {
    let confidence = 0.5; // Base confidence
    
    // Check if modules match expected services
    if (requirements.modules && Array.isArray(requirements.modules)) {
      const moduleMatch = this.calculateModuleMatch(requirements.modules, template.architecture.services);
      confidence += moduleMatch * 0.3;
    }
    
    // Check scale match
    if (requirements.scale) {
      const scaleMatch = this.calculateScaleMatch(requirements.scale, template.scale);
      confidence += scaleMatch * 0.2;
    }
    
    // Check complexity match
    if (requirements.complexity) {
      const complexityMatch = requirements.complexity === template.complexity ? 0.1 : 0;
      confidence += complexityMatch;
    }
    
    // Check team size match
    if (requirements.teamSize) {
      const teamMatch = Math.abs(requirements.teamSize - template.team) <= 2 ? 0.1 : 0;
      confidence += teamMatch;
    }
    
    // Check timeline match
    if (requirements.timeline) {
      const timelineMatch = this.calculateTimelineMatch(requirements.timeline, template.timeline);
      confidence += timelineMatch * 0.1;
    }
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Calculate module match score
   * @param {Array} requiredModules - Required modules
   * @param {Array} templateServices - Template services
   * @returns {number} Match score (0-1)
   */
  calculateModuleMatch(requiredModules, templateServices) {
    if (!requiredModules || requiredModules.length === 0) return 0.5;
    if (!templateServices || templateServices.length === 0) return 0;
    
    const normalizedRequired = requiredModules.map(m => 
      typeof m === 'string' ? m.toLowerCase() : (m.name || '').toLowerCase()
    );
    const normalizedTemplate = templateServices.map(s => s.toLowerCase());
    
    let matches = 0;
    normalizedRequired.forEach(module => {
      if (normalizedTemplate.some(service => 
        service.includes(module) || module.includes(service)
      )) {
        matches++;
      }
    });
    
    return matches / Math.max(normalizedRequired.length, normalizedTemplate.length);
  }

  /**
   * Calculate scale match score
   * @param {Object} requiredScale - Required scale
   * @param {Object} templateScale - Template scale
   * @returns {number} Match score (0-1)
   */
  calculateScaleMatch(requiredScale, templateScale) {
    if (!requiredScale || !templateScale) return 0.5;
    
    const userMatch = this.compareScale(requiredScale.users, templateScale.users);
    const transactionMatch = this.compareScale(
      requiredScale.transactions, 
      templateScale.transactions
    );
    
    return (userMatch + transactionMatch) / 2;
  }

  /**
   * Compare scale values (within 2x is good match)
   * @param {number} required - Required value
   * @param {number} template - Template value
   * @returns {number} Match score (0-1)
   */
  compareScale(required, template) {
    if (!required || !template) return 0.5;
    
    const ratio = Math.max(required, template) / Math.min(required, template);
    
    if (ratio <= 1.5) return 1.0;
    if (ratio <= 2.0) return 0.8;
    if (ratio <= 3.0) return 0.6;
    if (ratio <= 5.0) return 0.4;
    return 0.2;
  }

  /**
   * Calculate timeline match score
   * @param {string} requiredTimeline - Required timeline
   * @param {string} templateTimeline - Template timeline
   * @returns {number} Match score (0-1)
   */
  calculateTimelineMatch(requiredTimeline, templateTimeline) {
    if (!requiredTimeline || !templateTimeline) return 0.5;
    
    const requiredMonths = this.extractMonths(requiredTimeline);
    const templateMonths = this.extractMonths(templateTimeline);
    
    if (!requiredMonths || !templateMonths) return 0.5;
    
    const ratio = Math.max(requiredMonths, templateMonths) / Math.min(requiredMonths, templateMonths);
    
    if (ratio <= 1.2) return 1.0;
    if (ratio <= 1.5) return 0.8;
    if (ratio <= 2.0) return 0.6;
    return 0.4;
  }

  /**
   * Extract months from timeline string
   * @param {string} timeline - Timeline string
   * @returns {number|null} Number of months
   */
  extractMonths(timeline) {
    const match = timeline.match(/(\d+)\s*(?:month|months|mo)/i);
    if (match) return parseInt(match[1]);
    
    // Try weeks
    const weekMatch = timeline.match(/(\d+)\s*(?:week|weeks|wk)/i);
    if (weekMatch) return Math.ceil(parseInt(weekMatch[1]) / 4);
    
    return null;
  }

  /**
   * Get match score percentage (0-100)
   * @param {Object} requirements - Requirements object
   * @param {Object} template - Domain template
   * @returns {number} Match score percentage
   */
  getMatchScore(requirements, template) {
    const confidence = this.calculateConfidence(requirements, template);
    return Math.round(confidence * 100);
  }

  /**
   * Customize template based on requirements
   * @param {Object} template - Base template
   * @param {Object} requirements - Requirements
   * @returns {Object} Customized template
   */
  customizeTemplate(template, requirements) {
    const customized = JSON.parse(JSON.stringify(template)); // Deep clone
    
    // Adjust team size if specified
    if (requirements.teamSize) {
      customized.team = requirements.teamSize;
    }
    
    // Adjust timeline if specified
    if (requirements.timeline) {
      customized.timeline = requirements.timeline;
    }
    
    // Adjust scale if specified
    if (requirements.scale) {
      customized.scale = {
        ...customized.scale,
        ...requirements.scale
      };
    }
    
    // Add custom services if specified
    if (requirements.customServices && Array.isArray(requirements.customServices)) {
      customized.architecture.services = [
        ...customized.architecture.services,
        ...requirements.customServices
      ];
    }
    
    return customized;
  }

  /**
   * Generate rationale for prescription
   * @param {string} domain - Domain identifier
   * @param {Object} prescription - Prescription object
   * @param {Object} requirements - Requirements
   * @returns {string} Rationale text
   */
  generateRationale(domain, prescription, requirements) {
    const reasons = [];
    
    reasons.push(`Based on ${domain} domain best practices, we recommend a ${prescription.architecture.type} architecture.`);
    
    if (prescription.architecture.type === 'microservices') {
      reasons.push(`Microservices pattern is ideal for ${domain} due to scalability requirements and independent service scaling.`);
    } else if (prescription.architecture.type === 'monolith-first') {
      reasons.push(`Starting with a modular monolith allows faster initial development with the option to extract services later.`);
    }
    
    reasons.push(`The tech stack (${prescription.tech.frontend} + ${prescription.tech.backend} + ${prescription.tech.database}) is proven for ${domain} applications.`);
    
    if (prescription.scale) {
      reasons.push(`Designed to handle ${prescription.scale.users.toLocaleString()} users and ${prescription.scale.transactions.toLocaleString()} transactions.`);
    }
    
    return reasons.join(' ');
  }

  /**
   * Get alternative prescriptions
   * @param {string} domain - Current domain
   * @param {Object} requirements - Requirements
   * @returns {Array} Alternative prescriptions
   */
  getAlternatives(domain, requirements) {
    const alternatives = [];
    
    // Suggest simpler alternative if complexity is high
    if (domain === 'marketplace' || domain === 'erp') {
      alternatives.push({
        domain: 'saas',
        reason: 'Simpler architecture for faster time-to-market',
        prescription: this.prescribe('saas', requirements).prescription
      });
    }
    
    // Suggest more scalable alternative if scale is high
    if (domain === 'saas' && requirements.scale && requirements.scale.users > 10000) {
      alternatives.push({
        domain: 'marketplace',
        reason: 'Better suited for high-scale requirements',
        prescription: this.prescribe('marketplace', requirements).prescription
      });
    }
    
    return alternatives;
  }

  /**
   * Get all available domains
   * @returns {Array} List of domain identifiers
   */
  getAvailableDomains() {
    return Object.keys(this.templates);
  }

  /**
   * Get template for a domain
   * @param {string} domain - Domain identifier
   * @returns {Object|null} Template or null if not found
   */
  getTemplate(domain) {
    const normalized = this.normalizeDomain(domain);
    return this.templates[normalized] || null;
  }
}

module.exports = PrescriptiveEngine;

