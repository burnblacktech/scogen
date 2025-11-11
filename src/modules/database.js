const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class ScopeDatabase {
  constructor(dbPath, logger) {
    this.dbPath = dbPath;
    this.logger = logger;
    this.ensureDirectory();
    
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.initSchema();
      
      this.logger.info('Database initialized', { path: this.dbPath });
    } catch (error) {
      this.logger.error('Database initialization failed', { error: error.message });
      throw error;
    }
  }

  ensureDirectory() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  initSchema() {
    const version = this.getSchemaVersion();
    
    if (version === 0) {
      this.createSchemaV1();
    }
  }

  createSchemaV1() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scopes (
        id TEXT PRIMARY KEY,
        consultant_id TEXT,
        client_name TEXT,
        client_email TEXT,
        input_raw TEXT NOT NULL,
        industry TEXT,
        use_case TEXT,
        persona TEXT,
        estimated_days INTEGER,
        estimated_cost REAL,
        confidence REAL,
        modules TEXT,
        risks TEXT,
        plan TEXT,
        output_full TEXT,
        status TEXT DEFAULT 'draft',
        pdf_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_scopes_created ON scopes(created_at);
      CREATE INDEX IF NOT EXISTS idx_scopes_industry ON scopes(industry);
      CREATE INDEX IF NOT EXISTS idx_scopes_consultant ON scopes(consultant_id);

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        scope_id TEXT NOT NULL,
        actual_days INTEGER,
        actual_cost REAL,
        actual_modules TEXT,
        timeline_variance REAL,
        cost_variance REAL,
        outcome TEXT,
        complications TEXT,
        notes TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        feedback_collected_at DATETIME,
        feedback_by TEXT,
        FOREIGN KEY (scope_id) REFERENCES scopes(id)
      );

      CREATE INDEX IF NOT EXISTS idx_projects_scope ON projects(scope_id);
      CREATE INDEX IF NOT EXISTS idx_projects_completed ON projects(completed_at);

      CREATE TABLE IF NOT EXISTS baseline (
        id TEXT PRIMARY KEY,
        domain TEXT UNIQUE NOT NULL,
        hourly_rate REAL,
        module_efforts TEXT,
        complexity_multipliers TEXT,
        persona_buffers TEXT,
        sample_size INTEGER DEFAULT 0,
        confidence REAL DEFAULT 0.6,
        last_tuned DATETIME,
        tuned_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_baseline_domain ON baseline(domain);

      CREATE TABLE IF NOT EXISTS baseline_history (
        id TEXT PRIMARY KEY,
        baseline_id TEXT NOT NULL,
        field TEXT,
        old_value REAL,
        new_value REAL,
        adjustment REAL,
        reason TEXT,
        triggered_by TEXT,
        approved_by TEXT,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sample_size INTEGER,
        FOREIGN KEY (baseline_id) REFERENCES baseline(id)
      );

      CREATE INDEX IF NOT EXISTS idx_baseline_history_baseline ON baseline_history(baseline_id);

      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );

      INSERT INTO schema_version (version) VALUES (1);
    `);

    this.logger.info('Database schema v1 created');
  }

  getSchemaVersion() {
    try {
      const row = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get();
      return row ? row.version : 0;
    } catch {
      return 0;
    }
  }

  saveScope(scope) {
    const stmt = this.db.prepare(`
      INSERT INTO scopes (
        id, consultant_id, client_name, client_email, input_raw,
        industry, use_case, persona,
        estimated_days, estimated_cost, confidence,
        modules, risks, plan, output_full,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = uuidv4();

    try {
      stmt.run(
        id,
        scope.consultant_id || null,
        scope.client_name || null,
        scope.client_email || null,
        scope.input_raw,
        scope.industry || null,
        scope.use_case || null,
        scope.persona || null,
        scope.estimated_days || null,
        scope.estimated_cost || null,
        scope.confidence || null,
        JSON.stringify(scope.modules || []),
        JSON.stringify(scope.risks || []),
        JSON.stringify(scope.plan || {}),
        JSON.stringify(scope.output_full || {}),
        scope.status || 'draft',
        new Date().toISOString()
      );

      this.logger.info('Scope saved', { id, industry: scope.industry });
      return { success: true, id };
    } catch (error) {
      this.logger.error('Scope save failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  getScopeById(id) {
    const stmt = this.db.prepare('SELECT * FROM scopes WHERE id = ?');
    const row = stmt.get(id);
    
    if (!row) return null;

    return {
      ...row,
      modules: JSON.parse(row.modules || '[]'),
      risks: JSON.parse(row.risks || '[]'),
      plan: JSON.parse(row.plan || '{}'),
      output_full: JSON.parse(row.output_full || '{}')
    };
  }

  getRecentScopes(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT id, client_name, input_raw, industry, use_case,
             estimated_days, estimated_cost, confidence, created_at, status
      FROM scopes 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    return stmt.all(limit);
  }

  saveProject(project) {
    const stmt = this.db.prepare(`
      INSERT INTO projects (
        id, scope_id, actual_days, actual_cost, actual_modules,
        timeline_variance, cost_variance, outcome, complications, notes,
        completed_at, feedback_collected_at, feedback_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = uuidv4();

    try {
      stmt.run(
        id,
        project.scope_id,
        project.actual_days,
        project.actual_cost,
        JSON.stringify(project.actual_modules || []),
        project.timeline_variance,
        project.cost_variance,
        project.outcome,
        JSON.stringify(project.complications || []),
        project.notes || null,
        project.completed_at || new Date().toISOString(),
        new Date().toISOString(),
        project.feedback_by || null
      );

      this.logger.info('Project saved', { id, scope_id: project.scope_id });
      return { success: true, id };
    } catch (error) {
      this.logger.error('Project save failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  getAllProjects() {
    const stmt = this.db.prepare(`
      SELECT p.*, s.industry, s.use_case, s.persona, s.modules
      FROM projects p
      JOIN scopes s ON p.scope_id = s.id
      ORDER BY p.completed_at DESC
    `);
    
    return stmt.all().map(row => ({
      ...row,
      actual_modules: JSON.parse(row.actual_modules || '[]'),
      complications: JSON.parse(row.complications || '[]'),
      modules: JSON.parse(row.modules || '[]')
    }));
  }

  getBaseline(domain) {
    const stmt = this.db.prepare('SELECT * FROM baseline WHERE domain = ?');
    const row = stmt.get(domain);
    
    if (!row) return null;

    return {
      ...row,
      module_efforts: JSON.parse(row.module_efforts || '{}'),
      complexity_multipliers: JSON.parse(row.complexity_multipliers || '{}'),
      persona_buffers: JSON.parse(row.persona_buffers || '{}')
    };
  }

  saveBaseline(baseline) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO baseline (
        id, domain, hourly_rate, module_efforts,
        complexity_multipliers, persona_buffers,
        sample_size, confidence, last_tuned, tuned_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = baseline.id || uuidv4();

    try {
      stmt.run(
        id,
        baseline.domain,
        baseline.hourly_rate,
        JSON.stringify(baseline.module_efforts || {}),
        JSON.stringify(baseline.complexity_multipliers || {}),
        JSON.stringify(baseline.persona_buffers || {}),
        baseline.sample_size || 0,
        baseline.confidence || 0.6,
        new Date().toISOString(),
        baseline.tuned_by || 'manual'
      );

      this.logger.info('Baseline saved', { domain: baseline.domain });
      return { success: true, id };
    } catch (error) {
      this.logger.error('Baseline save failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.logger.info('Database closed');
    }
  }
}

module.exports = ScopeDatabase;

