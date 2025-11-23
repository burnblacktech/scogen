/**
 * Output Delivery Controller
 * 
 * Controls progressive delivery of outputs based on selected level
 * Filters complete analysis to deliver appropriate level (L1-L5)
 */

class OutputDeliveryController {
  constructor(logger) {
    this.logger = logger || console;
    this.trainingMode = process.env.TRAINING_MODE === 'true';
    
    this.levels = {
      L1_DISCOVERY: {
        price: 500,
        name: 'Scope Discovery',
        tagline: 'Understand what you\'re building',
        depth: 0.1,
        includes: ['discovery'],
        description: 'Basic project scope and rough estimates'
      },
      L2_PLANNING: {
        price: 2500,
        name: 'Project Planning',
        tagline: 'Plan your project properly',
        depth: 0.3,
        includes: ['discovery', 'planning'],
        description: 'Detailed planning with modules and milestones'
      },
      L3_ARCHITECTURE: {
        price: 10000,
        name: 'Technical Architecture',
        tagline: 'Blueprint for development',
        depth: 0.6,
        includes: ['discovery', 'planning', 'architecture'],
        description: 'Complete technical architecture and design'
      },
      L4_IMPLEMENTATION: {
        price: 25000,
        name: 'Implementation Blueprint',
        tagline: 'Ready-to-code specifications',
        depth: 0.8,
        includes: ['discovery', 'planning', 'architecture', 'implementation'],
        description: 'Detailed implementation with pseudocode and sprints'
      },
      L5_COMPLETE: {
        price: 50000,
        name: 'Complete Development Package',
        tagline: 'Everything you need to build',
        depth: 1.0,
        includes: ['discovery', 'planning', 'architecture', 'implementation', 'complete'],
        description: 'Complete package with code templates and DevOps'
      }
    };
  }

  /**
   * Deliver output for specific level
   * @param {string} projectId - Project ID
   * @param {string} level - Output level (L1_DISCOVERY, L2_PLANNING, etc.)
   * @param {string} previousLevel - Previous level if upgrading
   * @returns {Object} Formatted output for requested level
   */
  async deliverOutput(projectId, level, previousLevel = null) {
    const { getDbV2 } = require('../database/db-manager-v2');
    const dbV2 = getDbV2();
    
    if (!dbV2) {
      throw new Error('Database not available');
    }

    // Get complete analysis from database
    const project = dbV2.db.prepare('SELECT complete_analysis FROM projects WHERE id = ? OR project_code = ?').get(projectId, projectId);
    
    if (!project || !project.complete_analysis) {
      throw new Error('Complete analysis not found. Please regenerate the project.');
    }

    const completeAnalysis = JSON.parse(project.complete_analysis);

    // Check if training mode
    if (this.trainingMode) {
      this.logger.info('Training mode: All levels accessible', { projectId, level });
    }

    // Generate output for requested level
    const output = this.generateLevelOutput(completeAnalysis, level);

    // Add teaser for next level
    const nextLevel = this.getNextLevel(level);
    if (nextLevel) {
      output.teaser = this.generateTeaser(completeAnalysis, nextLevel);
      output.nextLevel = nextLevel;
    }

    // Store level access
    await this.recordLevelAccess(projectId, level);

    return output;
  }

  /**
   * Generate output for specific level
   * @param {Object} analysis - Complete analysis
   * @param {string} level - Output level
   * @param {string} projectId - Project ID for enhancement
   * @returns {Object} Level-specific output
   */
  async generateLevelOutput(analysis, level, projectId = null) {
    const levelConfig = this.levels[level];
    if (!levelConfig) {
      throw new Error(`Invalid level: ${level}`);
    }

    const output = {
      level: level,
      name: levelConfig.name,
      tagline: levelConfig.tagline,
      price: this.trainingMode ? 0 : levelConfig.price,
      depth: levelConfig.depth,
      data: {}
    };

    // Include appropriate sections based on level
    levelConfig.includes.forEach(section => {
      if (analysis[section]) {
        output.data[section] = analysis[section];
      }
    });

    // Enhance with function-level data if available
    if (projectId && level >= 'L2') {
      try {
        const ProgressiveEnhancer = require('../core/enhancement/ProgressiveEnhancer');
        const { getDbV2 } = require('../database/db-manager-v2');
        const dbV2 = getDbV2();
        
        if (dbV2) {
          const enhancer = new ProgressiveEnhancer(this.logger, dbV2.db);
          const enhanced = await enhancer.enhanceProgressiveOutput(output, level, projectId);
          Object.assign(output, enhanced);
        }
      } catch (error) {
        this.logger.warn('Failed to enhance Progressive Output', { error: error.message });
      }
    }

    // Format as document
    output.document = this.formatDocument(output.data, level);

    return output;
  }

