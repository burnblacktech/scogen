/**
 * Requirement Parser - Enhanced with Indian Context
 * 
 * Parses requirements with function-level breakdown and Indian market awareness
 * Part of Precision Pivot system
 */

/**
 * Indian Context Analyzer - Analyzes Indian market-specific requirements
 */
class IndianContextAnalyzer {
    analyze(input) {
        const text = typeof input === 'string' ? input : JSON.stringify(input);
        const lowerText = text.toLowerCase();
        
        return {
            hasGSTKeywords: this.hasGSTKeywords(lowerText),
            hasComplianceNeeds: this.hasComplianceNeeds(lowerText),
            suggestedGateway: this.suggestPaymentGateway(lowerText),
            requiresAadhaar: lowerText.includes('aadhaar') || lowerText.includes('aadhar'),
            requiresPAN: lowerText.includes('pan') && lowerText.includes('card'),
            requiresBankAccount: lowerText.includes('bank') || lowerText.includes('account')
        };
    }

    hasGSTKeywords(text) {
        const gstKeywords = ['gst', 'tax', 'invoice', 'billing', 'compliance', 'ca', 'chartered accountant'];
        return gstKeywords.some(keyword => text.includes(keyword));
    }

    hasComplianceNeeds(text) {
        const complianceKeywords = ['compliance', 'legal', 'audit', 'regulatory', 'gdpr', 'data protection'];
        return complianceKeywords.some(keyword => text.includes(keyword));
    }

    suggestPaymentGateway(text) {
        if (text.includes('razorpay') || text.includes('razor')) return 'razorpay';
        if (text.includes('paytm')) return 'paytm';
        if (text.includes('stripe')) return 'stripe';
        if (text.includes('payu')) return 'payu';
        // Default for Indian market
        return 'razorpay';
    }
}

class RequirementParser {
    constructor(logger) {
        this.logger = logger || console;
        this.industryPatterns = this.loadIndustryPatterns();
        this.indianContext = new IndianContextAnalyzer();
    }

