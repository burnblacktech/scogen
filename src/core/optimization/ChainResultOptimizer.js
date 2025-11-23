/**
 * Chain Result Optimizer
 * 
 * Caches and enhances chain results with function-level data
 * Enables reuse across Progressive Output and Progressive Documentation systems
 * Part of Precision Pivot system
 */

const crypto = require('crypto');

class ChainResultOptimizer {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
        this.cache = new Map(); // In-memory cache (can be replaced with Redis)
        this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Get optimized chain result (cached or generate new)
     * @param {string} projectId - Project ID
     * @param {Object} requirements - Requirements for generation
     * @param {Object} options - Options for enhancement
     * @returns {Object} Enhanced chain result with function-level data
     */
    async getOptimizedChainResult(projectId, requirements, options = {}) {
        try {
            // Check cache first
            const cacheKey = `chain:${projectId}`;
            let chainResult = await this.getFromCache(cacheKey);
            
            if (!chainResult) {
                // Check database
                chainResult = await this.getFromDatabase(projectId);
            }
            
            if (!chainResult || options.forceRegenerate) {
                // Generate new chain result with enhancements
                chainResult = await this.generateEnhancedChain(requirements, projectId, options);
                
                // Cache and store
                await this.setCache(cacheKey, chainResult);
                await this.saveToDatabase(projectId, chainResult);
            } else {
                // Check if enhancement needed
                if (!chainResult.hasFunctionLevel && options.enhance) {
                    chainResult = await this.enhanceWithFunctions(chainResult, requirements);
                    await this.setCache(cacheKey, chainResult);
                    await this.saveToDatabase(projectId, chainResult);
                }
            }
            
            return chainResult;
        } catch (error) {
            this.logger.error('Chain result optimization failed', {
                projectId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate enhanced chain result
     */
    async generateEnhancedChain(requirements, projectId, options = {}) {
        this.logger.info('Generating enhanced chain result', { projectId });
        
        // Run existing chain executor
        const ChainExecutor = require('../../modules/chain-executor');
        const executor = new ChainExecutor(/* config, logger, db */);
        
        // Execute chain
        const baseChain = await executor.execute(requirements, {
            mode: options.mode || 'express',
            enableProgressiveOutput: true
        });
        
        // Enhance with new precision features
        const RequirementParser = require('../extraction/RequirementParser');
        const MultiDimensionalMapper = require('../extraction/MultiDimensionalMapper');
        
        const parser = new RequirementParser(this.logger);
        const mapper = new MultiDimensionalMapper(this.logger, this.db);
        
        // Parse requirements to get features
        const parsedRequirements = await parser.parseRequirement(
            requirements.input || requirements,
            requirements.inputType || 'text'
        );
        
        // Map features multi-dimensionally
        const mappedFeatures = await Promise.all(
            parsedRequirements.features.map(feature => 
                mapper.mapFeature(feature, {
                    requiresGST: parsedRequirements.requiresGST,
                    requiresCompliance: parsedRequirements.requiresCompliance,
                    paymentGateway: parsedRequirements.paymentGateway,
                    industry: parsedRequirements.industry
                })
            )
        );
        
        // Build enhanced chain result
        const enhanced = {
            ...baseChain,
            
            // Original chain data
            refined: baseChain.refined,
            estimate: baseChain.estimate,
            plan: baseChain.plan,
            
            // New precision data
            features: parsedRequirements.features,
            functionBreakdown: this.buildFunctionBreakdown(mappedFeatures),
            multiDimensionalMapping: mappedFeatures,
            
            // Indian context
            indianContext: {
                requiresGST: parsedRequirements.requiresGST,
                requiresCompliance: parsedRequirements.requiresCompliance,
                paymentGateway: parsedRequirements.paymentGateway,
                industry: parsedRequirements.industry
            },
            
            // Metadata
            hasFunctionLevel: true,
            generatedAt: new Date().toISOString(),
            version: '2.0',
            
            // Confidence
            confidence: this.calculateOverallConfidence(mappedFeatures, baseChain)
        };
        
        // Generate hash for cache invalidation
        enhanced.hash = this.calculateHash(enhanced);
        
        return enhanced;
    }

    /**
     * Enhance existing chain result with function-level data
     */
    async enhanceWithFunctions(chainResult, requirements) {
        this.logger.info('Enhancing chain result with function-level data');
        
        const RequirementParser = require('../extraction/RequirementParser');
        const MultiDimensionalMapper = require('../extraction/MultiDimensionalMapper');
        
        const parser = new RequirementParser(this.logger);
        const mapper = new MultiDimensionalMapper(this.logger, this.db);
        
        // Extract features from existing chain result
        const modules = chainResult.refined?.scope?.modules || 
                       chainResult.refined?.modules || 
                       [];
        
        // Parse modules as requirements
        const parsedRequirements = await parser.parseRequirement(
            { modules: modules },
            'structured'
        );
        
        // Map features
        const mappedFeatures = await Promise.all(
            parsedRequirements.features.map(feature => 
                mapper.mapFeature(feature, {
                    requiresGST: chainResult.indianContext?.requiresGST || false,
                    requiresCompliance: chainResult.indianContext?.requiresCompliance || false
                })
            )
        );
        
        // Enhance chain result
        return {
            ...chainResult,
            features: parsedRequirements.features,
            functionBreakdown: this.buildFunctionBreakdown(mappedFeatures),
            multiDimensionalMapping: mappedFeatures,
            hasFunctionLevel: true,
            enhancedAt: new Date().toISOString(),
            hash: this.calculateHash({
                ...chainResult,
                features: parsedRequirements.features,
                functionBreakdown: this.buildFunctionBreakdown(mappedFeatures)
            })
        };
    }

    /**
     * Build function breakdown summary
     */
    buildFunctionBreakdown(mappedFeatures) {
        const breakdown = {
            totalFeatures: mappedFeatures.length,
            totalFunctions: 0,
            totalHours: 0,
            averageConfidence: 0,
            byCategory: {},
            byComplexity: { low: 0, medium: 0, high: 0 }
        };
        
        mappedFeatures.forEach(feature => {
            breakdown.totalFunctions += feature.functions.length;
            breakdown.totalHours += feature.estimatedHours;
            breakdown.averageConfidence += feature.confidence;
            
            // By category
            const category = feature.feature.category || 'general';
            breakdown.byCategory[category] = (breakdown.byCategory[category] || 0) + 1;
            
            // By complexity
            const complexity = feature.feature.estimatedComplexity || 3;
            if (complexity <= 2) breakdown.byComplexity.low++;
            else if (complexity <= 3) breakdown.byComplexity.medium++;
            else breakdown.byComplexity.high++;
        });
        
        breakdown.averageConfidence = breakdown.totalFeatures > 0 ?
            breakdown.averageConfidence / breakdown.totalFeatures : 0;
        
        return breakdown;
    }

    /**
     * Calculate overall confidence
     */
    calculateOverallConfidence(mappedFeatures, baseChain) {
        const featureConfidence = mappedFeatures.length > 0 ?
            mappedFeatures.reduce((sum, f) => sum + f.confidence, 0) / mappedFeatures.length : 0;
        
        const chainConfidence = baseChain.estimate?.confidence || 
                               baseChain.confidence || 0.8;
        
        // Weighted average (70% feature confidence, 30% chain confidence)
        return Math.round((featureConfidence * 0.7 + chainConfidence * 0.3) * 100) / 100;
    }

    /**
     * Calculate hash for cache invalidation
     */
    calculateHash(data) {
        const dataString = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Get from cache
     */
    async getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        // Check TTL
        if (Date.now() - cached.timestamp > this.cacheTTL) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    /**
     * Set cache
     */
    async setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Get from database
     */
    async getFromDatabase(projectId) {
        if (!this.db) return null;
        
        try {
            const project = this.db.prepare(`
                SELECT chain_result, chain_result_hash, chain_result_cached_at 
                FROM projects 
                WHERE id = ? OR project_code = ?
            `).get(projectId, projectId);
            
            if (project && project.chain_result) {
                const chainResult = JSON.parse(project.chain_result);
                
                // Check if cache is still valid (24 hours)
                if (project.chain_result_cached_at) {
                    const cachedAt = new Date(project.chain_result_cached_at);
                    const age = Date.now() - cachedAt.getTime();
                    if (age > this.cacheTTL) {
                        return null; // Cache expired
                    }
                }
                
                return chainResult;
            }
        } catch (error) {
            this.logger.warn('Failed to get chain result from database', { error: error.message });
        }
        
        return null;
    }

    /**
     * Save to database
     */
    async saveToDatabase(projectId, chainResult) {
        if (!this.db) return;
        
        try {
            const hash = this.calculateHash(chainResult);
            const chainResultJSON = JSON.stringify(chainResult);
            
            this.db.prepare(`
                UPDATE projects 
                SET chain_result = ?, 
                    chain_result_hash = ?, 
                    chain_result_cached_at = CURRENT_TIMESTAMP
                WHERE id = ? OR project_code = ?
            `).run(chainResultJSON, hash, projectId, projectId);
            
            this.logger.info('Chain result saved to database', { projectId });
        } catch (error) {
            this.logger.error('Failed to save chain result to database', {
                projectId,
                error: error.message
            });
        }
    }

    /**
     * Invalidate cache for a project
     */
    async invalidateCache(projectId) {
        const cacheKey = `chain:${projectId}`;
        this.cache.delete(cacheKey);
        
        // Also clear database cache
        if (this.db) {
            try {
                this.db.prepare(`
                    UPDATE projects 
                    SET chain_result = NULL, 
                        chain_result_hash = NULL, 
                        chain_result_cached_at = NULL
                    WHERE id = ? OR project_code = ?
                `).run(projectId, projectId);
            } catch (error) {
                this.logger.warn('Failed to invalidate database cache', { error: error.message });
            }
        }
    }
}

module.exports = ChainResultOptimizer;

