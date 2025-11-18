/**
 * Generation Controller
 * 
 * Controls generation from conversation requirements
 * Converts conversation state to chain input and executes with selected outputs
 */

class GenerationController {
  constructor(logger, chainExecutor, db) {
    this.logger = logger || console;
    this.chainExecutor = chainExecutor;
    this.db = db;
  }

  /**
   * Prepare generation - return available outputs with time estimates
   * @param {string} conversationId - Conversation ID
   * @returns {Object} Available outputs with estimates
   */
  async prepareGeneration(conversationId) {
    const outputs = {
      business: {
        name: 'Business Document',
        description: 'Executive summary, investment analysis, scope breakdown',
        estimatedTime: '30-60 seconds',
        required: true
      },
      technical: {
        name: 'Technical Document',
        description: 'Technical architecture, modules, API specs',
        estimatedTime: '45-90 seconds',
        required: false
      },
      blueprint: {
        name: 'Development Blueprint',
        description: 'Folder structure, database schema, API endpoints, pseudocode',
        estimatedTime: '60-120 seconds',
        required: false
      },
      pseudocode: {
        name: 'Pseudocode',
        description: 'Detailed pseudocode for key modules',
        estimatedTime: '30-60 seconds',
        required: false
      }
    };

    return {
      available: outputs,
      totalEstimatedTime: '3-6 minutes',
      recommendations: ['business', 'technical']
    };
  }

  /**
   * Generate outputs from conversation requirements
   * @param {string} sessionId - Session ID
   * @param {Object} options - Generation options
   * @param {Array} options.outputs - Array of output types to generate
   * @param {Object} options.requirements - Conversation requirements
   * @returns {Object} Generation result
   */
  async generate(sessionId, options = {}) {
    const { outputs = ['business', 'technical'], requirements } = options;

    try {
      // Convert conversation requirements to chain input
      const chainInput = this.convertToChainInput(requirements);

      // Execute chain in conversation mode with progressive output enabled
      const result = await this.chainExecutor.execute(chainInput, {
        mode: 'conversation',
        outputs: outputs,
        sessionId: sessionId,
        enableProgressiveOutput: true // Enable progressive output system
      });

      return {
        success: true,
        outputs: result.outputs || {},
        projectId: result.projectId || null,
        confidence: this.calculateConfidence(requirements),
        generationTime: result.generationTime || null,
        progressiveOutputEnabled: result.progressiveOutputEnabled || false
      };
    } catch (error) {
      this.logger.error('Generation failed', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Convert conversation requirements to chain input format
   * @param {Object} requirements - Conversation requirements
   * @returns {string} Chain input text
   */
  convertToChainInput(requirements) {
    const parts = [];

    // Domain
    if (requirements.domain) {
      parts.push(`I want to build a ${requirements.domain} platform.`);
    }

    // Features
    if (requirements.features && requirements.features.length > 0) {
      parts.push(`Key features include: ${requirements.features.join(', ')}.`);
    }

    // Scale
    if (requirements.scale) {
      parts.push(`Expected scale: ${requirements.scale}.`);
    }

    // Budget
    if (requirements.budget) {
      parts.push(`Budget: ${requirements.budget}.`);
    }

    // Timeline
    if (requirements.timeline) {
      parts.push(`Timeline: ${requirements.timeline}.`);
    }

    // Users
    if (requirements.users) {
      parts.push(`Expected users: ${requirements.users}.`);
    }

    // Technical preferences
    if (requirements.technical && Object.keys(requirements.technical).length > 0) {
      const techParts = [];
      if (requirements.technical.frontend) {
        techParts.push(`Frontend: ${requirements.technical.frontend}`);
      }
      if (requirements.technical.backend) {
        techParts.push(`Backend: ${requirements.technical.backend}`);
      }
      if (requirements.technical.database) {
        techParts.push(`Database: ${requirements.technical.database}`);
      }
      if (requirements.technical.deployment) {
        techParts.push(`Deployment: ${requirements.technical.deployment}`);
      }
      if (techParts.length > 0) {
        parts.push(`Technical preferences: ${techParts.join(', ')}.`);
      }
    }

    // Integrations
    if (requirements.integrations && requirements.integrations.length > 0) {
      parts.push(`Integrations needed: ${requirements.integrations.join(', ')}.`);
    }

    // Constraints
    if (requirements.constraints && requirements.constraints.length > 0) {
      parts.push(`Constraints: ${requirements.constraints.join(', ')}.`);
    }

    // If no parts, return default
    if (parts.length === 0) {
      return 'I want to build a software application.';
    }

    return parts.join(' ');
  }

  /**
   * Calculate confidence score based on requirement completeness
   * @param {Object} requirements - Requirements object
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(requirements) {
    let score = 0;
    let maxScore = 0;

    // Domain (required)
    maxScore += 20;
    if (requirements.domain) score += 20;

    // Features (required)
    maxScore += 25;
    if (requirements.features && requirements.features.length > 0) {
      score += Math.min(25, requirements.features.length * 5);
    }

    // Budget (important)
    maxScore += 15;
    if (requirements.budget) score += 15;

    // Timeline (important)
    maxScore += 15;
    if (requirements.timeline) score += 15;

    // Scale (important)
    maxScore += 10;
    if (requirements.scale) score += 10;

    // Technical (optional but helpful)
    maxScore += 10;
    if (requirements.technical && Object.keys(requirements.technical).length > 0) {
      score += Math.min(10, Object.keys(requirements.technical).length * 3);
    }

    // Integrations (optional)
    maxScore += 5;
    if (requirements.integrations && requirements.integrations.length > 0) {
      score += Math.min(5, requirements.integrations.length * 2);
    }

    return Math.min(1.0, score / maxScore);
  }
}

module.exports = GenerationController;

