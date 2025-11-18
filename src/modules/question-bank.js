/**
 * Question Bank
 * 
 * Manages categorized questions for conversational requirement gathering
 * Provides smart question selection based on current state
 */

class QuestionBank {
  constructor(logger) {
    this.logger = logger || console;
    
    // Define question categories
    this.questions = {
      discovery: {
        initial: "What type of software are you looking to build?",
        followups: {
          'ecommerce': [
            "Is this a B2C or B2B marketplace?",
            "Will you have a single vendor or multiple vendors?",
            "What's the expected catalog size? (e.g., 100, 1,000, 10,000 products)"
          ],
          'saas': [
            "What problem does your SaaS solve?",
            "Who are your target users?",
            "What subscription model are you planning? (monthly, annual, usage-based)"
          ],
          'mobile-app': [
            "Will this be iOS, Android, or both?",
            "Do you prefer native or cross-platform development?",
            "Does the app need to work offline?"
          ],
          'marketplace': [
            "What type of marketplace? (products, services, rentals)",
            "How will transactions be handled?",
            "Do you need review and rating systems?"
          ],
          'erp': [
            "Which business functions need to be covered? (finance, HR, inventory, etc.)",
            "How many users will use the system?",
            "Do you need integration with existing systems?"
          ],
          'hrms': [
            "Which HR functions are priority? (payroll, attendance, recruitment, etc.)",
            "How many employees will be in the system?",
            "Do you need mobile access for employees?"
          ]
        }
      },
      
      scoping: {
        budget: {
          question: "What's your budget range for this project?",
          followups: {
            'low': "With this budget, we'll need to prioritize. What's absolutely essential for launch?",
            'medium': "Good budget. Are you open to phased development?",
            'high': "Excellent. Should we plan for scalability from day one?"
          }
        },
        timeline: {
          question: "When do you need this completed?",
          followups: {
            'urgent': "Tight timeline. What features can we defer to Phase 2?",
            'normal': "Reasonable timeline. Should we include testing and documentation?",
            'flexible': "Flexible timeline allows for thorough development. Any specific milestones?"
          }
        },
        users: {
          question: "How many users do you expect? (concurrent and total)",
          followups: {
            'small': "Small user base allows simpler architecture. Any growth plans?",
            'medium': "Medium scale. Should we plan for horizontal scaling?",
            'large': "Large scale requires robust infrastructure. Any peak usage patterns?"
          }
        },
        features: {
          question: "What are the must-have features for launch?",
          followups: {
            'minimal': "MVP approach. What's the absolute minimum viable product?",
            'standard': "Standard feature set. Any unique requirements?",
            'comprehensive': "Comprehensive features. Should we prioritize by business value?"
          }
        }
      },
      
      technical: {
        preferences: {
          question: "Any technology preferences or constraints?",
          followups: {
            'frontend': "Any frontend framework preferences? (React, Vue, Angular, or no preference)",
            'backend': "Backend language preference? (Node.js, Python, Java, or no preference)",
            'database': "Database preference? (PostgreSQL, MySQL, MongoDB, or no preference)"
          }
        },
        integrations: {
          question: "What systems need to integrate with this? (payment gateways, third-party APIs, existing systems)",
          followups: {
            'payment': "Which payment gateway? (Razorpay, Stripe, PayPal, or custom)",
            'api': "Any specific third-party APIs? (SMS, email, analytics, etc.)",
            'existing': "What existing systems need integration? (ERP, CRM, accounting software)"
          }
        },
        deployment: {
          question: "Where will this be deployed? (Cloud, on-premise, hybrid)",
          followups: {
            'cloud': "Which cloud provider? (AWS, Azure, GCP, or no preference)",
            'on-premise': "What's your infrastructure setup?",
            'hybrid': "Which components go where?"
          }
        }
      },
      
      constraints: {
        compliance: {
          question: "Any compliance requirements? (GDPR, HIPAA, PCI-DSS, etc.)",
          followups: {}
        },
        security: {
          question: "Any specific security requirements? (2FA, SSO, encryption standards)",
          followups: {}
        },
        accessibility: {
          question: "Do you need accessibility compliance? (WCAG 2.1, Section 508)",
          followups: {}
        },
        localization: {
          question: "Do you need multi-language support?",
          followups: {
            'yes': "Which languages? How many initially?"
          }
        }
      }
    };
  }

