/**
 * Requirement Extractor
 * 
 * Extracts structured requirements from natural language input
 * Uses NLP patterns and integrates with InputAnalyzer
 */

class RequirementExtractor {
  constructor(logger, inputAnalyzer = null) {
    this.logger = logger || console;
    this.inputAnalyzer = inputAnalyzer;
    
    // Domain detection patterns
    this.domainPatterns = {
      'ecommerce': ['e-commerce', 'ecommerce', 'online store', 'shopping', 'retail', 'marketplace', 'cart', 'checkout', 'products', 'catalog'],
      'saas': ['saas', 'software as a service', 'subscription', 'monthly', 'annual', 'recurring', 'platform'],
      'mobile-app': ['mobile app', 'ios app', 'android app', 'mobile application', 'iphone', 'android', 'react native', 'flutter'],
      'marketplace': ['marketplace', 'platform', 'multi-vendor', 'sellers', 'buyers', 'transactions'],
      'erp': ['erp', 'enterprise resource planning', 'enterprise', 'business management', 'operations'],
      'hrms': ['hrms', 'hrm', 'human resources', 'payroll', 'attendance', 'employee management', 'hr system']
    };
    
    // Feature extraction patterns
    this.featurePatterns = {
      'authentication': ['login', 'signup', 'authentication', 'auth', 'user account', 'registration'],
      'payment': ['payment', 'checkout', 'razorpay', 'stripe', 'paypal', 'billing', 'invoice'],
      'inventory': ['inventory', 'stock', 'products', 'catalog', 'items'],
      'order': ['order', 'orders', 'order management', 'purchase'],
      'notification': ['notification', 'email', 'sms', 'push', 'alert'],
      'search': ['search', 'filter', 'find', 'query'],
      'reporting': ['report', 'reports', 'analytics', 'dashboard', 'statistics'],
      'admin': ['admin', 'admin panel', 'management', 'dashboard']
    };
    
    // Scale detection patterns
    this.scalePatterns = {
      'startup': ['startup', 'mvp', 'small', 'few users', '1-10', 'pilot'],
      'sme': ['sme', 'small business', 'medium', '100-1000', 'thousand'],
      'enterprise': ['enterprise', 'large', '1000+', 'thousands', 'many users'],
      'enterprise-plus': ['enterprise plus', 'very large', '10000+', 'millions', 'global']
    };
    
    // Integration patterns
    this.integrationPatterns = {
      'payment': ['razorpay', 'stripe', 'paypal', 'payment gateway', 'payment integration'],
      'sms': ['sms', 'twilio', 'text message', 'otp'],
      'email': ['email', 'sendgrid', 'mailgun', 'smtp'],
      'analytics': ['google analytics', 'analytics', 'tracking', 'mixpanel'],
      'storage': ['s3', 'aws s3', 'cloud storage', 'file storage']
    };
  }

  /**
   * Extract requirements from text input
   * @param {string} input - User input text
   * @returns {Object} Extracted requirements
   */
  async extractFromText(input) {
    if (!input || typeof input !== 'string') {
      return {};
    }

    const inputLower = input.toLowerCase();
    
    const extracted = {
      domain: this.detectDomain(inputLower),
      features: this.extractFeatures(inputLower),
      constraints: this.extractConstraints(inputLower),
      scale: this.extractScale(inputLower),
      technical: this.extractTechnical(inputLower),
      integrations: this.extractIntegrations(inputLower),
      budget: this.extractBudget(inputLower),
      timeline: this.extractTimeline(inputLower),
      users: this.extractUsers(inputLower)
    };
    
    // Use InputAnalyzer if available for additional insights
    if (this.inputAnalyzer) {
      try {
        const analysis = await this.inputAnalyzer.analyze(input, 'text');
        // Merge insights from InputAnalyzer
        if (analysis.checks) {
          if (analysis.checks.hasFeatures && !extracted.features.length) {
            // Try to extract features from analysis
            extracted.features = this.extractFeaturesFromAnalysis(analysis);
          }
        }
      } catch (error) {
        this.logger.warn('InputAnalyzer integration failed', { error: error.message });
      }
    }
    
    return extracted;
  }

