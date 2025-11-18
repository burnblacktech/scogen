/**
 * Domain Emergence Detector Module
 * 
 * Purpose: Detect emerging domain patterns from project data
 * Philosophy: Identify new domains before they become common
 */

const crypto = require('crypto');

class DomainEmergenceDetector {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
  }

  /**
   * Main detection entry point
   * @returns {Promise<Array>} - Array of emerging domains
   */
  async detectEmergingDomains() {
    try {
      this.logger.info('Starting domain emergence detection');

      if (!this.db.db) {
        return [];
      }

      // Get recent projects (last 90 days) with actuals
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const projects = this.db.db.prepare(`
        SELECT * FROM projects 
        WHERE status = 'completed' 
        AND actual_cost IS NOT NULL 
        AND completed_at >= ?
      `).all(cutoffDate.toISOString());

      if (projects.length < 10) {
        this.logger.info('Insufficient projects for domain emergence detection');
        return [];
      }

      // Group projects by pattern key
      const patternGroups = {};
      
      for (const project of projects) {
        const patternKey = this.generatePatternKey(project);
        
        if (!patternGroups[patternKey]) {
          patternGroups[patternKey] = [];
        }
        patternGroups[patternKey].push(project);
      }

      // Filter: Patterns with >= 10 projects
      const emergingDomains = [];
      
      for (const [patternKey, patternProjects] of Object.entries(patternGroups)) {
        if (patternProjects.length >= 10) {
          // Check for duplicate domain pattern
          const duplicate = await this.checkDuplicateDomain(patternKey);
          
          if (duplicate) {
            this.logger.debug('Duplicate domain pattern filtered', {
              patternKey,
              existingLessonId: duplicate.id
            });
            continue;
          }

          // Generate domain graph
          const domainGraph = this.generateDomainGraph(patternKey, patternProjects);
          
          // Calculate confidence
          const confidence = this.calculateConfidence(patternProjects);
          
          // Store in learned_patterns
          await this.storeDomainPattern(patternKey, domainGraph, confidence, patternProjects[0].id);
          
          emergingDomains.push({
            patternKey,
            domain: domainGraph.domain,
            confidence,
            sampleSize: patternProjects.length,
            modules: domainGraph.modules,
            graph: domainGraph
          });
        }
      }

      this.logger.info('Domain emergence detection complete', {
        emergingDomainsCount: emergingDomains.length
      });

      return emergingDomains;
    } catch (error) {
      this.logger.error('Domain emergence detection failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate pattern key from project
   * @param {Object} project - Project object
   * @returns {string} - Normalized pattern key
   */
  generatePatternKey(project) {
    try {
      // Extract industry
      let industry = 'generic';
      if (project.client_id && this.db.db) {
        const client = this.db.db.prepare('SELECT industry FROM clients WHERE id = ?').get(project.client_id);
        if (client && client.industry) {
          industry = client.industry;
        }
      }

      // Extract module count
      let moduleCount = 0;
      try {
        const refinedScope = project.refined_scope 
          ? (typeof project.refined_scope === 'string' 
              ? JSON.parse(project.refined_scope) 
              : project.refined_scope)
          : null;
        
        if (refinedScope?.modules && Array.isArray(refinedScope.modules)) {
          moduleCount = refinedScope.modules.length;
        }
      } catch {
        // Ignore parsing errors
      }

      // Extract complexity level (from estimate or modules)
      let complexity = 'medium';
      try {
        const baseEstimate = project.base_estimate 
          ? (typeof project.base_estimate === 'string' 
              ? JSON.parse(project.base_estimate) 
              : project.base_estimate)
          : null;
        
        if (baseEstimate?.complexity) {
          complexity = baseEstimate.complexity;
        } else if (moduleCount > 15) {
          complexity = 'high';
        } else if (moduleCount < 5) {
          complexity = 'low';
        }
      } catch {
        // Default to medium
      }

      // Extract tech stack (if available)
      let techStack = 'generic';
      try {
        const technicalBreakdown = project.technical_breakdown 
          ? (typeof project.technical_breakdown === 'string' 
              ? JSON.parse(project.technical_breakdown) 
              : project.technical_breakdown)
          : null;
        
        if (technicalBreakdown?.techStack) {
          techStack = technicalBreakdown.techStack;
        }
      } catch {
        // Default to generic
      }

      // Create normalized key
      return `${industry}-${moduleCount}-${complexity}-${techStack}`.toLowerCase();
    } catch (error) {
      this.logger.warn('Failed to generate pattern key', {
        projectId: project.id,
        error: error.message
      });
      return 'generic-0-medium-generic';
    }
  }

  /**
   * Calculate confidence for domain pattern
   * @param {Array} projects - Projects in pattern
   * @returns {number} - Confidence score (0-1)
   */
  calculateConfidence(projects) {
    // Base confidence from sample size
    let confidence = Math.min(projects.length / 20, 0.8);
    
    // Boost confidence if projects have similar actuals (low variance)
    if (projects.length >= 3) {
      const costs = projects.map(p => p.actual_cost || 0).filter(c => c > 0);
      if (costs.length >= 3) {
        const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
        const variance = costs.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / costs.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / avg;
        
        // Lower variance = higher confidence
        if (coefficientOfVariation < 0.2) {
          confidence += 0.1;
        } else if (coefficientOfVariation < 0.3) {
          confidence += 0.05;
        }
      }
    }
    
    return Math.min(confidence, 0.95);
  }

  /**
   * Generate domain graph from pattern
   * @param {string} patternKey - Pattern key
   * @param {Array} projects - Projects in pattern
   * @returns {Object} - Domain graph structure
   */
  generateDomainGraph(patternKey, projects) {
    // Extract common modules (appear in 80%+ projects)
    const moduleFrequency = {};
    
    for (const project of projects) {
      try {
        const refinedScope = project.refined_scope 
          ? (typeof project.refined_scope === 'string' 
              ? JSON.parse(project.refined_scope) 
              : project.refined_scope)
          : null;
        
        if (refinedScope?.modules && Array.isArray(refinedScope.modules)) {
          const moduleNames = refinedScope.modules.map(m => (m.name || m.displayName || '').toLowerCase());
          const uniqueModules = [...new Set(moduleNames)];
          
          for (const moduleName of uniqueModules) {
            moduleFrequency[moduleName] = (moduleFrequency[moduleName] || 0) + 1;
          }
        }
      } catch {
        // Skip projects with parsing errors
      }
    }

    const threshold = Math.ceil(projects.length * 0.8);
    const commonModules = Object.entries(moduleFrequency)
      .filter(([_, count]) => count >= threshold)
      .map(([name, _]) => name);

    // Extract hidden edges (edge cases mentioned in 50%+ projects)
    const edgeCaseFrequency = {};
    
    for (const project of projects) {
      try {
        const edgeCases = project.edge_cases 
          ? (typeof project.edge_cases === 'string' 
              ? JSON.parse(project.edge_cases) 
              : project.edge_cases)
          : [];
        
        if (Array.isArray(edgeCases)) {
          for (const edgeCase of edgeCases) {
            const edgeKey = typeof edgeCase === 'string' ? edgeCase : edgeCase.description || '';
            if (edgeKey) {
              edgeCaseFrequency[edgeKey] = (edgeCaseFrequency[edgeKey] || 0) + 1;
            }
          }
        }
      } catch {
        // Skip
      }
    }

    const edgeThreshold = Math.ceil(projects.length * 0.5);
    const hiddenEdges = Object.entries(edgeCaseFrequency)
      .filter(([_, count]) => count >= edgeThreshold)
      .map(([name, _]) => name);

    // Calculate budget and timeline reality
    const costs = projects.map(p => p.actual_cost || 0).filter(c => c > 0);
    const days = projects.map(p => p.actual_timeline_days || 0).filter(d => d > 0);

    const budgetReality = {
      avg: costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0,
      min: costs.length > 0 ? Math.min(...costs) : 0,
      max: costs.length > 0 ? Math.max(...costs) : 0
    };

    const timelineReality = {
      avg: days.length > 0 ? days.reduce((a, b) => a + b, 0) / days.length : 0,
      min: days.length > 0 ? Math.min(...days) : 0,
      max: days.length > 0 ? Math.max(...days) : 0
    };

    return {
      domain: patternKey,
      modules: commonModules,
      hiddenEdges,
      budgetReality,
      timelineReality,
      confidence: this.calculateConfidence(projects),
      sampleSize: projects.length
    };
  }

  /**
   * Check for duplicate domain pattern
   * @param {string} patternKey - Pattern key
   * @returns {Promise<Object|null>} - Existing domain pattern or null
   */
  async checkDuplicateDomain(patternKey) {
    try {
      // Create hash of pattern key
      const lessonHash = crypto.createHash('sha256').update(patternKey + 'domain').digest('hex');

      // Query learning_lessons table
      if (this.db.getLearningLesson) {
        return this.db.getLearningLesson(lessonHash);
      } else if (this.db.db) {
        const stmt = this.db.db.prepare('SELECT * FROM learning_lessons WHERE lesson_hash = ?');
        return stmt.get(lessonHash) || null;
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to check duplicate domain', {
        patternKey,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Store domain pattern in learned_patterns
   * @param {string} patternKey - Pattern key
   * @param {Object} domainGraph - Domain graph
   * @param {number} confidence - Confidence score
   * @param {number} projectId - First project ID
   * @returns {Promise<void>}
   */
  async storeDomainPattern(patternKey, domainGraph, confidence, projectId) {
    try {
      // Store in learned_patterns table
      if (this.db.recordPattern) {
        this.db.recordPattern(
          'domain_emergence',
          domainGraph.domain,
          patternKey,
          domainGraph,
          true // Success
        );
      }

      // Also store in learning_lessons to prevent duplicates
      const lessonContent = {
        type: 'domain_pattern',
        patternKey,
        domain: domainGraph.domain,
        modules: domainGraph.modules,
        hiddenEdges: domainGraph.hiddenEdges
      };

      const contentString = JSON.stringify(lessonContent) + 'domain';
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
        await this.db.storeLearningLesson(lessonHash, 'domain', JSON.stringify(lessonContent), projectId, confidence);
      } else if (this.db.db) {
        const stmt = this.db.db.prepare(`
          INSERT INTO learning_lessons (
            lesson_hash, lesson_type, lesson_content, 
            first_seen_project_id, occurrence_count, confidence_score
          ) VALUES (?, ?, ?, ?, 1, ?)
        `);
        stmt.run(lessonHash, 'domain', JSON.stringify(lessonContent), projectId, confidence);
      }
    } catch (error) {
      this.logger.warn('Failed to store domain pattern', {
        patternKey,
        error: error.message
      });
      // Don't throw - not critical
    }
  }
}

module.exports = DomainEmergenceDetector;

