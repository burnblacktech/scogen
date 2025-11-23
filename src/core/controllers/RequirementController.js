/**
 * Requirement Controller
 * 
 * Handles requirement parsing and feature extraction
 * Part of Precision Pivot system
 */

class RequirementController {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
    }

    async parse(input, inputType = 'text', options = {}) {
        const RequirementParser = require('../extraction/RequirementParser');
        const parser = new RequirementParser(this.logger);
        
        return await parser.parseRequirement(input, inputType, options);
    }

    async extractFeatures(requirements, projectContext = {}) {
        const RequirementParser = require('../extraction/RequirementParser');
        const parser = new RequirementParser(this.logger);
        
        const parsed = await parser.parseRequirement(requirements, 'structured');
        
        return {
            features: parsed.features,
            functionBreakdown: parsed.features.reduce((sum, f) => sum + f.functions.length, 0),
            confidence: parsed.confidence
        };
    }

    async processVoice(transcript, language = 'en-IN') {
        // Process voice transcript
        const RequirementParser = require('../extraction/RequirementParser');
        const parser = new RequirementParser(this.logger);
        
        const parsed = await parser.parseRequirement(transcript, 'text');
        
        // Generate quick estimate
        const totalHours = parsed.features.reduce((sum, f) => 
            sum + (f.functions.reduce((s, func) => s + (func.estimatedHours || 0), 0)), 0
        );
        
        return {
            parsed: parsed,
            quickEstimate: {
                hours: totalHours,
                weeks: Math.ceil(totalHours / 30),
                confidence: parsed.confidence
            },
            suggestedQuestions: this.generateQuestions(parsed)
        };
    }

    generateQuestions(parsed) {
        const questions = [];
        if (!parsed.timeline) questions.push('What is your target timeline?');
        if (!parsed.budget) questions.push('What is your budget range?');
        return questions;
    }
}

module.exports = RequirementController;