  /**
   * Format document for specific level
   * @param {Object} data - Level data
   * @param {string} level - Output level
   * @returns {string} Formatted markdown document
   */
  formatDocument(data, level) {
    const formatters = {
      L1_DISCOVERY: () => this.formatDiscoveryDocument(data),
      L2_PLANNING: () => this.formatPlanningDocument(data),
      L3_ARCHITECTURE: () => this.formatArchitectureDocument(data),
      L4_IMPLEMENTATION: () => this.formatImplementationDocument(data),
      L5_COMPLETE: () => this.formatCompleteDocument(data)
    };

    const formatter = formatters[level];
    if (!formatter) {
      throw new Error(`No formatter for level: ${level}`);
    }

    return formatter();
  }

  /**
   * Format L1 Discovery document
   */
  formatDiscoveryDocument(data) {
    const discovery = data.discovery || {};
    
    return `# Project Scope Discovery

## Executive Summary

${discovery.summary || 'Project summary'}

## Key Features

${(discovery.keyFeatures || []).map(f => `- **${f.name}**: ${f.description}`).join('\n')}

## Initial Estimates

- **Timeline**: ${discovery.roughEstimate?.timeline || 'TBD'}
- **Budget Range**: ${discovery.roughEstimate?.budget || 'TBD'}

## Feasibility Assessment

${discovery.feasibility || 'Assessment pending'}

---

*This is a Level 1 Discovery document. For detailed planning with modules and milestones, upgrade to Level 2.*
`;
  }

  /**
   * Format L2 Planning document
   */
  formatPlanningDocument(data) {
    const discovery = data.discovery || {};
    const planning = data.planning || {};
    
    return `# Project Planning Document

${this.formatDiscoveryDocument({ discovery })}

## Detailed Planning

### Modules Identified

${(planning.modules || []).map(m => `- **${m.name || m.displayName}**: ${m.description || ''}`).join('\n')}

### Detailed Features

${(planning.detailedFeatures || []).map(f => `- **${f.name}** (${f.priority} priority): ${f.description}`).join('\n')}

### Project Milestones

${(planning.milestones || []).map(m => `- **Week ${m.week}**: ${m.name} - ${m.description}`).join('\n')}

### Identified Risks

${(planning.risks || []).map(r => `- **${r.type}** (${r.severity}): ${r.description}`).join('\n')}

### Recommended Team

- **Size**: ${planning.teamComposition?.size || 'TBD'} members
- **Roles**: ${(planning.teamComposition?.roles || []).join(', ')}
- **Description**: ${planning.teamComposition?.description || ''}

### Module Dependencies

${(planning.dependencies || []).map(d => `- **${d.module}**: Depends on ${d.dependsOn.join(', ') || 'none'}`).join('\n')}

---

*This is a Level 2 Planning document. For technical architecture and system design, upgrade to Level 3.*
`;
  }

  /**
   * Format L3 Architecture document
   */
  formatArchitectureDocument(data) {
    const discovery = data.discovery || {};
    const planning = data.planning || {};
    const architecture = data.architecture || {};
    
    return `# Technical Architecture Document

${this.formatPlanningDocument({ discovery, planning })}

## System Architecture

### Architecture Type

- **Type**: ${architecture.systemDesign?.type || 'N/A'}
- **Pattern**: ${architecture.systemDesign?.pattern || 'N/A'}
- **Description**: ${architecture.systemDesign?.description || ''}
- **Services**: ${(architecture.systemDesign?.services || []).join(', ')}

### Database Design

- **Type**: ${architecture.databaseSchema?.type || 'N/A'}
- **Entities**: ${architecture.databaseSchema?.entities?.length || 0} main entities
- **Description**: ${architecture.databaseSchema?.description || ''}

### API Structure

- **Style**: ${architecture.apiStructure?.style || 'N/A'}
- **Endpoints**: ${architecture.apiStructure?.endpoints?.length || 0} main endpoints
- **Authentication**: ${architecture.apiStructure?.authentication || 'N/A'}

### Technology Stack

- **Frontend**: ${architecture.techStack?.frontend || 'N/A'}
- **Backend**: ${architecture.techStack?.backend || 'N/A'}
- **Database**: ${architecture.techStack?.database || 'N/A'}
- **Deployment**: ${architecture.techStack?.deployment || 'N/A'}

### Integrations

${(architecture.integrations || []).map(i => `- **${i.type}**: ${i.provider}`).join('\n')}

### Scalability Plan

- **Horizontal Scaling**: ${architecture.scalabilityPlan?.horizontal || 'N/A'}
- **Caching**: ${architecture.scalabilityPlan?.caching || 'N/A'}
- **Load Balancing**: ${architecture.scalabilityPlan?.loadBalancing || 'N/A'}
- **CDN**: ${architecture.scalabilityPlan?.cdn || 'N/A'}

---

*This is a Level 3 Architecture document. For implementation details with pseudocode and sprints, upgrade to Level 4.*
`;
  }