  /**
   * Get smart question based on current state
   * @param {Object} state - Current conversation state
   * @returns {string|null} Next question or null if complete
   */
  getSmartQuestion(state) {
    const stage = state.stage;
    const requirements = state.requirements;
    
    // Stage-specific question selection
    switch (stage) {
      case 'discovery':
        return this.getDiscoveryQuestion(requirements);
        
      case 'scoping':
        return this.getScopingQuestion(requirements);
        
      case 'technical':
        return this.getTechnicalQuestion(requirements);
        
      case 'constraints':
        return this.getConstraintQuestion(requirements);
        
      default:
        return null;
    }
  }

  /**
   * Get discovery stage question
   * @param {Object} requirements - Current requirements
   * @returns {string} Question text
   */
  getDiscoveryQuestion(requirements) {
    // If no domain, ask initial question
    if (!requirements.domain) {
      return this.questions.discovery.initial;
    }
    
    // If domain exists but no followups asked, get domain-specific followups
    const domain = requirements.domain.toLowerCase();
    const followups = this.questions.discovery.followups[domain];
    
    if (followups && followups.length > 0) {
      // Check which followups haven't been answered
      const answeredCount = this.countAnsweredFollowups(requirements, domain);
      
      if (answeredCount < followups.length) {
        return followups[answeredCount];
      }
    }
    
    // Discovery complete, move to scoping
    return null;
  }

  /**
   * Get scoping stage question
   * @param {Object} requirements - Current requirements
   * @returns {string} Question text
   */
  getScopingQuestion(requirements) {
    // Priority order: budget, timeline, users, features
    if (!requirements.budget) {
      return this.questions.scoping.budget.question;
    }
    
    if (!requirements.timeline) {
      return this.questions.scoping.timeline.question;
    }
    
    if (!requirements.users) {
      return this.questions.scoping.users.question;
    }
    
    if (requirements.features.length < 3) {
      return this.questions.scoping.features.question;
    }
    
    // Scoping complete
    return null;
  }

  /**
   * Get technical stage question
   * @param {Object} requirements - Current requirements
   * @returns {string} Question text
   */
  getTechnicalQuestion(requirements) {
    // Check if technical preferences are missing
    if (!requirements.technical || Object.keys(requirements.technical).length === 0) {
      return this.questions.technical.preferences.question;
    }
    
    // Check if integrations are missing
    if (!requirements.integrations || requirements.integrations.length === 0) {
      return this.questions.technical.integrations.question;
    }
    
    // Check if deployment is missing
    if (!requirements.technical.deployment) {
      return this.questions.technical.deployment.question;
    }
    
    // Technical complete
    return null;
  }

  /**
   * Get constraint stage question
   * @param {Object} requirements - Current requirements
   * @returns {string} Question text
   */
  getConstraintQuestion(requirements) {
    // Constraints are optional, but ask if not mentioned
    if (!requirements.constraints || requirements.constraints.length === 0) {
      // Ask about compliance first (most common)
      return this.questions.constraints.compliance.question;
    }
    
    // Check for specific constraints
    const constraints = requirements.constraints.map(c => c.toLowerCase());
    
    if (!constraints.some(c => c.includes('security') || c.includes('2fa') || c.includes('sso'))) {
      return this.questions.constraints.security.question;
    }
    
    if (!constraints.some(c => c.includes('accessibility') || c.includes('wcag'))) {
      return this.questions.constraints.accessibility.question;
    }
    
    if (!constraints.some(c => c.includes('language') || c.includes('localization') || c.includes('i18n'))) {
      return this.questions.constraints.localization.question;
    }
    
    // Constraints complete
    return null;
  }

  /**
   * Count answered followups for a domain
   * @param {Object} requirements - Current requirements
   * @param {string} domain - Domain identifier
   * @returns {number} Count of answered followups
   */
  countAnsweredFollowups(requirements, domain) {
    let count = 0;
    
    // Domain-specific logic to count answered questions
    if (domain === 'ecommerce') {
      if (requirements.features.some(f => f.toLowerCase().includes('b2c') || f.toLowerCase().includes('b2b'))) count++;
      if (requirements.features.some(f => f.toLowerCase().includes('vendor') || f.toLowerCase().includes('multi'))) count++;
      if (requirements.scale) count++;
    } else if (domain === 'saas') {
      if (requirements.features.length > 0) count++;
      if (requirements.users) count++;
      if (requirements.technical && requirements.technical.subscription) count++;
    } else if (domain === 'mobile-app') {
      if (requirements.technical && requirements.technical.platform) count++;
      if (requirements.technical && requirements.technical.framework) count++;
      if (requirements.features.some(f => f.toLowerCase().includes('offline'))) count++;
    }
    
    return count;
  }

