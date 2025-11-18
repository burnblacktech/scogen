/**
 * Testing Metrics Module
 * Tracks and aggregates metrics for internal testing projects
 */
class TestingMetrics {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Track a test project
   * @param {number} projectId - Project ID
   * @param {Object} testData - Test data (category, processingTime, etc.)
   * @returns {Object} - Tracking result
   */
  async trackProject(projectId, testData) {
    try {
      const { category, processingTime, inputQuality, outputModifications, wouldPayFor, improvements } = testData;

      // Get next test number
      const testNumber = await this.getNextTestNumber();

      // Update project with test info
      this.db.prepare(`
        UPDATE projects 
        SET test_number = ?,
            test_category = ?,
            output_version = COALESCE(output_version, 'v2')
        WHERE id = ?
      `).run(testNumber, category, projectId);

      // Store test metrics
      this.db.prepare(`
        INSERT INTO test_metrics (
          project_id,
          processing_time_ms,
          would_pay_for_this,
          needs_improvement,
          output_quality_score
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        projectId,
        processingTime || null,
        wouldPayFor || null,
        improvements || null,
        null // Will be updated later via feedback
      );

      this.logger.info('Test project tracked', {
        projectId,
        testNumber,
        category
      });

      return {
        projectId,
        testNumber,
        category,
        tracked: true
      };
    } catch (error) {
      this.logger.error('Failed to track test project', {
        projectId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get next test number
   * @returns {Promise<number>} - Next test number
   */
  async getNextTestNumber() {
    try {
      const result = this.db.prepare(
        'SELECT MAX(test_number) as max_num FROM projects WHERE test_number IS NOT NULL'
      ).get();

      return (result?.max_num || 0) + 1;
    } catch (error) {
      this.logger.warn('Failed to get next test number', { error: error.message });
      return 1;
    }
  }

  /**
   * Get testing summary statistics
   * @returns {Object} - Summary stats
   */
  async getTestingSummary() {
    try {
      // Get total projects
      const totalResult = this.db.prepare(`
        SELECT COUNT(*) as total
        FROM projects
        WHERE test_number IS NOT NULL
      `).get();

      const total = totalResult?.total || 0;

      // Get accuracy stats (projects with actual cost)
      const accuracyResult = this.db.prepare(`
        SELECT 
          AVG(CASE 
            WHEN actual_cost > 0 AND quoted_cost > 0 
            THEN ABS(actual_cost - quoted_cost) / quoted_cost * 100
            ELSE NULL
          END) as accuracy,
          COUNT(*) as count
        FROM projects
        WHERE test_number IS NOT NULL
          AND actual_cost > 0
          AND quoted_cost > 0
      `).get();

      const accuracy = accuracyResult?.accuracy || 0;
      const accuracyCount = accuracyResult?.count || 0;

      // Get average quality score
      const qualityResult = this.db.prepare(`
        SELECT AVG(output_quality_score) as avgQuality
        FROM projects
        WHERE test_number IS NOT NULL
          AND output_quality_score IS NOT NULL
      `).get();

      const avgQuality = qualityResult?.avgQuality || 0;

      // Get average processing time
      const timeResult = this.db.prepare(`
        SELECT AVG(processing_time_ms) as avgTime
        FROM test_metrics
        WHERE processing_time_ms IS NOT NULL
      `).get();

      const avgProcessingTime = timeResult?.avgTime || 0;

      return {
        total: total,
        accuracy: accuracy,
        accuracyCount: accuracyCount,
        avgQuality: avgQuality,
        avgProcessingTime: avgProcessingTime
      };
    } catch (error) {
      this.logger.error('Failed to get testing summary', { error: error.message });
      return {
        total: 0,
        accuracy: 0,
        accuracyCount: 0,
        avgQuality: 0,
        avgProcessingTime: 0
      };
    }
  }

  /**
   * Get list of test projects
   * @param {number} limit - Maximum number of projects to return
   * @returns {Array} - Array of test projects
   */
  getTestProjects(limit = 50) {
    try {
      const projects = this.db.prepare(`
        SELECT 
          id,
          project_code,
          test_number,
          test_category,
          quoted_cost,
          actual_cost,
          output_quality_score,
          CASE 
            WHEN actual_cost > 0 AND quoted_cost > 0 
            THEN (actual_cost - quoted_cost) / quoted_cost * 100
            ELSE NULL
          END as variance,
          created_at
        FROM projects
        WHERE test_number IS NOT NULL
        ORDER BY test_number DESC
        LIMIT ?
      `).all(limit);

      return projects || [];
    } catch (error) {
      this.logger.error('Failed to get test projects', { error: error.message });
      return [];
    }
  }

  /**
   * Submit feedback for a test project
   * @param {number} projectId - Project ID
   * @param {Object} feedback - Feedback data (cost, timeline, quality, etc.)
   * @returns {Object} - Update result
   */
  submitFeedback(projectId, feedback) {
    try {
      const { cost, timeline, output_quality_score, wouldPayFor, improvements } = feedback;

      // Update project with actuals
      const updates = [];
      const values = [];

      if (cost !== undefined && cost !== null) {
        updates.push('actual_cost = ?');
        values.push(cost);
      }

      if (timeline !== undefined && timeline !== null) {
        updates.push('actual_timeline_days = ?');
        values.push(timeline);
      }

      if (output_quality_score !== undefined && output_quality_score !== null) {
        updates.push('output_quality_score = ?');
        values.push(output_quality_score);
      }

      if (updates.length > 0) {
        values.push(projectId);
        this.db.prepare(`
          UPDATE projects 
          SET ${updates.join(', ')}
          WHERE id = ?
        `).run(...values);
      }

      // Update test metrics
      if (wouldPayFor !== undefined || improvements) {
        const metricUpdates = [];
        const metricValues = [];

        if (wouldPayFor !== undefined) {
          metricUpdates.push('would_pay_for_this = ?');
          metricValues.push(wouldPayFor);
        }

        if (improvements) {
          metricUpdates.push('needs_improvement = ?');
          metricValues.push(improvements);
        }

        if (metricUpdates.length > 0) {
          metricValues.push(projectId);
          this.db.prepare(`
            UPDATE test_metrics 
            SET ${metricUpdates.join(', ')}
            WHERE project_id = ?
          `).run(...metricValues);
        }
      }

      this.logger.info('Test feedback submitted', {
        projectId,
        hasCost: cost !== undefined,
        hasTimeline: timeline !== undefined,
        hasQuality: output_quality_score !== undefined
      });

      return {
        success: true,
        projectId,
        updated: true
      };
    } catch (error) {
      this.logger.error('Failed to submit test feedback', {
        projectId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = TestingMetrics;

