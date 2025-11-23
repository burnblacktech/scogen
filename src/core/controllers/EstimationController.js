/**
 * Estimation Controller
 * 
 * Handles multi-dimensional mapping and cost calculation
 * Part of Precision Pivot system
 */

class EstimationController {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
    }

    async mapFeature(feature, projectContext = {}) {
        const MultiDimensionalMapper = require('../extraction/MultiDimensionalMapper');
        const mapper = new MultiDimensionalMapper(this.logger, this.db);
        
        return await mapper.mapFeature(feature, projectContext);
    }

    async calculateCost(features, projectContext = {}, options = {}) {
        // Map all features
        const MultiDimensionalMapper = require('../extraction/MultiDimensionalMapper');
        const mapper = new MultiDimensionalMapper(this.logger, this.db);
        
        const mappedFeatures = await Promise.all(
            features.map(f => mapper.mapFeature(f, projectContext))
        );
        
        // Calculate costs
        const hourlyRate = options.hourlyRate || 85; // Default ₹85/hour
        const totalHours = mappedFeatures.reduce((sum, f) => sum + f.estimatedHours, 0);
        
        const baseCost = totalHours * hourlyRate;
        const gstAmount = projectContext.requiresGST ? baseCost * 0.18 : 0;
        const complianceCost = projectContext.requiresCompliance ? baseCost * 0.1 : 0;
        const totalCost = baseCost + gstAmount + complianceCost;
        
        return {
            baseCost: Math.round(baseCost),
            gstAmount: Math.round(gstAmount),
            complianceCost: Math.round(complianceCost),
            totalCost: Math.round(totalCost),
            totalHours: totalHours,
            hourlyRate: hourlyRate,
            breakdown: mappedFeatures.map(f => ({
                feature: f.feature,
                hours: f.estimatedHours,
                cost: Math.round(f.estimatedHours * hourlyRate)
            }))
        };
    }

    async optimizeResources(features, constraints = {}) {
        const totalHours = features.reduce((sum, f) => 
            sum + (f.estimatedHours || f.estimated_hours || 0), 0
        );
        
        const targetWeeks = constraints.targetWeeks || Math.ceil(totalHours / 150);
        const hoursPerWeek = totalHours / targetWeeks;
        
        // Optimize team composition
        const team = {
            seniors: Math.ceil(hoursPerWeek / 30),
            mids: Math.ceil(hoursPerWeek / 25),
            juniors: Math.ceil(hoursPerWeek / 20)
        };
        
        return {
            team: team,
            totalHours: totalHours,
            targetWeeks: targetWeeks,
            hoursPerWeek: Math.round(hoursPerWeek)
        };
    }
}

module.exports = EstimationController;

