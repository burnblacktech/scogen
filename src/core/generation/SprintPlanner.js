/**
 * Sprint Planner
 * 
 * Generates sprint plans with Indian holiday awareness
 * Includes capacity planning, checkpoints, and human endpoints
 * Part of Precision Pivot system
 */

class SprintPlanner {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
        this.holidayManager = new IndianHolidayManager(logger);
        this.capacityCalculator = new CapacityCalculator();
    }

    /**
     * Generate sprint plan for a project
     * @param {Object} project - Project object with features
     * @param {Object} team - Team composition
     * @param {Date} startDate - Sprint start date
     * @param {Object} options - Planning options
     * @returns {Object} Complete sprint plan
     */
    async generateSprintPlan(project, team, startDate, options = {}) {
        try {
            this.logger.info('Generating sprint plan', {
                projectId: project.id,
                startDate: startDate.toISOString()
            });
            
            const sprints = [];
            const features = project.features || [];
            
            // Sort features by dependencies
            const sortedFeatures = this.topologicalSort(features);
            
            // Calculate total capacity needed
            const totalHours = sortedFeatures.reduce((sum, f) => {
                return sum + (f.estimatedHours || f.estimated_hours || 0);
            }, 0);
            
            // Generate sprints (2-week sprints by default)
            const sprintDuration = options.sprintDuration || 14; // days
            let currentDate = new Date(startDate);
            let remainingFeatures = [...sortedFeatures];
            let sprintNumber = 1;
            
            while (remainingFeatures.length > 0) {
                const sprint = await this.planSprint(
                    sprintNumber,
                    currentDate,
                    sprintDuration,
                    remainingFeatures,
                    team,
                    project,
                    options
                );
                
                sprints.push(sprint);
                
                // Remove completed features
                remainingFeatures = remainingFeatures.filter(
                    f => !sprint.features.includes(f.id || f.feature_id)
                );
                
                // Move to next sprint (add gap between sprints)
                const gapDays = options.sprintGap || 3;
                currentDate = new Date(sprint.endDate);
                currentDate.setDate(currentDate.getDate() + gapDays);
                sprintNumber++;
                
                // Safety limit
                if (sprintNumber > 20) {
                    this.logger.warn('Sprint limit reached, stopping plan generation');
                    break;
                }
            }
            
            return {
                sprints,
                totalDuration: this.calculateDuration(startDate, sprints[sprints.length - 1].endDate),
                summary: this.generateSummary(sprints, project, team),
                totalSprints: sprints.length,
                totalHours: totalHours,
                averageSprintHours: totalHours / sprints.length
            };
        } catch (error) {
            this.logger.error('Sprint planning failed', {
                projectId: project.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Plan a single sprint
     */
    async planSprint(number, startDate, duration, availableFeatures, team, project, options) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration);
        
        // Calculate working days (excluding weekends and holidays)
        const holidays = await this.holidayManager.getHolidays(startDate, endDate);
        const workingDays = this.calculateWorkingDays(startDate, endDate, holidays);
        
        // Calculate team capacity
        const capacity = this.capacityCalculator.calculate(team, workingDays);
        
        // Adjust for festival season
        const festivalImpact = this.getFestivalImpact(startDate, endDate);
        const adjustedCapacity = capacity * festivalImpact;
        
        // Select features for sprint
        const sprintFeatures = this.selectFeaturesForSprint(
            availableFeatures,
            adjustedCapacity
        );
        
        // Generate sprint goals
        const goals = this.generateSprintGoals(sprintFeatures);
        
        // Generate deliverables
        const deliverables = this.generateDeliverables(sprintFeatures);
        
        // Generate checkpoints
        const checkpoints = this.generateCheckpoints(number, workingDays, project);
        
        // Identify human endpoints
        const humanEndpoints = this.identifyHumanEndpoints(sprintFeatures, project);
        
        // Identify risks
        const risks = this.identifySprintRisks(sprintFeatures, holidays, team);
        
        return {
            sprintNumber: number,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            workingDays,
            
            // Team and capacity
            team: team.composition || team,
            plannedCapacity: capacity,
            adjustedCapacity: Math.round(adjustedCapacity * 100) / 100,
            festivalImpact: festivalImpact < 1 ? `${Math.round((1-festivalImpact)*100)}% reduced` : 'None',
            
            // Sprint goals
            goals: goals,
            features: sprintFeatures.map(f => f.id || f.feature_id),
            featureCount: sprintFeatures.length,
            
            // Deliverables
            deliverables: deliverables,
            
            // Review checkpoints
            checkpoints: checkpoints,
            
            // Human endpoints
            humanEndpoints: humanEndpoints,
            
            // Risks
            risks: risks,
            
            // Indian context
            holidays: holidays.map(h => h.name),
            publicHolidays: holidays.filter(h => h.isPublic).map(h => h.name),
            festivalSeason: this.isFestivalSeason(startDate, endDate)
        };
    }

    /**
     * Calculate working days excluding weekends and holidays
     */
    calculateWorkingDays(startDate, endDate, holidays) {
        let workingDays = 0;
        const current = new Date(startDate);
        const end = new Date(endDate);
        const holidayDates = new Set(holidays.map(h => h.date));
        
        while (current <= end) {
            const dayOfWeek = current.getDay();
            const dateStr = current.toISOString().split('T')[0];
            
            // Exclude weekends (Saturday = 6, Sunday = 0)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                // Exclude holidays
                if (!holidayDates.has(dateStr)) {
                    workingDays++;
                }
            }
            
            current.setDate(current.getDate() + 1);
        }
        
        return workingDays;
    }

    /**
     * Select features for sprint based on capacity
     */
    selectFeaturesForSprint(availableFeatures, capacity) {
        const selected = [];
        let remainingCapacity = capacity;
        
        for (const feature of availableFeatures) {
            const featureHours = feature.estimatedHours || feature.estimated_hours || 0;
            
            // Check if feature fits in remaining capacity
            if (featureHours <= remainingCapacity) {
                selected.push(feature);
                remainingCapacity -= featureHours;
            } else {
                // Stop if next feature doesn't fit
                break;
            }
        }
        
        return selected;
    }

    /**
     * Generate sprint goals
     */
    generateSprintGoals(features) {
        const goals = [];
        
        features.forEach((feature, index) => {
            goals.push({
                id: index + 1,
                description: `Complete ${feature.name || feature.feature_name}`,
                featureId: feature.id || feature.feature_id,
                priority: feature.priority || 'medium'
            });
        });
        
        return goals;
    }

    /**
     * Generate deliverables
     */
    generateDeliverables(features) {
        return features.map(feature => ({
            feature: feature.name || feature.feature_name,
            deliverable: `Working ${feature.name || feature.feature_name} feature`,
            acceptanceCriteria: feature.acceptanceCriteria || feature.acceptance_criteria || [],
            estimatedHours: feature.estimatedHours || feature.estimated_hours || 0
        }));
    }

    /**
     * Generate checkpoints
     */
    generateCheckpoints(sprintNumber, workingDays, project) {
        const checkpoints = [];
        
        // Architecture Review (Day 3)
        if (workingDays >= 3) {
            checkpoints.push({
                day: 3,
                type: 'Architecture Review',
                participants: ['Tech Lead', 'Senior Developer'],
                duration: '2 hours',
                deliverable: 'Architecture approval',
                isHumanEndpoint: true
            });
        }
        
        // Mid-Sprint Review
        const midSprintDay = Math.floor(workingDays / 2);
        if (midSprintDay > 0) {
            checkpoints.push({
                day: midSprintDay,
                type: 'Mid-Sprint Review',
                participants: ['Product Owner', 'Team'],
                duration: '1 hour',
                deliverable: 'Progress update, blocker resolution'
            });
        }
        
        // Client Demo (2 days before end)
        const demoDay = workingDays - 2;
        if (demoDay > 0) {
            checkpoints.push({
                day: demoDay,
                type: 'Client Demo',
                participants: ['Client', 'Product Owner', 'Tech Lead'],
                duration: '1.5 hours',
                deliverable: 'Feature demonstration, feedback collection',
                isHumanEndpoint: true
            });
        }
        
        // Sprint Retrospective (Last day)
        checkpoints.push({
            day: workingDays,
            type: 'Sprint Retrospective',
            participants: ['Full Team'],
            duration: '2 hours',
            deliverable: 'Learnings documented, process improvements'
        });
        
        // Compliance checkpoint (first sprint only)
        if (sprintNumber === 1 && project.requires_compliance_check) {
            checkpoints.push({
                day: 5,
                type: 'Compliance Review',
                participants: ['Legal/CA Consultant', 'Tech Lead'],
                duration: '3 hours',
                deliverable: 'GST/Compliance approval',
                isHumanEndpoint: true
            });
        }
        
        return checkpoints;
    }

    /**
     * Identify human endpoints (tasks requiring human review/approval)
     */
    identifyHumanEndpoints(features, project) {
        const endpoints = [];
        
        features.forEach(feature => {
            if (feature.complexity_score >= 4) {
                endpoints.push({
                    task: feature.name || feature.feature_name,
                    description: `High complexity feature (${feature.complexity_score}/5) requires review`,
                    estimatedHours: 2,
                    type: 'code_review'
                });
            }
            
            if (feature.hasIndianCompliance || project.requires_compliance_check) {
                endpoints.push({
                    task: feature.name || feature.feature_name,
                    description: 'Compliance review required',
                    estimatedHours: 3,
                    type: 'compliance_review'
                });
            }
        });
        
        return endpoints;
    }

    /**
     * Identify sprint risks
     */
    identifySprintRisks(features, holidays, team) {
        const risks = [];
        
        // Holiday impact risk
        if (holidays.length > 2) {
            risks.push({
                type: 'holiday_impact',
                severity: 'medium',
                description: `${holidays.length} holidays during sprint may reduce capacity`,
                mitigation: 'Adjust sprint goals or extend sprint duration'
            });
        }
        
        // High complexity risk
        const highComplexityFeatures = features.filter(f => 
            (f.complexity_score || f.estimatedComplexity || 3) >= 4
        );
        if (highComplexityFeatures.length > 0) {
            risks.push({
                type: 'high_complexity',
                severity: 'high',
                description: `${highComplexityFeatures.length} high complexity features in sprint`,
                mitigation: 'Break down features or add buffer time'
            });
        }
        
        // Team capacity risk
        const totalHours = features.reduce((sum, f) => 
            sum + (f.estimatedHours || f.estimated_hours || 0), 0
        );
        if (totalHours > team.capacity * 1.2) {
            risks.push({
                type: 'overcommitment',
                severity: 'high',
                description: 'Sprint capacity exceeded by 20%',
                mitigation: 'Reduce scope or increase team size'
            });
        }
        
        return risks;
    }

    /**
     * Get festival impact factor
     */
    getFestivalImpact(startDate, endDate) {
        const festivals = [
            { name: 'Diwali', month: 10, impact: 0.7 }, // 30% reduction
            { name: 'Holi', month: 3, impact: 0.8 }, // 20% reduction
            { name: 'Dussehra', month: 9, impact: 0.85 }, // 15% reduction
            { name: 'New Year', month: 0, impact: 0.9 } // 10% reduction
        ];
        
        const startMonth = startDate.getMonth();
        const endMonth = endDate.getMonth();
        
        for (const festival of festivals) {
            if (startMonth <= festival.month && endMonth >= festival.month) {
                return festival.impact;
            }
        }
        
        return 1.0; // No impact
    }

    /**
     * Check if sprint is in festival season
     */
    isFestivalSeason(startDate, endDate) {
        const impact = this.getFestivalImpact(startDate, endDate);
        return impact < 1.0;
    }

    /**
     * Topological sort features by dependencies
     */
    topologicalSort(features) {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        
        const visit = (feature) => {
            if (visiting.has(feature.id || feature.feature_id)) {
                // Circular dependency detected
                this.logger.warn('Circular dependency detected', { feature: feature.name });
                return;
            }
            
            if (visited.has(feature.id || feature.feature_id)) {
                return;
            }
            
            visiting.add(feature.id || feature.feature_id);
            
            // Visit dependencies first
            const deps = feature.depends_on || feature.dependencies || [];
            deps.forEach(depId => {
                const dep = features.find(f => 
                    (f.id || f.feature_id) === depId
                );
                if (dep) {
                    visit(dep);
                }
            });
            
            visiting.delete(feature.id || feature.feature_id);
            visited.add(feature.id || feature.feature_id);
            sorted.push(feature);
        };
        
        features.forEach(feature => {
            if (!visited.has(feature.id || feature.feature_id)) {
                visit(feature);
            }
        });
        
        return sorted;
    }

    /**
     * Calculate duration between dates
     */
    calculateDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;
        
        return {
            totalDays: diffDays,
            weeks: weeks,
            days: days,
            formatted: weeks > 0 ? `${weeks} weeks ${days} days` : `${days} days`
        };
    }

    /**
     * Generate summary
     */
    generateSummary(sprints, project, team) {
        const totalFeatures = sprints.reduce((sum, s) => sum + s.featureCount, 0);
        const totalHours = sprints.reduce((sum, s) => sum + s.plannedCapacity, 0);
        const totalWorkingDays = sprints.reduce((sum, s) => sum + s.workingDays, 0);
        
        return {
            totalSprints: sprints.length,
            totalFeatures: totalFeatures,
            totalHours: Math.round(totalHours),
            totalWorkingDays: totalWorkingDays,
            averageSprintDuration: Math.round(totalWorkingDays / sprints.length),
            teamSize: team.composition ? 
                Object.values(team.composition).reduce((a, b) => a + b, 0) : 
                team.size || 0,
            estimatedCompletion: sprints[sprints.length - 1].endDate
        };
    }
}

