/**
 * Project Service
 * 
 * Service layer that manages dual-write to old and new databases
 * Feature flag controlled for gradual migration
 */

const DatabaseManagerV2 = require('../database/db-manager-v2');
const path = require('path');

class ProjectService {
  constructor() {
    // Feature flag: Enable new database
    this.useNewDb = process.env.USE_NEW_DB === 'true';
    
    // Initialize new database if enabled
    this.dbV2 = null;
    if (this.useNewDb) {
      try {
        this.dbV2 = new DatabaseManagerV2();
        this.dbV2.initialize();
        console.log('✅ New database enabled');
      } catch (error) {
        console.error('⚠️ Failed to initialize new database:', error.message);
        this.useNewDb = false; // Fallback to old database
      }
    }
    
    // Old database will be accessed via require when needed
    // (lazy loading to avoid circular dependencies)
    this.oldDb = null;
  }

  /**
   * Get old database instance (lazy load)
   */
  getOldDb() {
    if (!this.oldDb) {
      // Import old database module
      const Database = require('../modules/database');
      const Logger = require('../utils/logger');
      const ConfigManager = require('../utils/config-manager');
      
      const config = new ConfigManager();
      const logger = new Logger();
      const dbPath = config.get('database.path') || path.join(__dirname, '../../data/scogen.db');
      
      this.oldDb = new Database(dbPath, logger);
    }
    return this.oldDb;
  }

  /**
   * Save project to database(s)
   * Always saves to old database, optionally to new database
   */
  async saveProject(projectData) {
    const results = {
      oldDb: null,
      newDb: null,
      errors: []
    };
    
    // Always save to old database
    try {
      const oldDb = this.getOldDb();
      
      // Convert projectData to old database format
      const oldFormat = this.convertToOldFormat(projectData);
      
      // Use old database saveScope method
      results.oldDb = oldDb.saveScope(oldFormat);
      
      console.log('✅ Saved to old database');
    } catch (error) {
      console.error('❌ Old database save failed:', error.message);
      results.errors.push({ db: 'old', error: error.message });
      // Don't throw - continue to try new database
    }
    
    // Save to new database if enabled
    if (this.useNewDb && this.dbV2) {
      try {
        // Get or create client
        const clientId = this.dbV2.createOrUpdateClient({
          identifier: projectData.client?.email || projectData.client?.phone || projectData.client?.company_name,
          company_name: projectData.client?.company_name,
          contact_name: projectData.client?.contact_name,
          email: projectData.client?.email,
          phone: projectData.client?.phone,
          tech_savvy: projectData.clientProfile?.techSavvy || 'medium',
          industry: projectData.domainContext?.industry,
          client_type: projectData.clientProfile?.clientSize || 'sme'
        });
        
        // Create project
        const project = this.dbV2.createProject({
          client_id: clientId,
          project_name: projectData.projectName || projectData.client?.company_name + ' Project' || 'Untitled Project',
          status: 'scoping',
          
          // Input data
          original_input: projectData.input || projectData.originalInput,
          input_type: projectData.inputType || 'text',
          input_quality_score: projectData.inputAnalysis?.completeness || null,
          
          // Analysis results
          client_profile: projectData.clientProfile || {},
          extracted_modules: projectData.extractedIntent?.modules || projectData.modules || [],
          refined_scope: projectData.refinedScope || {},
          technical_breakdown: projectData.technicalBreakdown || {},
          edge_cases: projectData.edgeCases || [],
          assumptions: projectData.assumptions || {},
          
          // Estimates
          base_estimate: projectData.estimate || {},
          hidden_costs: projectData.hiddenCosts || {},
          scenarios: projectData.scenarios || {},
          
          // Quoted values
          quoted_cost: projectData.hiddenCosts?.client?.total || projectData.estimate?.cost?.total || null,
          quoted_timeline_days: projectData.estimate?.timeline?.days || null
        });
        
        results.newDb = {
          project_code: project.project_code,
          id: project.id
        };
        
        console.log('✅ Saved to new database:', project.project_code);
      } catch (error) {
        console.error('⚠️ New database save failed (non-blocking):', error.message);
        results.errors.push({ db: 'new', error: error.message });
        // Non-blocking: Don't throw, just log
      }
    }
    
    return results;
  }

