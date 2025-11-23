/**
 * Progress Tracker
 * 
 * Handles real-time progress updates via Socket.IO for PDF generation
 */

class ProgressTracker {
  constructor() {
    this.socket = null;
    this.jobId = null;
    this.connected = false;
    this.callbacks = {
      onProgress: null,
      onComplete: null,
      onError: null
    };
  }

  /**
   * Connect to Socket.IO server
   */
  connect() {
    if (this.socket && this.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Connect to Socket.IO (same origin as current page)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const socketUrl = `${protocol}//${host}`;

        this.socket = io(socketUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          this.connected = true;
          console.log('Socket.IO connected');
          resolve();
        });

        this.socket.on('disconnect', () => {
          this.connected = false;
          console.log('Socket.IO disconnected');
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error);
          reject(error);
        });

        // Listen for progress updates
        this.socket.on('progress', (data) => {
          if (this.callbacks.onProgress) {
            this.callbacks.onProgress(data);
          }
        });

        // Listen for completion
        this.socket.on('completed', (data) => {
          if (this.callbacks.onComplete) {
            this.callbacks.onComplete(data);
          }
        });

        // Listen for partial success
        this.socket.on('partial-success', (data) => {
          if (this.callbacks.onComplete) {
            // Use same callback but mark as partial
            this.callbacks.onComplete({ ...data, isPartial: true });
          }
        });

        // Listen for errors
        this.socket.on('error', (data) => {
          if (this.callbacks.onError) {
            this.callbacks.onError(data);
          }
        });

        // Listen for subscription confirmation
        this.socket.on('subscribed', (data) => {
          console.log('Subscribed to job:', data.jobId);
        });

      } catch (error) {
        console.error('Failed to initialize Socket.IO:', error);
        reject(error);
      }
    });
  }

  /**
   * Subscribe to job updates
   * @param {string} jobId - Job ID to subscribe to
   */
  subscribe(jobId) {
    if (!this.socket || !this.connected) {
      console.error('Socket.IO not connected');
      return;
    }

    this.jobId = jobId;
    this.socket.emit('subscribe', jobId);
    console.log('Subscribed to job:', jobId);
  }

  /**
   * Set progress callback
   * @param {Function} callback - Callback function(data)
   */
  onProgress(callback) {
    this.callbacks.onProgress = callback;
  }

  /**
   * Set completion callback
   * @param {Function} callback - Callback function(data)
   */
  onComplete(callback) {
    this.callbacks.onComplete = callback;
  }

  /**
   * Set error callback
   * @param {Function} callback - Callback function(error)
   */
  onError(callback) {
    this.callbacks.onError = callback;
  }

  /**
   * Disconnect from Socket.IO
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.jobId = null;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressTracker;
}

