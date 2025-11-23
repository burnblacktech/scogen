// src/core/intelligence/IntelligentTimeline.js
// Intelligent Timeline Calculator with Critical Path Method (CPM)

class IntelligentTimeline {
  constructor() {
    // Indian holiday manager (placeholder - would integrate with actual holiday service)
    this.holidayManager = {
      getHolidays: (startDate, endDate) => {
        // Placeholder - would return actual Indian holidays
        return [];
      }
    };
  }

  /**
   * Calculate project timeline with dependency analysis
   * @param {Array} modules - Array of module objects
   * @param {Object} resources - Resource allocation
   * @param {Object} projectContext - Project context
   * @returns {Object} Timeline with critical path and phases
   */
  calculateProjectTimeline(modules, resources, projectContext) {
    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(modules);

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(dependencyGraph);

    // Identify parallel work streams
    const workStreams = this.identifyWorkStreams(dependencyGraph);

    // Resource allocation
    const allocation = this.allocateResources(workStreams, resources);

    // Calculate timeline with constraints
    const timeline = this.generateTimeline(
      criticalPath,
      workStreams,
      allocation,
      projectContext
    );

    return timeline;
  }

  /**
   * Build dependency graph from modules
   */
  buildDependencyGraph(modules) {
    const graph = new Map();

    modules.forEach(module => {
      const moduleId = module.id || module.name || module.module;
      const dependencies = module.dependencies || [];
      
      // Calculate duration in days (assuming 8 hours per day)
      const estimatedHours = module.estimatedHours || module.hours || 
                            (module.dynamicCost?.hours?.adjusted || 40);
      const duration = Math.ceil(estimatedHours / 8);

      const node = {
        id: moduleId,
        name: module.name || module.module,
        duration: duration,
        dependencies: dependencies.map(dep => {
          if (typeof dep === 'string') return dep;
          return dep.id || dep.name || dep.module;
        }),
        earliestStart: 0,
        earliestFinish: 0,
        latestStart: Infinity,
        latestFinish: Infinity,
        slack: 0
      };

      graph.set(moduleId, node);
    });

    // Validate and fix circular dependencies
    this.validateDependencies(graph);

    return graph;
  }

  /**
   * Calculate critical path using CPM
   */
  calculateCriticalPath(graph) {
    const nodes = Array.from(graph.values());
    
    // Forward pass
    const endTime = this.forwardPass(nodes, graph);
    
    // Backward pass
    this.backwardPass(nodes, graph, endTime);

    // Identify critical path (zero slack)
    const criticalPath = nodes.filter(node => node.slack === 0);

    // Calculate path statistics
    const pathDuration = criticalPath.reduce((sum, node) => sum + node.duration, 0);
    const pathComplexity = this.calculatePathComplexity(criticalPath);

    return {
      nodes: criticalPath,
      duration: pathDuration,
      complexity: pathComplexity,
      bottlenecks: this.identifyBottlenecks(criticalPath),
      risks: this.identifyCriticalPathRisks(criticalPath)
    };
  }

  /**
   * Forward pass to calculate earliest start/finish times
   */
  forwardPass(nodes, graph) {
    // Sort topologically
    const sorted = this.topologicalSort(nodes, graph);
    let maxFinish = 0;

    sorted.forEach(node => {
      // Calculate earliest start
      node.earliestStart = 0;
      node.dependencies.forEach(depId => {
        const dep = graph.get(depId);
        if (dep) {
          node.earliestStart = Math.max(node.earliestStart, dep.earliestFinish);
        }
      });

      // Calculate earliest finish
      node.earliestFinish = node.earliestStart + node.duration;
      maxFinish = Math.max(maxFinish, node.earliestFinish);
    });

    return maxFinish;
  }

  /**
   * Backward pass to calculate latest start/finish times and slack
   */
  backwardPass(nodes, graph, projectEnd) {
    // Process in reverse topological order
    const reversed = [...nodes].reverse();

    reversed.forEach(node => {
      // Find successors
      const successors = this.getSuccessors(node, nodes, graph);

      if (successors.length === 0) {
        node.latestFinish = projectEnd;
      } else {
        node.latestFinish = Math.min(...successors.map(s => s.latestStart));
      }

      node.latestStart = node.latestFinish - node.duration;
      node.slack = node.latestStart - node.earliestStart;
    });
  }

