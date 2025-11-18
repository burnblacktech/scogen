/**
 * Baseline Tuner Module
 * 
 * Purpose: Analyze variance patterns and tune baseline estimates
 * Philosophy: Learn from consistent patterns, adjust baselines gradually
 */

const crypto = require('crypto');

class BaselineTuner {
  constructor(db, logger, config, library) {
    this.db = db;
    this.logger = logger;
    this.config = config;
    this.library = library;
  }

  /**
   * Main tuning entry point
   * @param {string} domain - Domain/industry to tune
   * @returns {Promise<Object>} - Tuning summary with recommendations
   */
  async tuneBaseline(domain) {
    try {
      this.logger.info('Starting baseline tuning', { domain });

      // Check if tuning is needed
      if (!(await this.shouldTune(domain))) {
        return {
          success: false,
          message: 'Insufficient data for tuning',
          recommendations: []
        };
      }

      // Analyze variance patterns
      const patterns = await this.analyzeVariancePatterns(domain);

      // Generate recommendations
      const recommendations = this.generateRecommendations(patterns, domain);

      this.logger.info('Baseline tuning complete', {
        domain,
        recommendationsCount: recommendations.length
      });

      return {
        success: true,
        domain,
        patterns,
        recommendations
      };
    } catch (error) {
      this.logger.error('Baseline tuning failed', {
        domain,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if tuning is needed (trigger condition)
   * @param {string} domain - Domain/industry
   * @returns {Promise<boolean>} - True if tuning should be performed
   */
  async shouldTune(domain) {
    try {
      if (!this.db.db) {
        return false;
      }

      // Get projects for domain (last 90 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const projects = this.db.db.prepare(`
        SELECT * FROM projects 
        WHERE status = 'completed' 
        AND actual_cost IS NOT NULL 
        AND actual_timeline_days IS NOT NULL
        AND completed_at >= ?
        AND (client_id IN (
          SELECT id FROM clients WHERE industry = ?
        ) OR domainContext LIKE ?)
      `).all(cutoffDate.toISOString(), domain, `%${domain}%`);

      // Need at least 10 projects with actuals
      if (projects.length < 10) {
        return false;
      }

      // Check for consistent variance patterns
      let consistentOverEstimation = 0;
      let consistentUnderEstimation = 0;

      for (const project of projects) {
        const estimatedCost = project.quoted_cost || 0;
        const actualCost = project.actual_cost || 0;
        
        if (estimatedCost > 0) {
          const variance = ((actualCost - estimatedCost) / estimatedCost) * 100;
          if (variance < -20) {
            consistentOverEstimation++;
          } else if (variance > 20) {
            consistentUnderEstimation++;
          }
        }
      }

      // Tune if 3+ projects show consistent pattern
      return consistentOverEstimation >= 3 || consistentUnderEstimation >= 3;
    } catch (error) {
      this.logger.warn('Failed to check if tuning needed', {
        domain,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Analyze variance patterns for domain
   * @param {string} domain - Domain/industry
   * @returns {Promise<Object>} - Pattern analysis
   */
  async analyzeVariancePatterns(domain) {
    try {
      if (!this.db.db) {
        return { modules: {}, overall: {} };
      }

      // Get completed projects with actuals
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const projects = this.db.db.prepare(`
        SELECT * FROM projects 
        WHERE status = 'completed' 
        AND actual_cost IS NOT NULL 
        AND actual_timeline_days IS NOT NULL
        AND completed_at >= ?
      `).all(cutoffDate.toISOString());

      // Filter by domain (check client industry or domainContext)
      const domainProjects = projects.filter(p => {
        try {
          // Try to get client industry
          if (p.client_id) {
            const client = this.db.db.prepare('SELECT industry FROM clients WHERE id = ?').get(p.client_id);
            if (client && client.industry === domain) {
              return true;
            }
          }
          
          // Check domainContext in refined_scope
          if (p.refined_scope) {
            const scope = typeof p.refined_scope === 'string' 
              ? JSON.parse(p.refined_scope) 
              : p.refined_scope;
            if (scope.domainContext?.industry === domain) {
              return true;
            }
          }
          
          return false;
        } catch {
          return false;
        }
      });

      if (domainProjects.length === 0) {
        return { modules: {}, overall: {} };
      }

      // Group by module and calculate averages
      const moduleData = {};
      let totalCostVariance = 0;
      let totalDaysVariance = 0;
      let projectCount = 0;

      for (const project of domainProjects) {
        const estimatedCost = project.quoted_cost || 0;
        const actualCost = project.actual_cost || 0;
        const estimatedDays = project.quoted_timeline_days || 0;
        const actualDays = project.actual_timeline_days || 0;

        if (estimatedCost > 0) {
          const costVariance = ((actualCost - estimatedCost) / estimatedCost) * 100;
          totalCostVariance += costVariance;
          projectCount++;
        }

        if (estimatedDays > 0) {
          const daysVariance = ((actualDays - estimatedDays) / estimatedDays) * 100;
          totalDaysVariance += daysVariance;
        }

        // Extract module-level data
        try {
          const refinedScope = project.refined_scope 
            ? (typeof project.refined_scope === 'string' 
                ? JSON.parse(project.refined_scope) 
                : project.refined_scope)
            : null;

          if (refinedScope?.modules && Array.isArray(refinedScope.modules)) {
            for (const module of refinedScope.modules) {
              const moduleName = module.name || module.displayName;
              if (!moduleData[moduleName]) {
                moduleData[moduleName] = {
                  variances: [],
                  estimatedEfforts: [],
                  actualEfforts: []
                };
              }

              const estimated = module.effort || module.days || module.estimatedDays || 0;
              // Try to get actual from hidden_cost_actuals or use overall variance
              let actual = estimated;
              if (estimatedDays > 0 && actualDays > 0) {
                const overallVariance = (actualDays - estimatedDays) / estimatedDays;
                actual = estimated * (1 + overallVariance);
              }

              if (estimated > 0) {
                const variance = (actual - estimated) / estimated;
                moduleData[moduleName].variances.push(variance);
                moduleData[moduleName].estimatedEfforts.push(estimated);
                moduleData[moduleName].actualEfforts.push(actual);
              }
            }
          }
        } catch (error) {
          this.logger.warn('Failed to parse project scope', {
            projectId: project.id,
            error: error.message
          });
        }
      }

      // Calculate averages per module
      const moduleAverages = {};
      for (const [moduleName, data] of Object.entries(moduleData)) {
        if (data.variances.length >= 3) { // Need at least 3 samples
          const avgVariance = data.variances.reduce((a, b) => a + b, 0) / data.variances.length;
          const avgEstimated = data.estimatedEfforts.reduce((a, b) => a + b, 0) / data.estimatedEfforts.length;
          const avgActual = data.actualEfforts.reduce((a, b) => a + b, 0) / data.actualEfforts.length;

          moduleAverages[moduleName] = {
            avgVariance,
            avgEstimated,
            avgActual,
            sampleSize: data.variances.length,
            recommendedMultiplier: 1 + avgVariance
          };
        }
      }

      return {
        modules: moduleAverages,
        overall: {
          avgCostVariance: projectCount > 0 ? totalCostVariance / projectCount : 0,
          avgDaysVariance: projectCount > 0 ? totalDaysVariance / projectCount : 0,
          sampleSize: projectCount
        }
      };
    } catch (error) {
      this.logger.error('Failed to analyze variance patterns', {
        domain,
        error: error.message
      });
      return { modules: {}, overall: {} };
    }
  }

  /**
   * Generate tuning recommendations
   * @param {Object} patterns - Pattern analysis results
   * @param {string} domain - Domain/industry
   * @returns {Array} - Array of recommendation objects
   */
  generateRecommendations(patterns, domain) {
    const recommendations = [];

    // Module-level recommendations
    for (const [moduleName, data] of Object.entries(patterns.modules)) {
      // Only recommend if variance is significant (>15%) and sample size is adequate
      if (Math.abs(data.avgVariance) > 0.15 && data.sampleSize >= 3) {
        const currentBaseline = this.library.getModuleEffort(moduleName, domain);
        const recommendedEffort = currentBaseline * data.recommendedMultiplier;

        // Check for duplicate recommendation
        const recommendationContent = {
          type: 'baseline_adjustment',
          domain,
          module: moduleName,
          currentBaseline,
          recommendedBaseline: recommendedEffort,
          multiplier: data.recommendedMultiplier
        };

        const duplicate = this.detectDuplicateRecommendation(recommendationContent);
        if (duplicate) {
          continue; // Skip duplicate
        }

        recommendations.push({
          type: 'multiplier_adjustment',
          module: moduleName,
          domain,
          currentMultiplier: 1.0,
          recommendedMultiplier: data.recommendedMultiplier,
          currentBaseline,
          recommendedBaseline: recommendedEffort,
          confidence: Math.min(0.5 + (data.sampleSize / 20), 0.95),
          sampleSize: data.sampleSize,
          rationale: `Consistent ${data.avgVariance > 0 ? 'under' : 'over'}-estimation (${(Math.abs(data.avgVariance) * 100).toFixed(1)}% variance) across ${data.sampleSize} projects`
        });
      }
    }

    // Overall baseline recommendation if overall variance is significant
    if (Math.abs(patterns.overall.avgCostVariance) > 20 && patterns.overall.sampleSize >= 10) {
      const overallMultiplier = 1 + (patterns.overall.avgCostVariance / 100);
      
      recommendations.push({
        type: 'overall_adjustment',
        domain,
        currentMultiplier: 1.0,
        recommendedMultiplier: overallMultiplier,
        confidence: Math.min(0.5 + (patterns.overall.sampleSize / 30), 0.9),
        sampleSize: patterns.overall.sampleSize,
        rationale: `Overall ${patterns.overall.avgCostVariance > 0 ? 'under' : 'over'}-estimation (${Math.abs(patterns.overall.avgCostVariance).toFixed(1)}% variance) across ${patterns.overall.sampleSize} projects`
      });
    }

    return recommendations;
  }

  /**
   * Detect duplicate recommendation
   * @param {Object} recommendationContent - Recommendation content
   * @returns {boolean} - True if duplicate exists
   */
  detectDuplicateRecommendation(recommendationContent) {
    try {
      // Create hash of recommendation
      const contentString = JSON.stringify(recommendationContent);
      const hash = crypto.createHash('sha256').update(contentString).digest('hex');

      // Check learning_lessons table
      if (this.db.getLearningLesson) {
        const existing = this.db.getLearningLesson(hash);
        return existing !== null;
      } else if (this.db.db) {
        const stmt = this.db.db.prepare('SELECT * FROM learning_lessons WHERE lesson_hash = ?');
        return stmt.get(hash) !== null;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Apply approved recommendations
   * @param {string} domain - Domain/industry
   * @param {Array} recommendations - Approved recommendations
   * @returns {Promise<Object>} - Application summary
   */
  async applyRecommendations(domain, recommendations) {
    const summary = {
      applied: 0,
      failed: 0,
      errors: []
    };

    try {
      for (const rec of recommendations) {
        try {
          if (rec.type === 'multiplier_adjustment') {
            // Update module effort in baseline
            const currentBaseline = this.library.getBaseline(domain);
            if (currentBaseline && currentBaseline.module_efforts) {
              const currentEffort = currentBaseline.module_efforts[rec.module] || 2.0;
              const newEffort = currentEffort * rec.recommendedMultiplier;
              
              // Update baseline (store in learned_patterns for persistence)
              if (this.db.recordPattern) {
                this.db.recordPattern(
                  'baseline_tuning',
                  domain,
                  `module_${rec.module}`,
                  {
                    oldEffort: currentEffort,
                    newEffort: newEffort,
                    multiplier: rec.recommendedMultiplier
                  },
                  true
                );
              }

              // Update in-memory baseline (library will use database baseline if available)
              if (currentBaseline.module_efforts) {
                currentBaseline.module_efforts[rec.module] = newEffort;
              }

              // Store as lesson to prevent duplicate
              const lessonContent = {
                type: 'baseline_adjustment',
                domain,
                module: rec.module,
                currentBaseline: currentEffort,
                recommendedBaseline: newEffort
              };
              await this.storeRecommendationLesson(lessonContent, domain);

              summary.applied++;
            }
          } else if (rec.type === 'overall_adjustment') {
            // Apply overall multiplier to all modules
            const currentBaseline = this.library.getBaseline(domain);
            if (currentBaseline && currentBaseline.module_efforts) {
              for (const [moduleName, effort] of Object.entries(currentBaseline.module_efforts)) {
                const newEffort = effort * rec.recommendedMultiplier;
                currentBaseline.module_efforts[moduleName] = newEffort;
              }

              // Store overall adjustment
              if (this.db.recordPattern) {
                this.db.recordPattern(
                  'baseline_tuning',
                  domain,
                  'overall_multiplier',
                  {
                    multiplier: rec.recommendedMultiplier
                  },
                  true
                );
              }

              summary.applied++;
            }
          }
        } catch (error) {
          summary.failed++;
          summary.errors.push({
            recommendation: rec,
            error: error.message
          });
          this.logger.warn('Failed to apply recommendation', {
            domain,
            recommendation: rec,
            error: error.message
          });
        }
      }

      this.logger.info('Recommendations applied', {
        domain,
        applied: summary.applied,
        failed: summary.failed
      });

      return summary;
    } catch (error) {
      this.logger.error('Failed to apply recommendations', {
        domain,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Store recommendation as lesson to prevent duplicates
   * @param {Object} lessonContent - Lesson content
   * @param {string} domain - Domain
   * @returns {Promise<void>}
   */
  async storeRecommendationLesson(lessonContent, domain) {
    try {
      const contentString = JSON.stringify(lessonContent) + 'baseline_tuning';
      const lessonHash = crypto.createHash('sha256').update(contentString).digest('hex');

      // Check for duplicate
      if (this.db.getLearningLesson) {
        const existing = this.db.getLearningLesson(lessonHash);
        if (existing) {
          return; // Already stored
        }
      }

      // Store new lesson
      if (this.db.storeLearningLesson) {
        await this.db.storeLearningLesson(lessonHash, 'baseline_tuning', JSON.stringify(lessonContent), null, 0.8);
      } else if (this.db.db) {
        const stmt = this.db.db.prepare(`
          INSERT INTO learning_lessons (
            lesson_hash, lesson_type, lesson_content, 
            first_seen_project_id, occurrence_count, confidence_score
          ) VALUES (?, ?, ?, NULL, 1, 0.8)
        `);
        stmt.run(lessonHash, 'baseline_tuning', JSON.stringify(lessonContent));
      }
    } catch (error) {
      this.logger.warn('Failed to store recommendation lesson', {
        error: error.message
      });
      // Don't throw - not critical
    }
  }
}

module.exports = BaselineTuner;

