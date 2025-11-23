// src/api/routes/conversation.js
// Conversation API routes for interactive requirement gathering

const express = require('express');
const router = express.Router();
const RequirementExtractor = require('../../modules/requirement-extractor');
const ConversationEngine = require('../../modules/conversation-engine');
const QuestionBank = require('../../modules/question-bank');

// Initialize conversation components
let conversationEngine = null;
let conversationSessions = new Map(); // In-memory session storage

function getConversationEngine() {
  if (!conversationEngine) {
    const logger = console;
    const questionBank = new QuestionBank(logger);
    const requirementExtractor = new RequirementExtractor(logger);
    conversationEngine = new ConversationEngine(logger, questionBank, requirementExtractor);
  }
  return conversationEngine;
}

/**
 * POST /api/v2/conversation/start
 * Start a new conversation session
 */
router.post('/start', async (req, res) => {
  try {
    const { projectName, clientIndustry, clientType } = req.body;
    
    const engine = getConversationEngine();
    engine.resetState();
    
    // Initialize with context if provided
    if (clientIndustry) {
      engine.state.requirements.domain = clientIndustry;
    }
    
    // Generate session ID
    const sessionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store session
    conversationSessions.set(sessionId, {
      id: sessionId,
      state: engine.getState(),
      projectName: projectName || null,
      clientIndustry: clientIndustry || null,
      clientType: clientType || null,
      createdAt: new Date().toISOString()
    });
    
    // Get initial question
    const next = engine.getNextInteraction();
    const initialMessage = `Hi! I'm here to help you scope your project. ${next.question || "What type of application are you building?"}`;
    
    // Add initial bot message to state
    engine.state.conversation.push({
      role: 'bot',
      content: initialMessage,
      timestamp: new Date().toISOString()
    });
    
    // Update session
    conversationSessions.set(sessionId, {
      ...conversationSessions.get(sessionId),
      state: engine.getState()
    });
    
    res.json({
      success: true,
      sessionId,
      message: initialMessage,
      suggestions: next.suggestions || [],
      completeness: 0,
      stage: 'discovery'
    });
  } catch (error) {
    console.error('[ERROR] Conversation start failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'CONVERSATION_START_ERROR'
    });
  }
});

/**
 * POST /api/v2/conversation/process
 * Process user message and get bot response
 */
router.post('/process', async (req, res) => {
  try {
    const { sessionId, message, context } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and message are required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Get session
    const session = conversationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Conversation session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }
    
    // Get conversation engine
    const engine = getConversationEngine();
    engine.setState(session.state);
    
    // Process user input
    const result = await engine.processInput(message, session.state);
    
    // Update session
    conversationSessions.set(sessionId, {
      ...session,
      state: result.state,
      lastActivity: new Date().toISOString()
    });
    
    // Extract requirements text if conversation is complete enough
    let extractedRequirements = null;
    if (result.completeness >= 60) {
      extractedRequirements = formatRequirementsForTextarea(result.requirements);
    }
    
    res.json({
      success: true,
      message: result.botResponse,
      suggestions: result.suggestions || [],
      completeness: result.completeness,
      stage: result.stage,
      stageName: result.stageName,
      canGenerate: result.canGenerate,
      preview: result.preview,
      extractedRequirements,
      requirements: result.requirements
    });
  } catch (error) {
    console.error('[ERROR] Conversation processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'CONVERSATION_PROCESS_ERROR'
    });
  }
});

/**
 * POST /api/v2/conversation/extract
 * Extract final requirements from conversation
 */
router.post('/extract', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Get session
    const session = conversationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Conversation session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }
    
    // Format requirements for RequirementParser
    const requirements = formatRequirementsForParser(session.state.requirements);
    
    res.json({
      success: true,
      requirements,
      completeness: session.state.completeness
    });
  } catch (error) {
    console.error('[ERROR] Requirement extraction failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXTRACTION_ERROR'
    });
  }
});

/**
 * Format requirements for textarea display
 */
function formatRequirementsForTextarea(requirements) {
  const lines = [];
  
  if (requirements.domain) {
    lines.push(`${requirements.domain.charAt(0).toUpperCase() + requirements.domain.slice(1)} Platform Requirements:`);
    lines.push('');
  }
  
  if (requirements.features && requirements.features.length > 0) {
    requirements.features.forEach(feature => {
      lines.push(`- ${feature}`);
    });
  }
  
  if (requirements.integrations && requirements.integrations.length > 0) {
    lines.push('');
    lines.push('Integrations:');
    requirements.integrations.forEach(integration => {
      lines.push(`- ${integration}`);
    });
  }
  
  if (requirements.technical && Object.keys(requirements.technical).length > 0) {
    lines.push('');
    lines.push('Technical Requirements:');
    Object.entries(requirements.technical).forEach(([key, value]) => {
      lines.push(`- ${key}: ${value}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Format requirements for RequirementParser
 */
function formatRequirementsForParser(requirements) {
  // Convert conversation requirements to text format for RequirementParser
  const parts = [];
  
  if (requirements.domain) {
    parts.push(`${requirements.domain} platform`);
  }
  
  if (requirements.features && requirements.features.length > 0) {
    parts.push(`Features: ${requirements.features.join(', ')}`);
  }
  
  if (requirements.integrations && requirements.integrations.length > 0) {
    parts.push(`Integrations: ${requirements.integrations.join(', ')}`);
  }
  
  if (requirements.scale) {
    parts.push(`Scale: ${requirements.scale}`);
  }
  
  if (requirements.budget) {
    parts.push(`Budget: ${requirements.budget}`);
  }
  
  if (requirements.timeline) {
    parts.push(`Timeline: ${requirements.timeline}`);
  }
  
  if (requirements.users) {
    parts.push(`Expected users: ${requirements.users}`);
  }
  
  return parts.join('. ');
}

module.exports = router;

