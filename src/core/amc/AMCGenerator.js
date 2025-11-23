/**
 * AMC (Annual Maintenance Contract) Generator
 * 
 * Generates AMC packages and pricing for post-development support
 * Part of SCOGEN 2.0 unified flow
 */

class AMCGenerator {
  constructor(logger) {
    this.logger = logger || console;
  }

  /**
   * Generate AMC packages for a project
   * @param {Object} projectData - Project data with cost and technical details
   * @returns {Object} AMC packages (basic, standard, premium)
   */
  generatePackages(projectData) {
    try {
      const totalCost = projectData.totalCost || 0;
      const projectComplexity = projectData.complexity || 'medium';
      const teamSize = projectData.teamSize || 5;
      
      this.logger.info('Generating AMC packages', {
        totalCost,
        complexity: projectComplexity
      });

      // Calculate base AMC as percentage of project cost
      const baseAMC = this.calculateBaseAMC(totalCost, projectComplexity);
      
      // Generate three tiers
      const packages = {
        basic: this.generateBasicPackage(baseAMC, projectComplexity),
        standard: this.generateStandardPackage(baseAMC, projectComplexity),
        premium: this.generatePremiumPackage(baseAMC, projectComplexity)
      };

      // Add SLA definitions
      packages.sla = this.generateSLA();

      // Add terms and conditions
      packages.terms = this.generateTerms();

      this.logger.info('AMC packages generated', {
        basic: packages.basic.annualCost,
        standard: packages.standard.annualCost,
        premium: packages.premium.annualCost
      });

      return packages;

    } catch (error) {
      this.logger.error('AMC generation failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Calculate base AMC cost
   * AMC typically ranges from 15-30% of project cost annually
   */
  calculateBaseAMC(totalCost, complexity) {
    let percentage;
    
    switch (complexity) {
      case 'low':
        percentage = 0.15; // 15% for simple projects
        break;
      case 'high':
        percentage = 0.30; // 30% for complex projects
        break;
      default:
        percentage = 0.20; // 20% for medium complexity
    }

    return totalCost * percentage;
  }

  /**
   * Generate Basic AMC Package
   */
  generateBasicPackage(baseAMC, complexity) {
    const annualCost = Math.round(baseAMC * 0.7); // 70% of base
    const monthlyCost = Math.round(annualCost / 12);

    return {
      packageType: 'basic',
      name: 'Basic Support',
      annualCost: annualCost,
      monthlyCost: monthlyCost,
      coverage: {
        bugFixes: true,
        securityUpdates: true,
        emailSupport: true,
        responseTime: '48 hours',
        supportHours: 'Business hours (9 AM - 6 PM, Mon-Fri)',
        updates: 'Critical only',
        backups: 'Weekly',
        monitoring: 'Basic uptime monitoring',
        documentation: 'Updated on request'
      },
      features: [
        'Bug fixes and patches',
        'Security updates',
        'Email support (48hr response)',
        'Weekly backups',
        'Basic uptime monitoring',
        'Documentation updates on request'
      ],
      exclusions: [
        'New feature development',
        'Custom integrations',
        'Performance optimization',
        '24/7 support',
        'Dedicated support engineer'
      ],
      suitableFor: 'Small projects with low maintenance needs'
    };
  }

  /**
   * Generate Standard AMC Package
   */
  generateStandardPackage(baseAMC, complexity) {
    const annualCost = Math.round(baseAMC); // 100% of base
    const monthlyCost = Math.round(annualCost / 12);

    return {
      packageType: 'standard',
      name: 'Standard Support',
      annualCost: annualCost,
      monthlyCost: monthlyCost,
      coverage: {
        bugFixes: true,
        securityUpdates: true,
        emailSupport: true,
        phoneSupport: true,
        responseTime: '24 hours',
        supportHours: 'Extended hours (9 AM - 8 PM, Mon-Sat)',
        updates: 'Regular updates and patches',
        backups: 'Daily',
        monitoring: 'Advanced monitoring with alerts',
        documentation: 'Regularly updated',
        performanceTuning: 'Quarterly',
        minorEnhancements: 'Up to 20 hours/month'
      },
      features: [
        'All Basic features',
        'Phone support (24hr response)',
        'Extended support hours',
        'Daily backups',
        'Advanced monitoring with alerts',
        'Regular documentation updates',
        'Quarterly performance tuning',
        'Minor enhancements (up to 20 hrs/month)'
      ],
      exclusions: [
        'Major feature development',
        'Custom integrations beyond scope',
        '24/7 support',
        'Dedicated support engineer',
        'On-site support'
      ],
      suitableFor: 'Medium-sized projects with regular maintenance needs'
    };
  }

  /**
   * Generate Premium AMC Package
   */
  generatePremiumPackage(baseAMC, complexity) {
    const annualCost = Math.round(baseAMC * 1.5); // 150% of base
    const monthlyCost = Math.round(annualCost / 12);

    return {
      packageType: 'premium',
      name: 'Premium Support',
      annualCost: annualCost,
      monthlyCost: monthlyCost,
      coverage: {
        bugFixes: true,
        securityUpdates: true,
        emailSupport: true,
        phoneSupport: true,
        chatSupport: true,
        responseTime: '4 hours',
        supportHours: '24/7 support',
        updates: 'Priority updates and patches',
        backups: 'Real-time + Daily',
        monitoring: 'Enterprise-grade monitoring',
        documentation: 'Always up-to-date',
        performanceTuning: 'Monthly',
        minorEnhancements: 'Up to 40 hours/month',
        dedicatedEngineer: true,
        onSiteSupport: 'Available on request',
        training: 'Quarterly training sessions',
        disasterRecovery: 'Included'
      },
      features: [
        'All Standard features',
        '24/7 support (4hr response)',
        'Chat support',
        'Real-time + daily backups',
        'Enterprise-grade monitoring',
        'Always up-to-date documentation',
        'Monthly performance tuning',
        'Minor enhancements (up to 40 hrs/month)',
        'Dedicated support engineer',
        'On-site support available',
        'Quarterly training sessions',
        'Disaster recovery included'
      ],
      exclusions: [
        'Major feature development (billed separately)',
        'Custom integrations beyond scope (billed separately)'
      ],
      suitableFor: 'Enterprise projects requiring high availability and support'
    };
  }

  /**
   * Generate SLA definitions
   */
  generateSLA() {
    return {
      basic: {
        uptime: '99.0%',
        responseTime: '48 hours',
        resolutionTime: '5 business days',
        availability: 'Business hours (9 AM - 6 PM, Mon-Fri)'
      },
      standard: {
        uptime: '99.5%',
        responseTime: '24 hours',
        resolutionTime: '3 business days',
        availability: 'Extended hours (9 AM - 8 PM, Mon-Sat)'
      },
      premium: {
        uptime: '99.9%',
        responseTime: '4 hours',
        resolutionTime: '1 business day',
        availability: '24/7'
      }
    };
  }

  /**
   * Generate terms and conditions
   */
  generateTerms() {
    return {
      contractDuration: '12 months (renewable)',
      paymentTerms: 'Monthly or annual payment options',
      cancellation: '30 days notice required',
      scopeChanges: 'Additional work billed separately',
      responseTime: 'Measured from ticket creation',
      resolutionTime: 'Measured from ticket acknowledgment',
      escalation: 'Available for critical issues',
      exclusions: [
        'Third-party software issues',
        'Hardware failures',
        'Network/infrastructure issues',
        'Client-side configuration errors',
        'Changes outside original scope'
      ],
      included: [
        'Bug fixes',
        'Security patches',
        'Performance optimization',
        'Documentation updates',
        'Support and troubleshooting'
      ],
      renewal: 'Automatic renewal unless cancelled 30 days before expiry',
      priceRevision: 'Prices may be revised annually with 60 days notice'
    };
  }

  /**
   * Generate training plan
   */
  generateTrainingPlan(projectData) {
    const modules = projectData.modules || [];
    const teamSize = projectData.teamSize || 5;

    return {
      overview: 'Comprehensive training program for end users and administrators',
      sessions: [
        {
          type: 'Administrator Training',
          duration: '2 days',
          participants: 'Up to 5 administrators',
          topics: [
            'System overview and architecture',
            'User management',
            'Configuration and settings',
            'Troubleshooting common issues',
            'Backup and recovery procedures'
          ],
          cost: Math.round((projectData.totalCost || 0) * 0.05) // 5% of project cost
        },
        {
          type: 'End User Training',
          duration: '1 day',
          participants: 'Up to 20 end users',
          topics: [
            'System navigation',
            'Core features and workflows',
            'Reports and analytics',
            'Best practices'
          ],
          cost: Math.round((projectData.totalCost || 0) * 0.03) // 3% of project cost
        },
        {
          type: 'Advanced Training',
          duration: '1 day',
          participants: 'Up to 10 power users',
          topics: [
            'Advanced features',
            'Customization options',
            'Integration capabilities',
            'API usage'
          ],
          cost: Math.round((projectData.totalCost || 0) * 0.02) // 2% of project cost
        }
      ],
      materials: [
        'User manual (PDF)',
        'Video tutorials',
        'Quick reference guide',
        'FAQ document',
        'Training slides'
      ],
      schedule: 'Training sessions scheduled within 2 weeks of project completion',
      totalCost: Math.round((projectData.totalCost || 0) * 0.10) // Total 10% of project cost
    };
  }

  /**
   * Generate maintenance schedule
   */
  generateMaintenanceSchedule() {
    return {
      daily: [
        'Automated backups',
        'System health checks',
        'Error log monitoring',
        'Performance metrics review'
      ],
      weekly: [
        'Security scan',
        'Database optimization',
        'Backup verification',
        'Uptime report generation'
      ],
      monthly: [
        'Performance tuning',
        'Security updates',
        'Documentation review',
        'Capacity planning review',
        'Client feedback review'
      ],
      quarterly: [
        'Comprehensive security audit',
        'Performance optimization',
        'Disaster recovery drill',
        'Training session (Premium only)',
        'Roadmap review'
      ],
      annually: [
        'Full system audit',
        'Technology stack review',
        'Contract renewal discussion',
        'Strategic planning session'
      ]
    };
  }

  /**
   * Generate handover documentation checklist
   */
  generateHandoverChecklist() {
    return {
      technical: [
        'Source code repository access',
        'Database schema documentation',
        'API documentation',
        'Deployment guide',
        'Environment configuration',
        'Third-party integrations documentation',
        'Backup and recovery procedures',
        'Monitoring and alerting setup'
      ],
      business: [
        'User manuals',
        'Admin guides',
        'Training materials',
        'Process documentation',
        'SOP documents',
        'Support contact information'
      ],
      operational: [
        'Access credentials',
        'Hosting details',
        'Domain and SSL certificates',
        'Payment gateway configurations',
        'Email service configurations',
        'Backup locations and schedules'
      ],
      signoff: [
        'Technical signoff',
        'Business signoff',
        'Training completion certificate',
        'Support handover confirmation'
      ]
    };
  }
}

module.exports = AMCGenerator;