/**
 * Indian Holiday Manager
 * Uses centralized HolidayManager service
 */
const HolidayManager = require('../../../services/indian-context/HolidayManager');

class IndianHolidayManager {
    constructor(logger) {
        this.logger = logger || console;
        this.holidayManager = new HolidayManager(logger);
    }

    async getHolidays(startDate, endDate) {
        return await this.holidayManager.getHolidays(startDate, endDate);
    }
}

/**
 * Capacity Calculator
 */
class CapacityCalculator {
    /**
     * Calculate team capacity in hours
     */
    calculate(team, workingDays) {
        const composition = team.composition || team;
        const hoursPerDay = team.hoursPerDay || 6; // Default 6 hours per day
        
        let totalCapacity = 0;
        
        if (typeof composition === 'object') {
            // Team composition object: {seniors: 2, mids: 3, juniors: 2}
            Object.entries(composition).forEach(([role, count]) => {
                const roleHours = this.getRoleHours(role);
                totalCapacity += count * roleHours * workingDays;
            });
        } else {
            // Simple team size
            const teamSize = composition || team.size || 1;
            totalCapacity = teamSize * hoursPerDay * workingDays;
        }
        
        return Math.round(totalCapacity * 100) / 100;
    }

    /**
     * Get hours per day for role
     */
    getRoleHours(role) {
        const roleMap = {
            'senior': 6,
            'seniors': 6,
            'mid': 6,
            'mids': 6,
            'junior': 5,
            'juniors': 5,
            'lead': 5,
            'leads': 5
        };
        
        return roleMap[role.toLowerCase()] || 6;
    }
}

module.exports = SprintPlanner;

