/**
 * Database Manager V2
 * 
 * Enhanced database system using better-sqlite3
 * Synchronous operations, prepared statements, transactions
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManagerV2 {
  constructor(dbPath = null) {
    // Use environment variable, provided path, or default to root directory (matching setup.js)
    this.dbPath = dbPath || 
                  process.env.DB_V2_PATH || 
                  path.join(process.cwd(), 'scogen-v2.db');
    this.db = null;
    this.initialized = false;
    this.statements = {};
  }

  /**
   * Initialize database connection and schema
   */
  initialize() {
    if (this.initialized) return;
    
    try {
      // Ensure data directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('📁 Created database directory:', dir);
      }
      
      // Open database (synchronous with better-sqlite3)
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL'); // Better performance
      this.db.pragma('foreign_keys = ON');
      
      // Initialize schema
      this.initializeSchema();
      
      // Prepare statements for performance
      this.prepareStatements();
      
      this.initialized = true;
      
      console.log('[OK] Database V2 initialized at:', this.dbPath);
      
      // Verify connection
      const testQuery = this.db.prepare('SELECT 1 as test').get();
      if (testQuery && testQuery.test === 1) {
        console.log('[OK] Database connection verified');
      }
    } catch (error) {
      console.error('[ERROR] Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database schema from SQL file
   */
  initializeSchema() {
    const schemaPath = path.join(__dirname, 'schema-v2.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.log('[WARN] Schema file not found, skipping schema initialization');
      return;
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Remove single-line comments but keep multi-line content
    const lines = schema.split('\n');
    const cleanedLines = lines
      .map(line => {
        // Remove inline comments (-- after code)
        const commentIndex = line.indexOf('--');
        if (commentIndex > 0 && line.substring(0, commentIndex).trim().length > 0) {
          return line.substring(0, commentIndex);
        }
        // Skip comment-only lines
        if (line.trim().startsWith('--')) {
          return '';
        }
        return line;
      })
      .filter(line => line.trim().length > 0);
    
    const cleanedSchema = cleanedLines.join('\n');
    
    // Execute the entire schema at once (better-sqlite3 handles this well)
    try {
      this.db.exec(cleanedSchema);
    } catch (error) {
      // If exec fails, try statement by statement
      const statements = cleanedSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          if (statement.trim().length > 0) {
            this.db.exec(statement + ';');
          }
        } catch (stmtError) {
          // Ignore "already exists" errors
          if (!stmtError.message.includes('already exists') && 
              !stmtError.message.includes('duplicate column name')) {
            console.error('Schema statement error:', stmtError.message);
            console.error('Statement:', statement.substring(0, 100));
          }
        }
      }
    }
  }

  /**
   * Prepare frequently used statements for performance
   */
  prepareStatements() {
    // Only prepare statements if tables exist
    try {
      // Check if tables exist
      const tablesCheck = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('clients', 'projects', 'learned_patterns', 'learning_lessons')
      `).all();
      
      const tableNames = tablesCheck.map(t => t.name);
      if (tableNames.length < 3) {
        console.log('[WARN] Tables not fully created, skipping statement preparation');
        this.statements = {};
        return;
      }
      
      this.statements = {
        insertClient: this.db.prepare(`
          INSERT INTO clients (
            client_identifier, company_name, contact_name, 
            email, phone, tech_savvy, industry, client_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `),
        
        getClient: this.db.prepare(`
          SELECT * FROM clients 
          WHERE client_identifier = ? OR email = ? OR phone = ?
          LIMIT 1
        `),
        
        updateClient: this.db.prepare(`
          UPDATE clients 
          SET company_name = ?, contact_name = ?, email = ?, 
              phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `),
        
        insertProject: this.db.prepare(`
          INSERT INTO projects (
            project_code, client_id, project_name, status,
            original_input, input_type, input_quality_score,
            client_profile, extracted_modules, refined_scope,
            technical_breakdown, edge_cases, assumptions,
            base_estimate, hidden_costs, scenarios,
            quoted_cost, quoted_timeline_days
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `),
        
        getProject: this.db.prepare(`
          SELECT * FROM projects 
          WHERE id = ? OR project_code = ?
          LIMIT 1
        `),
        
        updateProject: this.db.prepare(`
          UPDATE projects 
          SET actual_cost = ?, actual_timeline_days = ?, 
              scope_creep_percentage = ?, status = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE project_code = ?
        `),
        
        recordPattern: this.db.prepare(`
          INSERT INTO learned_patterns (pattern_type, domain, pattern_key, pattern_value, occurrence_count, success_rate, confidence_score)
          VALUES (?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(pattern_type, domain, pattern_key) 
          DO UPDATE SET 
            pattern_value = excluded.pattern_value,
            occurrence_count = occurrence_count + 1,
            success_rate = (success_rate * occurrence_count + excluded.success_rate) / (occurrence_count + 1),
            confidence_score = MIN((occurrence_count + 1) / 10.0, 1.0) * ((success_rate * occurrence_count + excluded.success_rate) / (occurrence_count + 1)),
            last_updated = CURRENT_TIMESTAMP
        `),
        
        getPattern: this.db.prepare(`
          SELECT pattern_value, confidence_score 
          FROM learned_patterns 
          WHERE pattern_type = ? AND domain = ? AND pattern_key = ?
        `)
      };
    } catch (error) {
      console.error('Error preparing statements:', error);
      // Continue without prepared statements if there's an error
    }
  }

  /**
   * CLIENT OPERATIONS
   */

  /**
   * Create or update client
   */
  createOrUpdateClient(data) {
    if (!this.initialized) this.initialize();
    
    const identifier = data.identifier || data.email || data.phone || data.company_name || 'unknown';
    
    // Try to find existing
    const existing = this.statements.getClient?.get(identifier, identifier, identifier);
    
    if (existing) {
      // Update existing
      if (this.statements.updateClient) {
        this.statements.updateClient.run(
          data.company_name || existing.company_name,
          data.contact_name || existing.contact_name,
          data.email || existing.email,
          data.phone || existing.phone,
          existing.id
        );
      } else {
        const stmt = this.db.prepare(`
          UPDATE clients 
          SET company_name = ?, contact_name = ?, email = ?, 
              phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        stmt.run(
          data.company_name || existing.company_name,
          data.contact_name || existing.contact_name,
          data.email || existing.email,
          data.phone || existing.phone,
          existing.id
        );
      }
      return existing.id;
    } else {
      // Create new
      let info;
      if (this.statements.insertClient) {
        info = this.statements.insertClient.run(
          identifier,
          data.company_name,
          data.contact_name,
          data.email,
          data.phone,
          data.tech_savvy || 'medium',
          data.industry,
          data.client_type
        );
      } else {
        const stmt = this.db.prepare(`
          INSERT INTO clients (
            client_identifier, company_name, contact_name, 
            email, phone, tech_savvy, industry, client_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        info = stmt.run(
          identifier,
          data.company_name,
          data.contact_name,
          data.email,
          data.phone,
          data.tech_savvy || 'medium',
          data.industry,
          data.client_type
        );
      }
      return info.lastInsertRowid;
    }
  }

  /**
   * Get client by identifier
   */
  getClient(identifier) {
    if (!this.initialized) this.initialize();
    
    return this.statements.getClient?.get(identifier, identifier, identifier) || null;
  }

  /**
   * Update client metrics
   */
  updateClientMetrics(clientId, updates) {
    if (!this.initialized) this.initialize();
    
    const fields = Object.keys(updates)
      .filter(k => k !== 'id')
      .map(k => `${k} = ?`);
    
    const values = Object.keys(updates)
      .filter(k => k !== 'id')
      .map(k => updates[k]);
    
    const sql = `
      UPDATE clients 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const stmt = this.db.prepare(sql);
    stmt.run(...values, clientId);
  }

  /**
   * PROJECT OPERATIONS
   */

  /**
   * Create project with auto-generated code
   */
  createProject(data) {
    if (!this.initialized) this.initialize();
    
    // Generate project code
    const year = new Date().getFullYear();
    const countStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM projects WHERE project_code LIKE ?"
    );
    const count = countStmt.get(`PROJ-${year}-%`)?.count || 0;
    
    const project_code = `PROJ-${year}-${String(count + 1).padStart(3, '0')}`;
    
    let info;
    if (this.statements.insertProject) {
      info = this.statements.insertProject.run(
        project_code,
        data.client_id,
        data.project_name,
        data.status || 'scoping',
        data.original_input || null,
        data.input_type || 'text',
        data.input_quality_score || null,
        JSON.stringify(data.client_profile || {}),
        JSON.stringify(data.extracted_modules || []),
        JSON.stringify(data.refined_scope || {}),
        JSON.stringify(data.technical_breakdown || {}),
        JSON.stringify(data.edge_cases || []),
        JSON.stringify(data.assumptions || {}),
        JSON.stringify(data.base_estimate || {}),
        JSON.stringify(data.hidden_costs || {}),
        JSON.stringify(data.scenarios || []),
        data.quoted_cost || null,
        data.quoted_timeline_days || null
      );
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO projects (
          project_code, client_id, project_name, status,
          original_input, input_type, input_quality_score,
          client_profile, extracted_modules, refined_scope,
          technical_breakdown, edge_cases, assumptions,
          base_estimate, hidden_costs, scenarios,
          quoted_cost, quoted_timeline_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      info = stmt.run(
        project_code,
        data.client_id,
        data.project_name,
        data.status || 'scoping',
        data.original_input || null,
        data.input_type || 'text',
        data.input_quality_score || null,
        JSON.stringify(data.client_profile || {}),
        JSON.stringify(data.extracted_modules || []),
        JSON.stringify(data.refined_scope || {}),
        JSON.stringify(data.technical_breakdown || {}),
        JSON.stringify(data.edge_cases || []),
        JSON.stringify(data.assumptions || {}),
        JSON.stringify(data.base_estimate || {}),
        JSON.stringify(data.hidden_costs || {}),
        JSON.stringify(data.scenarios || []),
        data.quoted_cost || null,
        data.quoted_timeline_days || null
      );
    }
    
    return { 
      id: info.lastInsertRowid, 
      project_code 
    };
  }

  /**
   * Get project by ID or code
   */
  getProject(idOrCode) {
    if (!this.initialized) this.initialize();
    
    let project;
    if (this.statements.getProject) {
      project = this.statements.getProject.get(idOrCode, idOrCode);
    } else {
      const stmt = this.db.prepare(`
        SELECT * FROM projects 
        WHERE id = ? OR project_code = ?
        LIMIT 1
      `);
      project = stmt.get(idOrCode, idOrCode);
    }
    
    if (project) {
      // Parse JSON fields
      const jsonFields = ['client_profile', 'extracted_modules', 'refined_scope',
                         'technical_breakdown', 'edge_cases', 'assumptions',
                         'base_estimate', 'hidden_costs', 'scenarios'];
      
      jsonFields.forEach(field => {
        if (project[field]) {
          try {
            project[field] = JSON.parse(project[field]);
          } catch (e) {
            console.error(`Error parsing ${field}:`, e);
            project[field] = {};
          }
        }
      });
    }
    
    return project;
  }

  /**
   * Update project with actuals
   */
  updateProjectActuals(projectCode, actuals) {
    if (!this.initialized) this.initialize();
    
    if (this.statements.updateProject) {
      this.statements.updateProject.run(
        actuals.cost || null,
        actuals.timeline || null,
        actuals.scopeCreep || null,
        actuals.status || 'completed',
        projectCode
      );
    } else {
      const stmt = this.db.prepare(`
        UPDATE projects 
        SET actual_cost = ?, actual_timeline_days = ?, 
            scope_creep_percentage = ?, status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_code = ?
      `);
      stmt.run(
        actuals.cost || null,
        actuals.timeline || null,
        actuals.scopeCreep || null,
        actuals.status || 'completed',
        projectCode
      );
    }
  }

  /**
   * Store complete analysis for progressive output
   */
  storeCompleteAnalysis(projectId, completeAnalysis) {
    if (!this.initialized) this.initialize();
    
    try {
      // Run migration if needed
      this.runMigration('add-progressive-output.sql');
      
      const stmt = this.db.prepare(`
        UPDATE projects 
        SET complete_analysis = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? OR project_code = ?
      `);
      stmt.run(JSON.stringify(completeAnalysis), projectId, projectId);
      return true;
    } catch (error) {
      console.error('Failed to store complete analysis:', error);
      return false;
    }
  }

  /**
   * Get complete analysis
   */
  getCompleteAnalysis(projectId) {
    if (!this.initialized) this.initialize();
    
    const project = this.getProject(projectId);
    if (project && project.complete_analysis) {
      try {
        return JSON.parse(project.complete_analysis);
      } catch (error) {
        console.error('Failed to parse complete analysis:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Update output level
   */
  updateOutputLevel(projectId, level) {
    if (!this.initialized) this.initialize();
    
    try {
      // Run migration if needed
      this.runMigration('add-progressive-output.sql');
      
      const stmt = this.db.prepare(`
        UPDATE projects 
        SET output_level = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? OR project_code = ?
      `);
      stmt.run(level, projectId, projectId);
      return true;
    } catch (error) {
      console.error('Failed to update output level:', error);
      return false;
    }
  }

  /**
   * Record level upgrade
   */
  recordLevelUpgrade(projectId, level) {
    if (!this.initialized) this.initialize();
    
    try {
      // Run migration if needed
      this.runMigration('add-progressive-output.sql');
      
      // Get current upgrades
      const project = this.getProject(projectId);
      const upgrades = project?.level_upgrades ? JSON.parse(project.level_upgrades) : [];
      
      // Add new upgrade
      upgrades.push({
        level: level,
        accessedAt: new Date().toISOString()
      });
      
      // Update database
      const stmt = this.db.prepare(`
        UPDATE projects 
        SET level_upgrades = ?, output_level = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? OR project_code = ?
      `);
      stmt.run(JSON.stringify(upgrades), level, projectId, projectId);
      return true;
    } catch (error) {
      console.error('Failed to record level upgrade:', error);
      return false;
    }
  }

  /**
   * Run migration script
   */
  runMigration(migrationFile) {
    try {
      const migrationPath = path.join(__dirname, migrationFile);
      if (fs.existsSync(migrationPath)) {
        const migration = fs.readFileSync(migrationPath, 'utf8');
        // Remove comments and execute
        const statements = migration
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        
        statements.forEach(statement => {
          try {
            this.db.exec(statement);
          } catch (error) {
            // Ignore errors for IF NOT EXISTS clauses
            if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
              console.warn('Migration statement failed (may be expected):', error.message);
            }
          }
        });
      }
    } catch (error) {
      console.warn('Migration failed (may be expected):', error.message);
    }
  }

  /**
   * LEARNING OPERATIONS
   */

  /**
   * Record learned pattern
   */
  recordPattern(type, domain, key, value, success = true) {
    if (!this.initialized) this.initialize();
    
    const successRate = success ? 1.0 : 0.0;
    const confidence = 0.1; // Start with low confidence
    
    if (this.statements.recordPattern) {
      this.statements.recordPattern.run(
        type,
        domain || null,
        key,
        JSON.stringify(value),
        successRate,
        confidence
      );
    } else {
      // Check if pattern exists
      const checkStmt = this.db.prepare(`
        SELECT * FROM learned_patterns 
        WHERE pattern_type = ? AND domain = ? AND pattern_key = ?
      `);
      const existing = checkStmt.get(type, domain || null, key);
      
      if (existing) {
        const newCount = existing.occurrence_count + 1;
        const newSuccessRate = success ? 
          (existing.success_rate * existing.occurrence_count + 1) / newCount :
          (existing.success_rate * existing.occurrence_count) / newCount;
        const newConfidence = Math.min(newCount / 10.0, 1.0) * newSuccessRate;
        
        const updateStmt = this.db.prepare(`
          UPDATE learned_patterns 
          SET pattern_value = ?, occurrence_count = ?, 
              success_rate = ?, confidence_score = ?, 
              last_updated = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateStmt.run(
          JSON.stringify(value),
          newCount,
          newSuccessRate,
          newConfidence,
          existing.id
        );
      } else {
        const insertStmt = this.db.prepare(`
          INSERT INTO learned_patterns 
          (pattern_type, domain, pattern_key, pattern_value, occurrence_count, success_rate, confidence_score)
          VALUES (?, ?, ?, ?, 1, ?, ?)
        `);
        insertStmt.run(
          type,
          domain || null,
          key,
          JSON.stringify(value),
          successRate,
          confidence
        );
      }
    }
  }

  /**
   * Get learned pattern
   */
  getPattern(type, domain, key) {
    if (!this.initialized) this.initialize();
    
    let result;
    if (this.statements.getPattern) {
      result = this.statements.getPattern.get(type, domain || null, key);
    } else {
      const stmt = this.db.prepare(`
        SELECT pattern_value, confidence_score 
        FROM learned_patterns 
        WHERE pattern_type = ? AND domain = ? AND pattern_key = ?
      `);
      result = stmt.get(type, domain || null, key);
    }
    
    if (result && result.confidence_score > 0.5) {
      return JSON.parse(result.pattern_value);
    }
    
    return null;
  }

  /**
   * ANALYTICS OPERATIONS
   */

  /**
   * Get client statistics
   */
  getClientStats(clientId) {
    if (!this.initialized) this.initialize();
    
    const sql = `
      SELECT 
        c.*,
        COUNT(p.id) as project_count,
        AVG(p.profitability) as avg_profitability,
        AVG(p.scope_creep_percentage) as avg_scope_creep,
        AVG(p.client_satisfaction) as avg_satisfaction
      FROM clients c
      LEFT JOIN projects p ON c.id = p.client_id
      WHERE c.id = ?
      GROUP BY c.id
    `;
    
    return this.db.prepare(sql).get(clientId);
  }

  /**
   * Get estimation accuracy stats
   */
  getAccuracyStats(domain = null) {
    if (!this.initialized) this.initialize();
    
    const sql = domain ?
      'SELECT * FROM estimation_accuracy WHERE domain = ?' :
      'SELECT * FROM estimation_accuracy';
    
    const stmt = this.db.prepare(sql);
    return domain ? stmt.all(domain) : stmt.all();
  }

  /**
   * LEARNING LESSONS OPERATIONS (for duplicate filtering)
   */

  /**
   * Store learning lesson (with duplicate detection)
   * @param {string} lessonHash - SHA256 hash of lesson content
   * @param {string} lessonType - Type of lesson (e.g., 'pattern', 'multiplier', 'domain')
   * @param {string} lessonContent - JSON string of lesson data
   * @param {number} projectId - ID of project where lesson was first seen
   * @param {number} confidence - Confidence score (0-1)
   * @returns {number} - Lesson ID (existing or new)
   */
  storeLearningLesson(lessonHash, lessonType, lessonContent, projectId, confidence = 0.5) {
    if (!this.initialized) this.initialize();
    
    // Check if lesson already exists
    const existing = this.getLearningLesson(lessonHash);
    
    if (existing) {
      // Update existing lesson
      const stmt = this.db.prepare(`
        UPDATE learning_lessons 
        SET occurrence_count = occurrence_count + 1,
            confidence_score = (confidence_score * occurrence_count + ?) / (occurrence_count + 1),
            last_applied_at = CURRENT_TIMESTAMP
        WHERE lesson_hash = ?
      `);
      stmt.run(confidence, lessonHash);
      return existing.id;
    } else {
      // Insert new lesson
      const stmt = this.db.prepare(`
        INSERT INTO learning_lessons (
          lesson_hash, lesson_type, lesson_content, 
          first_seen_project_id, occurrence_count, confidence_score
        ) VALUES (?, ?, ?, ?, 1, ?)
      `);
      const result = stmt.run(lessonHash, lessonType, lessonContent, projectId, confidence);
      return result.lastInsertRowid;
    }
  }

  /**
   * Get learning lesson by hash
   * @param {string} lessonHash - SHA256 hash of lesson content
   * @returns {Object|null} - Lesson object or null if not found
   */
  getLearningLesson(lessonHash) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare('SELECT * FROM learning_lessons WHERE lesson_hash = ?');
    return stmt.get(lessonHash) || null;
  }

  /**
   * Get lessons by type
   * @param {string} lessonType - Type of lesson
   * @param {number} limit - Maximum number of lessons to return
   * @returns {Array} - Array of lesson objects
   */
  getLessonsByType(lessonType, limit = 100) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      SELECT * FROM learning_lessons 
      WHERE lesson_type = ? 
      ORDER BY confidence_score DESC, occurrence_count DESC
      LIMIT ?
    `);
    return stmt.all(lessonType, limit);
  }

  /**
   * Update lesson application count and success rate
   * @param {string} lessonHash - SHA256 hash of lesson content
   * @param {boolean} success - Whether application was successful
   */
  updateLessonApplication(lessonHash, success) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      UPDATE learning_lessons 
      SET applied_count = applied_count + 1,
          success_rate = CASE 
            WHEN applied_count = 0 THEN ?
            ELSE (success_rate * applied_count + ?) / (applied_count + 1)
          END,
          last_applied_at = CURRENT_TIMESTAMP
      WHERE lesson_hash = ?
    `);
    const successValue = success ? 1.0 : 0.0;
    stmt.run(successValue, successValue, lessonHash);
  }

  /**
   * CHECKPOINT OPERATIONS
   */

  /**
   * Save checkpoint state
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Checkpoint identifier
   * @param {string} checkpointName - Human-readable checkpoint name
   * @param {Object} stateData - State data object (will be JSON stringified)
   * @param {number} projectId - Optional project ID
   * @returns {number} - Checkpoint state ID
   */
  saveCheckpointState(sessionId, checkpointId, checkpointName, stateData, projectId = null) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO checkpoint_states (
        session_id, checkpoint_id, checkpoint_name, state_data, project_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(
      sessionId,
      checkpointId,
      checkpointName,
      JSON.stringify(stateData),
      projectId
    );
    
    return result.lastInsertRowid;
  }

  /**
   * Get checkpoint state
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Checkpoint identifier
   * @returns {Object|null} - Checkpoint state or null if not found
   */
  getCheckpointState(sessionId, checkpointId) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      SELECT * FROM checkpoint_states
      WHERE session_id = ? AND checkpoint_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    const row = stmt.get(sessionId, checkpointId);
    
    if (!row) {
      return null;
    }
    
    return {
      id: row.id,
      sessionId: row.session_id,
      checkpointId: row.checkpoint_id,
      checkpointName: row.checkpoint_name,
      stateData: JSON.parse(row.state_data),
      projectId: row.project_id,
      status: row.status,
      createdAt: row.created_at
    };
  }

  /**
   * List all checkpoints for a session
   * @param {string} sessionId - Session identifier
   * @returns {Array} - Array of checkpoint states
   */
  listCheckpoints(sessionId) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      SELECT * FROM checkpoint_states
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);
    
    const rows = stmt.all(sessionId);
    
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      checkpointId: row.checkpoint_id,
      checkpointName: row.checkpoint_name,
      stateData: JSON.parse(row.state_data),
      projectId: row.project_id,
      status: row.status,
      createdAt: row.created_at
    }));
  }

  /**
   * Get execution session
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} - Execution session or null
   */
  getExecutionSession(sessionId) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare('SELECT * FROM execution_sessions WHERE session_id = ?');
    return stmt.get(sessionId) || null;
  }

  /**
   * Update execution session
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Current checkpoint
   * @param {number} projectId - Project ID
   * @param {string} status - Status: 'running', 'paused', 'completed', 'aborted'
   */
  updateExecutionSession(sessionId, checkpointId, projectId, status) {
    if (!this.initialized) this.initialize();
    
    // Check if session exists
    const checkStmt = this.db.prepare('SELECT session_id FROM execution_sessions WHERE session_id = ?');
    const existing = checkStmt.get(sessionId);
    
    if (existing) {
      // Update existing
      const updateStmt = this.db.prepare(`
        UPDATE execution_sessions
        SET current_checkpoint = ?, project_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = ?
      `);
      updateStmt.run(checkpointId, projectId, status, sessionId);
    } else {
      // Insert new
      const insertStmt = this.db.prepare(`
        INSERT INTO execution_sessions (
          session_id, project_id, current_checkpoint, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      insertStmt.run(sessionId, projectId, checkpointId, status);
    }
  }

  /**
   * Save checkpoint decision
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Checkpoint identifier
   * @param {string} decisionType - Decision type: 'approve', 'modify', 'reject', 'pause', 'custom'
   * @param {Object} decisionData - Additional decision data (will be JSON stringified)
   * @returns {number} - Decision ID
   */
  saveCheckpointDecision(sessionId, checkpointId, decisionType, decisionData = {}) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      INSERT INTO checkpoint_decisions (
        session_id, checkpoint_id, decision_type, decision_data, created_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(
      sessionId,
      checkpointId,
      decisionType,
      JSON.stringify(decisionData)
    );
    
    return result.lastInsertRowid;
  }

  /**
   * Get checkpoint decision
   * @param {string} sessionId - Session identifier
   * @param {string} checkpointId - Checkpoint identifier
   * @returns {Object|null} - Decision or null if not found
   */
  getCheckpointDecision(sessionId, checkpointId) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
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
      id: row.id,
      sessionId: row.session_id,
      checkpointId: row.checkpoint_id,
      decisionType: row.decision_type,
      decisionData: JSON.parse(row.decision_data || '{}'),
      createdAt: row.created_at
    };
  }

  /**
   * CONVERSATION OPERATIONS
   */

  /**
   * Create new conversation
   * @param {string} sessionId - Unique session identifier
   * @param {Object} initialState - Initial conversation state
   * @returns {number} - Conversation ID
   */
  createConversation(sessionId, initialState = {}) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      INSERT INTO conversations (
        session_id, state, completeness, requirements, status, 
        created_at, updated_at, last_activity_at
      ) VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(
      sessionId,
      JSON.stringify(initialState),
      0,
      JSON.stringify({})
    );
    
    return result.lastInsertRowid;
  }

  /**
   * Get conversation by session ID
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} - Conversation object or null
   */
  getConversation(sessionId) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare('SELECT * FROM conversations WHERE session_id = ?');
    const row = stmt.get(sessionId);
    
    if (!row) {
      return null;
    }
    
    return {
      id: row.id,
      sessionId: row.session_id,
      state: JSON.parse(row.state || '{}'),
      completeness: row.completeness,
      requirements: JSON.parse(row.requirements || '{}'),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActivityAt: row.last_activity_at
    };
  }

  /**
   * Update conversation state
   * @param {string} sessionId - Session identifier
   * @param {Object} state - Updated state
   * @param {Object} requirements - Updated requirements
   * @param {number} completeness - Completeness percentage
   */
  updateConversation(sessionId, state, requirements, completeness) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      UPDATE conversations
      SET state = ?, requirements = ?, completeness = ?, 
          updated_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);
    
    stmt.run(
      JSON.stringify(state),
      JSON.stringify(requirements),
      completeness,
      sessionId
    );
  }

  /**
   * Save conversation state (explicit save)
   * @param {string} sessionId - Session identifier
   * @param {Object} state - Current state
   */
  saveConversationState(sessionId, state) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      UPDATE conversations
      SET state = ?, status = 'saved', 
          updated_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);
    
    stmt.run(JSON.stringify(state), sessionId);
  }

  /**
   * Add conversation turn
   * @param {number} conversationId - Conversation ID
   * @param {number} turnNumber - Turn number
   * @param {string} userInput - User input text
   * @param {string} botResponse - Bot response text
   * @param {Object} extractedData - Extracted data from this turn
   * @returns {number} - Turn ID
   */
  addConversationTurn(conversationId, turnNumber, userInput, botResponse, extractedData = {}) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      INSERT INTO conversation_turns (
        conversation_id, turn_number, user_input, bot_response, extracted_data, timestamp
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(
      conversationId,
      turnNumber,
      userInput,
      botResponse,
      JSON.stringify(extractedData)
    );
    
    return result.lastInsertRowid;
  }

  /**
   * Get conversation turns
   * @param {number} conversationId - Conversation ID
   * @returns {Array} - Array of conversation turns
   */
  getConversationTurns(conversationId) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      SELECT * FROM conversation_turns
      WHERE conversation_id = ?
      ORDER BY turn_number ASC
    `);
    
    const rows = stmt.all(conversationId);
    
    return rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      turnNumber: row.turn_number,
      userInput: row.user_input,
      botResponse: row.bot_response,
      extractedData: JSON.parse(row.extracted_data || '{}'),
      timestamp: row.timestamp
    }));
  }

  /**
   * Update conversation status
   * @param {string} sessionId - Session identifier
   * @param {string} status - New status (active, saved, completed, abandoned)
   */
  updateConversationStatus(sessionId, status) {
    if (!this.initialized) this.initialize();
    
    const stmt = this.db.prepare(`
      UPDATE conversations
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);
    
    stmt.run(status, sessionId);
  }

  /**
   * TRANSACTIONS
   */

  /**
   * Execute function in transaction
   */
  transaction(callback) {
    if (!this.initialized) this.initialize();
    
    const trx = this.db.transaction(callback);
    return trx();
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

module.exports = DatabaseManagerV2;

