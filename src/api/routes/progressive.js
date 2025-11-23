// src/api/routes/progressive.js
// Progressive Output API - L1-L5 value ladder

const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

// Get database path
const dbPath = process.env.DB_V2_PATH || 
               path.join(process.cwd(), 'scogen-v2.db');

const LEVEL_FEATURES = {
    L1: {
        name: 'Discovery',
        price: 0,
        includes: [
            'Executive Summary',
            'Top 10 Features',
            'Rough Timeline',
            'Budget Range',
            'Key Risks'
        ],
        sections: ['summary', 'features', 'timeline', 'budget']
    },
    L2: {
        name: 'Planning',
        price: 2500,
        includes: [
            'Everything in L1',
            'All Features (Detailed)',
            'Milestones & Phases',
            'Team Composition',
            'Risk Mitigation'
        ],
        sections: ['summary', 'features', 'modules', 'timeline', 'budget', 'risks', 'team']
    },
    L3: {
        name: 'Architecture',
        price: 10000,
        includes: [
            'Everything in L2',
            'System Architecture',
            'Database Design',
            'API Specifications',
            'Tech Stack Details',
            'Integration Points'
        ],
        sections: ['summary', 'features', 'modules', 'timeline', 'budget', 'risks', 'team', 'architecture', 'database', 'apis']
    },
    L4: {
        name: 'Implementation',
        price: 25000,
        includes: [
            'Everything in L3',
            'Component Breakdown',
            '50% Pseudocode',
            'Sprint Planning',
            'Testing Strategy',
            'Deployment Plan'
        ],
        sections: ['summary', 'features', 'modules', 'timeline', 'budget', 'risks', 'team', 'architecture', 'database', 'apis', 'components', 'pseudocode', 'sprints']
    },
    L5: {
        name: 'Complete',
        price: 50000,
        includes: [
            'Everything in L4',
            '95% Pseudocode',
            'DevOps Configuration',
            'CI/CD Pipeline',
            'Documentation Templates',
            'Post-Launch Support Plan'
        ],
        sections: ['all']
    }
};

/**
 * GET /api/v2/progressive/:projectId/level/:level
 * Get progressive output for a specific level
 */
