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
    this.dbPath = dbPath || path.join(__dirname, '../../data/scogen_v2.db');
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
      
      console.log('✅ Database V2 initialized at:', this.dbPath);
      
      // Verify connection
      const testQuery = this.db.prepare('SELECT 1 as test').get();
      if (testQuery && testQuery.test === 1) {
        console.log('✅ Database connection verified');
      }
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database schema from SQL file
   */
  initializeSchema() {
    const schemaPath = path.join(__dirname, 'schema-v2.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.log('⚠️ Schema file not found, skipping schema initialization');
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
        WHERE type='table' AND name IN ('clients', 'projects', 'learned_patterns')
      `).all();
      
      const tableNames = tablesCheck.map(t => t.name);
      if (tableNames.length < 3) {
        console.log('⚠️ Tables not fully created, skipping statement preparation');
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

