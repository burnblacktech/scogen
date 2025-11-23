/**
 * Generation Controller
 * 
 * Handles pseudocode and sprint plan generation
 * Part of Precision Pivot system
 */

class GenerationController {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
    }

    async generatePseudocode(feature, projectContext = {}, options = {}) {
        const PseudocodeGenerator = require('../generation/PseudocodeGenerator');
        const generator = new PseudocodeGenerator(this.logger);
        
        return await generator.generatePseudocode(feature, projectContext, options);
    }

    async generateSprintPlan(project, team, startDate, options = {}) {
        const SprintPlanner = require('../generation/SprintPlanner');
        const planner = new SprintPlanner(this.logger, this.db);
        
        return await planner.generateSprintPlan(project, team, startDate, options);
    }

    async generateBlueprint(projectId, options = {}) {
        // Get project and features
        const project = this.db.prepare('SELECT * FROM projects WHERE id = ? OR project_code = ?')
            .get(projectId, projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }
        
        // Get features
        const features = this.db.prepare('SELECT * FROM features WHERE project_id = ?')
            .all(projectId);
        
        // Generate blueprint
        return {
            projectId: projectId,
            features: features,
            blueprint: {
                architecture: 'To be generated',
                database: 'To be generated',
                apis: 'To be generated'
            }
        };
    }
}

module.exports = GenerationController;

