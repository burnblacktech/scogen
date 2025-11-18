/**
 * Conversation Engine
 * 
 * Manages conversational requirement gathering through intelligent dialogue
 * Two-phase model: Requirement gathering → Generation (only when confirmed)
 */

class ConversationEngine {
  constructor(logger, questionBank, requirementExtractor) {
    this.logger = logger || console;
    this.questionBank = questionBank;
    this.requirementExtractor = requirementExtractor;
    
    // Define conversation stages
    this.stages = {
      'discovery': {
        name: 'Discovery',
        description: 'Understanding what you want to build',
        minAnswers: 3,
        weight: 0.3
      },
      'scoping': {
        name: 'Scoping',
        description: 'Defining scope, budget, and timeline',
        minAnswers: 5,
        weight: 0.4
      },
      'technical': {
        name: 'Technical',
        description: 'Technical preferences and constraints',
        minAnswers: 3,
        weight: 0.2
      },
      'constraints': {
        name: 'Constraints',
        description: 'Final constraints and preferences',
        minAnswers: 2,
        weight: 0.1
      }
    };
    
    // Initialize state
    this.resetState();
  }

  /**
   * Reset conversation state
   */
  resetState() {
    this.state = {
      stage: 'discovery',
      completeness: 0,
      requirements: {
        domain: null,
        features: [],
        scale: null,
        budget: null,
        timeline: null,
        users: null,
        technical: {},
        integrations: [],
        constraints: []
      },
      conversation: [],
      unanswered: [],
      suggestions: [],
      stageProgress: {
        discovery: 0,
        scoping: 0,
        technical: 0,
        constraints: 0
      }
    };
  }

