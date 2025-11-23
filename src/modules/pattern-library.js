/**
 * Pattern Library Manager
 * 
 * Handles pattern storage and learning from AI discoveries
 * Stores patterns in JSON files and tracks statistics
 */

const fs = require('fs').promises;
const path = require('path');

class PatternLibrary {
  constructor() {
    this.libraryPath = path.join(__dirname, '../../data/patterns');
    this.patterns = {
      implicit: new Map(),
      domain: new Map(),
      edgeCases: new Map(),
      technical: new Map()
    };
    this.statistics = {
      patternHits: new Map(),
      patternMisses: new Map(),
      aiDiscoveries: new Map()
    };
    this.initialized = false;
  }

  /**
   * Initialize pattern library
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Ensure pattern directory exists
      await fs.mkdir(this.libraryPath, { recursive: true });
      
      // Load existing patterns
      await this.loadPatterns();
      
      // Load statistics
      await this.loadStatistics();
      
      this.initialized = true;
      console.log('[OK] Pattern library initialized');
    } catch (error) {
      console.error('Error initializing pattern library:', error);
    }
  }

  /**
   * Load patterns from files
   */
  async loadPatterns() {
    const patternFiles = ['implicit.json', 'domain.json', 'edgeCases.json', 'technical.json'];
    
    for (const file of patternFiles) {
      const filePath = path.join(this.libraryPath, file);
      try {
        const data = await fs.readFile(filePath, 'utf8');
        const patterns = JSON.parse(data);
        const category = file.replace('.json', '');
        
        for (const [key, value] of Object.entries(patterns)) {
          this.patterns[category].set(key, value);
        }
      } catch (error) {
        // File doesn't exist yet, that's ok
        if (error.code !== 'ENOENT') {
          console.error(`Error loading ${file}:`, error);
        }
      }
    }
  }

