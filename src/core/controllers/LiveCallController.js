/**
 * Live Call Controller
 * 
 * Handles live call processing and quick estimation
 * Part of Precision Pivot system
 */

class LiveCallController {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
        this.requirementParser = require('../extraction/RequirementParser');
        this.chainOptimizer = require('../optimization/ChainResultOptimizer');
    }

    /**
     * Process live call transcript
     */
    async processTranscript(transcript, mode = 'live_call', options = {}) {
        try {
            this.logger.info('Processing live call transcript', { mode });
            
            // Quick parsing
            const RequirementParser = require('../extraction/RequirementParser');
            const parser = new RequirementParser(this.logger);
            
            const quickAnalysis = await parser.parseRequirement(transcript, 'text', {
                quick: true // Fast mode for live calls
            });
            
            // Generate quick estimate
            const estimate = await this.generateQuickEstimate(quickAnalysis);
            
            // Save as draft project
            const projectId = await this.saveDraftProject({
                source: 'live_call',
                transcript: transcript,
                quickAnalysis: quickAnalysis,
                quickEstimate: estimate,
                status: 'draft',
                mode: mode
            });
            
            // Generate suggested questions
            const suggestedQuestions = await this.generateSuggestedQuestions(quickAnalysis);
            
            // Determine next actions
            const nextActions = this.generateNextActions(projectId, estimate);
            
            return {
                projectId: projectId,
                estimate: estimate,
                confidence: estimate.confidence,
                suggestedQuestions: suggestedQuestions,
                nextActions: nextActions
            };
        } catch (error) {
            this.logger.error('Live call processing failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Generate quick estimate from analysis
     */
    async generateQuickEstimate(analysis) {
        const features = analysis.features || [];
        const totalHours = features.reduce((sum, f) => {
            return sum + (f.estimatedHours || f.estimated_hours || 0);
        }, 0);
        
        // Rough timeline (assuming 6 hours per day, 5 days per week)
        const weeks = Math.ceil(totalHours / (6 * 5));
        
        // Rough cost (assuming ₹85/hour average)
        const hourlyRate = 85;
        const baseCost = totalHours * hourlyRate;
        
        // Add GST if required
        const gstAmount = analysis.requiresGST ? baseCost * 0.18 : 0;
        const totalCost = baseCost + gstAmount;
        
        return {
            timeline: {
                weeks: weeks,
                range: `${weeks}-${weeks + 2} weeks`
            },
            cost: {
                base: Math.round(baseCost),
                gst: Math.round(gstAmount),
                total: Math.round(totalCost),
                formatted: this.formatCost(totalCost)
            },
            features: features.length,
            confidence: analysis.confidence || 0.75,
            completeness: this.calculateCompleteness(analysis)
        };
    }

    /**
     * Generate suggested questions
     */
    async generateSuggestedQuestions(analysis) {
        const questions = [];
        
        // Questions based on missing information
        if (!analysis.timeline) {
            questions.push('What is your target timeline for this project?');
        }
        
        if (!analysis.budget) {
            questions.push('What is your budget range for this project?');
        }
        
        if (analysis.requiresGST && !analysis.paymentGateway) {
            questions.push('Which payment gateway would you prefer? (Razorpay, Paytm, Stripe)');
        }
        
        if (analysis.features.length < 5) {
            questions.push('Are there any other features or requirements you\'d like to include?');
        }
        
        // Industry-specific questions
        if (analysis.industry === 'ecommerce') {
            questions.push('How many products do you expect to have in your catalog?');
        }
        
        if (analysis.industry === 'fintech') {
            questions.push('Do you need compliance certifications? (PCI-DSS, etc.)');
        }
        
        return questions.slice(0, 5); // Return top 5 questions
    }

    /**
     * Generate next actions
     */
    generateNextActions(projectId, estimate) {
        return [
            {
                label: 'Generate Full Scope',
                action: 'POST',
                endpoint: `/api/v2/progressive/generate/${projectId}`,
                estimatedTime: '30 seconds',
                description: 'Generate complete scope with all details'
            },
            {
                label: 'Generate Progressive Documentation',
                action: 'POST',
                endpoint: `/api/v2/live-call/to-progressive/${projectId}`,
                estimatedTime: '2 minutes',
                description: 'Generate hierarchical documentation (L1-L5)'
            },
            {
                label: 'Detailed Analysis',
                action: 'GET',
                endpoint: `/api/v2/detailed/${projectId}`,
                estimatedTime: '2 minutes',
                description: 'View comprehensive analysis with function-level breakdown'
            }
        ];
    }

    /**
     * Transition from LiveCall to Progressive systems
     */
    async transitionToProgressive(projectId, level = 'L1', system = 'output') {
        try {
            // Get project
            const project = this.db.prepare('SELECT * FROM projects WHERE id = ? OR project_code = ?')
                .get(projectId, projectId);
            
            if (!project) {
                throw new Error('Project not found');
            }
            
            // Get or generate chain result
            const ChainResultOptimizer = require('../optimization/ChainResultOptimizer');
            const optimizer = new ChainResultOptimizer(this.logger, this.db);
            
            const requirements = {
                input: project.input || project.transcript || '',
                inputType: 'text'
            };
            
            const chainResult = await optimizer.getOptimizedChainResult(
                projectId,
                requirements,
                { enhance: true }
            );
            
            // Generate progressive output/docs based on system
            if (system === 'output') {
                const InternalAnalysisEngine = require('../../modules/internal-analysis-engine');
                const engine = new InternalAnalysisEngine(this.logger);
                const analysis = await engine.generateCompleteAnalysis(chainResult);
                
                const OutputDeliveryController = require('../../modules/output-delivery-controller');
                const controller = new OutputDeliveryController(this.logger);
                const progressiveOutput = await controller.deliverOutput(projectId, level);
                
                return {
                    progressiveOutput: progressiveOutput,
                    availableLevels: ['L1_DISCOVERY', 'L2_PLANNING', 'L3_ARCHITECTURE', 'L4_IMPLEMENTATION', 'L5_COMPLETE'],
                    canSwitchTo: ['progressive_docs', 'detailed_analysis']
                };
            } else {
                // Progressive Documentation
                const LevelGenerator = require('../../modules/level-generator');
                const generator = new LevelGenerator(this.logger);
                
                const lockedScope = project.locked_scope ? 
                    JSON.parse(project.locked_scope) : 
                    { modules: chainResult.refined?.scope?.modules || [] };
                
                const levelNumber = parseInt(level.replace('L', ''));
                const levelData = await generator.generateLevel(
                    levelNumber,
                    lockedScope,
                    [],
                    chainResult
                );
                
                return {
                    progressiveOutput: levelData,
                    availableLevels: [1, 2, 3, 4, 5],
                    canSwitchTo: ['progressive_output', 'detailed_analysis']
                };
            }
        } catch (error) {
            this.logger.error('Progressive transition failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get quick estimate for project
     */
    async getQuickEstimate(projectId) {
        const project = this.db.prepare('SELECT * FROM projects WHERE id = ? OR project_code = ?')
            .get(projectId, projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }
        
        if (project.quickEstimate) {
            return JSON.parse(project.quickEstimate);
        }
        
        // Generate from chain result if available
        if (project.chain_result) {
            const chainResult = JSON.parse(project.chain_result);
            const analysis = {
                features: chainResult.features || [],
                requiresGST: chainResult.indianContext?.requiresGST || false,
                confidence: chainResult.confidence || 0.8
            };
            
            return await this.generateQuickEstimate(analysis);
        }
        
        throw new Error('No estimate available');
    }

    /**
     * Save draft project
     */
    async saveDraftProject(data) {
        const projectId = data.projectId || this.generateProjectId();
        
        const insert = this.db.prepare(`
            INSERT INTO projects (
                id, project_name, input, status, 
                quick_estimate, created_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                input = excluded.input,
                quick_estimate = excluded.quick_estimate,
                updated_at = CURRENT_TIMESTAMP
        `);
        
        insert.run(
            projectId,
            data.projectName || 'Live Call Project',
            data.transcript || '',
            'draft',
            JSON.stringify(data.quickEstimate || {})
        );
        
        return projectId;
    }

    /**
     * Calculate completeness score
     */
    calculateCompleteness(analysis) {
        let score = 0;
        
        if (analysis.features && analysis.features.length > 0) score += 30;
        if (analysis.timeline) score += 20;
        if (analysis.budget) score += 20;
        if (analysis.industry) score += 15;
        if (analysis.requiresGST !== undefined) score += 15;
        
        return Math.min(100, score);
    }

    /**
     * Format cost
     */
    formatCost(cost) {
        if (cost >= 10000000) return `₹${(cost / 10000000).toFixed(1)}Cr`;
        if (cost >= 100000) return `₹${(cost / 100000).toFixed(1)}L`;
        if (cost >= 1000) return `₹${(cost / 1000).toFixed(1)}K`;
        return `₹${Math.round(cost).toLocaleString('en-IN')}`;
    }

    /**
     * Generate project ID
     */
    generateProjectId() {
        return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = LiveCallController;