  /**
   * Convert new format to old database format
   */
  convertToOldFormat(projectData) {
    return {
      input_raw: projectData.input || projectData.originalInput || '',
      industry: projectData.domainContext?.industry || 'generic',
      use_case: projectData.extractedIntent?.useCase || 'application',
      persona: projectData.profile?.primaryPersona || 'cautious_solo',
      estimated_days: projectData.estimate?.timeline?.days || 0,
      estimated_cost: projectData.estimate?.cost?.total || projectData.hiddenCosts?.client?.total || 0,
      confidence: projectData.estimate?.confidence?.overall || 0.8,
      modules: JSON.stringify(projectData.extractedIntent?.modules || projectData.modules || []),
      risks: JSON.stringify(projectData.plan?.risks || []),
      plan: JSON.stringify(projectData.plan || {}),
      output_full: JSON.stringify(projectData)
    };
  }

  /**
   * Get project history
   * Uses new database if enabled, otherwise old database
   */
  getProjectHistory(limit = 10) {
    if (this.useNewDb && this.dbV2) {
      try {
        const sql = `
          SELECT p.*, c.company_name, c.contact_name
          FROM projects p
          LEFT JOIN clients c ON p.client_id = c.id
          ORDER BY p.created_at DESC
          LIMIT ?
        `;
        const stmt = this.dbV2.db.prepare(sql);
        const projects = stmt.all(limit);
        
        // Parse JSON fields
        return projects.map(p => {
          const jsonFields = ['client_profile', 'extracted_modules', 'refined_scope',
                             'technical_breakdown', 'edge_cases', 'assumptions',
                             'base_estimate', 'hidden_costs', 'scenarios'];
          jsonFields.forEach(field => {
            if (p[field]) {
              try {
                p[field] = JSON.parse(p[field]);
              } catch (e) {
                p[field] = {};
              }
            }
          });
          return p;
        });
      } catch (error) {
        console.error('New database read failed, falling back to old:', error.message);
        // Fall through to old database
      }
    }
    
    // Use old database
    try {
      const oldDb = this.getOldDb();
      // Old database doesn't have getHistory method, so we'll use getRecentScopes if available
      if (oldDb.getRecentScopes) {
        return oldDb.getRecentScopes(limit);
      }
      // Fallback: return empty array
      return [];
    } catch (error) {
      console.error('Old database read failed:', error.message);
      return [];
    }
  }

  /**
   * Get client by identifier
   */
  getClient(identifier) {
    if (this.useNewDb && this.dbV2) {
      try {
        return this.dbV2.getClient(identifier);
      } catch (error) {
        console.error('New database client lookup failed:', error.message);
      }
    }
    
    // Old database doesn't have client table, return null
    return null;
  }

  /**
   * Record project completion with actuals
   */
  async recordProjectCompletion(projectCode, actuals) {
    if (!this.useNewDb || !this.dbV2) {
      throw new Error('New database must be enabled to record project completion');
    }
    
    try {
      // Update project with actuals
      this.dbV2.updateProjectActuals(projectCode, {
        cost: actuals.cost,
        timeline: actuals.timeline,
        scopeCreep: actuals.scopeCreep || 0,
        status: 'completed'
      });
      
      // Get project to learn from
      const project = this.dbV2.getProject(projectCode);
      if (!project) {
        throw new Error(`Project ${projectCode} not found`);
      }
      
      // Learn patterns from variance
      if (project.refined_scope?.modules) {
        for (const module of project.refined_scope.modules) {
          const estimated = module.effort || module.days || 0;
          const actual = actuals.moduleActuals?.[module.name] || estimated;
          
          if (estimated > 0 && actual !== estimated) {
            const variance = actual / estimated;
            const domain = project.domainContext?.industry || 'general';
            
            this.dbV2.recordPattern(
              'effort_variance',
              domain,
              module.name,
              { multiplier: variance, samples: 1 },
              variance < 1.5 // Success if variance is reasonable
            );
          }
        }
      }
      
      // Update client metrics
      if (project.client_id) {
        this.dbV2.updateClientMetrics(project.client_id, {
          total_projects: this.dbV2.db.prepare('SELECT total_projects FROM clients WHERE id = ?').get(project.client_id).total_projects + 1,
          completed_projects: this.dbV2.db.prepare('SELECT completed_projects FROM clients WHERE id = ?').get(project.client_id).completed_projects + 1,
          total_value: this.dbV2.db.prepare('SELECT total_value FROM clients WHERE id = ?').get(project.client_id).total_value + (actuals.cost || 0)
        });
      }
      
      return { success: true, message: 'Project completion recorded and learning completed' };
    } catch (error) {
      console.error('Failed to record project completion:', error);
      throw error;
    }
  }

  /**
   * Close database connections
   */
  close() {
    if (this.dbV2) {
      this.dbV2.close();
    }
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getProjectService: () => {
    if (!instance) {
      instance = new ProjectService();
    }
    return instance;
  }
};

