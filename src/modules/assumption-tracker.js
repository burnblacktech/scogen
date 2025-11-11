/**
 * Assumption Tracker Module
 * 
 * Purpose: Track and surface all assumptions made during estimation
 * Philosophy: Transparency - users should know what assumptions were made
 */

class AssumptionTracker {
  constructor(logger) {
    this.logger = logger;
    this.assumptions = new Map();
  }

  /**
   * Track an assumption
   * @param {string} key - Assumption identifier (e.g., 'techStack', 'teamSize')
   * @param {*} value - Current assumption value
   * @param {string} category - Category (tech, team, scope, etc.)
   * @param {Object} impact - Impact of changing this assumption
   */
  track(key, value, category = 'general', impact = {}) {
    this.assumptions.set(key, {
      key,
      value,
      category,
      impact: {
        cost: impact.cost || 0,
        timeline: impact.timeline || 0,
        description: impact.description || ''
      },
      timestamp: Date.now()
    });

    this.logger.debug('Assumption tracked', { key, value, category });
  }

  /**
   * Get all assumptions
   * @returns {Array} - Array of assumption objects
   */
  getAll() {
    return Array.from(this.assumptions.values());
  }

  /**
   * Get assumptions by category
   * @param {string} category - Category to filter by
   * @returns {Array} - Filtered assumptions
   */
  getByCategory(category) {
    return this.getAll().filter(a => a.category === category);
  }

  /**
   * Get a specific assumption
   * @param {string} key - Assumption key
   * @returns {Object|null} - Assumption object or null
   */
  get(key) {
    return this.assumptions.get(key) || null;
  }

  /**
   * Calculate impact of changing an assumption
   * @param {string} key - Assumption key
   * @param {*} newValue - New value
   * @returns {Object} - Impact calculation
   */
  calculateImpact(key, newValue) {
    const assumption = this.get(key);
    if (!assumption) {
      return { error: 'Assumption not found' };
    }

    // Base impact from assumption
    const baseImpact = assumption.impact;

    // Calculate relative impact based on value change
    // This is a simplified calculation - can be enhanced
    let costImpact = baseImpact.cost;
    let timelineImpact = baseImpact.timeline;

    // Value-specific adjustments (can be enhanced with domain knowledge)
    if (key === 'teamSize') {
      const oldSize = parseInt(assumption.value) || 1;
      const newSize = parseInt(newValue) || 1;
      
      if (newSize > oldSize) {
        // More developers = faster but more expensive
        timelineImpact = -Math.round(timelineImpact * (newSize / oldSize - 1));
        costImpact = Math.round(costImpact * (newSize / oldSize));
      } else {
        // Fewer developers = slower but cheaper
        timelineImpact = Math.round(timelineImpact * (oldSize / newSize - 1));
        costImpact = -Math.round(costImpact * (oldSize / newSize - 1));
      }
    }

    return {
      key,
      oldValue: assumption.value,
      newValue,
      impact: {
        cost: costImpact,
        timeline: timelineImpact,
        description: baseImpact.description
      }
    };
  }

  /**
   * Reset all assumptions
   */
  reset() {
    this.assumptions.clear();
    this.logger.debug('Assumptions reset');
  }

  /**
   * Track common assumptions from project details
   * @param {Object} projectDetails - Project details from UI
   * @param {Object} estimate - Current estimate
   */
  trackFromProjectDetails(projectDetails, estimate) {
    // Tech stack assumptions
    this.track('techStack', 'React/Node.js', 'tech', {
      cost: 0,
      timeline: 0,
      description: 'Using React frontend and Node.js backend. Changing to Vue/Angular has minimal cost impact.'
    });

    this.track('database', 'PostgreSQL', 'tech', {
      cost: 0,
      timeline: 0,
      description: 'Using PostgreSQL. Changing to MongoDB/MySQL has minimal cost impact (~₹5K).'
    });

    this.track('hosting', 'AWS', 'tech', {
      cost: 0,
      timeline: 0,
      description: 'Using AWS hosting. Changing to Azure/GCP has minimal cost impact.'
    });

    // Team assumptions
    const teamSize = projectDetails.teamSize || 1;
    this.track('teamSize', teamSize, 'team', {
      cost: teamSize > 1 ? estimate.cost?.total * 0.1 : 0,
      timeline: teamSize > 1 ? -Math.round(estimate.timeline?.weeks * 0.4) : 0,
      description: `${teamSize} developer(s). Adding developers reduces timeline but increases cost.`
    });

    // Development approach
    this.track('developmentApproach', 'from scratch', 'scope', {
      cost: -80000,
      timeline: -2,
      description: 'Building from scratch. Using templates could save ₹80K and 2 weeks.'
    });

    // Scale assumptions
    if (projectDetails.scale) {
      this.track('projectScale', projectDetails.scale, 'scope', {
        cost: 0,
        timeline: 0,
        description: `Project scale: ${projectDetails.scale}. Affects architecture decisions.`
      });
    }

    // Market assumptions
    if (projectDetails.marketRegion) {
      this.track('marketRegion', projectDetails.marketRegion, 'scope', {
        cost: 0,
        timeline: 0,
        description: `Primary market: ${projectDetails.marketRegion}. Affects compliance and rates.`
      });
    }
  }

  /**
   * Format assumptions for display
   * @returns {Object} - Formatted assumptions grouped by category
   */
  formatForDisplay() {
    const all = this.getAll();
    const grouped = {};

    all.forEach(assumption => {
      if (!grouped[assumption.category]) {
        grouped[assumption.category] = [];
      }
      grouped[assumption.category].push(assumption);
    });

    return {
      total: all.length,
      byCategory: grouped,
      all: all
    };
  }
}

module.exports = AssumptionTracker;

