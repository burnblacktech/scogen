// src/core/library/ComponentLibrary.js
// Component Library - Reusable Component Management

class ComponentLibrary {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger || console;
  }

  /**
   * Extract component from completed code
   */
  async extractComponent(code, metadata) {
    try {
      const component = {
        id: this.generateId(),
        component_name: metadata.name,
        component_category: this.categorize(code, metadata),
        description: metadata.description || `Reusable ${metadata.name} component`,
        base_code: this.templatize(code),
        customization_points: this.identifyVariables(code),
        dependencies: this.extractDependencies(code),
        tech_stack: metadata.techStack || {},
        includes_indian_compliance: this.detectIndianCompliance(code),
        industries_used: [metadata.industry || 'generic'],
        times_reused: 0,
        average_hours_saved: metadata.hoursSaved || 0,
        success_rate: 1.0
      };

      // Save to database
      if (this.db) {
        await this.saveComponent(component);
      }

      // Index for search
      await this.indexForSearch(component);

      this.logger.info(`[COMPONENT] Extracted component: ${component.component_name}`);

      return component;
    } catch (error) {
      this.logger.error('[ERROR] Failed to extract component', error);
      throw error;
    }
  }

  /**
   * Match components to requirements
   */
  async matchComponents(requirements) {
    const matches = [];

    for (const req of requirements) {
      const semanticMatches = await this.semanticSearch(req);
      const bestMatch = this.rankMatches(semanticMatches, req);

      if (bestMatch && bestMatch.score > 0.8) {
        matches.push({
          requirement: req.name || req,
          component: bestMatch.component,
          matchScore: bestMatch.score,
          savings: bestMatch.component.average_hours_saved || 
                   (bestMatch.component.estimated_hours * 0.7),
          customizationEffort: bestMatch.component.estimated_hours * 0.3,
          customizationPoints: bestMatch.component.customization_points
        });
      }
    }

    return matches;
  }

  /**
   * Semantic search for components
   */
  async semanticSearch(requirement) {
    if (!this.db) {
      return [];
    }

    try {
      // Simple keyword-based search (would be enhanced with ML/NLP)
      const reqText = JSON.stringify(requirement).toLowerCase();
      const keywords = this.extractKeywords(reqText);

      const query = `
        SELECT * FROM components
        WHERE 
          component_name ILIKE ANY(ARRAY[${keywords.map(() => '?').join(',')}])
          OR description ILIKE ANY(ARRAY[${keywords.map(() => '?').join(',')}])
          OR component_category IN (
            SELECT category FROM component_categories 
            WHERE keywords && ARRAY[${keywords.map(() => '?').join(',')}]
          )
        ORDER BY times_reused DESC, success_rate DESC
        LIMIT 10
      `;

      const searchTerms = keywords.map(k => `%${k}%`);
      const stmt = this.db.prepare(query);
      const results = stmt.all(...searchTerms, ...keywords, ...keywords);

      return results.map(comp => ({
        component: comp,
        score: this.calculateMatchScore(comp, requirement, keywords)
      }));
    } catch (error) {
      this.logger.error('[ERROR] Semantic search failed', error);
      return [];
    }
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));

    // Return unique keywords
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Calculate match score
   */
  calculateMatchScore(component, requirement, keywords) {
    let score = 0;

    const compText = (component.component_name + ' ' + component.description).toLowerCase();
    
    // Keyword matching
    const matchedKeywords = keywords.filter(k => compText.includes(k)).length;
    score += (matchedKeywords / keywords.length) * 0.6;

    // Category matching
    if (requirement.category && component.component_category === requirement.category) {
      score += 0.2;
    }

    // Reusability score (more reused = more reliable)
    score += Math.min(0.2, component.times_reused / 10) * 0.2;

    return Math.min(1.0, score);
  }

  /**
   * Rank matches by score
   */
  rankMatches(matches, requirement) {
    if (matches.length === 0) return null;

    return matches.sort((a, b) => b.score - a.score)[0];
  }

  /**
   * Categorize component
   */
  categorize(code, metadata) {
    const codeText = code.toLowerCase();
    const name = (metadata.name || '').toLowerCase();

    if (codeText.includes('auth') || name.includes('auth') || name.includes('login')) {
      return 'authentication';
    }
    if (codeText.includes('payment') || name.includes('payment') || name.includes('gateway')) {
      return 'payment';
    }
    if (codeText.includes('notification') || name.includes('notification') || name.includes('email')) {
      return 'notification';
    }
    if (codeText.includes('report') || name.includes('report')) {
      return 'reporting';
    }
    if (codeText.includes('api') || name.includes('api')) {
      return 'api';
    }
    if (codeText.includes('database') || codeText.includes('db') || name.includes('database')) {
      return 'database';
    }

    return metadata.category || 'utility';
  }

  /**
   * Templatize code (identify variables)
   */
  templatize(code) {
    // Simple templatization - identify common patterns
    let templated = code;

    // Replace hardcoded values with placeholders
    templated = templated.replace(/(['"])([A-Z0-9_]+)\1/g, (match, quote, value) => {
      if (value.length > 5 && /^[A-Z_]/.test(value)) {
        return `{{${value.toLowerCase()}}}`;
      }
      return match;
    });

    return templated;
  }

  /**
   * Identify customization points
   */
  identifyVariables(code) {
    const variables = [];

    // Find configuration objects
    const configMatches = code.match(/config\s*=\s*\{[^}]+\}/gi);
    if (configMatches) {
      variables.push({
        type: 'configuration',
        description: 'Component configuration'
      });
    }

    // Find API endpoints
    const endpointMatches = code.match(/['"](https?:\/\/[^'"]+)['"]/gi);
    if (endpointMatches) {
      variables.push({
        type: 'endpoint',
        description: 'API endpoint URL'
      });
    }

    return variables;
  }

  /**
   * Extract dependencies
   */
  extractDependencies(code) {
    const dependencies = [];

    // Find require/import statements
    const requireMatches = code.match(/require\(['"]([^'"]+)['"]\)/g);
    const importMatches = code.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g);

    [...requireMatches || [], ...importMatches || []].forEach(match => {
      const dep = match.match(/['"]([^'"]+)['"]/)[1];
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push(dep);
      }
    });

    return dependencies;
  }

  /**
   * Detect Indian compliance requirements
   */
  detectIndianCompliance(code) {
    const codeText = code.toLowerCase();
    return codeText.includes('gst') || 
           codeText.includes('aadhaar') || 
           codeText.includes('pan') ||
           codeText.includes('razorpay') ||
           codeText.includes('upi');
  }

  /**
   * Save component to database
   */
  async saveComponent(component) {
    if (!this.db) return;

    try {
      const query = `
        INSERT INTO components (
          id,
          component_name,
          component_category,
          description,
          base_code,
          customization_points,
          dependencies,
          tech_stack,
          includes_indian_compliance,
          industries_used,
          times_reused,
          average_hours_saved,
          success_rate,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT(component_name) DO UPDATE SET
          times_reused = components.times_reused + 1,
          last_used_at = NOW()
      `;

      const stmt = this.db.prepare(query);
      stmt.run(
        component.id,
        component.component_name,
        component.component_category,
        component.description,
        component.base_code,
        JSON.stringify(component.customization_points),
        JSON.stringify(component.dependencies),
        JSON.stringify(component.tech_stack),
        component.includes_indian_compliance,
        JSON.stringify(component.industries_used),
        component.times_reused,
        component.average_hours_saved,
        component.success_rate
      );
    } catch (error) {
      this.logger.error('[ERROR] Failed to save component', error);
    }
  }

  /**
   * Index component for search
   */
  async indexForSearch(component) {
    // Placeholder for search indexing
    // Would integrate with Elasticsearch or similar
    this.logger.info(`[COMPONENT] Indexed component: ${component.component_name}`);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get component reuse statistics
   */
  async getReuseStatistics() {
    if (!this.db) {
      return {
        totalComponents: 0,
        totalReuses: 0,
        totalHoursSaved: 0
      };
    }

    try {
      const query = `
        SELECT 
          COUNT(*) as total_components,
          SUM(times_reused) as total_reuses,
          SUM(average_hours_saved * times_reused) as total_hours_saved
        FROM components
      `;

      const stmt = this.db.prepare(query);
      const result = stmt.get();

      return {
        totalComponents: result.total_components || 0,
        totalReuses: result.total_reuses || 0,
        totalHoursSaved: result.total_hours_saved || 0
      };
    } catch (error) {
      this.logger.error('[ERROR] Failed to get reuse statistics', error);
      return {
        totalComponents: 0,
        totalReuses: 0,
        totalHoursSaved: 0
      };
    }
  }
}

module.exports = ComponentLibrary;