  /**
   * Detect domain from input
   * @param {string} inputLower - Lowercase input text
   * @returns {string|null} Detected domain
   */
  detectDomain(inputLower) {
    // Check each domain pattern
    for (const [domain, patterns] of Object.entries(this.domainPatterns)) {
      for (const pattern of patterns) {
        if (inputLower.includes(pattern)) {
          return domain;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract features from input
   * @param {string} inputLower - Lowercase input text
   * @returns {Array} Array of detected features
   */
  extractFeatures(inputLower) {
    const features = [];
    
    // Check feature patterns
    for (const [feature, patterns] of Object.entries(this.featurePatterns)) {
      for (const pattern of patterns) {
        if (inputLower.includes(pattern)) {
          // Convert to display name
          const displayName = feature.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          if (!features.includes(displayName)) {
            features.push(displayName);
          }
        }
      }
    }
    
    // Extract explicit feature mentions (e.g., "I need X, Y, Z")
    const explicitFeatures = this.extractExplicitFeatures(inputLower);
    explicitFeatures.forEach(feature => {
      if (!features.includes(feature)) {
        features.push(feature);
      }
    });
    
    return features;
  }

  /**
   * Extract explicit feature mentions from text
   * @param {string} inputLower - Lowercase input text
   * @returns {Array} Array of explicit features
   */
  extractExplicitFeatures(inputLower) {
    const features = [];
    
    // Patterns like "I need X", "features include Y", "must have Z"
    const patterns = [
      /(?:need|want|require|must have|should have|features? include|features? are)\s+([^.,!?]+)/gi,
      /(?:with|including)\s+([^.,!?]+)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = inputLower.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const feature = match[1].trim();
          // Filter out common words
          if (feature.length > 3 && !['the', 'and', 'for', 'with', 'that'].includes(feature)) {
            features.push(feature);
          }
        }
      }
    });
    
    return features.slice(0, 10); // Limit to 10 features
  }

  /**
   * Extract constraints from input
   * @param {string} inputLower - Lowercase input text
   * @returns {Array} Array of constraints
   */
  extractConstraints(inputLower) {
    const constraints = [];
    
    // Compliance requirements
    if (inputLower.includes('gdpr') || inputLower.includes('compliance')) {
      constraints.push('GDPR Compliance');
    }
    if (inputLower.includes('hipaa')) {
      constraints.push('HIPAA Compliance');
    }
    if (inputLower.includes('pci') || inputLower.includes('pci-dss')) {
      constraints.push('PCI-DSS Compliance');
    }
    
    // Security requirements
    if (inputLower.includes('2fa') || inputLower.includes('two factor') || inputLower.includes('two-factor')) {
      constraints.push('2FA Required');
    }
    if (inputLower.includes('sso') || inputLower.includes('single sign-on')) {
      constraints.push('SSO Required');
    }
    if (inputLower.includes('encryption')) {
      constraints.push('Encryption Required');
    }
    
    // Accessibility
    if (inputLower.includes('accessibility') || inputLower.includes('wcag') || inputLower.includes('a11y')) {
      constraints.push('Accessibility Compliance');
    }
    
    // Localization
    if (inputLower.includes('multi-language') || inputLower.includes('i18n') || inputLower.includes('localization')) {
      constraints.push('Multi-language Support');
    }
    
    return constraints;
  }

  /**
   * Extract scale from input
   * @param {string} inputLower - Lowercase input text
   * @returns {string|null} Detected scale
   */
  extractScale(inputLower) {
    // Check scale patterns
    for (const [scale, patterns] of Object.entries(this.scalePatterns)) {
      for (const pattern of patterns) {
        if (inputLower.includes(pattern)) {
          return scale;
        }
      }
    }
    
    // Check for user count mentions
    const userCountMatch = inputLower.match(/(\d+)\s*(?:users?|people)/i);
    if (userCountMatch) {
      const count = parseInt(userCountMatch[1]);
      if (count < 100) return 'startup';
      if (count < 1000) return 'sme';
      if (count < 10000) return 'enterprise';
      return 'enterprise-plus';
    }
    
    return null;
  }

  /**
   * Extract technical preferences from input
   * @param {string} inputLower - Lowercase input text
   * @returns {Object} Technical preferences
   */
  extractTechnical(inputLower) {
    const technical = {};
    
    // Frontend preferences
    if (inputLower.includes('react')) {
      technical.frontend = 'React';
    } else if (inputLower.includes('vue')) {
      technical.frontend = 'Vue';
    } else if (inputLower.includes('angular')) {
      technical.frontend = 'Angular';
    } else if (inputLower.includes('next.js') || inputLower.includes('nextjs')) {
      technical.frontend = 'Next.js';
    }
    
    // Backend preferences
    if (inputLower.includes('node.js') || inputLower.includes('nodejs')) {
      technical.backend = 'Node.js';
    } else if (inputLower.includes('python')) {
      technical.backend = 'Python';
    } else if (inputLower.includes('java')) {
      technical.backend = 'Java';
    } else if (inputLower.includes('php')) {
      technical.backend = 'PHP';
    }
    
    // Database preferences
    if (inputLower.includes('postgresql') || inputLower.includes('postgres')) {
      technical.database = 'PostgreSQL';
    } else if (inputLower.includes('mysql')) {
      technical.database = 'MySQL';
    } else if (inputLower.includes('mongodb') || inputLower.includes('mongo')) {
      technical.database = 'MongoDB';
    }
    
    // Deployment preferences
    if (inputLower.includes('aws') || inputLower.includes('amazon web services')) {
      technical.deployment = 'AWS';
    } else if (inputLower.includes('azure')) {
      technical.deployment = 'Azure';
    } else if (inputLower.includes('gcp') || inputLower.includes('google cloud')) {
      technical.deployment = 'GCP';
    } else if (inputLower.includes('on-premise') || inputLower.includes('on-prem')) {
      technical.deployment = 'On-premise';
    } else if (inputLower.includes('cloud')) {
      technical.deployment = 'Cloud';
    }
    
    // Mobile framework
    if (inputLower.includes('react native') || inputLower.includes('react-native')) {
      technical.mobileFramework = 'React Native';
    } else if (inputLower.includes('flutter')) {
      technical.mobileFramework = 'Flutter';
    } else if (inputLower.includes('native')) {
      technical.mobileFramework = 'Native';
    }
    
    return technical;
  }

  /**
   * Extract integrations from input
   * @param {string} inputLower - Lowercase input text
   * @returns {Array} Array of integration names
   */
  extractIntegrations(inputLower) {
    const integrations = [];
    
    // Check integration patterns
    for (const [integration, patterns] of Object.entries(this.integrationPatterns)) {
      for (const pattern of patterns) {
        if (inputLower.includes(pattern)) {
          const displayName = integration.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          if (!integrations.includes(displayName)) {
            integrations.push(displayName);
          }
        }
      }
    }
    
    // Extract explicit integration mentions
    const integrationMentions = inputLower.match(/(?:integrate|integration|connect|link)\s+(?:with|to)?\s*([^.,!?]+)/gi);
    if (integrationMentions) {
      integrationMentions.forEach(mention => {
        const match = mention.match(/(?:integrate|integration|connect|link)\s+(?:with|to)?\s*(.+)/i);
        if (match && match[1]) {
          const integration = match[1].trim();
          if (integration.length > 2 && !integrations.includes(integration)) {
            integrations.push(integration);
          }
        }
      });
    }
    
    return integrations;
  }

  /**
   * Extract budget from input
   * @param {string} inputLower - Lowercase input text
   * @returns {string|null} Budget string
   */
  extractBudget(inputLower) {
    // Look for budget mentions
    const budgetPatterns = [
      /budget\s+(?:is|of|around|about)?\s*([^.,!?]+)/i,
      /(?:₹|rs\.?|rupees?)\s*(\d+)\s*(l|L|lakh|lakhs|cr|Cr|crore|crores)/i,
      /(\d+)\s*(l|L|lakh|lakhs|cr|Cr|crore|crores)/i
    ];
    
    for (const pattern of budgetPatterns) {
      const match = inputLower.match(pattern);
      if (match) {
        if (match[1] && match[2]) {
          return `₹${match[1]}${match[2]}`;
        } else if (match[1]) {
          return match[1].trim();
        }
      }
    }
    
    return null;
  }

  /**
   * Extract timeline from input
   * @param {string} inputLower - Lowercase input text
   * @returns {string|null} Timeline string
   */
  extractTimeline(inputLower) {
    // Look for timeline mentions
    const timelinePatterns = [
      /(?:need|want|required|deadline|by)\s+(?:in|within|by)?\s*(\d+)\s*(?:months?|weeks?|days?)/i,
      /(?:timeline|duration|timeframe)\s+(?:is|of|around)?\s*(\d+)\s*(?:months?|weeks?|days?)/i,
      /(\d+)\s*(?:months?|weeks?|days?)/i
    ];
    
    for (const pattern of timelinePatterns) {
      const match = inputLower.match(pattern);
      if (match && match[1]) {
        const number = match[1];
        const unit = match[2] || inputLower.substring(match.index + match[0].length).match(/(months?|weeks?|days?)/i)?.[1] || 'months';
        return `${number} ${unit}`;
      }
    }
    
    // Check for quarter/year mentions
    if (inputLower.match(/q[1-4]\s*\d{4}/i)) {
      return inputLower.match(/q[1-4]\s*\d{4}/i)[0];
    }
    
    if (inputLower.match(/\d{4}/)) {
      const year = inputLower.match(/\d{4}/)[0];
      return year;
    }
    
    return null;
  }

  /**
   * Extract user count from input
   * @param {string} inputLower - Lowercase input text
   * @returns {number|null} User count
   */
  extractUsers(inputLower) {
    // Look for user count mentions
    const userPatterns = [
      /(\d+)\s*(?:users?|people|employees?)/i,
      /(?:users?|people|employees?)\s*(?:are|will be|of)?\s*(\d+)/i,
      /(?:thousand|k)\s*(?:users?|people)/i,
      /(?:million|m)\s*(?:users?|people)/i
    ];
    
    for (const pattern of userPatterns) {
      const match = inputLower.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    
    // Check for "thousand" or "million"
    if (inputLower.includes('thousand') || inputLower.includes('k')) {
      const match = inputLower.match(/(\d+)\s*(?:thousand|k)/i);
      if (match) {
        return parseInt(match[1]) * 1000;
      }
    }
    
    if (inputLower.includes('million') || inputLower.includes('m')) {
      const match = inputLower.match(/(\d+)\s*(?:million|m)/i);
      if (match) {
        return parseInt(match[1]) * 1000000;
      }
    }
    
    return null;
  }

  /**
   * Detect implicit requirements based on explicit requirements
   * @param {Object} explicit - Explicitly stated requirements
   * @returns {Object} Implicit requirements
   */
  detectImplicitRequirements(explicit) {
    const implicit = {};
    
    // Domain-based implicit requirements
    if (explicit.domain === 'ecommerce') {
      // E-commerce always needs payment
      if (!explicit.features.some(f => f.toLowerCase().includes('payment'))) {
        implicit.payment = 'required (inferred from e-commerce domain)';
      }
      
      // E-commerce needs inventory if products mentioned
      if (explicit.features.some(f => f.toLowerCase().includes('product')) && 
          !explicit.features.some(f => f.toLowerCase().includes('inventory'))) {
        implicit.inventory = 'required (inferred from product management)';
      }
      
      // E-commerce needs order management
      if (!explicit.features.some(f => f.toLowerCase().includes('order'))) {
        implicit.orderManagement = 'required (inferred from e-commerce domain)';
      }
    }
    
    if (explicit.domain === 'saas') {
      // SaaS always needs authentication
      if (!explicit.features.some(f => f.toLowerCase().includes('auth') || f.toLowerCase().includes('login'))) {
        implicit.authentication = 'required (inferred from SaaS domain)';
      }
      
      // SaaS needs billing if subscription mentioned
      if (explicit.features.some(f => f.toLowerCase().includes('subscription')) && 
          !explicit.features.some(f => f.toLowerCase().includes('billing'))) {
        implicit.billing = 'required (inferred from subscription model)';
      }
    }
    
    if (explicit.domain === 'mobile-app') {
      // Mobile apps need push notifications
      if (!explicit.features.some(f => f.toLowerCase().includes('notification') || f.toLowerCase().includes('push'))) {
        implicit.pushNotifications = 'recommended (inferred from mobile app)';
      }
    }
    
    // Scale-based implicit requirements
    if (explicit.scale === 'enterprise' || explicit.scale === 'enterprise-plus') {
      // Enterprise needs SSO
      if (!explicit.constraints.some(c => c.toLowerCase().includes('sso'))) {
        implicit.sso = 'recommended (inferred from enterprise scale)';
      }
      
      // Enterprise needs reporting
      if (!explicit.features.some(f => f.toLowerCase().includes('report') || f.toLowerCase().includes('analytics'))) {
        implicit.reporting = 'recommended (inferred from enterprise scale)';
      }
    }
    
    // Integration-based implicit requirements
    if (explicit.integrations.some(i => i.toLowerCase().includes('payment'))) {
      // Payment integration implies payment feature
      if (!explicit.features.some(f => f.toLowerCase().includes('payment'))) {
        implicit.payment = 'required (inferred from payment integration)';
      }
    }
    
    return implicit;
  }

  /**
   * Extract features from InputAnalyzer analysis
   * @param {Object} analysis - InputAnalyzer analysis result
   * @returns {Array} Array of features
   */
  extractFeaturesFromAnalysis(analysis) {
    const features = [];
    
    // Extract from checks if available
    if (analysis.checks) {
      if (analysis.checks.hasFeatures) {
        // Try to extract from missingImportant or missingNiceToHave
        if (analysis.missingImportant) {
          features.push(...analysis.missingImportant);
        }
        if (analysis.missingNiceToHave) {
          features.push(...analysis.missingNiceToHave);
        }
      }
    }
    
    return features;
  }
}

module.exports = RequirementExtractor;

