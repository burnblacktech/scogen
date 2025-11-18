/**
 * Learning Orchestrator Module
 * 
 * Purpose: Coordinate all learning system components
 * Philosophy: Centralized orchestration for consistent learning flow
 */

class LearningOrchestrator {
  constructor(db, logger, config, library) {
    this.db = db;
    this.logger = logger;
    this.config = config;
    this.library = library;
    
    // Initialize learning components
    const FeedbackAutomator = require('./feedback-automator');
    const PatternLearner = require('./pattern-learner');
    const BaselineTuner = require('./baseline-tuner');
    const DomainEmergenceDetector = require('./domain-emergence');
    
    this.feedbackAutomator = new FeedbackAutomator(db, logger, config);
    this.patternLearner = new PatternLearner(db, logger, config);
    this.baselineTuner = new BaselineTuner(db, logger, config, library);
    this.domainEmergence = new DomainEmergenceDetector(db, logger, config);
  }

  /**
   * Main orchestration - process project completion
   * @param {number|string} projectId - Project ID or code
   * @returns {Promise<Object>} - Learning summary
   */
  async processProjectCompletion(projectId) {
    const summary = {
      projectId,
      feedbackRequest: null,
      patternLearning: null,
      baselineTuning: null,
      domainEmergence: null,
      errors: []
    };

    try {
      this.logger.info('Processing project completion for learning', { projectId });

      // 1. Generate feedback request
      try {
        summary.feedbackRequest = await this.feedbackAutomator.createFeedbackRequest(projectId);
      } catch (error) {
        summary.errors.push({ step: 'feedback_request', error: error.message });
        this.logger.warn('Failed to create feedback request', { projectId, error: error.message });
      }

      // 2. Trigger pattern learning
      try {
        summary.patternLearning = await this.patternLearner.learn(projectId);
      } catch (error) {
        summary.errors.push({ step: 'pattern_learning', error: error.message });
        this.logger.warn('Failed to trigger pattern learning', { projectId, error: error.message });
      }

      // 3. Check if baseline tuning needed
      try {
        // Get project to determine domain
        const project = this.db.getProject ? this.db.getProject(projectId) : null;
        if (project) {
          const domain = project.domainContext?.industry || project.industry || 'generic';
          
          const shouldTune = await this.baselineTuner.shouldTune(domain);
          if (shouldTune) {
            summary.baselineTuning = await this.baselineTuner.tuneBaseline(domain);
          } else {
            summary.baselineTuning = {
              skipped: true,
              reason: 'Insufficient data or no significant patterns'
            };
          }
        }
      } catch (error) {
        summary.errors.push({ step: 'baseline_tuning', error: error.message });
        this.logger.warn('Failed to check baseline tuning', { projectId, error: error.message });
      }

      // 4. Check domain emergence (run periodically, not for every project)
      // This would typically run on a schedule, but we can trigger it here occasionally
      try {
        // Only run domain emergence check occasionally (10% of the time) to avoid overhead
        if (Math.random() < 0.1) {
          summary.domainEmergence = await this.domainEmergence.detectEmergingDomains();
        } else {
          summary.domainEmergence = {
            skipped: true,
            reason: 'Scheduled check (runs periodically)'
          };
        }
      } catch (error) {
        summary.errors.push({ step: 'domain_emergence', error: error.message });
        this.logger.warn('Failed to check domain emergence', { projectId, error: error.message });
      }

      this.logger.info('Project completion learning processed', {
        projectId,
        success: summary.errors.length === 0,
        errorsCount: summary.errors.length
      });

      return summary;
    } catch (error) {
      this.logger.error('Failed to process project completion', {
        projectId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Scheduled learning tasks (run daily/weekly)
   * @returns {Promise<Object>} - Scheduled learning summary
   */
  async runScheduledLearning() {
    const summary = {
      timestamp: new Date().toISOString(),
      projectsProcessed: 0,
      baselineTunings: [],
      domainEmergence: null,
      errors: []
    };

    try {
      this.logger.info('Running scheduled learning tasks');

      if (!this.db.db) {
        return summary;
      }

      // 1. Check for projects needing learning (completed but not learned)
      try {
        const projects = this.db.db.prepare(`
          SELECT * FROM projects 
          WHERE status = 'completed' 
          AND actual_cost IS NOT NULL 
          AND actual_timeline_days IS NOT NULL
          AND completed_at >= datetime('now', '-90 days')
        `).all();

        for (const project of projects) {
          try {
            await this.processProjectCompletion(project.id || project.project_code);
            summary.projectsProcessed++;
          } catch (error) {
            summary.errors.push({
              projectId: project.id || project.project_code,
              error: error.message
            });
          }
        }
      } catch (error) {
        summary.errors.push({ step: 'project_processing', error: error.message });
        this.logger.warn('Failed to process projects', { error: error.message });
      }

      // 2. Run domain emergence detection
      try {
        summary.domainEmergence = await this.domainEmergence.detectEmergingDomains();
      } catch (error) {
        summary.errors.push({ step: 'domain_emergence', error: error.message });
        this.logger.warn('Failed to run domain emergence detection', { error: error.message });
      }

      // 3. Check baseline tuning for all domains
      try {
        // Get unique domains from projects
        const domains = this.db.db.prepare(`
          SELECT DISTINCT c.industry as domain
          FROM projects p
          JOIN clients c ON p.client_id = c.id
          WHERE p.status = 'completed'
          AND c.industry IS NOT NULL
        `).all().map(r => r.domain);

        for (const domain of domains) {
          try {
            const shouldTune = await this.baselineTuner.shouldTune(domain);
            if (shouldTune) {
              const tuningResult = await this.baselineTuner.tuneBaseline(domain);
              if (tuningResult.recommendations && tuningResult.recommendations.length > 0) {
                summary.baselineTunings.push({
                  domain,
                  recommendationsCount: tuningResult.recommendations.length
                });
              }
            }
          } catch (error) {
            summary.errors.push({
              step: 'baseline_tuning',
              domain,
              error: error.message
            });
          }
        }
      } catch (error) {
        summary.errors.push({ step: 'baseline_tuning_check', error: error.message });
        this.logger.warn('Failed to check baseline tuning', { error: error.message });
      }

      this.logger.info('Scheduled learning tasks complete', {
        projectsProcessed: summary.projectsProcessed,
        baselineTunings: summary.baselineTunings.length,
        emergingDomains: summary.domainEmergence?.length || 0
      });

      return summary;
    } catch (error) {
      this.logger.error('Scheduled learning failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Apply baseline tuning recommendations
   * @param {string} domain - Domain/industry
   * @param {Array} recommendations - Recommendations to apply
   * @returns {Promise<Object>} - Application summary
   */
  async applyBaselineRecommendations(domain, recommendations) {
    try {
      return await this.baselineTuner.applyRecommendations(domain, recommendations);
    } catch (error) {
      this.logger.error('Failed to apply baseline recommendations', {
        domain,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get learning statistics
   * @returns {Promise<Object>} - Learning statistics
   */
  async getLearningStats() {
    try {
      if (!this.db.db) {
        return {
          lessonsCount: 0,
          patternsCount: 0,
          accuracyRecordsCount: 0
        };
      }

      const lessonsCount = this.db.db.prepare('SELECT COUNT(*) as count FROM learning_lessons').get().count;
      const patternsCount = this.db.db.prepare('SELECT COUNT(*) as count FROM learned_patterns').get().count;
      const accuracyRecordsCount = this.db.db.prepare('SELECT COUNT(*) as count FROM estimation_accuracy').get().count;

      return {
        lessonsCount,
        patternsCount,
        accuracyRecordsCount,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.warn('Failed to get learning stats', { error: error.message });
      return {
        lessonsCount: 0,
        patternsCount: 0,
        accuracyRecordsCount: 0
      };
    }
  }
}

module.exports = LearningOrchestrator;