  /**
   * Save patterns to files
   */
  async savePatterns() {
    for (const [category, patterns] of Object.entries(this.patterns)) {
      const filePath = path.join(this.libraryPath, `${category}.json`);
      const data = Object.fromEntries(patterns);
      
      try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      } catch (error) {
        console.error(`Error saving ${category} patterns:`, error);
      }
    }
  }

  /**
   * Load statistics
   */
  async loadStatistics() {
    const statsPath = path.join(this.libraryPath, 'statistics.json');
    
    try {
      const data = await fs.readFile(statsPath, 'utf8');
      const stats = JSON.parse(data);
      
      this.statistics.patternHits = new Map(stats.patternHits || []);
      this.statistics.patternMisses = new Map(stats.patternMisses || []);
      this.statistics.aiDiscoveries = new Map(stats.aiDiscoveries || []);
    } catch (error) {
      // File doesn't exist yet
      if (error.code !== 'ENOENT') {
        console.error('Error loading statistics:', error);
      }
    }
  }

  /**
   * Save statistics
   */
  async saveStatistics() {
    const statsPath = path.join(this.libraryPath, 'statistics.json');
    const stats = {
      patternHits: Array.from(this.statistics.patternHits),
      patternMisses: Array.from(this.statistics.patternMisses),
      aiDiscoveries: Array.from(this.statistics.aiDiscoveries),
      timestamp: new Date().toISOString()
    };
    
    try {
      await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('Error saving statistics:', error);
    }
  }

  /**
   * Get patterns for a category
   */
  getPatterns(category, key) {
    if (!this.patterns[category]) return null;
    
    const pattern = this.patterns[category].get(key);
    if (pattern) {
      this.recordHit(category, key);
      return pattern;
    } else {
      this.recordMiss(category, key);
      return null;
    }
  }

  /**
   * Add new pattern (learned from AI)
   */
  async addPattern(category, key, pattern, confidence = 0.5) {
    if (!this.patterns[category]) {
      this.patterns[category] = new Map();
    }
    
    const existingPattern = this.patterns[category].get(key);
    
    if (existingPattern) {
      // Update confidence and merge patterns
      pattern.confidence = Math.min(1, (existingPattern.confidence || 0.5) + 0.1);
      pattern.items = [...new Set([...existingPattern.items || [], ...pattern.items || []])];
    } else {
      pattern.confidence = confidence;
    }
    
    this.patterns[category].set(key, pattern);
    
    // Save immediately
    await this.savePatterns();
    
    console.log(`📚 Pattern learned: ${category}/${key} (confidence: ${pattern.confidence})`);
  }

  /**
   * Record AI discovery
   */
  async recordDiscovery(category, discovery, context) {
    const key = `${category}_${context.domain || 'general'}`;
    
    if (!this.statistics.aiDiscoveries.has(key)) {
      this.statistics.aiDiscoveries.set(key, []);
    }
    
    const discoveries = this.statistics.aiDiscoveries.get(key);
    discoveries.push({
      discovery,
      context,
      timestamp: Date.now(),
      count: 1
    });
    
    // Check if this discovery should become a pattern
    const similarDiscoveries = discoveries.filter(d => 
      this.isSimilar(d.discovery, discovery)
    );
    
    if (similarDiscoveries.length >= 3) {
      // This discovery has appeared 3+ times, promote to pattern
      await this.promoteToPattern(category, discovery, context);
    }
    
    await this.saveStatistics();
  }

  /**
   * Check if two discoveries are similar
   */
  isSimilar(discovery1, discovery2) {
    // Simple similarity check (can be enhanced)
    const d1Lower = typeof discovery1 === 'string' ? discovery1.toLowerCase() : discovery1.discovery?.toLowerCase() || '';
    const d2Lower = typeof discovery2 === 'string' ? discovery2.toLowerCase() : discovery2.discovery?.toLowerCase() || '';
    
    // Check if they share significant keywords
    const keywords1 = d1Lower.split(/\s+/).filter(w => w.length > 3);
    const keywords2 = d2Lower.split(/\s+/).filter(w => w.length > 3);
    
    const common = keywords1.filter(k => keywords2.includes(k));
    const similarity = common.length / Math.max(keywords1.length, keywords2.length);
    
    return similarity > 0.6;
  }

  /**
   * Promote a discovery to a pattern
   */
  async promoteToPattern(category, discovery, context) {
    const key = context.domain || 'general';
    const discoveryText = typeof discovery === 'string' ? discovery : discovery.discovery || discovery;
    
    await this.addPattern(category, key, {
      items: [discoveryText],
      source: 'ai_learning',
      confidence: 0.7,
      context,
      promotedAt: new Date().toISOString()
    });
    
    console.log(`🎯 Discovery promoted to pattern: ${category}/${key}`);
  }

  /**
   * Record pattern hit
   */
  recordHit(category, key) {
    const hitKey = `${category}_${key}`;
    const hits = this.statistics.patternHits.get(hitKey) || 0;
    this.statistics.patternHits.set(hitKey, hits + 1);
  }

  /**
   * Record pattern miss
   */
  recordMiss(category, key) {
    const missKey = `${category}_${key}`;
    const misses = this.statistics.patternMisses.get(missKey) || 0;
    this.statistics.patternMisses.set(missKey, misses + 1);
  }

  /**
   * Get pattern performance statistics
   */
  getPatternStats() {
    const stats = {
      totalPatterns: 0,
      categoryBreakdown: {},
      topHits: [],
      topMisses: [],
      recentDiscoveries: []
    };
    
    // Count patterns by category
    for (const [category, patterns] of Object.entries(this.patterns)) {
      stats.categoryBreakdown[category] = patterns.size;
      stats.totalPatterns += patterns.size;
    }
    
    // Top hits
    const hits = Array.from(this.statistics.patternHits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    stats.topHits = hits.map(([key, count]) => ({ pattern: key, hits: count }));
    
    // Top misses
    const misses = Array.from(this.statistics.patternMisses.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    stats.topMisses = misses.map(([key, count]) => ({ pattern: key, misses: count }));
    
    // Recent discoveries
    for (const [key, discoveries] of this.statistics.aiDiscoveries.entries()) {
      const recent = discoveries.slice(-5).reverse();
      stats.recentDiscoveries.push(...recent.map(d => ({
        category: key,
        discovery: typeof d.discovery === 'string' ? d.discovery : d.discovery?.discovery || d.discovery,
        timestamp: new Date(d.timestamp).toISOString()
      })));
    }
    
    return stats;
  }

  /**
   * Export patterns for analysis
   */
  async exportPatterns(filePath) {
    const exportData = {
      patterns: {},
      statistics: this.getPatternStats(),
      exportedAt: new Date().toISOString()
    };
    
    for (const [category, patterns] of Object.entries(this.patterns)) {
      exportData.patterns[category] = Object.fromEntries(patterns);
    }
    
    // Ensure export directory exists
    const exportDir = path.dirname(filePath);
    await fs.mkdir(exportDir, { recursive: true });
    
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    console.log(`📦 Patterns exported to ${filePath}`);
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getPatternLibrary: () => {
    if (!instance) {
      instance = new PatternLibrary();
    }
    return instance;
  }
};

