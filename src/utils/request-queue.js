// src/utils/request-queue.js
// Request queuing for high-load scenarios

class RequestQueue {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;
    this.queue = [];
    this.active = 0;
    this.waiting = [];
  }

  /**
   * Add a request to the queue
   */
  async enqueue(requestFn, priority = 0) {
    return new Promise((resolve, reject) => {
      const item = {
        requestFn,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(q => q.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(insertIndex, 0, item);
      }

      this.process();
    });
  }

  /**
   * Process the queue
   */
  async process() {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    this.active++;

    try {
      const result = await item.requestFn();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.active--;
      this.process(); // Process next item
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      active: this.active,
      maxConcurrent: this.maxConcurrent,
      waiting: this.waiting.length
    };
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.active = 0;
  }
}

module.exports = RequestQueue;

