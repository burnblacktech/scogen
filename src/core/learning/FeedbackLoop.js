// src/core/learning/FeedbackLoop.js
// Feedback Loop - Captures Project Completion Data

class FeedbackLoop {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger || console;
    this.learningEngine = null; // Will be injected
  }

  /**
   * Set learning engine reference
   */
  setLearningEngine(learningEngine) {
    this.learningEngine = learningEngine;
  }

  /**
   * Complete a project and capture actuals
   */
  async completeProject(projectId, actuals) {
    try {
      // Get project estimates
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Capture actuals for each feature
      const capturedActuals = [];
      
      if (actuals.features && Array.isArray(actuals.features)) {
        for (const featureActual of actuals.features) {
          const captured = await this.captureFeatureActuals(
            projectId,
            featureActual.featureId || featureActual.id,
            featureActual,
            project
          );
          capturedActuals.push(captured);
        }
      } else {
        // Capture project-level actuals
        await this.captureProjectActuals(projectId, actuals, project);
      }

      // Extract learnings
      if (this.learningEngine) {
        const learnings = await this.learningEngine.learnFromProject(projectId);
        this.logger.info(`[FEEDBACK] Learned from project ${projectId}`, learnings);
      }

      // Calculate accuracy
      const accuracy = await this.calculateProjectAccuracy(projectId);

      // Update project status
      await this.updateProjectStatus(projectId, 'completed', accuracy);

      return {
        success: true,
        capturedActuals: capturedActuals.length,
        accuracy,
        learned: this.learningEngine !== null
      };
    } catch (error) {
      this.logger.error(`[ERROR] Failed to complete project ${projectId}`, error);
      throw error;
    }
  }

  /**
   * Capture feature-level actuals
   */
  async captureFeatureActuals(projectId, featureId, actuals, project) {
    if (!this.db) {
      this.logger.warn('[WARN] Database not available, skipping capture');
      return null;
    }

    try {
      // Get feature estimate
      const feature = await this.getFeature(featureId);
      if (!feature) {
        this.logger.warn(`[WARN] Feature ${featureId} not found`);
        return null;
      }

      const query = `
        INSERT INTO project_actuals (
          project_id,
          feature_id,
          estimated_hours,
          actual_hours,
          estimated_cost,
          actual_cost,
          variance_reasons,
          complexity_misestimate,
          domain,
          tech_stack,
          team_size,
          client_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const varianceReasons = actuals.varianceReasons || actuals.reasons || [];
      const complexityMisestimate = actuals.complexityMisestimate || 
        (actuals.actualComplexity && feature.complexity_score 
          ? actuals.actualComplexity / feature.complexity_score 
          : null);

      const stmt = this.db.prepare(query);
      stmt.run(
        projectId,
        featureId,
        feature.estimated_hours || feature.estimatedHours,
        actuals.actualHours || actuals.hours,
        feature.estimated_cost || feature.estimatedCost,
        actuals.actualCost || actuals.cost,
        JSON.stringify(varianceReasons),
        complexityMisestimate,
        project.domain || project.industry || 'generic',
        JSON.stringify(project.techStack || {}),
        actuals.teamSize || project.teamSize,
        project.clientType || project.client_type
      );

      return {
        featureId,
        captured: true
      };
    } catch (error) {
      this.logger.error(`[ERROR] Failed to capture feature actuals`, error);
      return null;
    }
  }

  /**
   * Capture project-level actuals
   */
  async captureProjectActuals(projectId, actuals, project) {
    if (!this.db) return;

    try {
      // Get all features for this project
      const features = await this.getProjectFeatures(projectId);

      // Distribute project actuals across features proportionally
      const totalEstimatedHours = features.reduce((sum, f) => 
        sum + (f.estimated_hours || f.estimatedHours || 0), 0
      );

      for (const feature of features) {
        const proportion = totalEstimatedHours > 0
          ? (feature.estimated_hours || feature.estimatedHours || 0) / totalEstimatedHours
          : 1 / features.length;

        await this.captureFeatureActuals(
          projectId,
          feature.id,
          {
            actualHours: (actuals.actualHours || actuals.hours) * proportion,
            actualCost: (actuals.actualCost || actuals.cost) * proportion,
            varianceReasons: actuals.varianceReasons || actuals.reasons || [],
            complexityMisestimate: actuals.complexityMisestimate,
            teamSize: actuals.teamSize
          },
          project
        );
      }
    } catch (error) {
      this.logger.error('[ERROR] Failed to capture project actuals', error);
    }
  }

  /**
   * Calculate project accuracy
   */
  async calculateProjectAccuracy(projectId) {
    if (!this.db) {
      return {
        overall: 0.7,
        byFeature: {},
        improvement: 0
      };
    }

    try {
      const query = `
        SELECT 
          AVG(ABS(actual_hours - estimated_hours) / NULLIF(estimated_hours, 0)) as avg_variance,
          COUNT(*) as sample_size
        FROM project_actuals
        WHERE project_id = ?
          AND estimated_hours > 0
      `;

      const stmt = this.db.prepare(query);
      const result = stmt.get(projectId);

      if (!result || result.sample_size === 0) {
        return {
          overall: 0.7,
          byFeature: {},
          improvement: 0,
          sampleSize: 0
        };
      }

      const accuracy = Math.max(0, 1 - result.avg_variance); // Higher variance = lower accuracy

      return {
        overall: accuracy,
        byFeature: {},
        improvement: accuracy - 0.7, // Baseline is 70%
        sampleSize: result.sample_size,
        variance: result.avg_variance
      };
    } catch (error) {
      this.logger.error('[ERROR] Failed to calculate accuracy', error);
      return {
        overall: 0.7,
        byFeature: {},
        improvement: 0
      };
    }
  }

  /**
   * Compare actuals with estimates
   */
  compareWithEstimates(actualData, estimates) {
    const comparison = {
      hours: {
        estimated: estimates.hours || estimates.estimatedHours,
        actual: actualData.hours || actualData.actualHours,
        variance: 0,
        percentage: 0
      },
      cost: {
        estimated: estimates.cost || estimates.estimatedCost,
        actual: actualData.cost || actualData.actualCost,
        variance: 0,
        percentage: 0
      },
      duration: {
        estimated: estimates.duration || estimates.estimatedDuration,
        actual: actualData.duration || actualData.actualDuration,
        variance: 0,
        percentage: 0
      }
    };

    // Calculate variances
    if (comparison.hours.estimated > 0) {
      comparison.hours.variance = comparison.hours.actual - comparison.hours.estimated;
      comparison.hours.percentage = (comparison.hours.variance / comparison.hours.estimated) * 100;
    }

    if (comparison.cost.estimated > 0) {
      comparison.cost.variance = comparison.cost.actual - comparison.cost.estimated;
      comparison.cost.percentage = (comparison.cost.variance / comparison.cost.estimated) * 100;
    }

    if (comparison.duration.estimated > 0) {
      comparison.duration.variance = comparison.duration.actual - comparison.duration.estimated;
      comparison.duration.percentage = (comparison.duration.variance / comparison.duration.estimated) * 100;
    }

    return comparison;
  }

  /**
   * Process feedback and trigger learning
   */
  async processFeedback(projectId, actuals) {
    try {
      // Calculate accuracy
      const accuracy = await this.calculateProjectAccuracy(projectId);

      // Get project estimates for comparison
      const project = await this.getProject(projectId);
      if (project) {
        const comparison = this.compareWithEstimates(actuals, {
          hours: project.total_hours || 0,
          cost: project.total_cost || 0,
          duration: project.estimated_duration || 0
        });

        // Analyze variance
        const analysis = await this.analyzeVariance(comparison);

        // Trigger learning if engine is available
        if (this.learningEngine) {
          await this.learningEngine.learnFromProject(projectId);
        }

        return {
          success: true,
          accuracy,
          comparison,
          analysis
        };
      }

      // Trigger learning if engine is available
      if (this.learningEngine) {
        await this.learningEngine.learnFromProject(projectId);
      }

      return {
        success: true,
        accuracy
      };
    } catch (error) {
      this.logger.error('[ERROR] Failed to process feedback', error);
      throw error;
    }
  }

  /**
   * Analyze variance to identify root causes
   */
  async analyzeVariance(accuracy) {
    const analysis = {
      rootCauses: [],
      recommendations: [],
      patterns: []
    };

    // Analyze hours variance
    if (accuracy.hours && Math.abs(accuracy.hours.percentage) > 15) {
      if (accuracy.hours.percentage > 0) {
        analysis.rootCauses.push('underestimated_complexity');
        analysis.recommendations.push('Increase complexity scores for similar features');
      } else {
        analysis.rootCauses.push('overestimated_complexity');
        analysis.recommendations.push('Review complexity scoring for similar features');
      }
    }

    // Analyze cost variance
    if (accuracy.cost && Math.abs(accuracy.cost.percentage) > 15) {
      analysis.rootCauses.push('rate_adjustment_needed');
      analysis.recommendations.push('Review hourly rates for project domain');
    }

    return analysis;
  }

  /**
   * Get project from database
   */
  async getProject(projectId) {
    if (!this.db) return null;

    try {
      const query = 'SELECT * FROM projects WHERE id = ? OR project_code = ?';
      const stmt = this.db.prepare(query);
      return stmt.get(projectId, projectId);
    } catch (error) {
      this.logger.error('[ERROR] Failed to get project', error);
      return null;
    }
  }

  /**
   * Get feature from database
   */
  async getFeature(featureId) {
    if (!this.db) return null;

    try {
      const query = 'SELECT * FROM features WHERE id = ?';
      const stmt = this.db.prepare(query);
      return stmt.get(featureId);
    } catch (error) {
      this.logger.error('[ERROR] Failed to get feature', error);
      return null;
    }
  }

  /**
   * Get project features
   */
  async getProjectFeatures(projectId) {
    if (!this.db) return [];

    try {
      const query = 'SELECT * FROM features WHERE project_id = ?';
      const stmt = this.db.prepare(query);
      return stmt.all(projectId);
    } catch (error) {
      this.logger.error('[ERROR] Failed to get project features', error);
      return [];
    }
  }

  /**
   * Update project status
   */
  async updateProjectStatus(projectId, status, accuracy) {
    if (!this.db) return;

    try {
      const query = `
        UPDATE projects 
        SET project_status = ?,
            updated_at = NOW()
        WHERE id = ? OR project_code = ?
      `;

      const stmt = this.db.prepare(query);
      stmt.run(status, projectId, projectId);

      // Store accuracy in learning_metrics table if it exists
      if (accuracy) {
        try {
          const metricsQuery = `
            INSERT INTO learning_metrics (
              project_id,
              overall_estimation_accuracy,
              created_at
            ) VALUES (?, ?, NOW())
            ON CONFLICT(project_id) DO UPDATE SET
              overall_estimation_accuracy = ?
          `;

          const metricsStmt = this.db.prepare(metricsQuery);
          metricsStmt.run(projectId, accuracy.overall * 100, accuracy.overall * 100);
        } catch (error) {
          // Table might not exist, ignore
        }
      }
    } catch (error) {
      this.logger.error('[ERROR] Failed to update project status', error);
    }
  }
}

module.exports = FeedbackLoop;

