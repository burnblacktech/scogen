/**
 * Multi-Dimensional Mapper
 * 
 * Maps features using three dimensions for accuracy:
 * 1. Function-level mapping (Primary)
 * 2. Module-level mapping (Validation)
 * 3. Component library check (Optimization)
 * 
 * Part of Precision Pivot system
 */

class MultiDimensionalMapper {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
        this.functionMapper = new FunctionLevelMapper(logger);
        this.moduleMapper = new ModuleLevelMapper(logger);
        this.componentLibrary = new ComponentLibrary(logger, db);
    }

    /**
     * Map feature using multi-dimensional approach
     * @param {Object} feature - Feature object with name, category, functions
     * @param {Object} projectContext - Project context (requiresGST, industry, etc.)
     * @returns {Object} Multi-dimensional mapping result
     */
    async mapFeature(feature, projectContext = {}) {
        try {
            this.logger.info('Mapping feature multi-dimensionally', { feature: feature.name });
            
            // 1. Function-level mapping (Primary)
            const functionMapping = await this.functionMapper.map(feature);
            
            // 2. Module-level mapping (Validation)
            const moduleMapping = await this.moduleMapper.map(feature);
            
            // 3. Component library check (Optimization)
            const componentMatch = await this.componentLibrary.findMatch(feature);
            
            // Reconcile all three mappings
            const reconciledMapping = this.reconcile(
                functionMapping,
                moduleMapping,
                componentMatch
            );
            
            // Add Indian context adjustments
            const adjustedMapping = this.applyIndianContext(
                reconciledMapping,
                projectContext
            );
            
            // Generate pseudocode if requested
            if (projectContext.generatePseudocode) {
                adjustedMapping.pseudocode = await this.generatePseudocode(
                    functionMapping.functions,
                    feature,
                    projectContext
                );
            }
            
            return {
                feature: feature.name,
                
                // Primary estimate
                estimatedHours: adjustedMapping.hours,
                confidence: adjustedMapping.confidence,
                
                // Breakdown
                functions: functionMapping.functions,
                modules: moduleMapping.modules,
                
                // Savings opportunity
                reusableComponent: componentMatch.matchedComponent,
                potentialSavings: componentMatch.savedHours,
                customizationHours: componentMatch.customizationHours,
                
                // Risk factors
                risks: this.identifyRisks(feature, adjustedMapping),
                
                // Multi-dimensional validation
                validation: {
                    functionHours: functionMapping.totalHours,
                    moduleHours: moduleMapping.totalHours,
                    variance: Math.abs(functionMapping.totalHours - moduleMapping.totalHours),
                    variancePercentage: this.calculateVariance(
                        functionMapping.totalHours,
                        moduleMapping.totalHours
                    )
                },
                
                // Metadata
                mappedAt: new Date().toISOString(),
                mappingMethod: 'multi_dimensional'
            };
        } catch (error) {
            this.logger.error('Multi-dimensional mapping failed', {
                feature: feature.name,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Reconcile multiple estimation methods
     */
    reconcile(functionMap, moduleMap, componentMatch) {
        const funcHours = functionMap.totalHours;
        const modHours = moduleMap.totalHours;
        
        let finalHours;
        let confidence;
        
        // If both estimates are close (within 15%), high confidence
        const variance = Math.abs(funcHours - modHours) / Math.max(funcHours, modHours);
        
        if (variance < 0.15) {
            // Estimates agree - high confidence
            finalHours = (funcHours + modHours) / 2;
            confidence = 0.90;
        } else if (variance < 0.30) {
            // Moderate variance - weighted average
            finalHours = (funcHours * 0.7 + modHours * 0.3);
            confidence = 0.75;
        } else {
            // High variance - flag for review, use conservative estimate
            finalHours = Math.max(funcHours, modHours);
            confidence = 0.60;
        }
        
        // Apply component library savings
        if (componentMatch && componentMatch.matchScore > 0.8) {
            const savedHours = componentMatch.savedHours || 0;
            const customHours = componentMatch.customizationHours || 0;
            
            // Use component if it saves significant time
            if (savedHours > finalHours * 0.3) {
                finalHours = Math.min(finalHours, customHours + (finalHours - savedHours) * 0.2);
                confidence = Math.min(0.95, confidence + 0.1); // Boost confidence
            }
        }
        
        return {
            hours: Math.round(finalHours * 100) / 100, // Round to 2 decimals
            confidence: Math.round(confidence * 100) / 100
        };
    }

    /**
     * Apply Indian context adjustments
     */
    applyIndianContext(mapping, projectContext) {
        let adjustedHours = mapping.hours;
        let adjustedConfidence = mapping.confidence;
        
        // GST compliance adds 15% overhead
        if (projectContext.requiresGST) {
            adjustedHours *= 1.15;
        }
        
        // General compliance adds 20% overhead
        if (projectContext.requiresCompliance) {
            adjustedHours *= 1.20;
        }
        
        // Payment gateway integration adds 10% overhead
        if (projectContext.paymentGateway) {
            adjustedHours *= 1.10;
        }
        
        // Slight confidence reduction for Indian context (more unknowns)
        if (projectContext.requiresGST || projectContext.requiresCompliance) {
            adjustedConfidence *= 0.95;
        }
        
        return {
            hours: Math.round(adjustedHours * 100) / 100,
            confidence: Math.round(adjustedConfidence * 100) / 100
        };
    }

    /**
     * Identify risks based on mapping
     */
    identifyRisks(feature, mapping) {
        const risks = [];
        
        // Low confidence risk
        if (mapping.confidence < 0.70) {
            risks.push({
                type: 'estimation_uncertainty',
                severity: 'medium',
                description: `Low confidence (${mapping.confidence}) in estimation for ${feature.name}`,
                mitigation: 'Request detailed requirements or break down further'
            });
        }
        
        // High variance risk
        if (mapping.validation && mapping.validation.variancePercentage > 30) {
            risks.push({
                type: 'estimation_variance',
                severity: 'high',
                description: `High variance (${mapping.validation.variancePercentage}%) between function and module estimates`,
                mitigation: 'Review both estimation methods and reconcile differences'
            });
        }
        
        // Complexity risk
        if (feature.complexity_score >= 4) {
            risks.push({
                type: 'high_complexity',
                severity: 'high',
                description: `High complexity feature (${feature.complexity_score}/5)`,
                mitigation: 'Consider breaking into smaller features or adding buffer time'
            });
        }
        
        return risks;
    }

    /**
     * Generate pseudocode for functions
     */
    async generatePseudocode(functions, feature, projectContext) {
        // This will be implemented by PseudocodeGenerator
        // For now, return placeholder
        return {
            functions: functions.map(func => ({
                name: func.name,
                pseudocode: `// TODO: Implement ${func.name} for ${feature.name}`,
                aiReadyScore: 0.0
            })),
            overallScore: 0.0
        };
    }

    /**
     * Calculate variance percentage
     */
    calculateVariance(value1, value2) {
        const max = Math.max(value1, value2);
        if (max === 0) return 0;
        return Math.round((Math.abs(value1 - value2) / max) * 100);
    }
}

/**
 * Function Level Mapper
 */
class FunctionLevelMapper {
    constructor(logger) {
        this.logger = logger || console;
    }

    async map(feature) {
        const functions = feature.functions || [];
        
        const totalHours = functions.reduce((sum, func) => {
            return sum + (func.estimatedHours || 0);
        }, 0);
        
        return {
            functions: functions,
            totalHours: totalHours,
            functionCount: functions.length,
            averageHoursPerFunction: functions.length > 0 ? totalHours / functions.length : 0
        };
    }
}

/**
 * Module Level Mapper
 */
class ModuleLevelMapper {
    constructor(logger) {
        this.logger = logger || console;
        this.complexityDays = { low: 1, med: 2, medium: 2, high: 4 };
    }

    async map(feature) {
        // Map feature to module-level estimate
        const complexity = feature.estimatedComplexity || 3;
        const complexityKey = this.normalizeComplexity(complexity);
        const baseDays = this.complexityDays[complexityKey] || 2;
        
        // Convert days to hours (assuming 6 hours per day)
        const baseHours = baseDays * 6;
        
        // Adjust for dependencies
        const dependencyFactor = feature.dependencies ? 
            Math.min(1 + (feature.dependencies.length * 0.1), 1.3) : 1;
        
        const totalHours = baseHours * dependencyFactor;
        
        return {
            modules: [{
                name: feature.name,
                complexity: complexityKey,
                baseHours: baseHours,
                adjustedHours: totalHours
            }],
            totalHours: totalHours,
            moduleCount: 1
        };
    }

    normalizeComplexity(complexity) {
        if (typeof complexity === 'number') {
            if (complexity <= 2) return 'low';
            if (complexity <= 3) return 'med';
            return 'high';
        }
        return complexity.toString().toLowerCase().substring(0, 3);
    }
}

/**
 * Component Library
 */
class ComponentLibrary {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
    }

    async findMatch(feature) {
        // Query component library for matches
        if (!this.db) {
            return { matchedComponent: null, matchScore: 0, savedHours: 0, customizationHours: 0 };
        }
        
        try {
            const query = `
                SELECT * FROM components 
                WHERE component_category = ? 
                OR component_name LIKE ?
                ORDER BY times_reused DESC, success_rate DESC
                LIMIT 1
            `;
            
            const category = feature.category || 'general';
            const namePattern = `%${feature.name}%`;
            
            const component = this.db.prepare(query).get(category, namePattern);
            
            if (component) {
                const matchScore = this.calculateMatchScore(feature, component);
                
                if (matchScore > 0.7) {
                    return {
                        matchedComponent: component,
                        matchScore: matchScore,
                        savedHours: component.average_hours_saved || 0,
                        customizationHours: this.estimateCustomizationHours(feature, component)
                    };
                }
            }
            
            return { matchedComponent: null, matchScore: 0, savedHours: 0, customizationHours: 0 };
        } catch (error) {
            this.logger.warn('Component library query failed', { error: error.message });
            return { matchedComponent: null, matchScore: 0, savedHours: 0, customizationHours: 0 };
        }
    }

    calculateMatchScore(feature, component) {
        let score = 0;
        
        // Category match
        if (component.component_category === feature.category) {
            score += 0.5;
        }
        
        // Name similarity
        const featureName = feature.name.toLowerCase();
        const componentName = component.component_name.toLowerCase();
        if (componentName.includes(featureName) || featureName.includes(componentName)) {
            score += 0.3;
        }
        
        // Success rate bonus
        if (component.success_rate > 0.8) {
            score += 0.2;
        }
        
        return Math.min(1.0, score);
    }

    estimateCustomizationHours(feature, component) {
        // Estimate customization based on component complexity
        const baseCustomization = 4; // Base hours for customization
        const complexityMultiplier = feature.estimatedComplexity / 3; // Normalize to 1-2x
        
        return Math.round(baseCustomization * complexityMultiplier);
    }
}

module.exports = MultiDimensionalMapper;

