// src/api/routes/intelligence.js
// Intelligence API Routes

const express = require('express');
const router = express.Router();

const ComplexityAnalyzer = require('../../core/estimation/ComplexityAnalyzer');
const DynamicCostCalculator = require('../../core/estimation/DynamicCostCalculator');
const IntelligentTimeline = require('../../core/intelligence/IntelligentTimeline');
const ContextAwareScenarios = require('../../core/intelligence/ContextAwareScenarios');

const complexityAnalyzer = new ComplexityAnalyzer();
const costCalculator = new DynamicCostCalculator();
const timelineCalculator = new IntelligentTimeline();
// Scenario generator will be instantiated per request with db/logger

/**
 * Analyze module complexity
 * POST /api/v2/intelligence/analyze-complexity
 */
router.post('/analyze-complexity', async (req, res) => {
  try {
    const { module, projectContext } = req.body;
    
    if (!module) {
      return res.status(400).json({ 
        success: false, 
        error: 'Module is required' 
      });
    }

    const complexity = complexityAnalyzer.analyze(module, projectContext || {});

    res.json({
      success: true,
      complexity: {
        overall: complexity.overall,
        breakdown: complexity.breakdown,
        factors: {
          functional: complexity.inherent,
          technical: complexity.technical,
          integration: complexity.integration,
          domain: complexity.domain,
          data: complexity.data,
          business: complexity.business,
          uncertainty: complexity.uncertainty
        }
      },
      explanation: complexity.breakdown?.summary || complexity.explanation,
      confidence: complexity.confidence
    });
  } catch (error) {
    console.error('[ERROR] Complexity analysis failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Calculate dynamic cost
 * POST /api/v2/intelligence/calculate-cost
 */
router.post('/calculate-cost', async (req, res) => {
  try {
    const { module, projectContext } = req.body;
    
    if (!module) {
      return res.status(400).json({ 
        success: false, 
        error: 'Module is required' 
      });
    }

    const cost = await costCalculator.calculateModuleCost(module, projectContext || {});

    res.json({
      success: true,
      cost: cost.cost.total,
      breakdown: cost.cost.breakdown,
      hours: cost.hours.adjusted,
      complexity: cost.complexity,
      confidence: cost.confidence,
      source: cost.source,
      explanation: cost.factors.join('\n')
    });
  } catch (error) {
    console.error('[ERROR] Cost calculation failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Generate intelligent timeline
 * POST /api/v2/intelligence/generate-timeline
 */
router.post('/generate-timeline', async (req, res) => {
  try {
    const { modules, resources, projectContext } = req.body;
    
    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Modules array is required' 
      });
    }

    const timeline = timelineCalculator.calculateProjectTimeline(
      modules,
      resources || {},
      projectContext || {}
    );

    res.json({
      success: true,
      timeline: {
        startDate: timeline.startDate,
        endDate: timeline.endDate,
        recommendedEndDate: timeline.recommendedEndDate,
        totalDuration: timeline.totalDuration,
        workingDays: timeline.workingDays,
        calendarDays: timeline.calendarDays,
        buffer: timeline.buffer,
        phases: timeline.phases,
        milestones: timeline.milestones,
        criticalPath: timeline.criticalPath,
        risks: timeline.risks
      }
    });
  } catch (error) {
    console.error('[ERROR] Timeline generation failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Generate context-aware scenarios
 * POST /api/v2/intelligence/generate-scenarios
 */
router.post('/generate-scenarios', async (req, res) => {
  try {
    const { project, modules, resources } = req.body;
    
    if (!project || !modules || !Array.isArray(modules)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project and modules array are required' 
      });
    }

    // Create scenario generator (db/logger would be injected via middleware in full implementation)
    const scenarioGenerator = new ContextAwareScenarios(null, null);
    const scenarios = await scenarioGenerator.generateScenarios(
      project,
      modules,
      resources || {}
    );

    res.json({
      success: true,
      scenarios: {
        optimistic: scenarios.optimistic,
        realistic: scenarios.realistic,
        pessimistic: scenarios.pessimistic,
        recommended: scenarios.recommended,
        comparison: scenarios.comparison
      }
    });
  } catch (error) {
    console.error('[ERROR] Scenario generation failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Analyze scope with intelligence system
 * POST /api/v2/intelligence/analyze-scope/:projectId
 */
router.post('/analyze-scope/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // TODO: Get project modules from database
    // For now, expect modules in request body
    const { modules, projectContext } = req.body;
    
    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Modules array is required' 
      });
    }

    // Analyze each module
    const analyses = [];
    for (const module of modules) {
      const complexity = complexityAnalyzer.analyze(module, projectContext || {});
      const cost = await costCalculator.calculateModuleCost(module, projectContext || {});
      
      analyses.push({
        moduleId: module.id || module.name,
        complexity: {
          overall: complexity.overall,
          breakdown: complexity.breakdown
        },
        cost: {
          total: cost.cost.total,
          hours: cost.hours.adjusted,
          breakdown: cost.cost.breakdown
        },
        confidence: cost.confidence
      });
    }

    res.json({
      success: true,
      projectId,
      analyses,
      summary: {
        totalModules: analyses.length,
        averageComplexity: analyses.reduce((sum, a) => sum + a.complexity.overall, 0) / analyses.length,
        totalCost: analyses.reduce((sum, a) => sum + a.cost.total, 0),
        averageConfidence: analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
      }
    });
  } catch (error) {
    console.error('[ERROR] Scope analysis failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;