  /**
   * Get successor nodes
   */
  getSuccessors(node, allNodes, graph) {
    return allNodes.filter(otherNode => {
      return otherNode.dependencies.includes(node.id);
    });
  }

  /**
   * Topological sort to order nodes by dependencies
   */
  topologicalSort(nodes, graph) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (node) => {
      if (visited.has(node.id)) return;
      if (visiting.has(node.id)) {
        // Circular dependency detected - break it
        console.warn(`[WARN] Circular dependency detected at ${node.name}, breaking cycle`);
        return;
      }

      visiting.add(node.id);

      // Visit dependencies first
      node.dependencies.forEach(depId => {
        const dep = graph.get(depId);
        if (dep) visit(dep);
      });

      visiting.delete(node.id);
      visited.add(node.id);
      sorted.push(node);
    };

    nodes.forEach(node => visit(node));
    return sorted;
  }

  /**
   * Identify parallel work streams
   */
  identifyWorkStreams(graph) {
    const streams = [];
    const visited = new Set();

    // Find independent work streams
    graph.forEach((node, id) => {
      if (!visited.has(id)) {
        const stream = this.extractWorkStream(node, graph, visited);
        if (stream.length > 0) {
          streams.push({
            id: `stream_${streams.length + 1}`,
            modules: stream,
            canParallelize: this.checkParallelizable(stream),
            duration: this.calculateStreamDuration(stream),
            requiredSkills: this.extractRequiredSkills(stream)
          });
        }
      }
    });

    return streams;
  }

  /**
   * Extract work stream starting from a node
   */
  extractWorkStream(startNode, graph, visited) {
    const stream = [];
    const queue = [startNode];

    while (queue.length > 0) {
      const node = queue.shift();
      if (visited.has(node.id)) continue;

      visited.add(node.id);
      stream.push(node);

      // Add dependent nodes
      const dependents = Array.from(graph.values()).filter(n => 
        n.dependencies.includes(node.id)
      );
      queue.push(...dependents);
    }

    return stream;
  }

  /**
   * Check if stream can be parallelized
   */
  checkParallelizable(stream) {
    // Can parallelize if no dependencies between modules in stream
    for (let i = 0; i < stream.length; i++) {
      for (let j = i + 1; j < stream.length; j++) {
        if (stream[i].dependencies.includes(stream[j].id) ||
            stream[j].dependencies.includes(stream[i].id)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Calculate stream duration
   */
  calculateStreamDuration(stream) {
    if (stream.length === 0) return 0;
    
    // If parallelizable, duration is max of all modules
    if (this.checkParallelizable(stream)) {
      return Math.max(...stream.map(m => m.duration));
    }
    
    // Otherwise, sum sequential durations
    return stream.reduce((sum, m) => sum + m.duration, 0);
  }

  /**
   * Extract required skills from stream
   */
  extractRequiredSkills(stream) {
    // Placeholder - would extract from module tech stack
    return ['backend', 'frontend', 'qa'];
  }

  /**
   * Allocate resources to work streams
   */
  allocateResources(workStreams, resources) {
    const allocation = {
      assignments: [],
      utilization: {},
      timeline: []
    };

    // Sort streams by priority (critical path first)
    const prioritizedStreams = this.prioritizeStreams(workStreams);

    prioritizedStreams.forEach(stream => {
      const bestResource = this.findBestResource(
        stream,
        resources,
        allocation.assignments
      );

      allocation.assignments.push({
        stream: stream.id,
        resource: bestResource?.id || 'default',
        startDate: this.calculateStartDate(stream, allocation),
        endDate: this.calculateEndDate(stream, allocation),
        utilizationRate: this.calculateUtilization(stream, bestResource)
      });
    });

    return allocation;
  }

  /**
   * Prioritize streams (critical path first)
   */
  prioritizeStreams(streams) {
    // Sort by duration (longer = more critical)
    return [...streams].sort((a, b) => b.duration - a.duration);
  }

  /**
   * Find best resource for stream
   */
  findBestResource(stream, resources, existingAssignments) {
    // Placeholder - would match skills
    return { id: 'resource_1', skills: ['backend', 'frontend'] };
  }

  /**
   * Calculate start date for stream
   */
  calculateStartDate(stream, allocation) {
    // Find earliest dependency completion
    let earliestStart = 0;
    
    stream.modules.forEach(module => {
      module.dependencies.forEach(depId => {
        const depAssignment = allocation.assignments.find(a => 
          a.stream.includes(depId)
        );
        if (depAssignment && depAssignment.endDate > earliestStart) {
          earliestStart = depAssignment.endDate;
        }
      });
    });

    return earliestStart;
  }

  /**
   * Calculate end date for stream
   */
  calculateEndDate(stream, allocation) {
    const startDate = this.calculateStartDate(stream, allocation);
    return startDate + stream.duration;
  }

  /**
   * Calculate resource utilization
   */
  calculateUtilization(stream, resource) {
    // Placeholder
    return 0.8;
  }

  /**
   * Generate timeline with phases and milestones
   */
  generateTimeline(criticalPath, workStreams, allocation, context) {
    const startDate = context.startDate || new Date();
    
    const timeline = {
      startDate: startDate,
      phases: [],
      milestones: [],
      totalDuration: 0,
      workingDays: 0,
      calendarDays: 0
    };

    // Account for holidays
    const endDateEstimate = new Date(startDate);
    endDateEstimate.setDate(endDateEstimate.getDate() + criticalPath.duration * 1.5);
    const holidays = this.holidayManager.getHolidays(startDate, endDateEstimate);

    // Generate phases
    workStreams.forEach((stream, index) => {
      const phaseStart = this.calculatePhaseStart(stream, allocation, startDate);
      const phaseDuration = stream.duration;
      
      const phase = {
        name: `Phase ${index + 1}`,
        modules: stream.modules.map(m => m.name),
        startDate: phaseStart,
        duration: phaseDuration,
        resources: this.getPhaseResources(stream, allocation),
        deliverables: this.extractDeliverables(stream.modules)
      };

      // Calculate working days (excluding weekends and holidays)
      phase.workingDays = this.calculateWorkingDays(
        phaseStart,
        phaseDuration,
        holidays
      );

      phase.endDate = this.addWorkingDays(phaseStart, phase.workingDays);

      timeline.phases.push(phase);
    });

    // Calculate total duration
    const lastPhase = timeline.phases[timeline.phases.length - 1];
    timeline.endDate = lastPhase.endDate;
    timeline.totalDuration = this.daysBetween(startDate, timeline.endDate);
    timeline.workingDays = timeline.phases.reduce((sum, p) => sum + p.workingDays, 0);
    timeline.calendarDays = timeline.totalDuration;

    // Add buffer
    timeline.buffer = Math.ceil(timeline.workingDays * 0.2); // 20% buffer
    timeline.recommendedEndDate = this.addWorkingDays(timeline.endDate, timeline.buffer);

    // Generate milestones
    timeline.milestones = this.generateMilestones(timeline.phases);

    // Risk assessment
    timeline.risks = this.assessTimelineRisks(timeline, context);

    return timeline;
  }

  /**
   * Calculate working days excluding weekends and holidays
   */
  calculateWorkingDays(startDate, duration, holidays) {
    let workingDays = 0;
    let currentDate = new Date(startDate);
    const holidayDates = holidays.map(h => 
      h.date ? new Date(h.date) : new Date(h)
    );

    while (workingDays < duration) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.some(h => 
        h.toDateString() === currentDate.toDateString()
      );

      if (!isWeekend && !isHoliday) {
        workingDays++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }

  /**
   * Add working days to a date
   */
  addWorkingDays(startDate, workingDays) {
    const result = new Date(startDate);
    let added = 0;
    const holidays = this.holidayManager.getHolidays(startDate, 
      new Date(startDate.getTime() + workingDays * 2 * 24 * 60 * 60 * 1000)
    );
    const holidayDates = holidays.map(h => h.date ? new Date(h.date) : new Date(h));

    while (added < workingDays) {
      const dayOfWeek = result.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.some(h => 
        h.toDateString() === result.toDateString()
      );

      if (!isWeekend && !isHoliday) {
        added++;
      }

      result.setDate(result.getDate() + 1);
    }

    return result;
  }

  /**
   * Calculate days between two dates
   */
  daysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate phase start date
   */
  calculatePhaseStart(stream, allocation, projectStart) {
    // Find earliest dependency completion
    let earliestStart = 0;
    
    stream.modules.forEach(module => {
      module.dependencies.forEach(depId => {
        const depAssignment = allocation.assignments.find(a => 
          a.stream.includes(depId)
        );
        if (depAssignment && depAssignment.endDate > earliestStart) {
          earliestStart = depAssignment.endDate;
        }
      });
    });

    const start = new Date(projectStart);
    start.setDate(start.getDate() + earliestStart);
    return start;
  }

  /**
   * Get phase resources
   */
  getPhaseResources(stream, allocation) {
    return allocation.assignments
      .filter(a => a.stream === stream.id)
      .map(a => a.resource);
  }

  /**
   * Extract deliverables from modules
   */
  extractDeliverables(modules) {
    return modules.map(m => ({
      name: m.name,
      type: 'module',
      description: `Complete ${m.name} module`
    }));
  }

  /**
   * Generate milestones
   */
  generateMilestones(phases) {
    const milestones = [];

    phases.forEach((phase, index) => {
      milestones.push({
        name: `${phase.name} Complete`,
        date: phase.endDate,
        deliverables: phase.deliverables,
        type: 'phase_completion'
      });

      if (phase.workingDays > 10) {
        const midPoint = new Date(phase.startDate);
        midPoint.setDate(midPoint.getDate() + Math.floor(phase.workingDays / 2));

        milestones.push({
          name: `${phase.name} Mid-Review`,
          date: midPoint,
          type: 'review'
        });
      }
    });

    return milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Assess timeline risks
   */
  assessTimelineRisks(timeline, context) {
    const risks = [];

    // Check for holiday season impact
    const holidayImpact = this.calculateHolidayImpact(timeline);
    if (holidayImpact > 0.2) {
      risks.push({
        type: 'holiday_impact',
        severity: 'medium',
        impact: `${(holidayImpact * 100).toFixed(0)}% of timeline during holiday season`,
        mitigation: 'Consider extending timeline or increasing resources'
      });
    }

    // Check for resource constraints
    if (timeline.phases.some(p => p.resources.length < 2)) {
      risks.push({
        type: 'resource_constraint',
        severity: 'high',
        impact: 'Single point of failure on critical phases',
        mitigation: 'Add backup resources or cross-training'
      });
    }

    // Check for aggressive timeline
    if (timeline.buffer < timeline.workingDays * 0.15) {
      risks.push({
        type: 'aggressive_timeline',
        severity: 'medium',
        impact: 'Less than 15% buffer for uncertainties',
        mitigation: 'Increase buffer to 20-25% for safety'
      });
    }

    return risks;
  }

  /**
   * Calculate holiday impact
   */
  calculateHolidayImpact(timeline) {
    // Placeholder - would calculate actual holiday overlap
    return 0.1;
  }

  /**
   * Calculate path complexity
   */
  calculatePathComplexity(criticalPath) {
    if (criticalPath.length === 0) return 0;
    return criticalPath.reduce((sum, node) => sum + (node.complexity || 3), 0) / criticalPath.length;
  }

  /**
   * Identify bottlenecks
   */
  identifyBottlenecks(criticalPath) {
    return criticalPath
      .filter(node => node.duration > 10) // Long duration tasks
      .map(node => ({
        module: node.name,
        duration: node.duration,
        reason: 'Long duration task on critical path'
      }));
  }

  /**
   * Identify critical path risks
   */
  identifyCriticalPathRisks(criticalPath) {
    return criticalPath
      .filter(node => node.complexity > 4)
      .map(node => ({
        module: node.name,
        risk: 'High complexity on critical path',
        impact: 'Any delay will delay entire project'
      }));
  }

  /**
   * Validate dependencies (detect and break cycles)
   */
  validateDependencies(graph) {
    // Simple validation - in production would use stronger cycle detection
    graph.forEach((node, id) => {
      node.dependencies = node.dependencies.filter(depId => {
        const dep = graph.get(depId);
        if (!dep) {
          console.warn(`[WARN] Dependency ${depId} not found for ${node.name}`);
          return false;
        }
        // Check for immediate circular dependency
        if (dep.dependencies.includes(id)) {
          console.warn(`[WARN] Circular dependency between ${node.name} and ${dep.name}, breaking cycle`);
          return false;
        }
        return true;
      });
    });
  }
}

module.exports = IntelligentTimeline;

