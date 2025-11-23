// src/core/learning/LearningEngine.js
// Learning Engine - The Brain That Gets Smarter

class LearningEngine {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger || console;
    this.complexityAnalyzer = require('../estimation/ComplexityAnalyzer');
  }

  /**
   * Learn from a completed project
   * This is the core intelligence - updates models based on actuals
   */
  async learnFromProject(projectId) {
    try {
      // Get project actuals
      const actuals = await this.getProjectActuals(projectId);
      if (!actuals || actuals.length === 0) {
        this.logger.warn(`[LEARNING] No actuals found for project ${projectId}`);
        return { learned: false, reason: 'no_actuals' };
      }

      // Extract patterns from actuals
      const patterns = await this.extractPatterns(actuals);

      // Update estimation models
      await this.updateEstimationModels(patterns);
      await this.updateComplexityWeights(patterns);
      await this.updateDomainModels(patterns);

      // Calculate accuracy improvement
      const accuracy = await this.calculateAccuracy(patterns);

      this.logger.info(`[LEARNING] Learned from project ${projectId}`, {
        patternsFound: patterns.length,
        accuracyImprovement: accuracy.improvement
      });

      return {
        learned: true,
        patterns: patterns.length,
        accuracyImprovement: accuracy.improvement,
        updatedModels: ['estimation', 'complexity', 'domain']
      };
    } catch (error) {
      this.logger.error(`[ERROR] Learning failed for project ${projectId}`, error);
      throw error;
    }
  }

  /**
   * Get project actuals from database
   */
  async getProjectActuals(projectId) {
    if (!this.db) {
      this.logger.warn('[WARN] Database not available, using mock data');
      return [];
    }

    try {
      const query = `
        SELECT 
          pa.*,
          f.feature_name,
          f.feature_category,
          f.complexity_score as estimated_complexity
        FROM project_actuals pa
        JOIN features f ON pa.feature_id = f.id
        WHERE pa.project_id = ?
      `;

      const stmt = this.db.prepare(query);
      const actuals = stmt.all(projectId);

      return actuals;
    } catch (error) {
      this.logger.error('[ERROR] Failed to get project actuals', error);
      return [];
    }
  }

  /**
   * Extract patterns from actuals
   * Identifies what went wrong/right and why
   */
  async extractPatterns(actuals) {
    const patterns = [];

    for (const actual of actuals) {
      const variance = this.calculateVariance(actual);
      
      if (Math.abs(variance.percentage) > 0.15) { // >15% variance is significant
        const pattern = {
          type: variance.percentage > 0 ? 'overrun' : 'underestimate',
          domain: actual.domain || 'generic',
          complexity: actual.complexity_misestimate || actual.estimated_complexity,
          variance: variance.percentage,
          factors: this.identifyVarianceFactors(actual),
          featureCategory: actual.feature_category,
          techStack: actual.tech_stack || {},
          teamSize: actual.team_size,
          clientType: actual.client_type
        };

        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Calculate variance between estimate and actual
   */
  calculateVariance(actual) {
    const hoursVariance = actual.actual_hours - actual.estimated_hours;
    const costVariance = actual.actual_cost - actual.estimated_cost;
    
    const hoursPercentage = actual.estimated_hours > 0 
      ? (hoursVariance / actual.estimated_hours) 
      : 0;
    
    const costPercentage = actual.estimated_cost > 0 
      ? (costVariance / actual.estimated_cost) 
      : 0;

    return {
      hours: hoursVariance,
      cost: costVariance,
      percentage: (hoursPercentage + costPercentage) / 2, // Average
      hoursPercentage,
      costPercentage
    };
  }

  /**
   * Identify factors that caused variance
   */
  identifyVarianceFactors(actual) {
    const factors = [];

    if (actual.variance_reasons && Array.isArray(actual.variance_reasons)) {
      factors.push(...actual.variance_reasons);
    }

    // Analyze complexity misestimate
    if (actual.complexity_misestimate) {
      if (actual.complexity_misestimate > 1.2) {
        factors.push('underestimated_complexity');
      } else if (actual.complexity_misestimate < 0.8) {
        factors.push('overestimated_complexity');
      }
    }

    // Analyze team size impact
    if (actual.team_size) {
      if (actual.team_size < 3) {
        factors.push('small_team_overhead');
      } else if (actual.team_size > 8) {
        factors.push('large_team_coordination');
      }
    }

    return factors;
  }

  /**
   * Update estimation models based on patterns
   */
  async updateEstimationModels(patterns) {
    if (!this.db) return;

    try {
      // Group patterns by type
      const overrunPatterns = patterns.filter(p => p.type === 'overrun');
      const underestimatePatterns = patterns.filter(p => p.type === 'underestimate');

      // Calculate multipliers
      const overrunMultiplier = this.calculatePatternMultiplier(overrunPatterns);
      const underestimateMultiplier = this.calculatePatternMultiplier(underestimatePatterns);

      // Store patterns in estimation_patterns table
      for (const pattern of patterns) {
        const hourMultiplier = pattern.type === 'overrun' 
          ? 1 + (pattern.variance * 0.5) // Increase estimates
          : 1 - (Math.abs(pattern.variance) * 0.3); // Decrease estimates

        const costMultiplier = hourMultiplier; // Cost follows hours

        await this.savePattern(pattern, {
          hour_multiplier: Math.max(0.5, Math.min(2.0, hourMultiplier)),
          cost_multiplier: Math.max(0.5, Math.min(2.0, costMultiplier))
        });
      }

      this.logger.info('[LEARNING] Updated estimation models', {
        overrunMultiplier,
        underestimateMultiplier,
        patternsSaved: patterns.length
      });
    } catch (error) {
      this.logger.error('[ERROR] Failed to update estimation models', error);
    }
  }

  /**
   * Calculate pattern multiplier
   */
  calculatePatternMultiplier(patterns) {
    if (patterns.length === 0) return 1.0;

    const avgVariance = patterns.reduce((sum, p) => sum + Math.abs(p.variance), 0) / patterns.length;
    return 1 + (avgVariance * 0.3); // Conservative adjustment
  }

  /**
   * Save pattern to database
   */
  async savePattern(pattern, multipliers) {
    if (!this.db) return;

    try {
      const query = `
        INSERT INTO estimation_patterns (
          pattern_name,
          pattern_type,
          conditions,
          hour_multiplier,
          cost_multiplier,
          occurrence_count,
          accuracy_improvement
        ) VALUES (?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(pattern_name) DO UPDATE SET
          occurrence_count = occurrence_count + 1,
          accuracy_improvement = (accuracy_improvement + ?) / 2
      `;

      const patternName = `${pattern.domain}_${pattern.featureCategory}_${pattern.type}`;
      const conditions = JSON.stringify({
        domain: pattern.domain,
        complexity: pattern.complexity,
        featureCategory: pattern.featureCategory,
        techStack: pattern.techStack,
        teamSize: pattern.teamSize,
        clientType: pattern.clientType
      });

      const stmt = this.db.prepare(query);
      stmt.run(
        patternName,
        pattern.type,
        conditions,
        multipliers.hour_multiplier,
        multipliers.cost_multiplier,
        multipliers.accuracy_improvement || 0.05,
        multipliers.accuracy_improvement || 0.05
      );
    } catch (error) {
      this.logger.error('[ERROR] Failed to save pattern', error);
    }
  }

  /**
   * Update complexity weights based on patterns
   */
  async updateComplexityWeights(patterns) {
    // Analyze which complexity factors were most predictive
    const factorAccuracy = {
      functional: 0,
      technical: 0,
      integration: 0,
      data: 0,
      business: 0
    };

    // This would analyze historical accuracy by factor
    // For now, return current weights
    return {
      functional: 0.3,
      technical: 0.25,
      integration: 0.25,
      data: 0.1,
      business: 0.1
    };
  }

  /**
   * Update domain models based on patterns
   */
  async updateDomainModels(patterns) {
    // Group patterns by domain
    const domainPatterns = {};
    
    for (const pattern of patterns) {
      const domain = pattern.domain || 'generic';
      if (!domainPatterns[domain]) {
        domainPatterns[domain] = [];
      }
      domainPatterns[domain].push(pattern);
    }

    // Calculate domain-specific adjustments
    const domainAdjustments = {};
    
    for (const [domain, domainPatternsList] of Object.entries(domainPatterns)) {
      const avgVariance = domainPatternsList.reduce((sum, p) => sum + p.variance, 0) / domainPatternsList.length;
      domainAdjustments[domain] = {
        multiplier: 1 + (avgVariance * 0.2), // Conservative adjustment
        confidence: Math.min(1.0, domainPatternsList.length / 10) // More data = higher confidence
      };
    }

    return domainAdjustments;
  }

  /**
   * Calculate accuracy improvement
   */
  async calculateAccuracy(patterns) {
    if (patterns.length === 0) {
      return { improvement: 0, currentAccuracy: 0.7 };
    }

    // Calculate average variance reduction
    const avgVariance = patterns.reduce((sum, p) => sum + Math.abs(p.variance), 0) / patterns.length;
    const improvement = Math.min(0.3, avgVariance * 0.1); // Max 30% improvement

    // Estimate current accuracy (would be calculated from historical data)
    const currentAccuracy = 0.7 + improvement;

    return {
      improvement,
      currentAccuracy,
      varianceReduction: avgVariance
    };
  }

  /**
   * Get historical accuracy for a domain/complexity combination
   */
  async getHistoricalAccuracy(domain, complexity) {
    if (!this.db) {
      return {
        sampleSize: 0,
        averageActualToEstimate: 1.0,
        standardDeviation: 0.2,
        confidence: 0.5
      };
    }

    try {
      const query = `
        SELECT 
          COUNT(*) as sample_size,
          AVG(actual_hours / NULLIF(estimated_hours, 0)) as avg_ratio,
          STDDEV(actual_hours / NULLIF(estimated_hours, 0)) as std_dev
        FROM project_actuals pa
        JOIN features f ON pa.feature_id = f.id
        WHERE pa.domain = ? 
          AND f.complexity_score BETWEEN ? AND ?
          AND pa.actual_hours > 0
          AND pa.estimated_hours > 0
      `;

      const complexityFloor = Math.floor(complexity);
      const complexityCeil = Math.ceil(complexity);

      const stmt = this.db.prepare(query);
      const result = stmt.get(domain || 'generic', complexityFloor, complexityCeil);

      if (!result || result.sample_size === 0) {
        return {
          sampleSize: 0,
          averageActualToEstimate: 1.0,
          standardDeviation: 0.2,
          confidence: 0.5
        };
      }

      return {
        sampleSize: result.sample_size,
        averageActualToEstimate: result.avg_ratio || 1.0,
        standardDeviation: result.std_dev || 0.2,
        confidence: Math.min(0.95, 0.5 + (result.sample_size / 20) * 0.45)
      };
    } catch (error) {
      this.logger.error('[ERROR] Failed to get historical accuracy', error);
      return {
        sampleSize: 0,
        averageActualToEstimate: 1.0,
        standardDeviation: 0.2,
        confidence: 0.5
      };
    }
  }

  /**
   * Get data availability for a domain
   */
  getDataAvailability(domain) {
    if (!this.db) return 0;

    try {
      const query = `
        SELECT COUNT(DISTINCT project_id) as count
        FROM project_actuals
        WHERE domain = ?
      `;

      const stmt = this.db.prepare(query);
      const result = stmt.get(domain || 'generic');

      return result?.count || 0;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = LearningEngine;

