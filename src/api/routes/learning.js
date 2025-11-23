// src/api/routes/learning.js
// Learning API routes - Project completion and learning system

const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

// Get database path
const dbPath = process.env.DB_V2_PATH || 
               path.join(process.cwd(), 'scogen-v2.db');

// Import learning modules
const LearningEngine = require('../../core/learning/LearningEngine');
const FeedbackLoop = require('../../core/learning/FeedbackLoop');

/**
 * POST /api/v2/learning/complete-project
 * Mark project as complete and save actuals
 */
router.post('/complete-project', async (req, res) => {
    const db = new Database(dbPath);
    
    try {
        const { projectId, actuals, varianceReasons, insights } = req.body;
        const userId = req.user?.id || 1;

        if (!projectId || !actuals) {
            db.close();
            return res.status(400).json({
                success: false,
                error: 'Project ID and actuals are required',
                code: 'VALIDATION_ERROR'
            });
        }

        // Get project and features
        const project = db.prepare(`
            SELECT * FROM projects WHERE id = ? AND created_by = ?
        `).get(projectId, userId);

        if (!project) {
            db.close();
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const features = db.prepare(`
            SELECT * FROM features WHERE project_id = ?
        `).all(projectId);

        // Calculate accuracy
        const totalEstimatedHours = features.reduce((sum, f) => sum + (f.estimated_hours || 0), 0);
        const accuracy = totalEstimatedHours > 0 
            ? Math.max(0, Math.min(1, 1 - Math.abs(actuals.hours - totalEstimatedHours) / totalEstimatedHours))
            : 0.5;

        // Save actuals for each feature (aggregate to project level for now)
        features.forEach(feature => {
            const estimatedHours = feature.estimated_hours || 0;
            const actualHours = actuals.hours * (estimatedHours / totalEstimatedHours); // Proportional distribution
            
            db.prepare(`
                INSERT INTO project_actuals (
                    id, project_id, feature_id, estimated_hours, actual_hours,
                    estimated_cost, actual_cost, estimated_duration, actual_duration,
                    variance_reasons, client_satisfaction_score, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(
                `actual_${Date.now()}_${feature.id}`,
                projectId,
                feature.id,
                estimatedHours,
                actualHours,
                feature.estimated_hours * 5000, // Rough cost estimate
                actualHours * 5000,
                Math.round(estimatedHours / 8), // Days
                Math.round(actualHours / 8),
                JSON.stringify(varianceReasons || []),
                actuals.clientSatisfaction || 3
            );
        });

        // Update project status
        db.prepare(`
            UPDATE projects 
            SET project_status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(projectId);

        // Save learning metrics
        db.prepare(`
            INSERT INTO learning_metrics (
                id, project_id, overall_estimation_accuracy,
                overrun_reasons, success_factors, bugs_reported,
                client_satisfaction_score, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
            `metrics_${Date.now()}`,
            projectId,
            accuracy * 100,
            JSON.stringify(varianceReasons || []),
            JSON.stringify([insights || '']),
            actuals.bugs || 0,
            actuals.clientSatisfaction || 3
        );

        db.close();
        res.json({
            success: true,
            accuracy: accuracy,
            message: 'Project completed and actuals saved',
            projectId: projectId
        });

    } catch (error) {
        console.error('[ERROR] Project completion failed:', error);
        db.close();
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'COMPLETION_ERROR'
        });
    }
});

/**
 * POST /api/v2/learning/learn-from-project
 * Trigger learning engine to process completed project
 */
router.post('/learn-from-project', async (req, res) => {
    const db = new Database(dbPath);
    
    try {
        const { projectId } = req.body;
        const userId = req.user?.id || 1;

        if (!projectId) {
            db.close();
            return res.status(400).json({
                success: false,
                error: 'Project ID is required'
            });
        }

        // Get project actuals
        const actuals = db.prepare(`
            SELECT * FROM project_actuals WHERE project_id = ?
        `).all(projectId);

        if (actuals.length === 0) {
            db.close();
            return res.status(404).json({
                success: false,
                error: 'No actuals found for this project'
            });
        }

        // Get project details
        const project = db.prepare(`
            SELECT * FROM projects WHERE id = ?
        `).get(projectId);

        // Initialize learning engine
        const learningEngine = new LearningEngine(db, console);
        const feedbackLoop = new FeedbackLoop(db, console);

        // Set learning engine reference
        feedbackLoop.setLearningEngine(learningEngine);

        // Process learning
        const learnings = await learningEngine.learnFromProject(projectId);

        // Process feedback (this will also trigger learning if needed)
        await feedbackLoop.processFeedback(projectId, actuals);

        db.close();
        res.json({
            success: true,
            learnings: learnings,
            message: 'System has learned from this project',
            patternsUpdated: true
        });

    } catch (error) {
        console.error('[ERROR] Learning failed:', error);
        db.close();
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'LEARNING_ERROR'
        });
    }
});

/**
 * GET /api/v2/learning/metrics
 * Get learning system metrics
 */
router.get('/metrics', async (req, res) => {
    const db = new Database(dbPath);
    
    try {
        // Get completed projects count
        const completedProjects = db.prepare(`
            SELECT COUNT(DISTINCT project_id) as count
            FROM project_actuals
        `).get();

        // Get average accuracy
        const accuracy = db.prepare(`
            SELECT 
                AVG(CASE 
                    WHEN estimated_hours > 0 
                    THEN 1 - ABS(actual_hours - estimated_hours) / estimated_hours 
                    ELSE 0 
                END) as accuracy
            FROM project_actuals
        `).get();

        // Get accuracy trend (last 10 projects)
        const trend = db.prepare(`
            SELECT 
                pa.created_at,
                1 - ABS(pa.actual_hours - pa.estimated_hours) / pa.estimated_hours as accuracy
            FROM project_actuals pa
            GROUP BY pa.project_id
            ORDER BY pa.created_at DESC
            LIMIT 10
        `).all();

        // Get patterns learned
        const patterns = db.prepare(`
            SELECT COUNT(*) as count
            FROM estimation_patterns
        `).get();

        // Calculate improvement rate
        let improvementRate = 0;
        if (trend.length >= 2) {
            const firstAccuracy = trend[trend.length - 1].accuracy || 0;
            const lastAccuracy = trend[0].accuracy || 0;
            if (firstAccuracy > 0) {
                improvementRate = ((lastAccuracy - firstAccuracy) / firstAccuracy * 100).toFixed(1);
            }
        }

        db.close();
        res.json({
            success: true,
            completedProjects: completedProjects.count || 0,
            accuracy: accuracy.accuracy || 0,
            accuracyTrend: trend.reverse(),
            patternsLearned: patterns.count || 0,
            improvementRate: improvementRate
        });

    } catch (error) {
        console.error('[ERROR] Metrics loading failed:', error);
        db.close();
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'METRICS_ERROR'
        });
    }
});

module.exports = router;
