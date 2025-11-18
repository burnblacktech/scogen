/**
 * Feedback Automator Module
 * 
 * Purpose: Automate feedback collection from completed projects
 * Philosophy: Make it easy for clients to provide actuals, learn from every project
 */

const crypto = require('crypto');

class FeedbackAutomator {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
    this.feedbackTokenExpiryDays = 30; // Tokens expire after 30 days
  }

  /**
   * Generate secure feedback URL with token
   * @param {number|string} projectId - Project ID or code
   * @returns {Promise<Object>} - Feedback request with URL and token
   */
  async createFeedbackRequest(projectId) {
    try {
      // Get project to verify it exists
      const project = this.db.getProject ? this.db.getProject(projectId) : null;
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Generate secure token
      const token = this.generateSecureToken(projectId);
      
      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.feedbackTokenExpiryDays);
      
      // Create feedback URL
      const feedbackUrl = `/api/projects/${projectId}/feedback?token=${token}`;
      
      // Store feedback request in database (if feedback_requests table exists)
      // For now, we'll store token in project notes or use a simple approach
      // In production, you might want a dedicated feedback_requests table
      
      this.logger.info('Feedback request created', {
        projectId,
        token: token.substring(0, 8) + '...',
        expiresAt: expiresAt.toISOString()
      });

      return {
        success: true,
        projectId,
        token,
        feedbackUrl,
        expiresAt: expiresAt.toISOString(),
        expiresInDays: this.feedbackTokenExpiryDays
      };
    } catch (error) {
      this.logger.error('Failed to create feedback request', {
        projectId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process submitted feedback
   * @param {number|string} projectId - Project ID or code
   * @param {string} token - Feedback token
   * @param {Object} actualData - Actual project data
   * @returns {Promise<Object>} - Processing result
   */
  async processFeedback(projectId, token, actualData) {
    try {
      // Validate token
      const isValid = this.validateToken(token, projectId);
      if (!isValid) {
        throw new Error('Invalid or expired feedback token');
      }

      // Get project
      const project = this.db.getProject ? this.db.getProject(projectId) : null;
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Calculate variances
      const variances = this.calculateVariances(project, actualData);

      // Update project with actuals
      if (this.db.updateProjectActuals) {
        this.db.updateProjectActuals(projectId, {
          cost: actualData.cost,
          timeline: actualData.timeline || actualData.days,
          scopeCreep: actualData.scopeCreep || 0,
          status: 'completed'
        });
      }

      // Update hidden cost actuals if provided
      if (actualData.hiddenCosts && Array.isArray(actualData.hiddenCosts)) {
        await this.updateHiddenCostActuals(projectId, actualData.hiddenCosts);
      }

      // Trigger learning system
      await this.triggerLearning(projectId, variances);

      this.logger.info('Feedback processed successfully', {
        projectId,
        variances: {
          costVariance: variances.costVariance,
          timelineVariance: variances.timelineVariance
        }
      });

      return {
        success: true,
        message: 'Feedback processed successfully',
        variances
      };
    } catch (error) {
      this.logger.error('Failed to process feedback', {
        projectId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate variances between estimated and actual
   * @param {Object} project - Project object
   * @param {Object} actualData - Actual data
   * @returns {Object} - Variance calculations
   */
  calculateVariances(project, actualData) {
    const estimatedCost = project.quoted_cost || project.base_estimate?.cost?.total || 0;
    const estimatedDays = project.quoted_timeline_days || project.base_estimate?.timeline?.days || 0;
    
    const actualCost = actualData.cost || 0;
    const actualDays = actualData.timeline || actualData.days || 0;

    const costVariance = estimatedCost > 0 
      ? ((actualCost - estimatedCost) / estimatedCost) * 100 
      : 0;
    
    const timelineVariance = estimatedDays > 0
      ? ((actualDays - estimatedDays) / estimatedDays) * 100
      : 0;

    // Module-level variances
    const moduleVariances = {};
    if (actualData.moduleActuals && project.refined_scope?.modules) {
      for (const module of project.refined_scope.modules) {
        const moduleName = module.name || module.displayName;
        const estimated = module.effort || module.days || module.estimatedDays || 0;
        const actual = actualData.moduleActuals[moduleName] || estimated;
        
        if (estimated > 0) {
          moduleVariances[moduleName] = {
            estimated,
            actual,
            variance: ((actual - estimated) / estimated) * 100
          };
        }
      }
    }

    // Scope creep calculation
    const scopeCreep = actualData.scopeCreep || 0;

    return {
      costVariance,
      timelineVariance,
      moduleVariances,
      scopeCreep,
      estimated: {
        cost: estimatedCost,
        days: estimatedDays
      },
      actual: {
        cost: actualCost,
        days: actualDays
      }
    };
  }

  /**
   * Trigger learning system to process variances
   * @param {number|string} projectId - Project ID
   * @param {Object} variances - Variance calculations
   * @returns {Promise<void>}
   */
  async triggerLearning(projectId, variances) {
    try {
      // Use LearningOrchestrator if available, otherwise use PatternLearner directly
      try {
        const LearningOrchestrator = require('./learning-orchestrator');
        // Note: LearningOrchestrator needs library, so we'll use PatternLearner directly for now
        // In production, you'd pass library to FeedbackAutomator constructor
      } catch {
        // Fallback to direct PatternLearner
      }
      
      // Trigger pattern learning
      const PatternLearner = require('./pattern-learner');
      const patternLearner = new PatternLearner(this.db, this.logger, this.config);
      
      await patternLearner.learn(projectId);
      
      this.logger.info('Learning triggered and completed', {
        projectId,
        hasSignificantVariance: Math.abs(variances.costVariance) > 15 || Math.abs(variances.timelineVariance) > 15
      });
    } catch (error) {
      this.logger.warn('Failed to trigger learning', {
        projectId,
        error: error.message
      });
      // Don't throw - learning failure shouldn't block feedback processing
    }
  }

  /**
   * Update hidden cost actuals
   * @param {number|string} projectId - Project ID
   * @param {Array} hiddenCosts - Array of hidden cost actuals
   * @returns {Promise<void>}
   */
  async updateHiddenCostActuals(projectId, hiddenCosts) {
    try {
      // Get project to get project ID (if projectId is code)
      const project = this.db.getProject ? this.db.getProject(projectId) : null;
      const projectIdNum = project?.id || projectId;

      if (!this.db.db || !projectIdNum) {
        this.logger.warn('Cannot update hidden cost actuals - database or project ID not available');
        return;
      }

      // Delete existing hidden cost actuals for this project
      const deleteStmt = this.db.db.prepare('DELETE FROM hidden_cost_actuals WHERE project_id = ?');
      deleteStmt.run(projectIdNum);

      // Insert new hidden cost actuals
      const insertStmt = this.db.db.prepare(`
        INSERT INTO hidden_cost_actuals (
          project_id, cost_type, estimated_percentage, estimated_amount,
          actual_percentage, actual_amount, variance
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const cost of hiddenCosts) {
        const variance = cost.estimated_amount > 0
          ? ((cost.actual_amount - cost.estimated_amount) / cost.estimated_amount) * 100
          : 0;

        insertStmt.run(
          projectIdNum,
          cost.cost_type || cost.type,
          cost.estimated_percentage || 0,
          cost.estimated_amount || 0,
          cost.actual_percentage || 0,
          cost.actual_amount || 0,
          variance
        );
      }

      this.logger.info('Hidden cost actuals updated', {
        projectId: projectIdNum,
        count: hiddenCosts.length
      });
    } catch (error) {
      this.logger.warn('Failed to update hidden cost actuals', {
        projectId,
        error: error.message
      });
      // Don't throw - hidden cost update failure shouldn't block feedback processing
    }
  }

  /**
   * Generate secure token for feedback request
   * @param {number|string} projectId - Project ID
   * @returns {string} - Secure token
   */
  generateSecureToken(projectId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const data = `${projectId}-${timestamp}-${random}`;
    
    // Create SHA256 hash
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    // Combine with timestamp for validation
    return `${hash}-${timestamp}`;
  }

  /**
   * Validate feedback token
   * @param {string} token - Token to validate
   * @param {number|string} projectId - Project ID
   * @returns {boolean} - True if valid
   */
  validateToken(token, projectId) {
    try {
      const parts = token.split('-');
      if (parts.length < 2) {
        return false;
      }

      const timestamp = parseInt(parts[parts.length - 1], 10);
      if (isNaN(timestamp)) {
        return false;
      }

      // Check if token is expired
      const tokenAge = Date.now() - timestamp;
      const maxAge = this.feedbackTokenExpiryDays * 24 * 60 * 60 * 1000;
      if (tokenAge > maxAge) {
        return false;
      }

      // Token format is valid and not expired
      // In production, you might want to verify the hash matches
      return true;
    } catch (error) {
      this.logger.warn('Token validation error', { error: error.message });
      return false;
    }
  }

  /**
   * Send feedback reminder email (optional - placeholder)
   * @param {number|string} projectId - Project ID
   * @returns {Promise<void>}
   */
  async sendReminder(projectId) {
    // Placeholder for email reminder functionality
    // In production, this would send an email with feedback link
    this.logger.info('Feedback reminder would be sent', { projectId });
  }
}

module.exports = FeedbackAutomator;