  /**
   * Format L4 Implementation document
   */
  formatImplementationDocument(data) {
    const discovery = data.discovery || {};
    const planning = data.planning || {};
    const architecture = data.architecture || {};
    const implementation = data.implementation || {};
    
    return `# Implementation Blueprint

${this.formatArchitectureDocument({ discovery, planning, architecture })}

## Implementation Details

### Component Specifications

${(implementation.components || []).map(c => `
#### ${c.name}

- **Type**: ${c.type}
- **Responsibilities**: ${(c.responsibilities || []).join(', ')}
- **Interfaces**: ${JSON.stringify(c.interfaces, null, 2)}
`).join('\n')}

### Pseudocode (50% Coverage)

${(implementation.pseudocode || []).map(p => `
#### ${p.component}

\`\`\`
${p.pseudocode}
\`\`\`
`).join('\n')}

### Sprint Plan

${(implementation.sprints || []).map(s => `
#### Sprint ${s.sprint} (Weeks ${s.weeks})

- **Modules**: ${(s.modules || []).join(', ')}
- **Goals**: ${s.goals}
`).join('\n')}

### Test Scenarios

${(implementation.testScenarios || []).map(t => `
#### ${t.module}

${(t.testCases || []).map(tc => `- ${tc}`).join('\n')}
`).join('\n')}

### Deployment Strategy

- **Environment**: ${implementation.deploymentStrategy?.environment || 'N/A'}
- **Staging**: ${implementation.deploymentStrategy?.staging || 'N/A'}
- **Production**: ${implementation.deploymentStrategy?.production || 'N/A'}
- **Monitoring**: ${implementation.deploymentStrategy?.monitoring || 'N/A'}

### CI/CD Pipeline

- **Source Control**: ${implementation.cicdPipeline?.sourceControl || 'N/A'}
- **CI**: ${implementation.cicdPipeline?.ci || 'N/A'}
- **CD**: ${implementation.cicdPipeline?.cd || 'N/A'}
- **Stages**: ${(implementation.cicdPipeline?.stages || []).join(' → ')}

---

*This is a Level 4 Implementation document. For complete package with code templates and DevOps configs, upgrade to Level 5.*
`;
  }

  /**
   * Format L5 Complete document
   */
  formatCompleteDocument(data) {
    const discovery = data.discovery || {};
    const planning = data.planning || {};
    const architecture = data.architecture || {};
    const implementation = data.implementation || {};
    const complete = data.complete || {};
    
    return `# Complete Development Package

${this.formatImplementationDocument({ discovery, planning, architecture, implementation })}

## Complete Package

### Full Pseudocode (95% Coverage)

${(complete.fullPseudocode || []).map(p => `
#### ${p.component}

\`\`\`
${p.pseudocode}
\`\`\`
`).join('\n')}

### Code Templates

${(complete.codeTemplates || []).map(t => `
#### ${t.component}

**Language**: ${t.language}
**Framework**: ${t.framework}

\`\`\`
${t.template}
\`\`\`
`).join('\n')}

### DevOps Configurations

- **Docker**: ${complete.devopsConfig?.docker || 'N/A'}
- **Kubernetes**: ${complete.devopsConfig?.kubernetes || 'N/A'}
- **Terraform**: ${complete.devopsConfig?.terraform || 'N/A'}
- **Monitoring**: ${complete.devopsConfig?.monitoring || 'N/A'}
- **Logging**: ${complete.devopsConfig?.logging || 'N/A'}

### Documentation Templates

- **API**: ${complete.documentation?.api || 'N/A'}
- **User**: ${complete.documentation?.user || 'N/A'}
- **Technical**: ${complete.documentation?.technical || 'N/A'}
- **Deployment**: ${complete.documentation?.deployment || 'N/A'}
- **Maintenance**: ${complete.documentation?.maintenance || 'N/A'}

### Post-Launch Plan

