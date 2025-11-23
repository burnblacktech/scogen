// src/core/lifecycle/ProjectLifecycle.js
// Project Lifecycle Management with State Machine

const EventEmitter = require('events');

class ProjectLifecycle extends EventEmitter {
  constructor(db, logger) {
    super();
    this.db = db;
    this.logger = logger || console;
    
    // Define state machine
    this.states = {
      DRAFT: 'draft',
      SCOPING: 'scoping',
      REVIEW: 'review',
      APPROVED: 'approved',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      LEARNED: 'learned',
      CANCELLED: 'cancelled',
      PAUSED: 'paused'
    };
    
    // Define valid transitions
    this.transitions = {
      draft: ['scoping', 'cancelled'],
      scoping: ['review', 'draft', 'cancelled'],
      review: ['approved', 'scoping', 'cancelled'],
      approved: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'paused', 'cancelled'],
      paused: ['in_progress', 'cancelled'],
      completed: ['learned'],
      learned: [], // Terminal state
      cancelled: [] // Terminal state
    };
    
    this.setupTables();
  }
  
  /**
   * Setup required database tables
   */
  setupTables() {
    try {
      // Create project_state_logs table if not exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS project_state_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id TEXT NOT NULL,
          from_state TEXT,
          to_state TEXT NOT NULL,
          changed_by TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create index for faster queries
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_project_state_logs_project 
        ON project_state_logs(project_id)
      `);
      
      this.logger.info('[LIFECYCLE] Tables initialized');
    } catch (error) {
      this.logger.error('[ERROR] Failed to setup lifecycle tables', error);
    }
  }
  
  /**
   * Transition project to new state
   * @param {string} projectId - Project ID
   * @param {string} newState - New state
   * @param {string} userId - User ID making the change
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Transition result
   */
  async transitionProject(projectId, newState, userId = null, metadata = {}) {
    try {
      // Get current project state
      const project = this.getProject(projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      const currentState = project.project_status || project.status || 'draft';
      
      // Validate transition
      if (!this.canTransition(currentState, newState)) {
        throw new Error(
          `Invalid transition: ${currentState} → ${newState}. ` +
          `Valid transitions from ${currentState}: ${this.transitions[currentState]?.join(', ') || 'none'}`
        );
      }
      
      // Execute pre-transition actions
      await this.executePreTransitionActions(project, newState, metadata);
      
      // Update project state
      const updateStmt = this.db.prepare(`
        UPDATE projects 
        SET project_status = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? OR project_code = ?
      `);
      
      updateStmt.run(newState, projectId, projectId);
      
      // Update last_updated_by if column exists
      try {
        const updateUserStmt = this.db.prepare(`
          UPDATE projects 
          SET last_updated_by = ?
          WHERE id = ? OR project_code = ?
        `);
        updateUserStmt.run(userId, projectId, projectId);
      } catch (error) {
        // Column might not exist yet, that's okay
        this.logger.debug('[LIFECYCLE] last_updated_by column not found, skipping');
      }
      
      // Log state change
      await this.logStateChange(projectId, currentState, newState, userId, metadata);
      
      // Execute post-transition actions
      await this.executePostTransitionActions(project, newState, metadata);
      
      // Emit event for listeners
      this.emit('stateChanged', {
        projectId,
        fromState: currentState,
        toState: newState,
        userId,
        metadata,
        timestamp: new Date().toISOString()
      });
      
      this.logger.info(`[LIFECYCLE] Project ${projectId} transitioned: ${currentState} → ${newState}`);
      
      return { 
        success: true, 
        fromState: currentState,
        toState: newState,
        projectId 
      };
      
    } catch (error) {
      this.logger.error(`[ERROR] Failed to transition project ${projectId}`, error);
      throw error;
    }
  }
  
  /**
   * Check if transition is valid
   * @param {string} currentState - Current state
   * @param {string} newState - New state
   * @returns {boolean} True if transition is valid
   */
  canTransition(currentState, newState) {
    const allowedStates = this.transitions[currentState] || [];
    return allowedStates.includes(newState);
  }
  
  /**
   * Get project from database
   * @param {string} projectId - Project ID or project_code
   * @returns {Object|null} Project object
   */
  getProject(projectId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM projects 
        WHERE id = ? OR project_code = ?
        LIMIT 1
      `);
      return stmt.get(projectId, projectId) || null;
    } catch (error) {
      this.logger.error('[ERROR] Failed to get project', error);
      return null;
    }
  }
  
  /**
   * Execute pre-transition actions
   * @param {Object} project - Project object
   * @param {string} newState - New state
   * @param {Object} metadata - Metadata
   */
  async executePreTransitionActions(project, newState, metadata) {
    const actions = {
      'review': async () => {
        // Generate final scope document
        this.logger.info(`[LIFECYCLE] Generating final scope for project ${project.id}`);
        // Could trigger scope generation here
      },
      'approved': async () => {
        // Lock the scope
        this.logger.info(`[LIFECYCLE] Locking scope for project ${project.id}`);
        // Could lock scope here
      },
      'in_progress': async () => {
        // Initialize project tracking
        this.logger.info(`[LIFECYCLE] Initializing tracking for project ${project.id}`);
        // Could set up tracking here
      },
      'completed': async () => {
        // Capture final metrics
        this.logger.info(`[LIFECYCLE] Capturing final metrics for project ${project.id}`);
        // Could capture metrics here
      }
    };
    
    const action = actions[newState];
    if (action) {
      try {
        await action();
      } catch (error) {
        this.logger.error(`[ERROR] Pre-transition action failed for ${newState}`, error);
        // Don't throw - allow transition to proceed
      }
    }
  }
  
  /**
   * Execute post-transition actions
   * @param {Object} project - Project object
   * @param {string} newState - New state
   * @param {Object} metadata - Metadata
   */
  async executePostTransitionActions(project, newState, metadata) {
    const actions = {
      'scoping': async () => {
        // Start complexity analysis
        this.emit('startAnalysis', project.id);
      },
      'review': async () => {
        // Notify reviewers
        this.logger.info(`[LIFECYCLE] Notifying reviewers for project ${project.id}`);
        // Could send notifications here
      },
      'approved': async () => {
        // Send approval notification
        this.logger.info(`[LIFECYCLE] Project ${project.id} approved`);
        // Could send notifications here
      },
      'in_progress': async () => {
        // Start progress tracking
        this.emit('startTracking', project.id);
      },
      'completed': async () => {
        // Trigger feedback collection
        this.logger.info(`[LIFECYCLE] Requesting feedback for project ${project.id}`);
        // Trigger learning system
        this.emit('requestFeedback', project.id);
      },
      'learned': async () => {
        // Extract components and update models
        this.logger.info(`[LIFECYCLE] Triggering learning for project ${project.id}`);
        // Trigger learning engine
        this.emit('triggerLearning', project.id);
      }
    };
    
    const action = actions[newState];
    if (action) {
      try {
        await action();
      } catch (error) {
        this.logger.error(`[ERROR] Post-transition action failed for ${newState}`, error);
        // Don't throw - transition already happened
      }
    }
  }
  
  /**
   * Log state change to database
   * @param {string} projectId - Project ID
   * @param {string} fromState - Previous state
   * @param {string} toState - New state
   * @param {string} userId - User ID
   * @param {Object} metadata - Metadata
   */
  async logStateChange(projectId, fromState, toState, userId, metadata) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO project_state_logs 
        (project_id, from_state, to_state, changed_by, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        projectId,
        fromState,
        toState,
        userId,
        JSON.stringify(metadata || {})
      );
    } catch (error) {
      this.logger.error('[ERROR] Failed to log state change', error);
      // Don't throw - state change already happened
    }
  }
  
  /**
   * Get project state history
   * @param {string} projectId - Project ID
   * @returns {Array} State transition history
   */
  getProjectHistory(projectId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM project_state_logs 
        WHERE project_id = ?
        ORDER BY created_at DESC
      `);
      
      const logs = stmt.all(projectId);
      
      return logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : {}
      }));
    } catch (error) {
      this.logger.error('[ERROR] Failed to get project history', error);
      return [];
    }
  }
  
  /**
   * Get current state of project
   * @param {string} projectId - Project ID
   * @returns {string|null} Current state
   */
  getCurrentState(projectId) {
    const project = this.getProject(projectId);
    if (!project) return null;
    return project.project_status || project.status || 'draft';
  }
  
  /**
   * Get valid next states for a project
   * @param {string} projectId - Project ID
   * @returns {Array} Valid next states
   */
  getValidNextStates(projectId) {
    const currentState = this.getCurrentState(projectId);
    if (!currentState) return [];
    return this.transitions[currentState] || [];
  }
}

module.exports = ProjectLifecycle;

