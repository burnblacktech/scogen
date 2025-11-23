// src/api/routes/projects.js
// Project management routes

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// UUID generation (using crypto.randomUUID if available, fallback to simple generator)
function uuidv4() {
  try {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    // Fall through to fallback
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get database path
const dbPath = process.env.DB_V2_PATH || 
               path.join(process.cwd(), 'scogen-v2.db');

// Import intelligence modules
const ComplexityAnalyzer = require('../../core/estimation/ComplexityAnalyzer');
const DynamicCostCalculator = require('../../core/estimation/DynamicCostCalculator');
const ContextAwareScenarios = require('../../core/intelligence/ContextAwareScenarios');
const RequirementParser = require('../../core/extraction/RequirementParser');

const complexityAnalyzer = new ComplexityAnalyzer();
const costCalculator = new DynamicCostCalculator();
const requirementParser = new RequirementParser(console); // Pass logger

/**
 * POST /api/v2/projects/create
 * Create a new project with intelligence analysis
 */
router.post('/create', async (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { 
      projectName, 
      clientName, 
      clientIndustry, 
      clientType,
      requirements, 
      requiresGST = true,
      requiresCompliance = false,
      inputMethod = 'text' 
    } = req.body;
    const userId = req.user?.id || 1; // Default to admin if no auth

    // Validation
    if (!projectName || !requirements) {
      db.close();
      return res.status(400).json({
        success: false,
        error: 'Project name and requirements are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Generate project ID
    const projectId = uuidv4();

    // 1. Create project in database
    db.prepare(`
      INSERT INTO projects (
        id, project_name, client_name, client_industry, 
        project_status, created_by, requires_gst_billing, 
        requires_compliance_check, created_at
      )
      VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      projectId,
      projectName,
      clientName || null,
      clientIndustry || 'other',
      userId,
      requiresGST ? 1 : 0,
      requiresCompliance ? 1 : 0
    );

    // 2. Parse requirements and extract features
    let parsedRequirements;
    try {
      // RequirementParser.parseRequirement returns an object with features array
      parsedRequirements = await requirementParser.parseRequirement(requirements, 'text');
      
      // Ensure we have features array
      if (!parsedRequirements.features || parsedRequirements.features.length === 0) {
        // Fallback: create basic feature from requirements
        parsedRequirements.features = [{
          name: 'Main Feature',
          category: 'core',
          description: requirements
        }];
      }
    } catch (error) {
      console.warn('Requirement parsing failed, using basic extraction:', error);
      // Fallback: create basic feature from requirements
      parsedRequirements = {
        features: [{
          name: 'Main Feature',
          category: 'core',
          description: requirements
        }]
      };
    }

    const features = parsedRequirements.features || [];
    const featureAnalyses = [];

    // 3. Process each feature with intelligence system
    for (const feature of features) {
      const featureId = uuidv4();

      // Save feature to database
      db.prepare(`
        INSERT INTO features (
          id, project_id, feature_name, feature_category,
          description, created_at
        )
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        featureId,
        projectId,
        feature.name || 'Unnamed Feature',
        feature.category || 'general',
        feature.description || ''
      );

      // Analyze complexity
      const projectContext = {
        clientIndustry: clientIndustry || 'other',
        clientType: clientType || 'startup',
        projectType: parsedRequirements.projectType || 'web',
        requiresGST: requiresGST,
        requiresCompliance: requiresCompliance
      };

      let complexity;
      try {
        complexity = complexityAnalyzer.analyze(feature, projectContext);
      } catch (error) {
        console.warn('Complexity analysis failed:', error);
        complexity = {
          overall: 3.0,
          breakdown: {
            functional: 3.0,
            technical: 3.0,
            integration: 3.0,
            data: 3.0,
            business: 3.0
          }
        };
      }

      // Calculate cost
      let cost;
      try {
        cost = await costCalculator.calculateModuleCost(feature, projectContext);
      } catch (error) {
        console.warn('Cost calculation failed:', error);
        cost = {
          cost: {
            total: 100000,
            breakdown: {
              development: 70000,
              testing: 21000,
              documentation: 7000,
              projectManagement: 10500,
              riskBuffer: 10000,
              gst: 18000
            }
          },
          hours: {
            adjusted: 100
          },
          confidence: 0.7
        };
      }

      // Update feature with analysis results
      db.prepare(`
        UPDATE features SET
          functional_complexity = ?,
          technical_complexity = ?,
          integration_complexity = ?,
          data_complexity = ?,
          business_complexity = ?,
          overall_complexity = ?,
          estimated_hours = ?,
          confidence_score = ?,
          complexity_factors = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        complexity.breakdown?.functional || complexity.functional || 3.0,
        complexity.breakdown?.technical || complexity.technical || 3.0,
        complexity.breakdown?.integration || complexity.integration || 3.0,
        complexity.breakdown?.data || complexity.data || 3.0,
        complexity.breakdown?.business || complexity.business || 3.0,
        complexity.overall || 3.0,
        cost.hours?.adjusted || 100,
        cost.confidence || 0.7,
        JSON.stringify(complexity.breakdown || {}),
        featureId
      );

      featureAnalyses.push({
        featureId,
        featureName: feature.name || 'Unnamed Feature',
        complexity: complexity.overall || 3.0,
        estimatedHours: cost.hours?.adjusted || 100,
        estimatedCost: cost.cost?.total || 100000,
        confidence: cost.confidence || 0.7
      });
    }

    // 4. Generate scenarios
    let scenarios;
    try {
      const scenarioGenerator = new ContextAwareScenarios(null, null);
      scenarios = await scenarioGenerator.generateScenarios(
        {
          id: projectId,
          clientIndustry: clientIndustry || 'other',
          projectName
        },
        features,
        {
          developers: 2,
          designers: 1,
          qa: 1
        }
      );
    } catch (error) {
      console.warn('Scenario generation failed:', error);
      // Fallback scenarios
      const totalHours = featureAnalyses.reduce((sum, f) => sum + f.estimatedHours, 0);
      const totalCost = featureAnalyses.reduce((sum, f) => sum + f.estimatedCost, 0);
      
      scenarios = {
        optimistic: {
          totalHours: totalHours * 0.8,
          totalCost: totalCost * 0.8,
          duration: Math.ceil(totalHours * 0.8 / 40)
        },
        realistic: {
          totalHours: totalHours,
          totalCost: totalCost,
          duration: Math.ceil(totalHours / 40)
        },
        pessimistic: {
          totalHours: totalHours * 1.3,
          totalCost: totalCost * 1.3,
          duration: Math.ceil(totalHours * 1.3 / 40)
        },
        recommended: {
          totalHours: totalHours * 1.1,
          totalCost: totalCost * 1.1,
          duration: Math.ceil(totalHours * 1.1 / 40)
        }
      };
    }

    // 5. Save cost estimate
    const recommendedScenario = scenarios.recommended || scenarios.realistic;
    const developmentCost = recommendedScenario.totalCost || featureAnalyses.reduce((sum, f) => sum + f.estimatedCost, 0);
    const gstAmount = developmentCost * 0.18;
    const totalCost = developmentCost + gstAmount;
    const quotedPrice = totalCost * 1.2; // Add margin

    const costEstimateId = uuidv4();
    db.prepare(`
      INSERT INTO cost_estimates (
        id, project_id, development_cost, testing_cost,
        project_management_cost, gst_amount, total_cost, quoted_price,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      costEstimateId,
      projectId,
      developmentCost * 0.7, // Development portion
      developmentCost * 0.21, // Testing (30%)
      developmentCost * 0.09, // PM (15%)
      gstAmount,
      totalCost,
      quotedPrice
    );

    // 6. Update project status
    db.prepare(`
      UPDATE projects 
      SET project_status = 'scoping', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(projectId);

    db.close();

    res.json({
      success: true,
      project: {
        id: projectId,
        name: projectName,
        clientName: clientName || null,
        industry: clientIndustry || 'other',
        status: 'scoping'
      },
      analysis: {
        totalFeatures: featureAnalyses.length,
        totalHours: recommendedScenario.totalHours || featureAnalyses.reduce((sum, f) => sum + f.estimatedHours, 0),
        totalCost: recommendedScenario.totalCost || developmentCost,
        averageComplexity: featureAnalyses.reduce((sum, f) => sum + f.complexity, 0) / featureAnalyses.length,
        averageConfidence: featureAnalyses.reduce((sum, f) => sum + f.confidence, 0) / featureAnalyses.length
      },
      scenarios: {
        optimistic: scenarios.optimistic,
        realistic: scenarios.realistic,
        pessimistic: scenarios.pessimistic,
        recommended: scenarios.recommended
      },
      features: featureAnalyses
    });
  } catch (error) {
    db.close();
    console.error('[ERROR] Project creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'PROJECT_CREATION_ERROR'
    });
  }
});

/**
 * GET /api/v2/projects
 * List all projects for current user
 */
router.get('/', async (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const userId = req.user?.id || null;
    
    let projects;
    if (userId) {
      projects = db.prepare(`
        SELECT 
          p.id,
          p.project_name,
          p.client_name,
          p.client_industry,
          p.project_status,
          p.created_at,
          COUNT(DISTINCT f.id) as feature_count,
          SUM(f.estimated_hours) as total_hours,
          AVG(f.confidence_score) as avg_confidence
        FROM projects p
        LEFT JOIN features f ON f.project_id = p.id
        WHERE p.created_by = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `).all(userId);
    } else {
      // If no auth, return all projects (for demo)
      projects = db.prepare(`
        SELECT 
          p.id,
          p.project_name,
          p.client_name,
          p.client_industry,
          p.project_status,
          p.created_at,
          COUNT(DISTINCT f.id) as feature_count,
          SUM(f.estimated_hours) as total_hours,
          AVG(f.confidence_score) as avg_confidence
        FROM projects p
        LEFT JOIN features f ON f.project_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 50
      `).all();
    }

    // Get cost estimates for each project
    const projectsWithCosts = projects.map(project => {
      const costEstimate = db.prepare(`
        SELECT total_cost, quoted_price 
        FROM cost_estimates 
        WHERE project_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(project.id);

      return {
        ...project,
        totalCost: costEstimate?.total_cost || null,
        quotedPrice: costEstimate?.quoted_price || null
      };
    });

    db.close();

    res.json({
      success: true,
      projects: projectsWithCosts
    });
  } catch (error) {
    db.close();
    console.error('[ERROR] Failed to list projects:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'LIST_PROJECTS_ERROR'
    });
  }
});

/**
 * GET /api/v2/projects/:projectId
 * Get project details with intelligence data
 */
router.get('/:projectId', async (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { projectId } = req.params;

    // Get project
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    
    if (!project) {
      db.close();
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Get features with complexity
    const features = db.prepare(`
      SELECT 
        id, feature_name, feature_category, description,
        functional_complexity, technical_complexity, integration_complexity,
        data_complexity, business_complexity, overall_complexity,
        estimated_hours, confidence_score, complexity_factors
      FROM features
      WHERE project_id = ?
      ORDER BY overall_complexity DESC
    `).all(projectId);

    // Get cost estimate
    const costEstimate = db.prepare(`
      SELECT * FROM cost_estimates
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId);

    db.close();

    res.json({
      success: true,
      project: {
        ...project,
        features: features.map(f => ({
          ...f,
          complexity_factors: f.complexity_factors ? JSON.parse(f.complexity_factors) : null
        })),
        costEstimate
      }
    });
  } catch (error) {
    db.close();
    console.error('[ERROR] Failed to get project:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_PROJECT_ERROR'
    });
  }
});

module.exports = router;

