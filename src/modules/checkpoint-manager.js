/**
 * Checkpoint Manager
 * 
 * Manages checkpoint states, decisions, and resume functionality
 * for prescriptive checkpoint mode in chain execution
 */

class CheckpointManager {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
    
    // Define checkpoint configuration
    this.checkpoints = {
      'cp0_input': {
        name: 'Input Quality Gate',
        after: 'stepInputAnalysis',
        required: true,
        description: 'Review input quality and request clarification if needed'
      },
      'cp1_prescription': {
        name: 'Architecture Prescription',
        after: 'stepRequirementsEnrichment',
        required: false,
        description: 'Review recommended architecture and tech stack'
      },
      'cp2_scope': {
        name: 'Scope Refinement',
        after: 'stepRefiner',
        required: true,
        description: 'Review refined scope before estimation'
      },
      'cp3_estimate': {
        name: 'Estimate Approval',
        after: 'stepEstimator',
        required: true,
        description: 'Review cost and timeline estimates'
      },
      'cp4_blueprint': {
        name: 'Technical Blueprint',
        after: 'stepTechnicalDecomposition',
        required: false,
        description: 'Review technical blueprint and implementation plan'
      }
    };
    
    // Active checkpoint states (in-memory for quick access)
    this.activeCheckpoints = new Map();
  }

  /**
   * Save checkpoint state
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Checkpoint identifier
   * @param {Object} state - State data to save
   * @param {number} projectId - Optional project ID
   * @returns {Object} Saved checkpoint state
   */
  saveCheckpoint(sessionId, checkpointId, state, projectId = null) {
    if (!this.checkpoints[checkpointId]) {
      throw new Error(`Unknown checkpoint: ${checkpointId}`);
    }

    try {
      const checkpointConfig = this.checkpoints[checkpointId];
      const stateData = JSON.stringify(state);
      
      // Save to database
      const stmt = this.db.db.prepare(`
        INSERT OR REPLACE INTO checkpoint_states (
          session_id, checkpoint_id, checkpoint_name, state_data, project_id, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
      `);
      
      stmt.run(
        sessionId,
        checkpointId,
        checkpointConfig.name,
        stateData,
        projectId
      );

      // Update execution session
      this.updateExecutionSession(sessionId, checkpointId, projectId, 'paused');

      // Cache in memory
      this.activeCheckpoints.set(`${sessionId}_${checkpointId}`, {
        sessionId,
        checkpointId,
        state,
        timestamp: Date.now()
      });

      this.logger.info('Checkpoint saved', { sessionId, checkpointId });

      return {
        sessionId,
        checkpointId,
        checkpointName: checkpointConfig.name,
        state,
        status: 'active'
      };
    } catch (error) {
      this.logger.error('Failed to save checkpoint', {
        sessionId,
        checkpointId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get checkpoint state
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Checkpoint identifier
   * @returns {Object|null} Checkpoint state or null if not found
   */
  getCheckpoint(sessionId, checkpointId) {
    try {
      // Check cache first
      const cacheKey = `${sessionId}_${checkpointId}`;
      if (this.activeCheckpoints.has(cacheKey)) {
        return this.activeCheckpoints.get(cacheKey);
      }

      // Query database
      const stmt = this.db.db.prepare(`
        SELECT * FROM checkpoint_states
        WHERE session_id = ? AND checkpoint_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `);

      const row = stmt.get(sessionId, checkpointId);
      
      if (!row) {
        return null;
      }

      const state = JSON.parse(row.state_data);

      // Cache it
      this.activeCheckpoints.set(cacheKey, {
        sessionId: row.session_id,
        checkpointId: row.checkpoint_id,
        state,
        timestamp: new Date(row.created_at).getTime()
      });

      return {
        sessionId: row.session_id,
        checkpointId: row.checkpoint_id,
        checkpointName: row.checkpoint_name,
        state,
        projectId: row.project_id,
        status: row.status,
        createdAt: row.created_at
      };
    } catch (error) {
      this.logger.error('Failed to get checkpoint', {
        sessionId,
        checkpointId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Wait for checkpoint decision (non-blocking - returns immediately)
   * In practice, this will be handled via API polling or WebSocket
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Checkpoint identifier
   * @param {number} timeout - Timeout in milliseconds (default: 24 hours)
   * @returns {Promise<Object>} Decision object
   */
  async waitForDecision(sessionId, checkpointId, timeout = 24 * 60 * 60 * 1000) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const decision = this.getDecision(sessionId, checkpointId);
        
        if (decision) {
          clearInterval(checkInterval);
          resolve(decision);
          return;
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Checkpoint decision timeout'));
          return;
        }
      }, 1000); // Check every second
    });
  }

  /**
   * Get checkpoint decision
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Checkpoint identifier
   * @returns {Object|null} Decision or null if not found
   */
  getDecision(sessionId, checkpointId) {
    try {
      const stmt = this.db.db.prepare(`
        SELECT * FROM checkpoint_decisions
        WHERE session_id = ? AND checkpoint_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `);

      const row = stmt.get(sessionId, checkpointId);
      
      if (!row) {
        return null;
      }

      return {
        sessionId: row.session_id,
        checkpointId: row.checkpoint_id,
        decisionType: row.decision_type,
        decisionData: JSON.parse(row.decision_data || '{}'),
        createdAt: row.created_at
      };
    } catch (error) {
      this.logger.error('Failed to get decision', {
        sessionId,
        checkpointId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Save checkpoint decision
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Checkpoint identifier
   * @param {string} decisionType - Decision type: 'approve', 'modify', 'reject', 'pause', 'custom'
   * @param {Object} decisionData - Additional decision data
   * @returns {Object} Saved decision
   */
  saveDecision(sessionId, checkpointId, decisionType, decisionData = {}) {
    try {
      const stmt = this.db.db.prepare(`
        INSERT INTO checkpoint_decisions (
          session_id, checkpoint_id, decision_type, decision_data, created_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        sessionId,
        checkpointId,
        decisionType,
        JSON.stringify(decisionData)
      );

      // Update execution session status based on decision
      if (decisionType === 'approve' || decisionType === 'modify') {
        this.updateExecutionSession(sessionId, checkpointId, null, 'running');
      } else if (decisionType === 'pause') {
        this.updateExecutionSession(sessionId, checkpointId, null, 'paused');
      }

      this.logger.info('Checkpoint decision saved', {
        sessionId,
        checkpointId,
        decisionType
      });

      return {
        sessionId,
        checkpointId,
        decisionType,
        decisionData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to save decision', {
        sessionId,
        checkpointId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Resume from checkpoint
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Checkpoint identifier
   * @returns {Object} Checkpoint state for resumption
   */
  resumeFromCheckpoint(sessionId, checkpointId) {
    const checkpoint = this.getCheckpoint(sessionId, checkpointId);
    
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${sessionId}/${checkpointId}`);
    }

    const decision = this.getDecision(sessionId, checkpointId);
    
    // Update execution session
    this.updateExecutionSession(sessionId, checkpointId, checkpoint.projectId, 'running');

    this.logger.info('Resuming from checkpoint', { sessionId, checkpointId });

    return {
      checkpoint,
      decision,
      resumeData: {
        sessionId,
        checkpointId,
        state: checkpoint.state,
        decision: decision?.decisionData || {}
      }
    };
  }

  /**
   * List all checkpoints for a session
   * @param {string} sessionId - Session identifier
   * @returns {Array} List of checkpoints
   */
  listCheckpoints(sessionId) {
    try {
      const stmt = this.db.db.prepare(`
        SELECT * FROM checkpoint_states
        WHERE session_id = ?
        ORDER BY created_at ASC
      `);

      const rows = stmt.all(sessionId);
      
      return rows.map(row => ({
        sessionId: row.session_id,
        checkpointId: row.checkpoint_id,
        checkpointName: row.checkpoint_name,
        state: JSON.parse(row.state_data),
        projectId: row.project_id,
        status: row.status,
        createdAt: row.created_at
      }));
    } catch (error) {
      this.logger.error('Failed to list checkpoints', {
        sessionId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Update execution session
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Current checkpoint
   * @param {number} projectId - Project ID
   * @param {string} status - Status: 'running', 'paused', 'completed', 'aborted'
   */
  updateExecutionSession(sessionId, checkpointId, projectId, status) {
    try {
      // Check if session exists
      const checkStmt = this.db.db.prepare(`
        SELECT session_id FROM execution_sessions WHERE session_id = ?
      `);
      const existing = checkStmt.get(sessionId);

      if (existing) {
        // Update existing
        const updateStmt = this.db.db.prepare(`
          UPDATE execution_sessions
          SET current_checkpoint = ?, project_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE session_id = ?
        `);
        updateStmt.run(checkpointId, projectId, status, sessionId);
      } else {
        // Insert new
        const insertStmt = this.db.db.prepare(`
          INSERT INTO execution_sessions (
            session_id, project_id, current_checkpoint, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        insertStmt.run(sessionId, projectId, checkpointId, status);
      }
    } catch (error) {
      this.logger.error('Failed to update execution session', {
        sessionId,
        error: error.message
      });
    }
  }

  /**
   * Get execution session
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Execution session or null
   */
  getExecutionSession(sessionId) {
    try {
      const stmt = this.db.db.prepare(`
        SELECT * FROM execution_sessions WHERE session_id = ?
      `);
      return stmt.get(sessionId);
    } catch (error) {
      this.logger.error('Failed to get execution session', {
        sessionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get checkpoint configuration
   * @param {string} checkpointId - Checkpoint identifier
   * @returns {Object|null} Checkpoint configuration
   */
  getCheckpointConfig(checkpointId) {
    return this.checkpoints[checkpointId] || null;
  }

  /**
   * Get all checkpoint configurations
   * @returns {Object} All checkpoint configurations
   */
  getAllCheckpoints() {
    return this.checkpoints;
  }

  /**
   * Clear checkpoint cache
   * @param {string} sessionId - Optional session ID to clear specific session
   */
  clearCache(sessionId = null) {
    if (sessionId) {
      // Clear specific session
      for (const key of this.activeCheckpoints.keys()) {
        if (key.startsWith(sessionId)) {
          this.activeCheckpoints.delete(key);
        }
      }
    } else {
      // Clear all
      this.activeCheckpoints.clear();
    }
  }
}

module.exports = CheckpointManager;

