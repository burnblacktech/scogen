// src/utils/performance-monitor.js
// Performance monitoring and optimization utilities

class PerformanceMonitor {
  constructor(logger, config = null) {
    this.logger = logger;
    this.config = config;
    this.operationTimings = new Map();
    this.slowOperations = [];
    // Load threshold from config if available
    this.SLOW_OPERATION_THRESHOLD = config?.get?.('performance.slowOperationThreshold') || 5000; // 5 seconds
  }

  /**
   * Start timing an operation
   */
  start(operationName) {
    const startTime = performance.now();
    this.operationTimings.set(operationName, { start: startTime });
    return operationName;
  }

  /**
   * End timing an operation and log if slow
   */
  end(operationName, metadata = {}) {
    const timing = this.operationTimings.get(operationName);
    if (!timing) {
      this.logger.warn(`Performance monitor: No start time found for ${operationName}`);
      return null;
    }

    const duration = performance.now() - timing.start;
    this.operationTimings.delete(operationName);

    // Log slow operations
    if (duration > this.SLOW_OPERATION_THRESHOLD) {
      this.slowOperations.push({
        operation: operationName,
        duration,
        timestamp: Date.now(),
        metadata
      });

      this.logger.warn('Slow operation detected', {
        operation: operationName,
        duration: `${(duration / 1000).toFixed(2)}s`,
        threshold: `${(this.SLOW_OPERATION_THRESHOLD / 1000).toFixed(2)}s`,
        metadata
      });
    } else {
      this.logger.debug('Operation completed', {
        operation: operationName,
        duration: `${(duration / 1000).toFixed(2)}s`,
        metadata
      });
    }

    return duration;
  }

  /**
   * Time an async operation
   */
  async time(operationName, operation, metadata = {}) {
    this.start(operationName);
    try {
      const result = await operation();
      this.end(operationName, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.end(operationName, { ...metadata, success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Get slow operations summary
   */
  getSlowOperations(limit = 10) {
    return this.slowOperations
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Clear all timings
   */
  clear() {
    this.operationTimings.clear();
    this.slowOperations = [];
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const slowOps = this.getSlowOperations(10);
    return {
      slowOperationsCount: this.slowOperations.length,
      slowOperations: slowOps,
      averageSlowDuration: slowOps.length > 0
        ? slowOps.reduce((sum, op) => sum + op.duration, 0) / slowOps.length
        : 0
    };
  }
}

module.exports = PerformanceMonitor;