router.get('/:projectId/level/:level', async (req, res) => {
    const db = new Database(dbPath);
    
    try {
        const { projectId, level } = req.params;
        const userId = req.user?.id || 1; // Default to admin if no auth
        
        // Validate level
        if (!LEVEL_FEATURES[level]) {
            db.close();
            return res.status(400).json({ 
                error: 'Invalid level',
                validLevels: Object.keys(LEVEL_FEATURES)
            });
        }
        
        // Check if user has access to this level
        const access = checkLevelAccess(db, userId, projectId, level);
        if (!access.hasAccess && level !== 'L1') {
            db.close();
            return res.status(403).json({ 
                error: 'Upgrade required',
                level: level,
                levelName: LEVEL_FEATURES[level].name,
                price: LEVEL_FEATURES[level].price,
                upgradeUrl: `/api/v2/progressive/${projectId}/upgrade/${level}`
            });
        }
        
        // Get project data
        const project = db.prepare(`
            SELECT * FROM projects WHERE id = ? AND created_by = ?
        `).get(projectId, userId);
        
        if (!project) {
            db.close();
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Get level config
        const levelConfig = LEVEL_FEATURES[level];
        const output = {
            success: true,
            level: level,
            levelName: levelConfig.name,
            price: levelConfig.price,
            includes: levelConfig.includes,
            data: {}
        };
        
        // Build output based on level sections
        if (levelConfig.sections.includes('summary') || levelConfig.sections.includes('all')) {
            output.data.summary = generateSummary(db, projectId);
        }
        
        if (levelConfig.sections.includes('features') || levelConfig.sections.includes('all')) {
            const features = db.prepare(`
                SELECT * FROM features 
                WHERE project_id = ?
                ${level === 'L1' ? 'LIMIT 10' : ''}
                ORDER BY overall_complexity DESC
            `).all(projectId);
            
            output.data.features = features.map(f => ({
                id: f.id,
                name: f.feature_name,
                category: f.feature_category,
                complexity: f.overall_complexity || 3,
                hours: level === 'L1' ? Math.round((f.estimated_hours || 0) / 10) * 10 : f.estimated_hours || 0,
                description: level === 'L1' ? f.feature_name : (f.description || f.feature_name),
                confidence: f.confidence_score || 0.7
            }));
        }
        
        if (levelConfig.sections.includes('architecture') || levelConfig.sections.includes('all')) {
            output.data.architecture = generateArchitecture(project);
        }
        
        if (levelConfig.sections.includes('database') || levelConfig.sections.includes('all')) {
            output.data.database = generateDatabaseDesign(db, projectId, level);
        }
        
        if (levelConfig.sections.includes('apis') || levelConfig.sections.includes('all')) {
            output.data.apis = generateAPISpecs(db, projectId, level);
        }
        
        if (levelConfig.sections.includes('pseudocode') || levelConfig.sections.includes('all')) {
            const completeness = level === 'L4' ? 0.5 : level === 'L5' ? 0.95 : 0;
            output.data.pseudocode = generatePseudocode(db, projectId, completeness);
        }
        
        if (levelConfig.sections.includes('sprints') || levelConfig.sections.includes('all')) {
            const sprints = db.prepare(`
                SELECT * FROM sprint_plans 
                WHERE project_id = ?
                ORDER BY sprint_number
            `).all(projectId);
            
            output.data.sprints = sprints.map(s => ({
                sprintNumber: s.sprint_number,
                startDate: s.start_date,
                endDate: s.end_date,
                workingDays: s.working_days,
                goals: typeof s.sprint_goals === 'string' ? JSON.parse(s.sprint_goals) : s.sprint_goals,
                plannedHours: s.planned_hours
            }));
        }
        
        // Add cost estimate
        const costEstimate = db.prepare(`
            SELECT * FROM cost_estimates 
            WHERE project_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        `).get(projectId);
        
        if (costEstimate) {
            output.data.cost = {
                total: level === 'L1' ? 
                    `₹${Math.round(costEstimate.total_cost / 100000)}L - ₹${Math.round(costEstimate.total_cost * 1.3 / 100000)}L` :
                    `₹${(costEstimate.total_cost / 100000).toFixed(2)}L`,
                breakdown: level >= 'L2' ? {
                    development: costEstimate.development_cost,
                    testing: costEstimate.testing_cost,
                    management: costEstimate.project_management_cost,
                    gst: costEstimate.gst_amount,
                    total: costEstimate.total_cost,
                    quoted: costEstimate.quoted_price
                } : null
            };
        }
        
        // Add timeline
        if (levelConfig.sections.includes('timeline') || levelConfig.sections.includes('all')) {
            const sprints = db.prepare(`
                SELECT * FROM sprint_plans 
                WHERE project_id = ?
                ORDER BY sprint_number
            `).all(projectId);
            
            if (sprints.length > 0) {
                const firstSprint = sprints[0];
                const lastSprint = sprints[sprints.length - 1];
                
                output.data.timeline = {
                    startDate: firstSprint.start_date,
                    endDate: lastSprint.end_date,
                    totalSprints: sprints.length,
                    estimatedWeeks: level === 'L1' ? 
                        `${Math.round(sprints.length * 2)} weeks` :
                        `${sprints.length * 2} weeks (${sprints.length} sprints)`
                };
            }
        }
        
        db.close();
        res.json(output);
        
    } catch (error) {
        console.error('[ERROR] Progressive output error:', error);
        db.close();
        res.status(500).json({ 
            success: false,
            error: error.message,
            code: 'PROGRESSIVE_OUTPUT_ERROR'
        });
    }
});

/**
 * POST /api/v2/progressive/:projectId/upgrade/:level
 * Upgrade to a specific level (in production, this would process payment)
 */
router.post('/:projectId/upgrade/:level', async (req, res) => {
    const db = new Database(dbPath);
    
    try {
        const { projectId, level } = req.params;
        const userId = req.user?.id || 1;
        
        if (!LEVEL_FEATURES[level]) {
            db.close();
            return res.status(400).json({ 
                success: false,
                error: 'Invalid level' 
            });
        }
        
        const price = LEVEL_FEATURES[level].price;
        
        // In production, this would process payment via Stripe/Razorpay
        // For now, just grant access
        
        // Ensure table exists
        db.exec(`
            CREATE TABLE IF NOT EXISTS user_project_access (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                project_id TEXT,
                level TEXT NOT NULL,
                purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, project_id, level)
            )
        `);
        
        // Grant access
        db.prepare(`
            INSERT OR REPLACE INTO user_project_access 
            (user_id, project_id, level, purchased_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).run(userId, projectId, level);
        
        db.close();
        res.json({ 
            success: true,
            level: level,
            levelName: LEVEL_FEATURES[level].name,
            price: price,
            message: `Upgraded to ${LEVEL_FEATURES[level].name}`,
            redirectUrl: `/intelligent-scope.html?projectId=${projectId}&level=${level}`
        });
        
    } catch (error) {
        console.error('[ERROR] Upgrade error:', error);
        db.close();
        res.status(500).json({ 
            success: false,
            error: error.message,
            code: 'UPGRADE_ERROR'
        });
    }
});

/**
 * Check if user has access to a level
 */
function checkLevelAccess(db, userId, projectId, level) {
    // L1 is always free
    if (level === 'L1') return { hasAccess: true };
    
    // Ensure table exists
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS user_project_access (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                project_id TEXT,
                level TEXT NOT NULL,
                purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, project_id, level)
            )
        `);
    } catch (e) {
        // Table might already exist
    }
    
    // Check if user has purchased this level or higher
    const levelOrder = { 'L1': 1, 'L2': 2, 'L3': 3, 'L4': 4, 'L5': 5 };
    const requiredLevel = levelOrder[level];
    
    const access = db.prepare(`
        SELECT * FROM user_project_access
        WHERE user_id = ? AND project_id = ?
    `).all(userId, projectId);
    
    // Check if user has access to this level or higher
    for (const a of access) {
        if (levelOrder[a.level] >= requiredLevel) {
            return { hasAccess: true };
        }
    }
    
    return { hasAccess: false };
}

/**
 * Generate summary for project
 */
function generateSummary(db, projectId) {
    const project = db.prepare(`
        SELECT 
            p.*,
            COUNT(DISTINCT f.id) as feature_count,
            SUM(f.estimated_hours) as total_hours,
            AVG(f.overall_complexity) as avg_complexity
        FROM projects p
        LEFT JOIN features f ON f.project_id = p.id
        WHERE p.id = ?
        GROUP BY p.id
    `).get(projectId);
    
    if (!project) return null;
    
    return {
        projectName: project.project_name,
        client: project.client_name,
        industry: project.client_industry,
        featureCount: project.feature_count || 0,
        estimatedHours: Math.round(project.total_hours || 0),
        complexity: (project.avg_complexity || 3).toFixed(1),
        status: project.project_status
    };
}

/**
 * Generate architecture recommendations
 */
function generateArchitecture(project) {
    const industry = project.client_industry || 'other';
    
    const architectures = {
        ecommerce: {
            type: 'Microservices',
            frontend: 'Next.js + React',
            backend: 'Node.js + Express',
            database: 'PostgreSQL + Redis',
            deployment: 'AWS/Docker',
            cdn: 'CloudFront',
            monitoring: 'New Relic',
            caching: 'Redis',
            search: 'Elasticsearch'
        },
        fintech: {
            type: 'Service-Oriented',
            frontend: 'React + TypeScript',
            backend: 'Node.js + NestJS',
            database: 'PostgreSQL + MongoDB',
            deployment: 'AWS with High Availability',
            security: 'OAuth2, JWT, Encryption',
            compliance: 'PCI DSS, RBI Guidelines',
            monitoring: 'Datadog'
        },
        saas: {
            type: 'Multi-Tenant',
            frontend: 'React + Next.js',
            backend: 'Node.js + Express',
            database: 'PostgreSQL (multi-tenant)',
            deployment: 'Kubernetes',
            monitoring: 'Prometheus + Grafana'
        },
        default: {
            type: 'Monolithic',
            frontend: 'React',
            backend: 'Node.js',
            database: 'PostgreSQL',
            deployment: 'Cloud (AWS/GCP)'
        }
    };
    
    return architectures[industry] || architectures.default;
}

/**
 * Generate database design
 */
function generateDatabaseDesign(db, projectId, level) {
    const features = db.prepare(`
        SELECT DISTINCT feature_category FROM features 
        WHERE project_id = ? AND feature_category IS NOT NULL
    `).all(projectId);
    
    const tables = features.map(f => ({
        name: `${f.feature_category.toLowerCase().replace(/\s+/g, '_')}`,
        description: `${f.feature_category} related data`,
        columns: level >= 'L3' ? [
            'id (PRIMARY KEY)',
            'created_at (TIMESTAMP)',
            'updated_at (TIMESTAMP)',
            'status (VARCHAR)'
        ] : ['id', 'created_at', 'updated_at']
    }));
    
    return {
        type: 'Relational (PostgreSQL)',
        tables: tables,
        relationships: level >= 'L3' ? 'Foreign keys defined' : 'Basic relationships'
    };
}

/**
 * Generate API specifications
 */
function generateAPISpecs(db, projectId, level) {
    const features = db.prepare(`
        SELECT feature_name, feature_category FROM features 
        WHERE project_id = ?
        LIMIT ${level >= 'L3' ? 10 : 5}
    `).all(projectId);
    
    const apis = features.map(f => ({
        endpoint: `/api/${f.feature_category.toLowerCase().replace(/\s+/g, '-')}`,
        methods: level >= 'L3' ? ['GET', 'POST', 'PUT', 'DELETE'] : ['GET', 'POST'],
        description: `Manage ${f.feature_name}`,
        auth: level >= 'L3' ? 'JWT Bearer Token' : 'Required'
    }));
    
    return {
        baseUrl: '/api/v1',
        apis: apis,
        authentication: 'JWT Bearer Token',
        rateLimit: level >= 'L3' ? '1000 requests/hour' : 'Standard'
    };
}

/**
 * Generate pseudocode based on completeness
 */
function generatePseudocode(db, projectId, completeness) {
    const features = db.prepare(`
        SELECT * FROM features WHERE project_id = ? LIMIT 3
    `).all(projectId);
    
    const pseudocode = {};
    
    features.forEach(feature => {
        const code = completeness > 0.9 ? 
            generateCompletePseudocode(feature) :
            completeness > 0.4 ?
            generatePartialPseudocode(feature) :
            generateStubPseudocode(feature);
            
        pseudocode[feature.feature_name] = {
            completeness: completeness,
            code: code
        };
    });
    
    return pseudocode;
}

function generateCompletePseudocode(feature) {
    const className = feature.feature_name.replace(/\s+/g, '');
    return `// ${feature.feature_name} Implementation
class ${className} {
    constructor(db, logger, config) {
        this.db = db;
        this.logger = logger;
        this.config = config;
    }
    
    async create(data) {
        // Validate input
        const validated = this.validate(data);
        
        // Begin transaction
        const trx = await this.db.transaction();
        
        try {
            // Business logic
            const processed = this.processBusinessRules(validated);
            
            // Save to database
            const result = await trx('${feature.feature_category?.toLowerCase().replace(/\s+/g, '_') || 'items'}')
                .insert(processed);
            
            // Commit transaction
            await trx.commit();
            
            // Audit log
            this.logger.info(\`Created ${feature.feature_name}: \${result.id}\`);
            
            return result;
            
        } catch (error) {
            await trx.rollback();
            this.logger.error(\`Failed to create ${feature.feature_name}: \${error.message}\`);
            throw error;
        }
    }
    
    async update(id, data) {
        // Implementation here
    }
    
    async delete(id) {
        // Implementation here
    }
    
    async get(id) {
        // Implementation here
    }
}

module.exports = ${className};`;
}

function generatePartialPseudocode(feature) {
    const className = feature.feature_name.replace(/\s+/g, '');
    return `// ${feature.feature_name} - Partial Implementation
class ${className} {
    async create(data) {
        // TODO: Add validation
        // TODO: Add business logic
        // TODO: Save to database
        return { id: 'generated-id', ...data };
    }
    
    async update(id, data) {
        // TODO: Implementation needed
    }
    
    async delete(id) {
        // TODO: Implementation needed
    }
}`;
}

function generateStubPseudocode(feature) {
    return `// ${feature.feature_name} - To be implemented`;
}

module.exports = router;