- **Monitoring**: ${complete.postLaunchPlan?.monitoring || 'N/A'}
- **Analytics**: ${complete.postLaunchPlan?.analytics || 'N/A'}
- **Support**: ${complete.postLaunchPlan?.support || 'N/A'}
- **Updates**: ${complete.postLaunchPlan?.updates || 'N/A'}
- **Scaling**: ${complete.postLaunchPlan?.scaling || 'N/A'}

### Maintenance Guide

#### Regular Maintenance

${(complete.maintenanceGuide?.regular || []).map(item => `- ${item}`).join('\n')}

#### Monitoring

${(complete.maintenanceGuide?.monitoring || []).map(item => `- ${item}`).join('\n')}

#### Backup Strategy

${complete.maintenanceGuide?.backup || 'N/A'}

---

*This is the complete Level 5 package with everything needed for development.*
`;
  }

  /**
   * Generate teaser for next level
   */
  generateTeaser(analysis, nextLevel) {
    const teasers = {
      L2_PLANNING: `See ${(analysis.planning?.modules || []).length} detailed modules, ${(analysis.planning?.risks || []).length} identified risks, and complete milestone planning`,
      L3_ARCHITECTURE: `Get complete system architecture, database design, API structure, and technology stack recommendations`,
      L4_IMPLEMENTATION: `Access sprint planning, 50% pseudocode coverage, component specifications, and deployment strategy`,
      L5_COMPLETE: `Unlock 95% pseudocode coverage, ready-to-use code templates, DevOps configurations, and complete documentation`
    };

    return teasers[nextLevel] || 'Upgrade to next level for more details';
  }

  /**
   * Get next level after current
   */
  getNextLevel(currentLevel) {
    const levelOrder = ['L1_DISCOVERY', 'L2_PLANNING', 'L3_ARCHITECTURE', 'L4_IMPLEMENTATION', 'L5_COMPLETE'];
    const currentIndex = levelOrder.indexOf(currentLevel);
    if (currentIndex >= 0 && currentIndex < levelOrder.length - 1) {
      return levelOrder[currentIndex + 1];
    }
    return null;
  }

  /**
   * Record level access/upgrade
   */
  async recordLevelAccess(projectId, level) {
    const { getDbV2 } = require('../database/db-manager-v2');
    const dbV2 = getDbV2();
    
    if (!dbV2) {
      this.logger.warn('Database not available for recording level access');
      return;
    }

    try {
      // Get current upgrades
      const project = dbV2.db.prepare('SELECT level_upgrades, output_level FROM projects WHERE id = ? OR project_code = ?').get(projectId, projectId);
      const upgrades = project?.level_upgrades ? JSON.parse(project.level_upgrades) : [];
      
      // Add new upgrade if not already recorded
      if (!upgrades.includes(level)) {
        upgrades.push({
          level: level,
          accessedAt: new Date().toISOString()
        });
        
        // Update database
        dbV2.db.prepare(`
          UPDATE projects 
          SET level_upgrades = ?, output_level = ?
          WHERE id = ? OR project_code = ?
        `).run(JSON.stringify(upgrades), level, projectId, projectId);
        
        this.logger.info('Level access recorded', { projectId, level });
      }
    } catch (error) {
      this.logger.error('Failed to record level access', { error: error.message, projectId, level });
    }
  }

  /**
   * Get available levels for project
   */
  getAvailableLevels(projectId) {
    const levelList = Object.entries(this.levels).map(([key, config]) => ({
      level: key,
      name: config.name,
      tagline: config.tagline,
      price: this.trainingMode ? 0 : config.price,
      depth: config.depth,
      description: config.description,
      includes: config.includes
    }));

    return {
      levels: levelList,
      trainingMode: this.trainingMode,
      defaultLevel: 'L1_DISCOVERY'
    };
  }

  /**
   * Upgrade from one level to another
   */
  async upgradeOutput(projectId, fromLevel, toLevel) {
    // Get both outputs
    const fromOutput = await this.deliverOutput(projectId, fromLevel);
    const toOutput = await this.deliverOutput(projectId, toLevel);

    // Extract delta (new content)
    const delta = this.extractDelta(fromOutput.data, toOutput.data);

    return {
      fromLevel: fromLevel,
      toLevel: toLevel,
      delta: delta,
      newContent: toOutput.document,
      previousContent: fromOutput.document
    };
  }

  /**
   * Extract delta between two data objects
   */
  extractDelta(fromData, toData) {
    const delta = {};
    
    Object.keys(toData).forEach(key => {
      if (!fromData[key] || JSON.stringify(fromData[key]) !== JSON.stringify(toData[key])) {
        delta[key] = toData[key];
      }
    });

    return delta;
  }
}

module.exports = OutputDeliveryController;

