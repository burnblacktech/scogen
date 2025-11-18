/**
 * Sprint Planner
 * 
 * Generates sprint plans, dependencies, milestones, and Gantt data
 * for project implementation
 */

class SprintPlanner {
  constructor(logger) {
    this.logger = logger || console;
  }

  /**
   * Generate sprint plan for project
   * @param {Object} project - Project data with technical breakdown
   * @param {number} teamSize - Team size (default: 5)
   * @returns {Object} Sprint plan with sprints, dependencies, milestones, gantt
   */
  generateSprints(project, teamSize = 5) {
    try {
      const components = this.extractComponents(project);
      const velocity = this.calculateVelocity(teamSize);
      
      return {
        sprints: this.allocateToSprints(components, velocity),
        dependencies: this.mapDependencies(components),
        milestones: this.defineMilestones(components),
        gantt: this.generateGanttData(components, velocity),
        teamSize: teamSize,
        velocity: velocity
      };
    } catch (error) {
      this.logger.error('Sprint planning failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract components from project
   * @param {Object} project - Project data
   * @returns {Array} Array of components with effort estimates
   */
  extractComponents(project) {
    const technicalBreakdown = project.technicalBreakdown || project.technical_breakdown;
    
    if (!technicalBreakdown || !technicalBreakdown.technicalBreakdowns) {
      // Fallback to modules if no technical breakdown
      const modules = project.refinedScope?.modules || project.refined_scope?.modules || [];
      return modules.map((module, index) => ({
        id: `comp_${index + 1}`,
        name: typeof module === 'string' ? module : (module.name || module.displayName || `Component ${index + 1}`),
        effort: typeof module === 'object' && module.effort ? module.effort : 5, // Default 5 story points
        dependencies: typeof module === 'object' && module.deps ? module.deps : [],
        type: 'module'
      }));
    }

    const components = [];
    
    technicalBreakdown.technicalBreakdowns.forEach((breakdown, bIndex) => {
      if (breakdown.technicalComponents) {
        breakdown.technicalComponents.forEach((component, cIndex) => {
          components.push({
            id: `comp_${bIndex}_${cIndex}`,
            name: component.name || component.type || `Component ${bIndex}_${cIndex}`,
            effort: this.estimateEffort(component),
            dependencies: component.dependencies || [],
            type: component.type || 'component',
            module: breakdown.businessModule || breakdown.displayName
          });
        });
      }
    });

    return components;
  }

  /**
   * Estimate effort for a component (in story points)
   * @param {Object} component - Component object
   * @returns {number} Story points
   */
  estimateEffort(component) {
    // Base effort from component
    if (component.effort) return component.effort;
    if (component.days) return component.days * 0.5; // Convert days to story points (rough)
    
    // Estimate based on type
    const typeEffort = {
      'model': 2,
      'service': 5,
      'controller': 3,
      'route': 2,
      'component': 3,
      'page': 5,
      'middleware': 2
    };
    
    return typeEffort[component.type] || 3; // Default 3 story points
  }

  /**
   * Calculate team velocity (story points per sprint)
   * @param {number} teamSize - Team size
   * @returns {number} Velocity in story points
   */
  calculateVelocity(teamSize) {
    // Standard velocity: 6 story points per developer per sprint
    // Sprint = 2 weeks
    return teamSize * 6;
  }

  /**
   * Allocate components to sprints
   * @param {Array} components - Components to allocate
   * @param {number} velocity - Story points per sprint
   * @returns {Array} Array of sprints with allocated components
   */
  allocateToSprints(components, velocity) {
    const sprints = [];
    let currentSprint = 1;
    let currentSprintEffort = 0;
    let currentSprintComponents = [];
    
    // Sort components by dependencies (components with no deps first)
    const sortedComponents = this.sortByDependencies(components);
    
    sortedComponents.forEach(component => {
      // Check if component fits in current sprint
      if (currentSprintEffort + component.effort <= velocity) {
        currentSprintComponents.push(component);
        currentSprintEffort += component.effort;
      } else {
        // Save current sprint
        if (currentSprintComponents.length > 0) {
          sprints.push({
            sprint: currentSprint,
            effort: currentSprintEffort,
            components: currentSprintComponents,
            startWeek: (currentSprint - 1) * 2 + 1,
            endWeek: currentSprint * 2
          });
        }
        
        // Start new sprint
        currentSprint++;
        currentSprintEffort = component.effort;
        currentSprintComponents = [component];
      }
    });
    
    // Add last sprint
    if (currentSprintComponents.length > 0) {
      sprints.push({
        sprint: currentSprint,
        effort: currentSprintEffort,
        components: currentSprintComponents,
        startWeek: (currentSprint - 1) * 2 + 1,
        endWeek: currentSprint * 2
      });
    }
    
    return sprints;
  }

  /**
   * Sort components by dependencies (topological sort)
   * @param {Array} components - Components to sort
   * @returns {Array} Sorted components
   */
  sortByDependencies(components) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (component) => {
      if (visiting.has(component.id)) {
        // Circular dependency detected, skip
        return;
      }
      if (visited.has(component.id)) {
        return;
      }
      
      visiting.add(component.id);
      
      // Visit dependencies first
      if (component.dependencies && component.dependencies.length > 0) {
        component.dependencies.forEach(depName => {
          const dep = components.find(c => c.name === depName || c.id === depName);
          if (dep) {
            visit(dep);
          }
        });
      }
      
      visiting.delete(component.id);
      visited.add(component.id);
      sorted.push(component);
    };
    
    components.forEach(component => {
      if (!visited.has(component.id)) {
        visit(component);
      }
    });
    
    return sorted;
  }

  /**
   * Map dependencies between components
   * @param {Array} components - Components
   * @returns {Object} Dependency map
   */
  mapDependencies(components) {
    const dependencyMap = {};
    
    components.forEach(component => {
      dependencyMap[component.id] = {
        component: component.name,
        dependsOn: component.dependencies || [],
        requiredBy: components
          .filter(c => c.dependencies && c.dependencies.some(d => d === component.name || d === component.id))
          .map(c => c.name)
      };
    });
    
    return dependencyMap;
  }

  /**
   * Define milestones
   * @param {Array} components - Components
   * @returns {Array} Array of milestones
   */
  defineMilestones(components) {
    const milestones = [];
    const totalComponents = components.length;
    const quarterPoints = [0.25, 0.5, 0.75, 1.0];
    
    quarterPoints.forEach((percentage, index) => {
      const componentIndex = Math.floor(totalComponents * percentage);
      if (componentIndex > 0 && componentIndex <= totalComponents) {
        const component = components[componentIndex - 1];
        milestones.push({
          id: `milestone_${index + 1}`,
          name: `Milestone ${index + 1}: ${percentage * 100}% Complete`,
          component: component.name,
          percentage: percentage * 100,
          description: `Completion of ${component.name} marks ${percentage * 100}% project completion`
        });
      }
    });
    
    return milestones;
  }

  /**
   * Generate Gantt chart data
   * @param {Array} components - Components
   * @param {number} velocity - Story points per sprint
   * @returns {Array} Gantt data array
   */
  generateGanttData(components, velocity) {
    const sprints = this.allocateToSprints(components, velocity);
    const ganttData = [];
    
    sprints.forEach(sprint => {
      sprint.components.forEach(component => {
        ganttData.push({
          id: component.id,
          name: component.name,
          start: sprint.startWeek,
          end: sprint.endWeek,
          duration: sprint.endWeek - sprint.startWeek + 1,
          sprint: sprint.sprint,
          effort: component.effort,
          dependencies: component.dependencies || []
        });
      });
    });
    
    return ganttData;
  }

  /**
   * Generate sprint summary
   * @param {Object} sprintPlan - Sprint plan object
   * @returns {string} Summary as markdown
   */
  generateSprintSummary(sprintPlan) {
    let summary = `# Sprint Plan\n\n`;
    summary += `**Team Size:** ${sprintPlan.teamSize} developers\n`;
    summary += `**Velocity:** ${sprintPlan.velocity} story points per sprint\n`;
    summary += `**Total Sprints:** ${sprintPlan.sprints.length}\n`;
    summary += `**Total Duration:** ${sprintPlan.sprints.length * 2} weeks\n\n`;
    
    summary += `## Sprint Breakdown\n\n`;
    sprintPlan.sprints.forEach(sprint => {
      summary += `### Sprint ${sprint.sprint} (Weeks ${sprint.startWeek}-${sprint.endWeek})\n`;
      summary += `- **Effort:** ${sprint.effort} story points\n`;
      summary += `- **Components:** ${sprint.components.length}\n`;
      summary += `- **Components:** ${sprint.components.map(c => c.name).join(', ')}\n\n`;
    });
    
    return summary;
  }
}

module.exports = SprintPlanner;