  /**
   * Get followup question based on answer
   * @param {string} category - Question category
   * @param {string} answer - User's answer
   * @returns {string|null} Followup question or null
   */
  getFollowupQuestion(category, answer) {
    // Analyze answer to determine followup
    const answerLower = answer.toLowerCase();
    
    if (category === 'budget') {
      const budget = this.parseBudget(answer);
      if (budget < 5) {
        return this.questions.scoping.budget.followups.low;
      } else if (budget < 50) {
        return this.questions.scoping.budget.followups.medium;
      } else {
        return this.questions.scoping.budget.followups.high;
      }
    }
    
    if (category === 'timeline') {
      if (answerLower.includes('urgent') || answerLower.includes('asap') || answerLower.includes('soon')) {
        return this.questions.scoping.timeline.followups.urgent;
      } else if (answerLower.includes('flexible') || answerLower.includes('no rush')) {
        return this.questions.scoping.timeline.followups.flexible;
      } else {
        return this.questions.scoping.timeline.followups.normal;
      }
    }
    
    if (category === 'users') {
      const userCount = this.parseUserCount(answer);
      if (userCount < 100) {
        return this.questions.scoping.users.followups.small;
      } else if (userCount < 10000) {
        return this.questions.scoping.users.followups.medium;
      } else {
        return this.questions.scoping.users.followups.large;
      }
    }
    
    return null;
  }

  /**
   * Parse budget from text
   * @param {string} text - Budget text
   * @returns {number} Budget in lakhs
   */
  parseBudget(text) {
    const match = text.match(/(\d+)\s*(L|lakh|lakhs|Cr|crore|crores)/i);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.includes('cr') || unit.includes('crore')) {
        return amount * 100;
      }
      return amount;
    }
    
    // Try to extract number
    const numbers = text.match(/\d+/);
    if (numbers) {
      const num = parseInt(numbers[0]);
      if (num > 100) {
        return num / 100; // Assume crores if > 100
      }
      return num;
    }
    
    return 10; // Default
  }

  /**
   * Parse user count from text
   * @param {string} text - User count text
   * @returns {number} User count
   */
  parseUserCount(text) {
    const numbers = text.match(/\d+/);
    if (numbers) {
      return parseInt(numbers[0]);
    }
    
    // Check for keywords
    const textLower = text.toLowerCase();
    if (textLower.includes('thousand') || textLower.includes('k')) {
      const match = text.match(/(\d+)\s*(k|thousand)/i);
      if (match) {
        return parseInt(match[1]) * 1000;
      }
    }
    
    if (textLower.includes('million') || textLower.includes('m')) {
      const match = text.match(/(\d+)\s*(m|million)/i);
      if (match) {
        return parseInt(match[1]) * 1000000;
      }
    }
    
    return 100; // Default
  }

  /**
   * Get all questions for a stage (for testing/debugging)
   * @param {string} stage - Stage identifier
   * @returns {Array} Array of questions
   */
  getAllQuestionsForStage(stage) {
    const questions = [];
    
    switch (stage) {
      case 'discovery':
        questions.push(this.questions.discovery.initial);
        Object.values(this.questions.discovery.followups).forEach(followupArray => {
          questions.push(...followupArray);
        });
        break;
        
      case 'scoping':
        questions.push(this.questions.scoping.budget.question);
        questions.push(this.questions.scoping.timeline.question);
        questions.push(this.questions.scoping.users.question);
        questions.push(this.questions.scoping.features.question);
        break;
        
      case 'technical':
        questions.push(this.questions.technical.preferences.question);
        questions.push(this.questions.technical.integrations.question);
        questions.push(this.questions.technical.deployment.question);
        break;
        
      case 'constraints':
        questions.push(this.questions.constraints.compliance.question);
        questions.push(this.questions.constraints.security.question);
        questions.push(this.questions.constraints.accessibility.question);
        questions.push(this.questions.constraints.localization.question);
        break;
    }
    
    return questions;
  }
}

module.exports = QuestionBank;

