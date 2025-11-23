// src/core/analytics/AnalyticsDashboard.js
// Analytics Dashboard - Business Metrics and Accuracy Tracking

class AnalyticsDashboard {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger || console;
  }

  /**
   * Get comprehensive business metrics
   */
  async getBusinessMetrics() {
    return {
      accuracy: await this.getAccuracyMetrics(),
      efficiency: await this.getEfficiencyMetrics(),
      business: await this.getBusinessMetrics(),
      learning: await this.getLearningMetrics()
    };
  }

  /**
   * Get accuracy metrics
   */
  async getAccuracyMetrics() {
    if (!this.db) {
      return {
        overall: 0.7,
        byDomain: {},
        trend: [],
        improvement: 0
      };
    }

    try {
      // Overall accuracy
      const overallQuery = `
        SELECT 
          AVG(1 - ABS(actual_hours - estimated_hours) / NULLIF(estimated_hours, 0)) as accuracy
        FROM project_actuals
        WHERE estimated_hours > 0 AND actual_hours > 0
      `;
      const overallStmt = this.db.prepare(overallQuery);
      const overallResult = overallStmt.get();
      const overall = overallResult?.accuracy || 0.7;

      // Accuracy by domain
      const domainQuery = `
        SELECT 
          domain,
          AVG(1 - ABS(actual_hours - estimated_hours) / NULLIF(estimated_hours, 0)) as accuracy,
          COUNT(*) as sample_size
        FROM project_actuals
        WHERE estimated_hours > 0 AND actual_hours > 0
        GROUP BY domain
      `;
      const domainStmt = this.db.prepare(domainQuery);
      const domainResults = domainStmt.all();
      const byDomain = {};
      domainResults.forEach(row => {
        byDomain[row.domain || 'generic'] = {
          accuracy: row.accuracy || 0.7,
          sampleSize: row.sample_size || 0
        };
      });

      // Accuracy trend (last 6 months)
      const trendQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          AVG(1 - ABS(actual_hours - estimated_hours) / NULLIF(estimated_hours, 0)) as accuracy
        FROM project_actuals
        WHERE created_at >= NOW() - INTERVAL '6 months'
          AND estimated_hours > 0 AND actual_hours > 0
        GROUP BY month
        ORDER BY month
      `;
      const trendStmt = this.db.prepare(trendQuery);
      const trendResults = trendStmt.all();
      const trend = trendResults.map(row => ({
        month: row.month,
        accuracy: row.accuracy || 0.7
      }));

      // Calculate improvement rate
      const improvement = trend.length > 1
        ? trend[trend.length - 1].accuracy - trend[0].accuracy
        : 0;

      return {
        overall: Math.max(0, Math.min(1, overall)),
        byDomain,
        trend,
        improvement: Math.round(improvement * 100) / 100
      };
    } catch (error) {
      this.logger.error('[ERROR] Failed to get accuracy metrics', error);
      return {
        overall: 0.7,
        byDomain: {},
        trend: [],
        improvement: 0
      };
    }
  }

  /**
   * Get efficiency metrics
   */
  async getEfficiencyMetrics() {
    if (!this.db) {
      return {
        scopingTime: 0,
        reuseRate: 0,
        templateUsage: 0
      };
    }

    try {
      // Average scoping time (would be tracked separately)
      const scopingTime = 0; // Placeholder

      // Component reuse rate
      const reuseQuery = `
        SELECT 
          SUM(times_reused) as total_reuses,
          COUNT(*) as total_components
        FROM components
      `;
      const reuseStmt = this.db.prepare(reuseQuery);
      const reuseResult = reuseStmt.get();
      const reuseRate = reuseResult?.total_components > 0
        ? reuseResult.total_reuses / reuseResult.total_components
        : 0;

      // Template usage rate (would track template usage)
      const templateUsage = 0; // Placeholder

      return {
        scopingTime,
        reuseRate: Math.round(reuseRate * 100) / 100,
        templateUsage
      };
    } catch (error) {
      this.logger.error('[ERROR] Failed to get efficiency metrics', error);
      return {
        scopingTime: 0,
        reuseRate: 0,
        templateUsage: 0
      };
    }
  }

  /**
   * Get business metrics
   */
  async getBusinessMetrics() {
    if (!this.db) {
      return {
        projectsScoped: 0,
        totalValue: 0,
        winRate: 0,
        clientSatisfaction: 0
      };
    }

    try {
      // Total projects scoped
      const projectsQuery = 'SELECT COUNT(*) as count FROM projects';
      const projectsStmt = this.db.prepare(projectsQuery);
      const projectsResult = projectsStmt.get();
      const projectsScoped = projectsResult?.count || 0;

      // Total project value
      const valueQuery = `
        SELECT SUM(estimated_cost) as total_value
        FROM projects
        WHERE estimated_cost > 0
      `;
      const valueStmt = this.db.prepare(valueQuery);
      const valueResult = valueStmt.get();
      const totalValue = valueResult?.total_value || 0;

      // Win rate (would track project status)
      const winRate = 0; // Placeholder

      // Client satisfaction (would track CSAT scores)
      const satisfactionQuery = `
        SELECT AVG(client_satisfaction_score) as avg_satisfaction
        FROM learning_metrics
        WHERE client_satisfaction_score > 0
      `;
      const satisfactionStmt = this.db.prepare(satisfactionQuery);
      const satisfactionResult = satisfactionStmt.get();
      const clientSatisfaction = satisfactionResult?.avg_satisfaction || 0;

      return {
        projectsScoped,
        totalValue,
        winRate,
        clientSatisfaction: Math.round(clientSatisfaction * 100) / 100
      };
    } catch (error) {
      this.logger.error('[ERROR] Failed to get business metrics', error);
      return {
        projectsScoped: 0,
        totalValue: 0,
        winRate: 0,
        clientSatisfaction: 0
      };
    }
  }

  /**
   * Get learning metrics
   */
  async getLearningMetrics() {
    if (!this.db) {
      return {
        patternsIdentified: 0,
        componentsExtracted: 0,
        accuracyImprovement: 0
      };
    }

    try {
      // Patterns identified
      const patternsQuery = 'SELECT COUNT(*) as count FROM estimation_patterns';
      const patternsStmt = this.db.prepare(patternsQuery);
      const patternsResult = patternsStmt.get();
      const patternsIdentified = patternsResult?.count || 0;

      // Components extracted
      const componentsQuery = 'SELECT COUNT(*) as count FROM components';
      const componentsStmt = this.db.prepare(componentsQuery);
      const componentsResult = componentsStmt.get();
      const componentsExtracted = componentsResult?.count || 0;

      // Accuracy improvement (from learning_metrics)
      const improvementQuery = `
        SELECT 
          AVG(overall_estimation_accuracy) as avg_accuracy
        FROM learning_metrics
        WHERE overall_estimation_accuracy > 0
      `;
      const improvementStmt = this.db.prepare(improvementQuery);
      const improvementResult = improvementStmt.get();
      const accuracyImprovement = improvementResult?.avg_accuracy 
        ? (improvementResult.avg_accuracy - 70) / 100 // Baseline is 70%
        : 0;

      return {
        patternsIdentified,
        componentsExtracted,
        accuracyImprovement: Math.round(accuracyImprovement * 100) / 100
      };
    } catch (error) {
      this.logger.error('[ERROR] Failed to get learning metrics', error);
      return {
        patternsIdentified: 0,
        componentsExtracted: 0,
        accuracyImprovement: 0
      };
    }
  }

  /**
   * Get accuracy by domain
   */
  async getAccuracyByDomain() {
    return (await this.getAccuracyMetrics()).byDomain;
  }

  /**
   * Get accuracy trend
   */
  async getAccuracyTrend() {
    return (await this.getAccuracyMetrics()).trend;
  }

  /**
   * Get improvement rate
   */
  async getImprovementRate() {
    return (await this.getAccuracyMetrics()).improvement;
  }

  /**
   * Get average scoping time
   */
  async getAverageScopingTime() {
    return (await this.getEfficiencyMetrics()).scopingTime;
  }

  /**
   * Get component reuse rate
   */
  async getComponentReuseRate() {
    return (await this.getEfficiencyMetrics()).reuseRate;
  }

  /**
   * Get template usage rate
   */
  async getTemplateUsageRate() {
    return (await this.getEfficiencyMetrics()).templateUsage;
  }

  /**
   * Get total projects
   */
  async getTotalProjects() {
    return (await this.getBusinessMetrics()).projectsScoped;
  }

  /**
   * Get total project value
   */
  async getTotalProjectValue() {
    return (await this.getBusinessMetrics()).totalValue;
  }

  /**
   * Get win rate
   */
  async getWinRate() {
    return (await this.getBusinessMetrics()).winRate;
  }

  /**
   * Get CSAT
   */
  async getCSAT() {
    return (await this.getBusinessMetrics()).clientSatisfaction;
  }

  /**
   * Get pattern count
   */
  async getPatternCount() {
    return (await this.getLearningMetrics()).patternsIdentified;
  }

  /**
   * Get component count
   */
  async getComponentCount() {
    return (await this.getLearningMetrics()).componentsExtracted;
  }

  /**
   * Get learning curve
   */
  async getLearningCurve() {
    return (await this.getLearningMetrics()).accuracyImprovement;
  }
}

module.exports = AnalyticsDashboard;