  /**
   * Process user input and update conversation state
   * @param {string} input - User input text
   * @param {Object} existingState - Existing conversation state (for resume)
   * @returns {Object} Response with next question, completeness, suggestions, preview
   */
  async processInput(input, existingState = null) {
    try {
      // Restore state if provided
      if (existingState) {
        this.state = existingState;
      }

      // Extract requirements from input
      const extracted = await this.requirementExtractor.extractFromText(input);
      
      // Update state with extracted information
      this.updateState(extracted);
      
      // Add to conversation history
      this.state.conversation.push({
        role: 'user',
        content: input,
        extracted: extracted,
        timestamp: new Date().toISOString()
      });
      
      // Calculate completeness
      this.calculateCompleteness();
      
      // Detect implicit requirements
      const implicit = this.requirementExtractor.detectImplicitRequirements(
        this.state.requirements
      );
      if (implicit && Object.keys(implicit).length > 0) {
        this.updateState(implicit);
        this.calculateCompleteness();
      }
      
      // Determine next stage if current stage is complete
      this.advanceStageIfNeeded();
      
      // Get next interaction (question or suggestion)
      const next = this.getNextInteraction();
      
      // Generate bot response
      const botResponse = this.generateBotResponse(extracted, next);
      
      // Add bot response to conversation
      this.state.conversation.push({
        role: 'bot',
        content: botResponse,
        question: next.question,
        suggestions: next.suggestions,
        timestamp: new Date().toISOString()
      });
      
      // Generate preview if completeness is sufficient
      let preview = null;
      if (this.state.completeness >= 60) {
        preview = this.generatePreview();
      }
      
      return {
        success: true,
        completeness: this.state.completeness,
        canGenerate: this.state.completeness >= 85,
        stage: this.state.stage,
        stageName: this.stages[this.state.stage].name,
        botResponse: botResponse,
        nextQuestion: next.question,
        suggestions: next.suggestions,
        preview: preview,
        requirements: this.state.requirements,
        state: this.state
      };
    } catch (error) {
      this.logger.error('Conversation processing failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Update state with extracted requirements
   * @param {Object} extracted - Extracted requirements
   */
  updateState(extracted) {
    if (extracted.domain) {
      this.state.requirements.domain = extracted.domain;
    }
    
    if (extracted.features && Array.isArray(extracted.features)) {
      extracted.features.forEach(feature => {
        if (!this.state.requirements.features.includes(feature)) {
          this.state.requirements.features.push(feature);
        }
      });
    }
    
    if (extracted.scale) {
      this.state.requirements.scale = extracted.scale;
    }
    
    if (extracted.budget) {
      this.state.requirements.budget = extracted.budget;
    }
    
    if (extracted.timeline) {
      this.state.requirements.timeline = extracted.timeline;
    }
    
    if (extracted.users) {
      this.state.requirements.users = extracted.users;
    }
    
    if (extracted.technical) {
      Object.assign(this.state.requirements.technical, extracted.technical);
    }
    
    if (extracted.integrations && Array.isArray(extracted.integrations)) {
      extracted.integrations.forEach(integration => {
        if (!this.state.requirements.integrations.includes(integration)) {
          this.state.requirements.integrations.push(integration);
        }
      });
    }
    
    if (extracted.constraints && Array.isArray(extracted.constraints)) {
      extracted.constraints.forEach(constraint => {
        if (!this.state.requirements.constraints.includes(constraint)) {
          this.state.requirements.constraints.push(constraint);
        }
      });
    }
  }

  /**
   * Calculate overall completeness percentage
   */
  calculateCompleteness() {
    let totalScore = 0;
    let maxScore = 0;
    
    // Stage-based scoring
    Object.keys(this.stages).forEach(stageKey => {
      const stage = this.stages[stageKey];
      const stageScore = this.calculateStageCompleteness(stageKey);
      this.state.stageProgress[stageKey] = stageScore;
      
      totalScore += stageScore * stage.weight;
      maxScore += 100 * stage.weight;
    });
    
    // Overall completeness
    this.state.completeness = Math.round((totalScore / maxScore) * 100);
    
    // Identify unanswered critical questions
    this.identifyUnanswered();
  }

  /**
   * Calculate completeness for a specific stage
   * @param {string} stageKey - Stage identifier
   * @returns {number} Completeness score (0-100)
   */
  calculateStageCompleteness(stageKey) {
    const requirements = this.state.requirements;
    
    switch (stageKey) {
      case 'discovery':
        let discoveryScore = 0;
        if (requirements.domain) discoveryScore += 40;
        if (requirements.features.length > 0) discoveryScore += 30;
        if (requirements.scale) discoveryScore += 30;
        return Math.min(discoveryScore, 100);
        
      case 'scoping':
        let scopingScore = 0;
        if (requirements.budget) scopingScore += 30;
        if (requirements.timeline) scopingScore += 30;
        if (requirements.users) scopingScore += 20;
        if (requirements.features.length >= 3) scopingScore += 20;
        return Math.min(scopingScore, 100);
        
      case 'technical':
        let technicalScore = 0;
        if (Object.keys(requirements.technical).length > 0) technicalScore += 40;
        if (requirements.integrations.length > 0) technicalScore += 30;
        if (requirements.constraints.length > 0) technicalScore += 30;
        return Math.min(technicalScore, 100);
        
      case 'constraints':
        // Constraints are optional, so lower weight
        return requirements.constraints.length > 0 ? 100 : 50;
        
      default:
        return 0;
    }
  }

  /**
   * Identify unanswered critical questions
   */
  identifyUnanswered() {
    this.state.unanswered = [];
    const requirements = this.state.requirements;
    
    if (!requirements.domain) {
      this.state.unanswered.push({
        question: 'What type of software are you building?',
        category: 'discovery',
        critical: true
      });
    }
    
    if (requirements.features.length === 0) {
      this.state.unanswered.push({
        question: 'What are the main features you need?',
        category: 'discovery',
        critical: true
      });
    }
    
    if (!requirements.budget) {
      this.state.unanswered.push({
        question: 'What is your budget range?',
        category: 'scoping',
        critical: true
      });
    }
    
    if (!requirements.timeline) {
      this.state.unanswered.push({
        question: 'When do you need this completed?',
        category: 'scoping',
        critical: true
      });
    }
    
    if (!requirements.users) {
      this.state.unanswered.push({
        question: 'How many users do you expect?',
        category: 'scoping',
        critical: false
      });
    }
  }

  /**
   * Advance to next stage if current stage is complete
   */
  advanceStageIfNeeded() {
    const currentStageProgress = this.state.stageProgress[this.state.stage];
    const currentStage = this.stages[this.state.stage];
    
    // Check if current stage is sufficiently complete
    if (currentStageProgress >= 80) {
      const stageOrder = ['discovery', 'scoping', 'technical', 'constraints'];
      const currentIndex = stageOrder.indexOf(this.state.stage);
      
      if (currentIndex < stageOrder.length - 1) {
        // Move to next stage
        this.state.stage = stageOrder[currentIndex + 1];
        this.logger.info('Advanced to next stage', {
          from: stageOrder[currentIndex],
          to: this.state.stage
        });
      }
    }
  }

  /**
   * Get next interaction (question or suggestions)
   * @returns {Object} Next question and suggestions
   */
  getNextInteraction() {
    // Use question bank to get smart question
    const question = this.questionBank.getSmartQuestion(this.state);
    
    // Generate contextual suggestions
    const suggestions = this.generateSuggestions();
    
    return {
      question: question,
      suggestions: suggestions
    };
  }

  /**
   * Generate contextual suggestions based on current state
   * @returns {Array} Array of suggestion strings
   */
  generateSuggestions() {
    const suggestions = [];
    const requirements = this.state.requirements;
    
    // Stage-specific suggestions
    if (this.state.stage === 'discovery') {
      if (!requirements.domain) {
        suggestions.push('E-commerce platform');
        suggestions.push('SaaS application');
        suggestions.push('Mobile app');
        suggestions.push('Marketplace');
      } else if (requirements.domain === 'ecommerce' && requirements.features.length === 0) {
        suggestions.push('Product catalog');
        suggestions.push('Shopping cart');
        suggestions.push('Payment integration');
        suggestions.push('Order management');
      }
    } else if (this.state.stage === 'scoping') {
      if (!requirements.budget) {
        suggestions.push('₹5L - ₹50L');
        suggestions.push('₹50L - ₹5Cr');
        suggestions.push('₹5Cr+');
      }
      if (!requirements.timeline) {
        suggestions.push('3 months');
        suggestions.push('6 months');
        suggestions.push('1 year');
      }
    }
    
    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  /**
   * Generate bot response based on extracted data and next question
   * @param {Object} extracted - Extracted requirements
   * @param {Object} next - Next interaction data
   * @returns {string} Bot response text
   */
  generateBotResponse(extracted, next) {
    let response = '';
    
    // Acknowledge extracted information
    if (extracted.domain) {
      response += `Great! I see you're building a ${extracted.domain} platform. `;
    }
    
    if (extracted.features && extracted.features.length > 0) {
      response += `I've noted features like ${extracted.features.slice(0, 3).join(', ')}. `;
    }
    
    // Add next question
    if (next.question) {
      response += next.question;
    } else {
      response += 'Tell me more about your project requirements.';
    }
    
    return response.trim();
  }

  /**
   * Generate template-based preview without chain execution
   * @returns {Object} Preview data
   */
  generatePreview() {
    const requirements = this.state.requirements;
    
    // Use prescriptive engine for architecture suggestions
    const PrescriptiveEngine = require('./prescriptive-engine');
    const prescriptiveEngine = new PrescriptiveEngine(this.logger);
    
    let prescription = null;
    if (requirements.domain) {
      try {
        prescription = prescriptiveEngine.prescribe(requirements.domain, {
          modules: requirements.features,
          scale: requirements.scale,
          teamSize: this.estimateTeamSize(requirements),
          timeline: requirements.timeline
        });
      } catch (error) {
        this.logger.warn('Prescription generation failed in preview', { error: error.message });
      }
    }
    
    // Template-based estimates
    const moduleCount = this.estimateModuleCount(requirements);
    const complexity = this.estimateComplexity(requirements);
    const timeline = this.estimateTimeline(requirements, prescription);
    const costRange = this.estimateCostRange(requirements, prescription);
    const architecture = prescription?.prescription?.architecture || null;
    
    // Identify missing critical information
    const missingCritical = this.getMissingCritical();
    
    // Format architecture for display
    let architectureDisplay = '-';
    let teamSize = '-';
    if (architecture) {
      if (typeof architecture === 'object') {
        architectureDisplay = architecture.type || architecture.architecture || '-';
        teamSize = architecture.team || architecture.teamSize || '-';
      } else {
        architectureDisplay = architecture;
      }
    }
    
    // If team size not in architecture, estimate it
    if (teamSize === '-') {
      teamSize = this.estimateTeamSize(requirements);
    }
    
    return {
      estimatedModules: moduleCount,
      complexity: complexity,
      roughTimeline: timeline,
      roughCost: costRange,
      architecture: architectureDisplay,
      teamSize: teamSize,
      missingCritical: missingCritical,
      confidence: this.calculatePreviewConfidence(),
      requirements: this.state.requirements // Include for UI display
    };
  }

  /**
   * Estimate module count based on requirements
   * @param {Object} requirements - Requirements object
   * @returns {number} Estimated module count
   */
  estimateModuleCount(requirements) {
    let count = requirements.features.length;
    
    // Add implicit modules based on domain
    if (requirements.domain === 'ecommerce') {
      count += 3; // auth, payment, inventory (implicit)
    } else if (requirements.domain === 'saas') {
      count += 2; // auth, billing (implicit)
    } else if (requirements.domain === 'mobile-app') {
      count += 2; // auth, push notifications (implicit)
    }
    
    return Math.max(count, 5); // Minimum 5 modules
  }

  /**
   * Estimate complexity based on requirements
   * @param {Object} requirements - Requirements object
   * @returns {string} Complexity level
   */
  estimateComplexity(requirements) {
    let score = 0;
    
    if (requirements.features.length > 10) score += 2;
    else if (requirements.features.length > 5) score += 1;
    
    if (requirements.integrations.length > 3) score += 2;
    else if (requirements.integrations.length > 0) score += 1;
    
    if (requirements.scale === 'enterprise' || requirements.scale === 'enterprise-plus') score += 2;
    else if (requirements.scale === 'sme') score += 1;
    
    if (score >= 5) return 'very-high';
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  /**
   * Estimate timeline based on requirements and prescription
   * @param {Object} requirements - Requirements object
   * @param {Object} prescription - Prescription object
   * @returns {string} Timeline estimate
   */
  estimateTimeline(requirements, prescription) {
    if (prescription?.prescription?.timeline) {
      return prescription.prescription.timeline;
    }
    
    if (requirements.timeline) {
      return requirements.timeline;
    }
    
    // Default estimates based on complexity
    const complexity = this.estimateComplexity(requirements);
    const moduleCount = this.estimateModuleCount(requirements);
    
    if (complexity === 'very-high' || moduleCount > 15) {
      return '8-12 months';
    } else if (complexity === 'high' || moduleCount > 10) {
      return '6-8 months';
    } else if (complexity === 'medium' || moduleCount > 5) {
      return '3-6 months';
    }
    return '2-4 months';
  }

  /**
   * Estimate cost range based on requirements and prescription
   * @param {Object} requirements - Requirements object
   * @param {Object} prescription - Prescription object
   * @returns {string} Cost range estimate
   */
  estimateCostRange(requirements, prescription) {
    if (requirements.budget) {
      // If budget provided, show range around it
      const budgetLakhs = this.parseBudget(requirements.budget);
      const minBudget = Math.round(budgetLakhs * 0.8);
      const maxBudget = Math.round(budgetLakhs * 1.2);
      return `₹${minBudget}L - ₹${maxBudget}L`;
    }
    
    // Estimate based on complexity and modules
    const complexity = this.estimateComplexity(requirements);
    const moduleCount = this.estimateModuleCount(requirements);
    
    const baseCosts = {
      'very-high': 50,
      'high': 25,
      'medium': 10,
      'low': 5
    };
    
    const moduleMultiplier = 1 + (moduleCount - 5) * 0.1;
    const estimatedCost = baseCosts[complexity] * moduleMultiplier;
    
    return `₹${Math.round(estimatedCost * 0.8)}L - ₹${Math.round(estimatedCost * 1.2)}L`;
  }

  /**
   * Parse budget string to number (in lakhs)
   * @param {string} budget - Budget string
   * @returns {number} Budget in lakhs
   */
  parseBudget(budget) {
    if (typeof budget === 'number') return budget;
    
    const match = budget.match(/(\d+)\s*(L|lakh|lakhs|Cr|crore|crores)/i);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.includes('cr') || unit.includes('crore')) {
        return amount * 100; // Convert crores to lakhs
      }
      return amount;
    }
    
    return 10; // Default
  }

  /**
   * Estimate team size based on requirements
   * @param {Object} requirements - Requirements object
   * @returns {number} Team size
   */
  estimateTeamSize(requirements) {
    const complexity = this.estimateComplexity(requirements);
    const moduleCount = this.estimateModuleCount(requirements);
    
    if (complexity === 'very-high' || moduleCount > 15) {
      return 8;
    } else if (complexity === 'high' || moduleCount > 10) {
      return 6;
    } else if (complexity === 'medium' || moduleCount > 5) {
      return 4;
    }
    return 3;
  }

  /**
   * Get missing critical information
   * @returns {Array} Array of missing critical items
   */
  getMissingCritical() {
    return this.state.unanswered
      .filter(item => item.critical)
      .map(item => item.question);
  }

  /**
   * Calculate preview confidence based on completeness
   * @returns {number} Confidence score (0-1)
   */
  calculatePreviewConfidence() {
    const completeness = this.state.completeness;
    
    if (completeness >= 85) return 0.9;
    if (completeness >= 70) return 0.75;
    if (completeness >= 60) return 0.6;
    return 0.4;
  }

  /**
   * Get current state
   * @returns {Object} Current conversation state
   */
  getState() {
    return this.state;
  }

  /**
   * Set state (for resume)
   * @param {Object} state - State to restore
   */
  setState(state) {
    this.state = state;
  }
}

module.exports = ConversationEngine;