    /**
     * Parse requirement input with Indian context awareness
     * @param {string|Object} input - User input (text, PDF text, or structured)
     * @param {string} mode - Input mode: 'text', 'pdf', 'excel', 'structured'
     * @param {Object} options - Additional options
     * @returns {Object} Parsed requirements with features and functions
     */
    async parseRequirement(input, mode = 'text', options = {}) {
        try {
            // Extract base requirements
            const baseRequirements = await this.extractBaseRequirements(input, mode);
            
            // Identify Indian-specific needs
            const indianNeeds = this.indianContext.analyze(input);
            
            // Detect industry
            const industry = this.detectIndustry(baseRequirements);
            
            // Extract features with function breakdown
            const features = await this.extractFeatures(baseRequirements, indianNeeds, industry);
            
            // Structure output
            const result = {
                projectType: this.identifyProjectType(baseRequirements),
                industry: industry,
                features: features,
                
                // Indian specific
                requiresGST: indianNeeds.hasGSTKeywords,
                requiresCompliance: indianNeeds.hasComplianceNeeds,
                paymentGateway: indianNeeds.suggestedGateway, // 'razorpay', 'paytm', 'stripe'
                
                // Constraints
                timeline: this.extractTimeline(input),
                budget: this.extractBudget(input),
                teamSize: this.extractTeamSize(input),
                
                // Similar projects for learning
                similarProjects: await this.findSimilarProjects(baseRequirements, industry),
                
                // Metadata
                parsedAt: new Date().toISOString(),
                confidence: this.calculateParsingConfidence(baseRequirements, features)
            };
            
            this.logger.info('Requirement parsing completed', {
                featureCount: features.length,
                requiresGST: result.requiresGST,
                industry: industry
            });
            
            return result;
        } catch (error) {
            this.logger.error('Requirement parsing failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Extract base requirements from input
     */
    async extractBaseRequirements(input, mode) {
        if (typeof input === 'string') {
            return this.parseTextInput(input);
        } else if (input && typeof input === 'object') {
            return this.parseStructuredInput(input);
        }
        throw new Error('Invalid input format');
    }

    /**
     * Parse text input using NLP patterns
     */
    parseTextInput(text) {
        const requirements = [];
        
        // Simple pattern matching (can be enhanced with NLP library)
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        sentences.forEach(sentence => {
            const trimmed = sentence.trim();
            
            // Detect requirement patterns
            if (this.isRequirement(trimmed)) {
                requirements.push({
                    text: trimmed,
                    type: this.classifyRequirement(trimmed),
                    priority: this.detectPriority(trimmed)
                });
            }
        });
        
        return requirements;
    }

    /**
     * Parse structured input (from conversation, forms, etc.)
     */
    parseStructuredInput(input) {
        const requirements = [];
        
        if (input.modules) {
            input.modules.forEach(module => {
                requirements.push({
                    text: module.name || module.description,
                    type: module.category || 'general',
                    priority: module.priority || 'medium'
                });
            });
        }
        
        return requirements;
    }

    /**
     * Extract features with function-level breakdown
     */
    async extractFeatures(baseRequirements, indianNeeds, industry) {
        const features = [];
        
        for (const req of baseRequirements) {
            const feature = {
                name: this.extractFeatureName(req),
                category: this.categorizeFeature(req),
                description: req.text,
                acceptanceCriteria: this.generateAcceptanceCriteria(req),
                
                // Function breakdown
                functions: this.breakdownToFunctions(req, indianNeeds),
                
                // Estimation seeds
                estimatedComplexity: this.estimateComplexity(req),
                hasIndianCompliance: this.checkIndianCompliance(req, indianNeeds),
                
                // Dependencies
                dependencies: this.identifyDependencies(req, baseRequirements),
                
                // Industry context
                industryPattern: this.matchIndustryPattern(req, industry)
            };
            
            features.push(feature);
        }
        
        return features;
    }

    /**
     * Break down requirement to function level
     */
    breakdownToFunctions(requirement, indianNeeds) {
        const functions = [];
        const category = this.categorizeFeature(requirement);
        
        // Pattern-based function extraction
        const functionPatterns = this.getFunctionPatterns(category);
        
        functionPatterns.forEach(pattern => {
            const func = {
                name: pattern.name,
                description: pattern.description || `${pattern.name} for ${requirement.text}`,
                estimatedHours: pattern.baseHours,
                complexity: pattern.complexity || 'medium',
                category: category,
                parameters: pattern.parameters || [],
                returnType: pattern.returnType || 'Object',
                requiresTransaction: pattern.requiresTransaction || false,
                involvesPayment: pattern.involvesPayment || false
            };
            
            // Add Indian-specific functions
            if (indianNeeds.hasGSTKeywords && pattern.involvesPayment) {
                func.includesGSTLogic = true;
                func.estimatedHours += 2; // Extra time for GST
            }
            
            if (indianNeeds.hasComplianceNeeds && pattern.requiresCompliance) {
                func.includesCompliance = true;
                func.estimatedHours += 3; // Extra time for compliance
            }
            
            functions.push(func);
        });
        
        return functions;
    }

    /**
     * Get function patterns for a category
     */
    getFunctionPatterns(category) {
        const patterns = {
            'authentication': [
                { name: 'validateCredentials', baseHours: 2, complexity: 'low' },
                { name: 'generateSession', baseHours: 1, complexity: 'low' },
                { name: 'handlePasswordReset', baseHours: 3, complexity: 'medium' },
                { name: 'implement2FA', baseHours: 4, complexity: 'high' },
                { name: 'logUserActivity', baseHours: 1, complexity: 'low' }
            ],
            'payment': [
                { name: 'processPayment', baseHours: 4, complexity: 'high', involvesPayment: true, requiresTransaction: true },
                { name: 'validatePaymentMethod', baseHours: 2, complexity: 'medium' },
                { name: 'handleRefund', baseHours: 3, complexity: 'high', involvesPayment: true, requiresTransaction: true },
                { name: 'generateInvoice', baseHours: 2, complexity: 'medium', involvesPayment: true },
                { name: 'sendPaymentNotification', baseHours: 1, complexity: 'low' }
            ],
            'inventory': [
                { name: 'addInventory', baseHours: 2, complexity: 'low', requiresTransaction: true },
                { name: 'updateInventory', baseHours: 2, complexity: 'low', requiresTransaction: true },
                { name: 'checkStock', baseHours: 1, complexity: 'low' },
                { name: 'generateStockReport', baseHours: 3, complexity: 'medium' },
                { name: 'handleLowStockAlert', baseHours: 2, complexity: 'medium' }
            ],
            'reporting': [
                { name: 'generateReport', baseHours: 4, complexity: 'high' },
                { name: 'exportReport', baseHours: 2, complexity: 'medium' },
                { name: 'scheduleReport', baseHours: 3, complexity: 'medium' },
                { name: 'filterReportData', baseHours: 2, complexity: 'medium' }
            ]
        };
        
        return patterns[category] || [
            { name: 'processRequest', baseHours: 2, complexity: 'medium' },
            { name: 'validateInput', baseHours: 1, complexity: 'low' },
            { name: 'saveData', baseHours: 2, complexity: 'medium', requiresTransaction: true },
            { name: 'returnResponse', baseHours: 1, complexity: 'low' }
        ];
    }

    // Helper methods
    isRequirement(text) {
        const requirementKeywords = ['need', 'want', 'require', 'must', 'should', 'feature', 'function'];
        return requirementKeywords.some(keyword => text.toLowerCase().includes(keyword)) || 
               text.length > 20; // Assume longer sentences are requirements
    }

    classifyRequirement(text) {
        const lower = text.toLowerCase();
        if (lower.includes('login') || lower.includes('auth')) return 'authentication';
        if (lower.includes('payment') || lower.includes('pay')) return 'payment';
        if (lower.includes('inventory') || lower.includes('stock')) return 'inventory';
        if (lower.includes('report') || lower.includes('analytics')) return 'reporting';
        return 'general';
    }

    detectPriority(text) {
        const lower = text.toLowerCase();
        if (lower.includes('must') || lower.includes('critical')) return 'high';
        if (lower.includes('should') || lower.includes('important')) return 'medium';
        return 'low';
    }

    extractFeatureName(requirement) {
        // Extract feature name from requirement text
        const words = requirement.text.split(' ');
        const nameWords = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1));
        return nameWords.join(' ').replace(/[.!?]/g, '');
    }

    categorizeFeature(requirement) {
        return requirement.type || this.classifyRequirement(requirement.text);
    }

    generateAcceptanceCriteria(requirement) {
        return [
            `${requirement.text} is implemented`,
            `User can access ${requirement.text}`,
            `System validates ${requirement.text}`
        ];
    }

    estimateComplexity(requirement) {
        const lower = requirement.text.toLowerCase();
        if (lower.includes('complex') || lower.includes('advanced')) return 5;
        if (lower.includes('simple') || lower.includes('basic')) return 1;
        return 3; // Default medium
    }

    checkIndianCompliance(requirement, indianNeeds) {
        return indianNeeds.hasGSTKeywords || indianNeeds.hasComplianceNeeds;
    }

    identifyDependencies(req, allRequirements) {
        // Simple dependency detection (can be enhanced)
        const dependencies = [];
        const reqText = req.text.toLowerCase();
        
        allRequirements.forEach(otherReq => {
            if (otherReq === req) return;
            const otherText = otherReq.text.toLowerCase();
            
            // If requirement mentions another requirement, it's a dependency
            if (reqText.includes(otherText.split(' ')[0])) {
                dependencies.push(otherReq.text);
            }
        });
        
        return dependencies;
    }

    detectIndustry(requirements) {
        const allText = requirements.map(r => r.text).join(' ').toLowerCase();
        
        if (allText.includes('ecommerce') || allText.includes('shop')) return 'ecommerce';
        if (allText.includes('fintech') || allText.includes('finance')) return 'fintech';
        if (allText.includes('healthcare') || allText.includes('hospital')) return 'healthcare';
        if (allText.includes('hrms') || allText.includes('hr')) return 'hrms';
        if (allText.includes('erp')) return 'erp';
        
        return 'general';
    }

    identifyProjectType(requirements) {
        const allText = requirements.map(r => r.text).join(' ').toLowerCase();
        
        if (allText.includes('mobile') || allText.includes('app')) return 'Mobile App';
        if (allText.includes('web') || allText.includes('website')) return 'Web Application';
        if (allText.includes('api') || allText.includes('backend')) return 'API/Backend';
        
        return 'Software Development';
    }

    extractTimeline(input) {
        const text = typeof input === 'string' ? input : JSON.stringify(input);
        const timelineMatch = text.match(/(\d+)\s*(week|month|day)/i);
        return timelineMatch ? timelineMatch[0] : null;
    }

    extractBudget(input) {
        const text = typeof input === 'string' ? input : JSON.stringify(input);
        const budgetMatch = text.match(/₹?\s*(\d+)\s*(lakh|lac|cr|crore|k|thousand)/i);
        return budgetMatch ? budgetMatch[0] : null;
    }

    extractTeamSize(input) {
        const text = typeof input === 'string' ? input : JSON.stringify(input);
        const teamMatch = text.match(/(\d+)\s*(developer|team|member)/i);
        return teamMatch ? parseInt(teamMatch[1]) : null;
    }

    async findSimilarProjects(requirements, industry) {
        // Placeholder - would query database for similar projects
        return [];
    }

    calculateParsingConfidence(requirements, features) {
        if (requirements.length === 0) return 0.0;
        if (features.length === 0) return 0.0;
        
        // Higher confidence if we extracted functions
        const avgFunctionsPerFeature = features.reduce((sum, f) => sum + f.functions.length, 0) / features.length;
        const baseConfidence = Math.min(0.9, 0.5 + (avgFunctionsPerFeature / 10));
        
        return Math.round(baseConfidence * 100) / 100;
    }

    loadIndustryPatterns() {
        // Load industry-specific patterns (can be from database or config)
        return {
            ecommerce: ['payment', 'inventory', 'shipping', 'catalog'],
            fintech: ['payment', 'compliance', 'security', 'reporting'],
            healthcare: ['compliance', 'security', 'reporting', 'scheduling']
        };
    }

    matchIndustryPattern(requirement, industry) {
        const patterns = this.industryPatterns[industry] || [];
        return patterns.find(pattern => requirement.text.toLowerCase().includes(pattern));
    }
}

// Export both classes
RequirementParser.IndianContextAnalyzer = IndianContextAnalyzer;
module.exports = RequirementParser;
module.exports.IndianContextAnalyzer = IndianContextAnalyzer;

