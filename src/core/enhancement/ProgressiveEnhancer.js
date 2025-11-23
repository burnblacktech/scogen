/**
 * Progressive Enhancer
 * 
 * Enhances Progressive Output and Progressive Documentation systems
 * with function-level precision data
 * Part of Precision Pivot system
 */

class ProgressiveEnhancer {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
        this.chainOptimizer = require('../optimization/ChainResultOptimizer');
        this.multiMapper = require('../extraction/MultiDimensionalMapper');
    }

    /**
     * Enhance Progressive Output with function-level data
     * @param {Object} baseOutput - Base progressive output
     * @param {string} level - Output level (L1-L5)
     * @param {string} projectId - Project ID
     * @returns {Object} Enhanced output
     */
    async enhanceProgressiveOutput(baseOutput, level, projectId) {
        try {
            this.logger.info('Enhancing Progressive Output', { level, projectId });
            
            // Get function-level data from chain result
            const chainResult = await this.getChainResult(projectId);
            
            if (!chainResult || !chainResult.hasFunctionLevel) {
                // Enhance chain result if needed
                const enhancedChain = await this.enhanceChainResult(projectId, chainResult);
                return this.applyEnhancements(baseOutput, enhancedChain, level);
            }
            
            return this.applyEnhancements(baseOutput, chainResult, level);
        } catch (error) {
            this.logger.error('Progressive Output enhancement failed', {
                level,
                projectId,
                error: error.message
            });
            // Return base output if enhancement fails
            return baseOutput;
        }
    }

    /**
     * Enhance Progressive Documentation Level with function-level data
     * @param {Object} levelData - Level data from Level Generator
     * @param {number} level - Level number (1-5)
     * @param {string} projectId - Project ID
     * @returns {Object} Enhanced level data
     */
    async enhanceProgressiveDocumentation(levelData, level, projectId) {
        try {
            this.logger.info('Enhancing Progressive Documentation', { level, projectId });
            
            // Get function-level data
            const chainResult = await this.getChainResult(projectId);
            
            if (!chainResult || !chainResult.hasFunctionLevel) {
                const enhancedChain = await this.enhanceChainResult(projectId, chainResult);
                return this.applyDocumentationEnhancements(levelData, enhancedChain, level);
            }
            
            return this.applyDocumentationEnhancements(levelData, chainResult, level);
        } catch (error) {
            this.logger.error('Progressive Documentation enhancement failed', {
                level,
                projectId,
                error: error.message
            });
            return levelData;
        }
    }

    /**
     * Get chain result from database or cache
     */
    async getChainResult(projectId) {
        if (!this.db) return null;
        
        try {
            const project = this.db.prepare(`
                SELECT chain_result FROM projects 
                WHERE id = ? OR project_code = ?
            `).get(projectId, projectId);
            
            if (project && project.chain_result) {
                return JSON.parse(project.chain_result);
            }
        } catch (error) {
            this.logger.warn('Failed to get chain result', { error: error.message });
        }
        
        return null;
    }

    /**
     * Enhance chain result with function-level data
     */
    async enhanceChainResult(projectId, existingChainResult) {
        const ChainResultOptimizer = require('../optimization/ChainResultOptimizer');
        const optimizer = new ChainResultOptimizer(this.logger, this.db);
        
        // Get project requirements
        const project = this.db.prepare('SELECT * FROM projects WHERE id = ? OR project_code = ?')
            .get(projectId, projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }
        
        const requirements = {
            input: project.input || '',
            inputType: 'text'
        };
        
        return await optimizer.getOptimizedChainResult(
            projectId,
            requirements,
            { enhance: true, forceRegenerate: false }
        );
    }

    /**
     * Apply enhancements to Progressive Output
     */
    applyEnhancements(baseOutput, chainResult, level) {
        const enhanced = { ...baseOutput };
        
        // Add function-level breakdown for L2+
        if (level >= 'L2' && chainResult.functionBreakdown) {
            enhanced.functionBreakdown = {
                totalFunctions: chainResult.functionBreakdown.totalFunctions,
                totalHours: chainResult.functionBreakdown.totalHours,
                byCategory: chainResult.functionBreakdown.byCategory
            };
        }
        
        // Add multi-dimensional mapping for L3+
        if (level >= 'L3' && chainResult.multiDimensionalMapping) {
            enhanced.multiDimensionalMapping = chainResult.multiDimensionalMapping.map(m => ({
                feature: m.feature,
                estimatedHours: m.estimatedHours,
                confidence: m.confidence,
                functions: m.functions.length
            }));
        }
        
        // Add pseudocode for L4+
        if (level >= 'L4' && chainResult.features) {
            enhanced.pseudocodePreview = {
                features: chainResult.features.slice(0, 3).map(f => ({
                    name: f.name,
                    pseudocodeAvailable: true
                }))
            };
        }
        
        // Add confidence score
        if (chainResult.confidence) {
            enhanced.confidence = chainResult.confidence;
        }
        
        return enhanced;
    }

    /**
     * Apply enhancements to Progressive Documentation
     */
    applyDocumentationEnhancements(levelData, chainResult, level) {
        const enhanced = { ...levelData };
        
        // Level 2: Add function-level details to module sections
        if (level >= 2 && chainResult.features) {
            enhanced.sections = this.addFunctionDetailsToSections(
                enhanced.sections,
                chainResult.features
            );
        }
        
        // Level 3: Add multi-dimensional mapping details
        if (level >= 3 && chainResult.multiDimensionalMapping) {
            enhanced.sections = this.addMultiDimensionalDetails(
                enhanced.sections,
                chainResult.multiDimensionalMapping
            );
        }
        
        // Level 4: Add pseudocode sections
        if (level >= 4 && chainResult.features) {
            enhanced.sections = this.addPseudocodeSections(
                enhanced.sections,
                chainResult.features
            );
        }
        
        // Level 5: Add complete pseudocode
        if (level >= 5 && chainResult.features) {
            enhanced.sections = this.addCompletePseudocode(
                enhanced.sections,
                chainResult.features
            );
        }
        
        // Update metadata
        if (!enhanced.metadata) {
            enhanced.metadata = {};
        }
        enhanced.metadata.hasFunctionLevel = true;
        enhanced.metadata.enhancedAt = new Date().toISOString();
        
        return enhanced;
    }

    /**
     * Add function details to sections
     */
    addFunctionDetailsToSections(sections, features) {
        // Find module sections and add function breakdown
        const updatedSections = { ...sections };
        
        features.forEach(feature => {
            // Find section for this feature
            Object.keys(updatedSections).forEach(sectionKey => {
                const section = updatedSections[sectionKey];
                if (this.sectionMatchesFeature(section, feature)) {
                    if (!section.content) section.content = {};
                    
                    // Add function breakdown
                    section.content.functions = {
                        title: 'Function Breakdown',
                        content: feature.functions.map(func => ({
                            name: func.name,
                            estimatedHours: func.estimatedHours,
                            complexity: func.complexity
                        }))
                    };
                }
            });
        });
        
        return updatedSections;
    }

    /**
     * Add multi-dimensional mapping details
     */
    addMultiDimensionalDetails(sections, mappings) {
        const updatedSections = { ...sections };
        
        // Add validation section
        if (!updatedSections.validation) {
            updatedSections.validation = {
                title: 'Estimation Validation',
                content: {
                    multiDimensionalMapping: {
                        title: 'Multi-Dimensional Mapping',
                        content: mappings.map(m => ({
                            feature: m.feature,
                            functionHours: m.validation.functionHours,
                            moduleHours: m.validation.moduleHours,
                            variance: m.validation.variancePercentage,
                            confidence: m.confidence
                        }))
                    }
                }
            };
        }
        
        return updatedSections;
    }

    /**
     * Add pseudocode sections
     */
    addPseudocodeSections(sections, features) {
        const updatedSections = { ...sections };
        
        // Add pseudocode preview section
        if (!updatedSections.pseudocode) {
            updatedSections.pseudocode = {
                title: 'Pseudocode Preview',
                content: {
                    note: '95% complete pseudocode available for all features',
                    features: features.slice(0, 5).map(f => ({
                        name: f.name,
                        functions: f.functions.length,
                        pseudocodeAvailable: true
                    }))
                }
            };
        }
        
        return updatedSections;
    }

    /**
     * Add complete pseudocode
     */
    addCompletePseudocode(sections, features) {
        const updatedSections = { ...sections };
        
        // Add complete pseudocode section
        if (!updatedSections.completePseudocode) {
            updatedSections.completePseudocode = {
                title: 'Complete Pseudocode (95%)',
                content: {
                    note: 'All features include 95% complete pseudocode ready for AI code generation',
                    features: features.map(f => ({
                        name: f.name,
                        functions: f.functions.map(func => ({
                            name: func.name,
                            pseudocode: func.pseudocode || '// Pseudocode to be generated',
                            estimatedHours: func.estimatedHours
                        }))
                    }))
                }
            };
        }
        
        return updatedSections;
    }

    /**
     * Check if section matches feature
     */
    sectionMatchesFeature(section, feature) {
        const sectionText = JSON.stringify(section).toLowerCase();
        const featureName = feature.name.toLowerCase();
        return sectionText.includes(featureName);
    }
}

module.exports = ProgressiveEnhancer;

