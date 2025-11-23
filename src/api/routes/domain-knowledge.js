/**
 * Domain Knowledge Management Routes
 * 
 * Handles domain knowledge CRUD operations
 */

const express = require('express');
const router = express.Router();
const InputSanitizer = require('../../utils/input-sanitizer');

/**
 * Create domain knowledge routes
 * @param {Object} executor - ChainExecutor instance
 * @param {Object} db - Database instance
 * @param {Object} logger - Logger instance
 * @returns {Router} Express router
 */
function createDomainKnowledgeRoutes(executor, db, logger) {
  // Domain Knowledge endpoints
  const DomainKnowledgeManager = require('../../modules/domain-knowledge-manager');
  const domainKnowledgeManager = new DomainKnowledgeManager(logger);

  // GET /api/domain-knowledge - List all domain knowledge
  router.get('/domain-knowledge', (req, res, next) => {
    try {
      const list = domainKnowledgeManager.listDomainKnowledge();
      res.json({ success: true, domains: list });
    } catch (error) {
      logger.error('Failed to list domain knowledge', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'DOMAIN_KNOWLEDGE_LIST_ERROR';
      next(error);
    }
  });

  // GET /api/domain-knowledge/:domain - Get specific domain knowledge
  router.get('/domain-knowledge/:domain', (req, res, next) => {
    try {
      const { domain } = req.params;
      const knowledge = domainKnowledgeManager.getDomainKnowledge(domain);
      
      if (!knowledge) {
        return res.status(404).json({
          success: false,
          error: `Domain knowledge not found: ${domain}`
        });
      }
      
      res.json({ success: true, knowledge });
    } catch (error) {
      logger.error('Failed to get domain knowledge', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'DOMAIN_KNOWLEDGE_GET_ERROR';
      next(error);
    }
  });

  // POST /api/domain-knowledge - Save domain knowledge
  router.post('/domain-knowledge', (req, res, next) => {
    try {
      const domainKnowledge = req.body;
      
      if (!domainKnowledge.domain && !domainKnowledge.platformType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: domain or platformType'
        });
      }
      
      const result = domainKnowledgeManager.saveDomainKnowledge(domainKnowledge);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Failed to save domain knowledge', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'DOMAIN_KNOWLEDGE_SAVE_ERROR';
      next(error);
    }
  });

  // PUT /api/domain-knowledge/:domain/pattern/:patternName - Update specific pattern
  router.put('/domain-knowledge/:domain/pattern/:patternName', (req, res, next) => {
    try {
      // Sanitize parameters
      const domain = InputSanitizer.sanitizeString(req.params.domain, {
        allowNewlines: false,
        maxLength: 100
      });
      const patternName = InputSanitizer.sanitizeString(req.params.patternName, {
        allowNewlines: false,
        maxLength: 100
      });
      const patternData = req.body;
      
      const result = domainKnowledgeManager.updatePattern(domain, patternName, patternData);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Failed to update pattern', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'PATTERN_UPDATE_ERROR';
      next(error);
    }
  });

  // DELETE /api/domain-knowledge/:domain/pattern/:patternName - Delete specific pattern
  router.delete('/domain-knowledge/:domain/pattern/:patternName', (req, res, next) => {
    try {
      // Sanitize parameters
      const domain = InputSanitizer.sanitizeString(req.params.domain, {
        allowNewlines: false,
        maxLength: 100
      });
      const patternName = InputSanitizer.sanitizeString(req.params.patternName, {
        allowNewlines: false,
        maxLength: 100
      });
      
      const result = domainKnowledgeManager.deletePattern(domain, patternName);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Failed to delete pattern', { error: error.message });
      error.status = error.status || 500;
      error.code = error.code || 'PATTERN_DELETE_ERROR';
      next(error);
    }
  });

  return router;
}

module.exports = createDomainKnowledgeRoutes;

