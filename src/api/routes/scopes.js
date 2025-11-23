/**
 * Scope Management Routes
 * 
 * Handles scope CRUD operations, reviews, cost proposals, and specs generation
 */

const express = require('express');
const router = express.Router();
const InputSanitizer = require('../../utils/input-sanitizer');

/**
 * Create scope routes
 * @param {Object} executor - ChainExecutor instance
 * @param {Object} db - Database instance
 * @param {Object} logger - Logger instance
 * @returns {Router} Express router
 */
function createScopeRoutes(executor, db, logger) {
  // Get scope history
  router.get('/scopes', async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 20;

      // Get scopes from database using getRecentScopes method
      const scopes = db.getRecentScopes ? db.getRecentScopes(limit) : [];

      res.json({
        success: true,
        scopes: scopes.map(scope => ({
          id: scope.id,
          input: scope.input_raw || scope.input,
          industry: scope.industry,
          useCase: scope.use_case,
          persona: scope.persona,
          estimatedDays: scope.estimated_days,
          estimatedCost: scope.estimated_cost,
          confidence: scope.confidence,
          createdAt: scope.created_at || scope.createdAt,
          status: scope.status
        })),
        limit
      });
    } catch (error) {
      next(error);
    }
  });

  // Get specific scope
  router.get('/scopes/:id', async (req, res, next) => {
    try {
      const { id } = req.params;

      const scope = db.getScopeById ? db.getScopeById(id) : null;

      if (!scope) {
        return res.status(404).json({
          error: 'Scope not found',
          message: `No scope found with ID: ${id}`
        });
      }

      res.json({
        success: true,
        scope: {
          id: scope.id,
          input: scope.input_raw,
          industry: scope.industry,
          useCase: scope.use_case,
          persona: scope.persona,
          estimatedDays: scope.estimated_days,
          estimatedCost: scope.estimated_cost,
          confidence: scope.confidence,
          modules: scope.modules,
          risks: scope.risks,
          plan: scope.plan,
          outputFull: scope.output_full,
          createdAt: scope.created_at,
          status: scope.status
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Get review for existing scope
  router.get('/scopes/:id/review', async (req, res, next) => {
    try {
      const { id } = req.params;

      const scope = db.getScopeById ? db.getScopeById(id) : null;

      if (!scope) {
        return res.status(404).json({
          error: 'Scope not found',
          message: `No scope found with ID: ${id}`
        });
      }

      // Parse stored scope data
      const plan = scope.plan ? JSON.parse(scope.plan) : {};
      const modules = scope.modules ? JSON.parse(scope.modules) : [];
      const estimate = {
        timeline: { days: scope.estimated_days || 0 },
        cost: { total: scope.estimated_cost || 0 }
      };
      const domainContext = {
        industry: scope.industry || 'generic',
        useCase: scope.use_case || 'application'
      };
      const refinedScope = { refinedScope: { modules } };

      // Generate review
      const ScopeReviewer = require('../../modules/scope-reviewer');
      const reviewer = new ScopeReviewer(executor.library, db, logger);

      const review = await reviewer.reviewScope(refinedScope.refinedScope, estimate, domainContext);

      res.json({
        success: true,
        review: review,
        scope: {
          id: scope.id,
          input: scope.input_raw,
          industry: scope.industry,
          useCase: scope.use_case
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Generate cost proposal for existing scope
  router.post('/scopes/:id/cost-proposal', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rateTier = 'avg', includeOverhead = true } = req.body;

      const scope = db.getScopeById ? db.getScopeById(id) : null;

      if (!scope) {
        return res.status(404).json({
          error: 'Scope not found',
          message: `No scope found with ID: ${id}`
        });
      }

      // Parse stored scope data
      const plan = scope.plan ? JSON.parse(scope.plan) : {};
      const modules = scope.modules ? JSON.parse(scope.modules) : [];
      const estimate = {
        timeline: { days: scope.estimated_days || 0 },
        cost: { total: scope.estimated_cost || 0 }
      };
      const refinedScope = { refinedScope: { modules } };

      // Generate cost proposal
      const CostProposalGenerator = require('../../modules/cost-proposal');
      const proposalGen = new CostProposalGenerator(logger, executor.config || require('../../utils/config-manager'));

      const proposal = proposalGen.generateProposal(refinedScope, estimate, {
        rateTier,
        includeOverhead
      });

      const markdown = proposalGen.formatProposalMarkdown(proposal, scope.use_case || 'Project');

      res.json({
        success: true,
        proposal: proposal,
        markdown: markdown
      });
    } catch (error) {
      next(error);
    }
  });

  // Generate specs for existing scope
  router.post('/scopes/:id/specs', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { level = 'standard' } = req.body;

      const scope = db.getScopeById ? db.getScopeById(id) : null;

      if (!scope) {
        return res.status(404).json({
          error: 'Scope not found',
          message: `No scope found with ID: ${id}`
        });
      }

      // Parse stored scope data
      const plan = scope.plan ? JSON.parse(scope.plan) : {};
      const modules = scope.modules ? JSON.parse(scope.modules) : [];
      const domainContext = {
        industry: scope.industry || 'generic',
        useCase: scope.use_case || 'application'
      };

      // Generate specs
      const SpecGenerator = require('../../modules/specs/spec-generator');
      // Access library from executor (it's stored in ChainExecutor constructor)
      const library = executor.library;
      if (!library) {
        return res.status(500).json({
          error: 'Library not available',
          message: 'Cannot generate specs without library instance'
        });
      }
      const specGenerator = new SpecGenerator(library, logger);

      const specs = await specGenerator.generate(plan, modules, domainContext, level);

      if (!specs) {
        return res.status(500).json({
          error: 'Spec generation failed',
          message: 'Failed to generate technical specifications'
        });
      }

      res.json({
        success: true,
        specs: {
          outputDir: specs.outputDir,
          filesWritten: specs.filesWritten
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Delete scope
  router.delete('/scopes/:id', async (req, res, next) => {
    try {
      const { id } = req.params;

      // Database doesn't have delete method yet, return not implemented
      res.status(501).json({
        error: 'Not implemented',
        message: 'Delete functionality not available in current version'
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createScopeRoutes;

