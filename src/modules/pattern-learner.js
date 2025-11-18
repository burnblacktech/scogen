/**
 * Pattern Learner Module
 * 
 * Purpose: Learn from project variances and update estimation accuracy
 * Philosophy: Learn from every project, filter duplicates, improve over time
 */

const crypto = require('crypto');

class PatternLearner {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
  }

  /**
   * Main learning entry point
   * @param {number|string} projectId - Project ID or code
   * @returns {Promise<Object>} - Learning summary
   */
  async learn(projectId) {
    try {
      this.logger.info('Starting pattern learning', { projectId });

      // Get project
      const project = this.db.getProject ? this.db.getProject(projectId) : null;
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Get project ID number (if projectId is code)
      const projectIdNum = project.id || projectId;

      // Get actuals from project
      const actualCost = project.actual_cost || 0;
      const actualDays = project.actual_timeline_days || 0;
      const estimatedCost = project.quoted_cost || project.base_estimate?.cost?.total || 0;
      const estimatedDays = project.quoted_timeline_days || project.base_estimate?.timeline?.days || 0;

      if (actualCost === 0 && actualDays === 0) {
        this.logger.warn('No actuals available for learning', { projectId });
        return {
          success: false,
          message: 'No actuals available for learning'
        };
      }

      // Calculate variances
      const costVariance = estimatedCost > 0 ? ((actualCost - estimatedCost) / estimatedCost) * 100 : 0;
      const daysVariance = estimatedDays > 0 ? ((actualDays - estimatedDays) / estimatedDays) * 100 : 0;

      const learningSummary = {
        projectId: projectIdNum,
        costVariance,
        daysVariance,
        modulesUpdated: 0,
        multipliersUpdated: 0,
        lessonsStored: 0,
        duplicatesFiltered: 0
      };

      // Learn from module-level variances
      if (project.refined_scope?.modules && Array.isArray(project.refined_scope.modules)) {
        for (const module of project.refined_scope.modules) {
          const moduleName = module.name || module.displayName;
          const estimated = module.effort || module.days || module.estimatedDays || 0;
          
          // Try to get actual from project data or use overall variance
          let actual = estimated;
          if (project.moduleActuals && project.moduleActuals[moduleName]) {
            actual = project.moduleActuals[moduleName];
          } else if (daysVariance !== 0) {
            // Apply overall variance to module
            actual = estimated * (1 + daysVariance / 100);
          }

          if (estimated > 0 && actual !== estimated) {
            const variance = (actual - estimated) / estimated;
            const domain = project.domainContext?.industry || project.industry || 'generic';
            
            await this.updateModuleAccuracy(moduleName, domain, variance, projectIdNum);
            learningSummary.modulesUpdated++;
          }
        }
      }

      // Update hidden cost multipliers if variances are significant
      if (Math.abs(costVariance) > 15 || Math.abs(daysVariance) > 15) {
        await this.updateHiddenCostMultipliers(project, { costVariance, daysVariance }, projectIdNum);
        learningSummary.multipliersUpdated++;
      }

      // Detect new patterns
      const newPatterns = await this.detectNewPatterns(project, projectIdNum);
      learningSummary.lessonsStored = newPatterns.stored;
      learningSummary.duplicatesFiltered = newPatterns.duplicates;

      this.logger.info('Pattern learning complete', learningSummary);

      return {
        success: true,
        ...learningSummary
      };
    } catch (error) {
      this.logger.error('Pattern learning failed', {
        projectId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update module accuracy with duplicate filtering
   * @param {string} moduleName - Module name
   * @param {string} domain - Domain/industry
   * @param {number} variance - Variance ratio (actual/estimated - 1)
   * @param {number} projectId - Project ID
   * @returns {Promise<void>}
   */
  async updateModuleAccuracy(moduleName, domain, variance, projectId) {
    try {
      // Create lesson content for duplicate detection
      const lessonContent = {
        moduleName,
        domain,
        variance,
        multiplier: 1 + variance
      };

      // Check for duplicate lesson
      const duplicate = await this.detectDuplicateLesson(lessonContent, 'module_accuracy');
      
      if (duplicate) {
        this.logger.debug('Duplicate module accuracy lesson filtered', {
          moduleName,
          domain,
          existingLessonId: duplicate.id
        });
        // Update existing lesson occurrence count (already done in storeLesson)
        return;
      }

      // Calculate new multiplier with decay
      const existingAccuracy = this.db.getAccuracyStats 
        ? this.db.getAccuracyStats(domain).find(a => a.module_name === moduleName)
        : null;

      let newMultiplier = 1.0;
      if (existingAccuracy) {
        const oldMultiplier = existingAccuracy.recommended_multiplier || 1.0;
        const adjustment = variance > 0 ? 1.05 : 0.95; // 5% adjustment
        // Decay: 80% old, 20% new
        newMultiplier = (oldMultiplier * 0.8) + (adjustment * 0.2);
      } else {
        newMultiplier = variance > 0 ? 1.05 : 0.95;
      }

      // Update estimation accuracy
      if (this.db.updateEstimationAccuracy) {
        this.db.updateEstimationAccuracy(moduleName, domain, variance, newMultiplier);
      } else if (this.db.db) {
        // Fallback: direct database update
        const stmt = this.db.db.prepare(`
          INSERT INTO estimation_accuracy (
            module_name, domain, total_estimates, 
            total_actual_effort, total_estimated_effort,
            avg_variance, recommended_multiplier
          ) VALUES (?, ?, 1, ?, ?, ?, ?)
          ON CONFLICT(module_name, domain) DO UPDATE SET
            total_estimates = total_estimates + 1,
            total_actual_effort = total_actual_effort + ?,
            total_estimated_effort = total_estimated_effort + ?,
            avg_variance = (avg_variance * (total_estimates - 1) + ?) / total_estimates,
            recommended_multiplier = ?,
            last_updated = CURRENT_TIMESTAMP
        `);
        
        const estimatedEffort = 1; // Base effort
        const actualEffort = 1 + variance;
        
        stmt.run(
          moduleName, domain, actualEffort, estimatedEffort, variance, newMultiplier,
          actualEffort, estimatedEffort, variance, newMultiplier
        );
      }

      // Store lesson (with duplicate check)
      const confidence = Math.min(0.5 + Math.abs(variance) * 0.1, 1.0); // Higher variance = higher confidence
      await this.storeLesson(lessonContent, 'module_accuracy', projectId, confidence);
    } catch (error) {
      this.logger.warn('Failed to update module accuracy', {
        moduleName,
        domain,
        error: error.message
      });
      // Don't throw - continue with other modules
    }
  }

  /**
   * Update hidden cost multipliers with duplicate filtering
   * @param {Object} project - Project object
   * @param {Object} variances - Variance calculations
   * @param {number} projectId - Project ID
   * @returns {Promise<void>}
   */
  async updateHiddenCostMultipliers(project, variances, projectId) {
    try {
      // Only update if variance is significant (>15%)
      if (Math.abs(variances.costVariance) <= 15 && Math.abs(variances.daysVariance) <= 15) {
        return;
      }

      // Get hidden cost actuals from database
      if (!this.db.db) {
        return;
      }

      const hiddenCostActuals = this.db.db.prepare(`
        SELECT * FROM hidden_cost_actuals WHERE project_id = ?
      `).all(projectId);

      for (const costActual of hiddenCostActuals) {
        const variance = costActual.variance || 0;
        
        // Only update if variance is significant (>15%)
        if (Math.abs(variance) <= 15) {
          continue;
        }

        // Create lesson content
        const lessonContent = {
          component: costActual.cost_type,
          variance,
          clientProfile: project.client_profile,
          multiplier: 1 + (variance / 100)
        };

        // Check for duplicate
        const duplicate = await this.detectDuplicateLesson(lessonContent, 'hidden_cost_multiplier');
        
        if (duplicate) {
          this.logger.debug('Duplicate hidden cost multiplier lesson filtered', {
            component: costActual.cost_type,
            existingLessonId: duplicate.id
          });
          continue;
        }

        // Store lesson
        const confidence = Math.min(0.5 + Math.abs(variance) * 0.01, 1.0);
        await this.storeLesson(lessonContent, 'hidden_cost_multiplier', projectId, confidence);
      }
    } catch (error) {
      this.logger.warn('Failed to update hidden cost multipliers', {
        projectId,
        error: error.message
      });
      // Don't throw - continue
    }
  }

  /**
   * Detect and filter duplicate lessons
   * @param {Object} lessonContent - Lesson content object
   * @param {string} lessonType - Type of lesson
   * @returns {Promise<Object|null>} - Existing lesson or null
   */
  async detectDuplicateLesson(lessonContent, lessonType) {
    try {
      // Create hash of lesson content
      const contentString = JSON.stringify(lessonContent) + lessonType;
      const lessonHash = crypto.createHash('sha256').update(contentString).digest('hex');

      // Query learning_lessons table
      if (this.db.getLearningLesson) {
        return this.db.getLearningLesson(lessonHash);
      } else if (this.db.db) {
        const stmt = this.db.db.prepare('SELECT * FROM learning_lessons WHERE lesson_hash = ?');
        return stmt.get(lessonHash) || null;
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to detect duplicate lesson', {
        lessonType,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Store lesson (only if not duplicate)
   * @param {Object} lessonContent - Lesson content
   * @param {string} lessonType - Type of lesson
   * @param {number} projectId - Project ID
   * @param {number} confidence - Confidence score (0-1)
   * @returns {Promise<number>} - Lesson ID
   */
  async storeLesson(lessonContent, lessonType, projectId, confidence = 0.5) {
    try {
      // Check for duplicate
      const duplicate = await this.detectDuplicateLesson(lessonContent, lessonType);

      if (duplicate) {
        // Update existing lesson
        if (this.db.db) {
          const stmt = this.db.db.prepare(`
            UPDATE learning_lessons 
            SET occurrence_count = occurrence_count + 1,
                confidence_score = (confidence_score * occurrence_count + ?) / (occurrence_count + 1),
                last_applied_at = CURRENT_TIMESTAMP
            WHERE lesson_hash = ?
          `);
          stmt.run(confidence, duplicate.lesson_hash);
        }
        return duplicate.id;
      }

      // Create hash for new lesson
      const contentString = JSON.stringify(lessonContent) + lessonType;
      const lessonHash = crypto.createHash('sha256').update(contentString).digest('hex');

      // Store new lesson
      if (this.db.storeLearningLesson) {
        return this.db.storeLearningLesson(lessonHash, lessonType, JSON.stringify(lessonContent), projectId, confidence);
      } else if (this.db.db) {
        const stmt = this.db.db.prepare(`
          INSERT INTO learning_lessons (
            lesson_hash, lesson_type, lesson_content, 
            first_seen_project_id, occurrence_count, confidence_score
          ) VALUES (?, ?, ?, ?, 1, ?)
        `);
        const result = stmt.run(lessonHash, lessonType, JSON.stringify(lessonContent), projectId, confidence);
        return result.lastInsertRowid;
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to store lesson', {
        lessonType,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Apply learned lessons to future estimates
   * @param {string} moduleName - Module name
   * @param {string} domain - Domain/industry
   * @returns {Promise<Object>} - Applied lessons
   */
  async applyLessons(moduleName, domain) {
    try {
      // Get lessons for this module/domain
      const lessons = this.db.getLessonsByType 
        ? this.db.getLessonsByType('module_accuracy', 100)
        : [];

      // Filter lessons for this module/domain
      const relevantLessons = lessons.filter(lesson => {
        try {
          const content = JSON.parse(lesson.lesson_content);
          return content.moduleName === moduleName && content.domain === domain;
        } catch {
          return false;
        }
      });

      // Get highest confidence lesson
      const bestLesson = relevantLessons.sort((a, b) => b.confidence_score - a.confidence_score)[0];

      if (bestLesson) {
        const content = JSON.parse(bestLesson.lesson_content);
        return {
          multiplier: content.multiplier || 1.0,
          confidence: bestLesson.confidence_score,
          occurrenceCount: bestLesson.occurrence_count
        };
      }

      return { multiplier: 1.0, confidence: 0, occurrenceCount: 0 };
    } catch (error) {
      this.logger.warn('Failed to apply lessons', {
        moduleName,
        domain,
        error: error.message
      });
      return { multiplier: 1.0, confidence: 0, occurrenceCount: 0 };
    }
  }

  /**
   * Detect new patterns from project
   * @param {Object} project - Project object
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} - Pattern detection summary
   */
  async detectNewPatterns(project, projectId) {
    const summary = {
      stored: 0,
      duplicates: 0
    };

    try {
      // Detect patterns from modules
      if (project.refined_scope?.modules && Array.isArray(project.refined_scope.modules)) {
        const moduleNames = project.refined_scope.modules.map(m => m.name || m.displayName);
        const domain = project.domainContext?.industry || project.industry || 'generic';

        // Pattern: Module combination
        const patternContent = {
          type: 'module_combination',
          modules: moduleNames.sort(),
          domain,
          moduleCount: moduleNames.length
        };

        const duplicate = await this.detectDuplicateLesson(patternContent, 'pattern');
        if (duplicate) {
          summary.duplicates++;
        } else {
          await this.storeLesson(patternContent, 'pattern', projectId, 0.3);
          summary.stored++;
        }
      }

      // Detect patterns from client profile
      if (project.client_profile) {
        const profilePattern = {
          type: 'client_profile_pattern',
          techSavvy: project.client_profile.techSavvy,
          riskLevel: project.client_profile.riskLevel,
          clientSize: project.client_profile.clientSize
        };

        const duplicate = await this.detectDuplicateLesson(profilePattern, 'client_pattern');
        if (duplicate) {
          summary.duplicates++;
        } else {
          await this.storeLesson(profilePattern, 'client_pattern', projectId, 0.2);
          summary.stored++;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to detect new patterns', {
        projectId,
        error: error.message
      });
    }

    return summary;
  }
}

module.exports = PatternLearner;

