/**
 * Memory Usage Monitor
 * Tracks memory usage and provides alerts for potential leaks
 */

class MemoryMonitor {
  constructor(logger, options = {}) {
    this.logger = logger;
    this.options = {
      checkInterval: options.checkInterval || 60000, // 1 minute
      warningThreshold: options.warningThreshold || 500 * 1024 * 1024, // 500MB
      criticalThreshold: options.criticalThreshold || 1000 * 1024 * 1024, // 1GB
      trackHistory: options.trackHistory !== false,
      maxHistorySize: options.maxHistorySize || 100
    };
    
    this.history = [];
    this.intervalId = null;
    this.isMonitoring = false;
  }

  /**
   * Start monitoring memory usage
   */
  start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.checkMemory();
    }, this.options.checkInterval);

    // Initial check
    this.checkMemory();
    
    this.logger?.info('Memory monitoring started', {
      checkInterval: this.options.checkInterval,
      warningThreshold: this.formatBytes(this.options.warningThreshold),
      criticalThreshold: this.formatBytes(this.options.criticalThreshold)
    });
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
    this.logger?.info('Memory monitoring stopped');
  }

  /**
   * Check current memory usage
   */
  checkMemory() {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    const heapTotal = usage.heapTotal;
    const rss = usage.rss;
    const external = usage.external;

    const snapshot = {
      timestamp: new Date().toISOString(),
      heapUsed,
      heapTotal,
      rss,
      external,
      heapUsedMB: this.formatBytes(heapUsed),
      heapTotalMB: this.formatBytes(heapTotal),
      rssMB: this.formatBytes(rss)
    };

    // Track history
    if (this.options.trackHistory) {
      this.history.push(snapshot);
      if (this.history.length > this.options.maxHistorySize) {
        this.history.shift();
      }
    }

    // Check thresholds
    if (heapUsed > this.options.criticalThreshold) {
      this.logger?.error('Critical memory usage detected', snapshot);
    } else if (heapUsed > this.options.warningThreshold) {
      this.logger?.warn('High memory usage detected', snapshot);
    }

    return snapshot;
  }

  /**
   * Get current memory snapshot
   */
  getSnapshot() {
    return this.checkMemory();
  }

  /**
   * Get memory history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Get memory statistics
   */
  getStats() {
    if (this.history.length === 0) {
      return null;
    }

    const heapUsages = this.history.map(h => h.heapUsed);
    const rssUsages = this.history.map(h => h.rss);

    return {
      samples: this.history.length,
      heapUsed: {
        min: Math.min(...heapUsages),
        max: Math.max(...heapUsages),
        avg: heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length,
        current: this.history[this.history.length - 1].heapUsed
      },
      rss: {
        min: Math.min(...rssUsages),
        max: Math.max(...rssUsages),
        avg: rssUsages.reduce((a, b) => a + b, 0) / rssUsages.length,
        current: this.history[this.history.length - 1].rss
      },
      trend: this.calculateTrend()
    };
  }

  /**
   * Calculate memory trend (increasing/decreasing/stable)
   */
  calculateTrend() {
    if (this.history.length < 2) {
      return 'insufficient_data';
    }

    const recent = this.history.slice(-10);
    const first = recent[0].heapUsed;
    const last = recent[recent.length - 1].heapUsed;
    const change = ((last - first) / first) * 100;

    if (change > 10) {
      return 'increasing';
    } else if (change < -10) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Force garbage collection if available (requires --expose-gc flag)
   */
  forceGC() {
    if (global.gc) {
      global.gc();
      this.logger?.info('Garbage collection forced');
      return true;
    } else {
      this.logger?.warn('Garbage collection not available (run with --expose-gc flag)');
      return false;
    }
  }
}

module.exports = MemoryMonitor;

