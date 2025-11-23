/**
 * Level Generator
 * 
 * Generates 5 progressive documentation levels where each level includes
 * all previous levels + adds new depth.
 * 
 * Level 1: Executive Summary (3-5 pages)
 * Level 2: Business Scope (15-20 pages) - includes L1
 * Level 3: Detailed Planning (40-50 pages) - includes L1+L2
 * Level 4: Technical Blueprint (80-100 pages) - includes L1+L2+L3
 * Level 5: Implementation Guide (150-200 pages) - includes L1+L2+L3+L4 + 95% pseudocode
 */

const Ajv = require('ajv');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getComplexityDays } = require('../utils/module-utils');
const Formatters = require('../utils/formatters');
const { handleError, wrapError, ErrorTypes } = require('../core/errors/ErrorHandler');
const { validateRequired, validateObject, validateArray, validateNumber } = require('../utils/validators');

// Get engine version from package.json
const packageJson = require('../../package.json');
const ENGINE_VERSION = packageJson.version || '1.0.0';

/**
 * Level Generator Module
 * 
 * Generates 5 progressive documentation levels where each level includes
 * all previous levels + adds new depth.
 * 
 * @class LevelGenerator
 */
class LevelGenerator {
  /**
   * Create a LevelGenerator instance
   * @param {Object} logger - Logger instance
   * @param {Object} library - Library instance
   */
  constructor(logger, library) {
    this.logger = logger || console;
    this.library = library;
    this.ajv = new Ajv({ allErrors: true });
    this.loadSchemas();
    this.engineVersion = packageJson.version || '1.0.0';
    
    // Performance targets (in seconds)
    this.performanceTargets = {
      1: parseInt(process.env.DOC_TARGETS_L1) || 10,
      2: parseInt(process.env.DOC_TARGETS_L2) || 20,
      3: parseInt(process.env.DOC_TARGETS_L3) || 40,
      4: parseInt(process.env.DOC_TARGETS_L4) || 60,
      5: parseInt(process.env.DOC_TARGETS_L5) || 120
    };
  }
  
  /**
   * Load JSON schemas for validation
   */
  loadSchemas() {
    const schemaDir = path.join(__dirname, '../../schemas/levels');
    const schemaFiles = ['level1.schema.json', 'level2.schema.json', 'level3.schema.json', 'level4.schema.json', 'level5.schema.json'];
    
    schemaFiles.forEach(file => {
      try {
        const schemaPath = path.join(schemaDir, file);
        if (fs.existsSync(schemaPath)) {
          const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
          const level = parseInt(file.match(/level(\d)/)[1]);
          this.ajv.addSchema(schema, `level${level}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to load schema ${file}:`, error.message);
      }
    });
  }
  
  /**
   * Validate level structure against JSON schema
   */
  validateLevelStructure(levelData, level) {
    const schemaName = `level${level}`;
    const validate = this.ajv.getSchema(schemaName);
    
    if (!validate) {
      this.logger.warn(`Schema for level ${level} not found, skipping validation`);
      return { valid: true };
    }
    
    const valid = validate(levelData);
    
    if (!valid) {
      const errors = validate.errors.map(err => ({
        path: err.instancePath || err.schemaPath,
        message: err.message,
        params: err.params
      }));
      
      this.logger.error(`Level ${level} structure validation failed:`, errors);
      
      // In local dev, fail hard; in CI, log but continue
      if (process.env.NODE_ENV !== 'production' && process.env.CI !== 'true') {
        throw new Error(`Level ${level} structure validation failed: ${JSON.stringify(errors, null, 2)}`);
      }
      
      return { valid: false, errors };
    }
    
    return { valid: true };
  }
  
  /**
   * Generate stable anchor ID from section number
   */
  generateAnchorId(sectionNumber) {
    return `section-${sectionNumber.replace(/\./g, '-')}`;
  }
  
  /**
   * Add module tag to section
   */
  addModuleTag(section, moduleName) {
    if (!section.metadata) {
      section.metadata = {};
    }
    section.metadata.module = moduleName;
    return section;
  }

  /**
   * Generate a specific level
   * @param {number} level - Level number (1-5)
   * @param {Object} lockedScope - Locked scope object
   * @param {Array} previousLevels - Previously generated levels
   * @param {Object} chainResult - Complete chain execution result
   * @param {string} projectId - Project ID for enhancement
   * @returns {Object} Generated level data
   */
  async generateLevel(level, lockedScope, previousLevels = [], chainResult = {}, projectId = null) {
    try {
      // Validate required parameters
      validateRequired(level, 'level');
      validateNumber(level, 'level', { min: 1, max: 5, allowFloat: false });
      validateRequired(lockedScope, 'lockedScope');
      validateObject(lockedScope, 'lockedScope', ['modules']);
      validateArray(lockedScope.modules, 'lockedScope.modules', true);
      
      const startTime = Date.now();
      this.logger.info(`Generating Level ${level}`, { 
        moduleCount: lockedScope.modules.length 
      });

      let levelData;
    
    switch(level) {
      case 1:
        levelData = await this.generateLevel1(lockedScope, chainResult);
        break;
      case 2:
        levelData = await this.generateLevel2(lockedScope, previousLevels[0], chainResult);
        break;
      case 3:
        levelData = await this.generateLevel3(lockedScope, previousLevels[0], previousLevels[1], chainResult);
        break;
      case 4:
        levelData = await this.generateLevel4(lockedScope, previousLevels[0], previousLevels[1], previousLevels[2], chainResult);
        break;
      case 5:
        levelData = await this.generateLevel5(lockedScope, previousLevels[0], previousLevels[1], previousLevels[2], previousLevels[3], chainResult);
        break;
      default:
        throw new Error(`Invalid level: ${level}. Must be 1-5.`);
    }
    
    // Enhance with function-level data if available
    if (projectId && level >= 2) {
      try {
        const ProgressiveEnhancer = require('../core/enhancement/ProgressiveEnhancer');
        const { getDbV2 } = require('../database/db-manager-v2');
        const dbV2 = getDbV2();
        
        if (dbV2) {
          const enhancer = new ProgressiveEnhancer(this.logger, dbV2.db);
          levelData = await enhancer.enhanceProgressiveDocumentation(levelData, level, projectId);
        }
      } catch (error) {
        this.logger.warn('Failed to enhance Progressive Documentation', { 
          level, 
          error: error.message 
        });
      }
    }
    
    // Add stable anchor IDs and module tags
    levelData = this.addStableAnchors(levelData, lockedScope);
    
    // Validate structure
    const validation = this.validateLevelStructure(levelData, level);
    if (!validation.valid) {
      this.logger.warn(`Level ${level} validation errors:`, validation.errors);
    }
    
    // Calculate generation time
    const generationTime = (Date.now() - startTime) / 1000; // Convert to seconds
    const target = this.performanceTargets[level];
    
    // Add performance metadata
    if (!levelData.metadata) {
      levelData.metadata = {};
    }
    levelData.metadata.generationTime = generationTime;
    levelData.metadata.targetTime = target;
    levelData.metadata.performancePassed = generationTime <= target;
    levelData.metadata.engineVersion = this.engineVersion;
    
    // Log performance warning if exceeded
    if (generationTime > target) {
      this.logger.warn(`Level ${level} generation time ${generationTime.toFixed(2)}s exceeded target ${target}s by ${(generationTime - target).toFixed(2)}s`);
    }
    
    // For L5, calculate pseudocode coverage
    if (level === 5) {
      const coverage = this.calculatePseudocodeCoverage(lockedScope, levelData);
      levelData.metadata.pseudocodeCoverage = coverage;
      
      if (coverage.coverage < 0.95) {
        this.logger.warn(`Level 5 pseudocode coverage ${(coverage.coverage * 100).toFixed(1)}% is below 95% threshold`);
      }
    }
    
    return levelData;
  }
  
  /**
   * Add stable anchor IDs to all sections
   */
  addStableAnchors(levelData, lockedScope) {
    const addAnchorsRecursive = (sections, parentNumber = '') => {
      Object.entries(sections).forEach(([key, section]) => {
        // Generate anchor ID
        const sectionNumber = parentNumber ? `${parentNumber}.${key}` : key;
        const anchorId = this.generateAnchorId(sectionNumber);
        
        if (!section.metadata) {
          section.metadata = {};
        }
        section.metadata.anchorId = anchorId;
        section.metadata.sectionNumber = sectionNumber;
        
        // Add module tag if section relates to a module
        if (section.content && typeof section.content === 'object') {
          // Try to match module name in section title or content
          const sectionText = (section.title || '') + ' ' + JSON.stringify(section.content);
          const matchingModule = lockedScope.modules.find(m => {
            const name = m.name.toLowerCase();
            return sectionText.toLowerCase().includes(name);
          });
          
          if (matchingModule) {
            section.metadata.module = matchingModule.name;
            section.metadata.moduleId = matchingModule.id;
          }
          
          // Recursively process nested sections
          addAnchorsRecursive(section.content, sectionNumber);
        }
      });
    };
    
    if (levelData.sections) {
      addAnchorsRecursive(levelData.sections);
    }
    
    return levelData;
  }
  
  /**
   * Calculate pseudocode coverage for L5
   */
  calculatePseudocodeCoverage(lockedScope, levelData) {
    // Count expected pseudocode blocks
    const expectedBlocks = lockedScope.modules.reduce((sum, m) => {
      // Each module should have: controller, service, model, validation, business rules
      // Plus one per feature if features exist
      const baseBlocks = 5; // controller, service, model, validation, business rules
      const featureBlocks = (m.features && m.features.length > 0) ? m.features.length : 0;
      return sum + baseBlocks + featureBlocks;
    }, 0);
    
    // Count actual pseudocode blocks in level data
    let actualBlocks = 0;
    
    const countBlocksRecursive = (obj) => {
      if (typeof obj === 'string' && obj.includes('```')) {
        // Count code blocks in string content
        const matches = obj.match(/```[\w]*\n[\s\S]*?```/g);
        if (matches) {
          actualBlocks += matches.length;
        }
      } else if (obj && typeof obj === 'object') {
        if (obj.pseudocode) {
          actualBlocks++;
        }
        Object.values(obj).forEach(value => {
          if (typeof value === 'object' || typeof value === 'string') {
            countBlocksRecursive(value);
          }
        });
      }
    };
    
    // Count in Part V (implementation section)
    if (levelData.sections && levelData.sections['Part V'] && levelData.sections['Part V'].content) {
      countBlocksRecursive(levelData.sections['Part V'].content);
    }
    
    const coverage = expectedBlocks > 0 ? actualBlocks / expectedBlocks : 0;
    
    return {
      expected: expectedBlocks,
      actual: actualBlocks,
      coverage: coverage,
      meetsThreshold: coverage >= 0.95
    };
  }

  /**
   * Generate Level 1: Executive Summary
   */
  async generateLevel1(lockedScope, chainResult) {
    const estimate = chainResult.estimate || {};
    const modules = lockedScope.modules;
    const moduleCount = modules.length;

    // Group modules by category for summary
    const categorySummary = {};
    modules.forEach(m => {
      const cat = m.category || 'General';
      categorySummary[cat] = (categorySummary[cat] || 0) + 1;
    });

    const level1 = {
      level: 1,
      title: 'Executive Summary',
      pages: 3,
      generatedAt: new Date().toISOString(),
      sections: {
        '1.0': {
          title: 'Project Overview',
          content: {
            '1.1': {
              title: 'Project Name & Description',
              content: chainResult.projectName || 'Software Development Project'
            },
            '1.2': {
              title: 'Business Objectives',
              content: this.generateBusinessObjectives(chainResult)
            },
            '1.3': {
              title: 'Success Criteria',
              content: this.generateSuccessCriteria(chainResult)
            }
          }
        },
        '2.0': {
          title: 'Scope Summary',
          content: {
            '2.1': {
              title: 'Total Modules',
              content: `**${moduleCount} modules** identified across ${Object.keys(categorySummary).length} categories`
            },
            '2.2': {
              title: 'Module Categories',
              content: Object.entries(categorySummary).map(([cat, count]) => 
                `- **${cat}**: ${count} modules`
              ).join('\n')
            },
            '2.3': {
              title: 'Detailed Module List',
              content: `→ See Level 2, Section 3.0 for complete module list with all ${moduleCount} modules`
            }
          }
        },
        '3.0': {
          title: 'Investment Summary',
          content: {
            '3.1': {
              title: 'Total Cost',
              content: this.formatCost(estimate?.cost?.total || estimate?.estimate?.cost?.total || estimate?.cost || 0)
            },
            '3.2': {
              title: 'Timeline',
              content: this.formatTimeline(estimate.timeline || estimate.estimate?.timeline || estimate.weeks || estimate.estimate?.timeline?.weeks || 'TBD')
            },
            '3.3': {
              title: 'Team Size',
              content: this.calculateTeamSize(moduleCount)
            },
            '3.4': {
              title: 'Cost Breakdown',
              content: `→ See Level 2, Section 5.0 for detailed cost breakdown by module`
            }
          }
        },
        '4.0': {
          title: 'Key Risks',
          content: {
            '4.1': {
              title: 'Top 3 Risks',
              content: this.identifyTopRisks(chainResult, 3)
            },
            '4.2': {
              title: 'Complete Risk Analysis',
              content: `→ See Level 3, Section 8.0 for complete risk analysis`
            }
          }
        },
        '5.0': {
          title: 'Recommendation',
          content: {
            '5.1': {
              title: 'Go/No-Go Decision',
              content: this.generateRecommendation(chainResult)
            },
            '5.2': {
              title: 'Next Steps',
              content: '1. Review Level 2 for detailed business scope\n2. Proceed to Level 3 for detailed planning\n3. Generate Level 4 for technical architecture'
            }
          }
        }
      },
      appendices: {
        'Appendix A': {
          title: 'Index to Level 2 Sections',
          content: this.generateLevel2Index(lockedScope)
        },
        'Appendix B': {
          title: 'Glossary',
          content: this.generateGlossary()
        }
      },
      crossReferences: this.generateCrossReferences(1, lockedScope)
    };

    return level1;
  }

  /**
   * Generate Level 2: Business Scope
   */
  async generateLevel2(lockedScope, level1, chainResult) {
    // Handle both chainResult.estimate and chainResult.estimate.estimate
    const estimate = chainResult.estimate || {};
    const modules = lockedScope.modules;

    const level2 = {
      level: 2,
      title: 'Business Scope Document',
      pages: 15,
      generatedAt: new Date().toISOString(),
      includesPreviousLevels: [1],
      sections: {
        'Part I': {
          title: 'Executive Summary (from Level 1)',
          content: level1.sections
        },
        'Part II': {
          title: 'Detailed Business Scope',
          content: {
            '3.0': {
              title: 'Complete Module List',
              content: this.generateCompleteModuleList(modules)
            },
            '4.0': {
              title: 'User Workflows',
              content: this.generateUserWorkflows(modules, chainResult)
            },
            '5.0': {
              title: 'Cost Breakdown',
              content: this.generateCostBreakdown(modules, estimate)
            },
            '6.0': {
              title: 'Timeline & Phases',
              content: this.generateTimelinePhases(modules, estimate || {})
            }
          }
        }
      },
      appendices: {
        'Appendix C': {
          title: 'Module-Feature Matrix',
          content: this.generateModuleFeatureMatrix(modules)
        },
        'Appendix D': {
          title: 'Index to Level 3 Sections',
          content: this.generateLevel3Index(lockedScope)
        }
      },
      crossReferences: this.generateCrossReferences(2, lockedScope)
    };

    return level2;
  }

  /**
   * Generate Level 3: Detailed Planning
   */
  async generateLevel3(lockedScope, level1, level2, chainResult) {
    const modules = lockedScope.modules;

    const level3 = {
      level: 3,
      title: 'Detailed Planning Document',
      pages: 40,
      generatedAt: new Date().toISOString(),
      includesPreviousLevels: [1, 2],
      sections: {
        'Part I': {
          title: 'Business Scope (from Level 2)',
          content: level2.sections
        },
        'Part II': {
          title: 'Detailed Planning',
          content: {
            '7.0': {
              title: 'Detailed User Stories',
              content: this.generateDetailedUserStories(modules)
            },
            '8.0': {
              title: 'Risk Analysis',
              content: this.generateRiskAnalysis(modules, chainResult)
            },
            '9.0': {
              title: 'Resource Planning',
              content: this.generateResourcePlanning(modules, chainResult)
            },
            '10.0': {
              title: 'Testing Strategy',
              content: this.generateTestingStrategy(modules)
            }
          }
        }
      },
      appendices: {
        'Appendix E': {
          title: 'Complete Requirements Traceability Matrix',
          content: this.generateTraceabilityMatrix(modules)
        },
        'Appendix F': {
          title: 'Index to Level 4 Sections',
          content: this.generateLevel4Index(lockedScope)
        }
      },
      crossReferences: this.generateCrossReferences(3, lockedScope)
    };

    return level3;
  }

  /**
   * Generate Level 4: Technical Blueprint
   */
  async generateLevel4(lockedScope, level1, level2, level3, chainResult) {
    const modules = lockedScope.modules;
    const technicalBreakdown = chainResult.technicalBreakdown || {};

    const level4 = {
      level: 4,
      title: 'Technical Blueprint',
      pages: 80,
      generatedAt: new Date().toISOString(),
      includesPreviousLevels: [1, 2, 3],
      sections: {
        'Part I-III': {
          title: 'Business & Planning (from Level 3)',
          content: level3.sections
        },
        'Part IV': {
          title: 'Technical Architecture',
          content: {
            '11.0': {
              title: 'System Architecture',
              content: this.generateSystemArchitecture(modules, technicalBreakdown)
            },
            '12.0': {
              title: 'Database Design',
              content: this.generateDatabaseDesign(modules, technicalBreakdown)
            },
            '13.0': {
              title: 'API Specifications',
              content: this.generateAPISpecifications(modules, technicalBreakdown)
            },
            '14.0': {
              title: 'Component Specifications',
              content: this.generateComponentSpecifications(modules, technicalBreakdown)
            },
            '15.0': {
              title: 'Sprint Planning',
              content: this.generateSprintPlanning(modules, chainResult)
            }
          }
        }
      },
      appendices: {
        'Appendix G': {
          title: 'Technology Stack Details',
          content: this.generateTechStackDetails(technicalBreakdown)
        },
        'Appendix H': {
          title: 'Index to Level 5 Sections',
          content: this.generateLevel5Index(lockedScope)
        }
      },
      crossReferences: this.generateCrossReferences(4, lockedScope)
    };

    return level4;
  }

  /**
   * Generate Level 5: Implementation Guide (95% Pseudocode)
   */
  async generateLevel5(lockedScope, level1, level2, level3, level4, chainResult) {
    const modules = lockedScope.modules;

    const level5 = {
      level: 5,
      title: 'Complete Implementation Guide',
      pages: 150,
      generatedAt: new Date().toISOString(),
      includesPreviousLevels: [1, 2, 3, 4],
      sections: {
        'Part I-IV': {
          title: 'Complete Documentation (from Level 4)',
          content: level4.sections
        },
        'Part V': {
          title: 'Implementation Guide (95% Pseudocode)',
          content: {
            '16.0': {
              title: 'Project Setup',
              content: this.generateProjectSetup(modules)
            },
            '17.0': {
              title: 'Database Implementation',
              content: this.generateDatabaseImplementation(modules, chainResult)
            },
            '18.0': {
              title: 'Backend Implementation (95% Pseudocode)',
              content: await this.generateBackendPseudocode(modules, chainResult)
            },
            '19.0': {
              title: 'Frontend Implementation (95% Pseudocode)',
              content: await this.generateFrontendPseudocode(modules, chainResult)
            },
            '20.0': {
              title: 'Integration Implementation',
              content: this.generateIntegrationImplementation(modules, chainResult)
            },
            '21.0': {
              title: 'Testing Implementation',
              content: this.generateTestingImplementation(modules)
            },
            '22.0': {
              title: 'Deployment Implementation',
              content: this.generateDeploymentImplementation(chainResult)
            }
          }
        }
      },
      appendices: {
        'Appendix I': {
          title: 'Complete Code Index',
          content: this.generateCodeIndex(modules)
        },
        'Appendix J': {
          title: 'Dependencies & Versions',
          content: this.generateDependencies(chainResult)
        },
        'Appendix K': {
          title: 'Troubleshooting Guide',
          content: this.generateTroubleshootingGuide()
        }
      },
      crossReferences: this.generateCrossReferences(5, lockedScope)
    };

    return level5;
  }

  // Helper methods for generating content sections

  generateBusinessObjectives(chainResult) {
    return [
      'Deliver a scalable software solution',
      'Meet all specified functional requirements',
      'Complete within budget and timeline',
      'Ensure high code quality and maintainability'
    ].join('\n');
  }

  generateSuccessCriteria(chainResult) {
    return [
      'All modules implemented and tested',
      'User acceptance criteria met',
      'Performance benchmarks achieved',
      'Documentation complete'
    ].join('\n');
  }

  formatCost(cost) {
    // Use centralized formatter with TBD option
    return Formatters.formatIndianCurrency(cost, { returnTBD: true });
  }

  formatTimeline(timeline) {
    if (typeof timeline === 'number') {
      return `${timeline} weeks`;
    }
    return timeline || 'TBD';
  }

  calculateTeamSize(moduleCount) {
    if (moduleCount <= 5) return '2-3 people';
    if (moduleCount <= 10) return '4-5 people';
    if (moduleCount <= 20) return '6-8 people';
    return '8-12 people';
  }

  identifyTopRisks(chainResult, limit = 3) {
    const risks = [];
    const estimate = chainResult.estimate || {};
    
    if (estimate.confidence < 0.7) {
      risks.push('Low confidence in estimates - scope may vary');
    }
    
    if (!risks.length) {
      risks.push('Potential scope changes during development');
      risks.push('Integration complexity with third-party services');
      risks.push('Resource availability and timeline constraints');
    }

    return risks.slice(0, limit).map((r, i) => `${i + 1}. ${r}`).join('\n');
  }

  generateRecommendation(chainResult) {
    return 'Proceed with project. Review detailed scope in Level 2 before final approval.';
  }

  generateLevel2Index(lockedScope) {
    return [
      '3.0 - Complete Module List',
      '4.0 - User Workflows',
      '5.0 - Cost Breakdown',
      '6.0 - Timeline & Phases'
    ].join('\n');
  }

  generateGlossary() {
    return [
      '**Module**: A self-contained functional unit of the system',
      '**Feature**: A specific capability within a module',
      '**Sprint**: A 2-week development cycle',
      '**API**: Application Programming Interface'
    ].join('\n\n');
  }

  generateCompleteModuleList(modules) {
    const content = {};
    let sectionIndex = 3.1;
    
    // Group by category
    const byCategory = {};
    modules.forEach(m => {
      const cat = m.category || 'General';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(m);
    });

    Object.entries(byCategory).forEach(([category, categoryModules]) => {
      content[`${sectionIndex}`] = {
        title: `${category} Module (${categoryModules.length} modules)`,
        content: categoryModules.map((m, idx) => {
          const subSection = `${sectionIndex}.${idx + 1}`;
          return {
            [subSection]: {
              title: m.name,
              content: m.description || `Module: ${m.name}`,
              features: m.features || [],
              detailsIn: `→ Technical specs in Level 4, Section 13.0`
            }
          };
        }).reduce((acc, obj) => ({ ...acc, ...obj }), {})
      };
      sectionIndex += 0.1;
    });

    return content;
  }

  generateUserWorkflows(modules, chainResult) {
    return {
      '4.1': {
        title: 'Employer Workflows',
        content: 'Workflow descriptions...'
      },
      '4.2': {
        title: 'Employee Workflows',
        content: 'Workflow descriptions...'
      },
      '4.3': {
        title: 'Admin Workflows',
        content: 'Workflow descriptions...'
      }
    };
  }

  generateCostBreakdown(modules, estimate) {
    // Calculate cost per module based on complexity and effort
    // Use same mapping as Estimator for consistency
    const hourlyRate = estimate.hourly_rate || estimate.estimate?.hourly_rate || 85;
    const hoursPerDay = 6;
    
    // Calculate total effort days
    let totalEffortDays = 0;
    const moduleEfforts = modules.map(m => {
      const baseDays = getComplexityDays(m.complexity);
      
      // Adjust for reusable modules
      let moduleDays = baseDays;
      if (m.reusable) {
        moduleDays *= 0.5;
      }
      
      // Adjust for dependencies (integration tax)
      if (m.deps && m.deps.length > 0) {
        const depCount = m.deps.length;
        const integrationTax = Math.min(depCount * 0.1, 0.3); // Max 30% tax
        moduleDays *= (1 + integrationTax);
      }
      
      totalEffortDays += moduleDays;
      return {
        module: m,
        days: moduleDays,
        cost: moduleDays * hoursPerDay * hourlyRate
      };
    });
    
    // If we have a total cost from estimate, scale to match
    const estimatedTotal = estimate.cost?.total || 0;
    if (estimatedTotal > 0) {
      const calculatedTotal = moduleEfforts.reduce((sum, e) => sum + e.cost, 0);
      const scaleFactor = calculatedTotal > 0 ? estimatedTotal / calculatedTotal : 1;
      
      moduleEfforts.forEach(e => {
        e.cost *= scaleFactor;
      });
    }
    
    // Add breakdown adjustments if available
    // Handle both estimate.cost.breakdown and estimate.estimate.cost.breakdown
    const breakdown = estimate.cost?.breakdown || estimate.estimate?.cost?.breakdown || {};
    const adjustments = {
      reuse_discount: breakdown.reuse_discount || 0,
      complexity_adjustment: breakdown.complexity_adjustment || 0,
      risk_buffer: breakdown.risk_buffer || 0
    };
    
    return moduleEfforts.map((effort, idx) => {
      const moduleCost = Math.ceil(effort.cost);
      const moduleName = effort.module.name || effort.module.displayName || `Module ${idx + 1}`;
      
      return {
        [`5.${idx + 1}`]: {
          title: `${moduleName}: ${this.formatCost(moduleCost)}`,
          content: [
            `**Effort**: ${effort.days.toFixed(1)} days`,
            `**Complexity**: ${effort.module.complexity || 'medium'}`,
            `**Base Cost**: ${this.formatCost(moduleCost)}`,
            effort.module.reusable ? `**Reusable**: 50% discount applied` : '',
            effort.module.deps && effort.module.deps.length > 0 
              ? `**Dependencies**: ${effort.module.deps.join(', ')} (integration tax applied)`
              : ''
          ].filter(Boolean).join('\n\n')
        }
      };
    }).reduce((acc, obj) => ({ ...acc, ...obj }), {
      '5.0': {
        title: 'Cost Summary',
        content: [
          `**Total Modules**: ${modules.length}`,
          `**Total Effort**: ${totalEffortDays.toFixed(1)} days`,
          `**Total Cost**: ${this.formatCost(estimatedTotal || moduleEfforts.reduce((sum, e) => sum + e.cost, 0))}`,
          adjustments.reuse_discount < 0 ? `**Reuse Discount**: ${this.formatCost(Math.abs(adjustments.reuse_discount))}` : '',
          adjustments.complexity_adjustment > 0 ? `**Complexity Adjustment**: ${this.formatCost(adjustments.complexity_adjustment)}` : '',
          adjustments.risk_buffer > 0 ? `**Risk Buffer**: ${this.formatCost(adjustments.risk_buffer)}` : ''
        ].filter(Boolean).join('\n\n')
      }
    });
  }

  generateTimelinePhases(modules, estimate) {
    const totalWeeks = estimate.weeks || estimate.timeline?.weeks || 12;
    
    // Calculate effort per module
    const moduleEfforts = modules.map(m => {
      const baseDays = getComplexityDays(m.complexity);
      let days = baseDays;
      
      if (m.reusable) days *= 0.5;
      if (m.deps && m.deps.length > 0) {
        days *= (1 + Math.min(m.deps.length * 0.1, 0.3));
      }
      
      return {
        module: m,
        days: days,
        priority: m.priority || 'medium',
        phase: m.phase || 1
      };
    });
    
    // Group by phase (respecting dependencies)
    const phases = { 1: [], 2: [], 3: [] };
    moduleEfforts.forEach(effort => {
      const phase = effort.phase || 1;
      if (phase <= 3) {
        phases[phase].push(effort);
      }
    });
    
    // Calculate weeks per phase
    const daysPerWeek = 5;
    const phase1Weeks = Math.ceil(phases[1].reduce((sum, e) => sum + e.days, 0) / daysPerWeek);
    const phase2Weeks = Math.ceil(phases[2].reduce((sum, e) => sum + e.days, 0) / daysPerWeek);
    const phase3Weeks = Math.ceil(phases[3].reduce((sum, e) => sum + e.days, 0) / daysPerWeek);
    
    let currentWeek = 1;
    
    return {
      '6.0': {
        title: 'Timeline Overview',
        content: [
          `**Total Duration**: ${totalWeeks} weeks`,
          `**Phase 1**: Weeks 1-${phase1Weeks} (${phases[1].length} modules)`,
          `**Phase 2**: Weeks ${phase1Weeks + 1}-${phase1Weeks + phase2Weeks} (${phases[2].length} modules)`,
          `**Phase 3**: Weeks ${phase1Weeks + phase2Weeks + 1}-${totalWeeks} (${phases[3].length} modules)`
        ].join('\n\n')
      },
      '6.1': {
        title: `Phase 1: Core Modules (Weeks 1-${phase1Weeks})`,
        content: [
          `**Modules**: ${phases[1].map(e => e.module.name).join(', ')}`,
          `**Total Effort**: ${phases[1].reduce((sum, e) => sum + e.days, 0).toFixed(1)} days`,
          `**Focus**: Critical and high-priority modules with dependencies`
        ].join('\n\n')
      },
      '6.2': {
        title: `Phase 2: Extended Features (Weeks ${phase1Weeks + 1}-${phase1Weeks + phase2Weeks})`,
        content: [
          `**Modules**: ${phases[2].map(e => e.module.name).join(', ')}`,
          `**Total Effort**: ${phases[2].reduce((sum, e) => sum + e.days, 0).toFixed(1)} days`,
          `**Focus**: Medium-priority modules and integrations`
        ].join('\n\n')
      },
      '6.3': {
        title: `Phase 3: Enhancements (Weeks ${phase1Weeks + phase2Weeks + 1}-${totalWeeks})`,
        content: [
          `**Modules**: ${phases[3].map(e => e.module.name).join(', ')}`,
          `**Total Effort**: ${phases[3].reduce((sum, e) => sum + e.days, 0).toFixed(1)} days`,
          `**Focus**: Low-priority modules and nice-to-have features`
        ].join('\n\n')
      }
    };
  }

  generateModuleFeatureMatrix(modules) {
    return modules.map(m => 
      `| ${m.name} | ${m.category} | ${m.features?.length || 0} features | ${m.priority} |`
    ).join('\n');
  }

  generateLevel3Index(lockedScope) {
    return [
      '7.0 - Detailed User Stories',
      '8.0 - Risk Analysis',
      '9.0 - Resource Planning',
      '10.0 - Testing Strategy'
    ].join('\n');
  }

  generateDetailedUserStories(modules) {
    const content = {};
    let sectionIndex = 7.1;
    
    modules.forEach((module, idx) => {
      content[`${sectionIndex}`] = {
        title: `Module ${idx + 1}: ${module.name}`,
        content: {
          [`${sectionIndex}.1`]: {
            title: 'User Stories',
            content: `As a user, I want to use ${module.name}...`
          },
          [`${sectionIndex}.2`]: {
            title: 'Acceptance Criteria',
            content: 'Criteria for module completion...'
          },
          [`${sectionIndex}.3`]: {
            title: 'Edge Cases',
            content: 'Edge cases to handle...'
          }
        }
      };
      sectionIndex += 0.1;
    });

    return content;
  }

  generateRiskAnalysis(modules, chainResult) {
    return {
      '8.1': {
        title: 'Module-Level Risks',
        content: modules.map(m => `- ${m.name}: Risk description`).join('\n')
      },
      '8.2': {
        title: 'Mitigation Strategies',
        content: 'Strategies to mitigate identified risks'
      },
      '8.3': {
        title: 'Contingency Plans',
        content: 'Plans for handling unexpected issues'
      }
    };
  }

  generateResourcePlanning(modules, chainResult) {
    return {
      '9.1': {
        title: 'Team Structure',
        content: 'Recommended team composition'
      },
      '9.2': {
        title: 'Role Assignments by Module',
        content: 'Role assignments for each module'
      },
      '9.3': {
        title: 'Skills Required',
        content: 'Required skills and expertise'
      }
    };
  }

  generateTestingStrategy(modules) {
    return {
      '10.1': {
        title: 'Test Cases by Module',
        content: modules.map(m => `- ${m.name}: Test scenarios`).join('\n')
      },
      '10.2': {
        title: 'Testing Approach',
        content: 'Unit, integration, and E2E testing approach'
      }
    };
  }

  generateTraceabilityMatrix(modules) {
    return modules.map((m, idx) => 
      `| ${idx + 1} | ${m.name} | ${m.category} | L2-3.${idx + 1} | L4-13.${idx + 1} | L5-18.${idx + 1} |`
    ).join('\n');
  }

  generateLevel4Index(lockedScope) {
    return [
      '11.0 - System Architecture',
      '12.0 - Database Design',
      '13.0 - API Specifications',
      '14.0 - Component Specifications',
      '15.0 - Sprint Planning'
    ].join('\n');
  }

  generateSystemArchitecture(modules, technicalBreakdown) {
    return {
      '11.1': {
        title: 'High-Level Architecture',
        content: 'Architecture diagram and description'
      },
      '11.2': {
        title: 'Component Diagram',
        content: 'Component relationships'
      },
      '11.3': {
        title: 'Data Flow Diagrams',
        content: 'Data flow between components'
      },
      '11.4': {
        title: 'Integration Architecture',
        content: 'Integration points and patterns'
      }
    };
  }

  generateDatabaseDesign(modules, technicalBreakdown) {
    const content = {};
    let sectionIndex = 12.1;
    
    modules.forEach((module, idx) => {
      content[`${sectionIndex}`] = {
        title: `${module.name} Tables`,
        content: {
          [`${sectionIndex}.1`]: {
            title: `${module.name.toLowerCase()}_table`,
            content: {
              [`${sectionIndex}.1.1`]: {
                title: 'Schema Definition (SQL)',
                content: `CREATE TABLE ${module.name.toLowerCase()} (...);`
              },
              [`${sectionIndex}.1.2`]: {
                title: 'Indexes',
                content: 'Index definitions'
              },
              [`${sectionIndex}.1.3`]: {
                title: 'Relationships',
                content: 'Table relationships'
              }
            }
          }
        }
      };
      sectionIndex += 0.1;
    });

    return content;
  }

  generateAPISpecifications(modules, technicalBreakdown) {
    const content = {};
    let sectionIndex = 13.1;
    
    modules.forEach((module, idx) => {
      content[`${sectionIndex}`] = {
        title: `${module.name} Module APIs`,
        content: {
          [`${sectionIndex}.1`]: {
            title: `POST /api/${module.name.toLowerCase()}/create`,
            content: {
              [`${sectionIndex}.1.1`]: 'Request Schema',
              [`${sectionIndex}.1.2`]: 'Response Schema',
              [`${sectionIndex}.1.3`]: 'Error Codes',
              [`${sectionIndex}.1.4`]: 'Business Logic Summary'
            }
          }
        }
      };
      sectionIndex += 0.1;
    });

    return content;
  }

  generateComponentSpecifications(modules, technicalBreakdown) {
    return {
      '14.1': {
        title: 'Frontend Components',
        content: 'Component specifications...'
      },
      '14.2': {
        title: 'Backend Services',
        content: 'Service specifications...'
      }
    };
  }

  generateSprintPlanning(modules, chainResult) {
    const sprints = Math.ceil((chainResult.estimate?.weeks || 12) / 2);
    const modulesPerSprint = Math.ceil(modules.length / sprints);
    
    const content = {};
    for (let i = 0; i < sprints; i++) {
      const sprintModules = modules.slice(i * modulesPerSprint, (i + 1) * modulesPerSprint);
      content[`15.${i + 1}`] = {
        title: `Sprint ${i + 1}: Modules ${i * modulesPerSprint + 1}-${Math.min((i + 1) * modulesPerSprint, modules.length)}`,
        content: {
          [`15.${i + 1}.1`]: {
            title: 'User Stories',
            content: sprintModules.map(m => `- ${m.name}`).join('\n')
          },
          [`15.${i + 1}.2`]: {
            title: 'Story Points',
            content: `${sprintModules.length * 5} story points`
          },
          [`15.${i + 1}.3`]: {
            title: 'Acceptance Criteria',
            content: 'Acceptance criteria for sprint completion'
          }
        }
      };
    }

    return content;
  }

  generateTechStackDetails(technicalBreakdown) {
    return {
      frontend: technicalBreakdown.frontend || 'React',
      backend: technicalBreakdown.backend || 'Node.js',
      database: technicalBreakdown.database || 'PostgreSQL'
    };
  }

  generateLevel5Index(lockedScope) {
    return [
      '16.0 - Project Setup',
      '17.0 - Database Implementation',
      '18.0 - Backend Implementation (95% Pseudocode)',
      '19.0 - Frontend Implementation (95% Pseudocode)',
      '20.0 - Integration Implementation',
      '21.0 - Testing Implementation',
      '22.0 - Deployment Implementation'
    ].join('\n');
  }

  generateProjectSetup(modules) {
    return {
      '16.1': {
        title: 'Development Environment Setup',
        content: 'Setup instructions...'
      },
      '16.2': {
        title: 'Folder Structure',
        content: 'Complete folder structure...'
      },
      '16.3': {
        title: 'Configuration Files',
        content: 'Configuration file templates...'
      }
    };
  }

  generateDatabaseImplementation(modules, chainResult) {
    return {
      '17.1': {
        title: 'Complete SQL Migration Scripts',
        content: modules.map((m, idx) => 
          `**${idx + 1}. ${m.name.toLowerCase()}_table.sql**\n\`\`\`sql\nCREATE TABLE ${m.name.toLowerCase()} (...);\n\`\`\``
        ).join('\n\n')
      },
      '17.2': {
        title: 'Seed Data Scripts',
        content: 'Seed data for development...'
      },
      '17.3': {
        title: 'Database Utility Functions',
        content: 'Utility functions for database operations...'
      }
    };
  }

  async generateBackendPseudocode(modules, chainResult) {
    const content = {};
    let sectionIndex = 18.1;
    
    for (const module of modules) {
      content[`${sectionIndex}`] = {
        title: `Module: ${module.name}`,
        content: {
          [`${sectionIndex}.1`]: {
            title: 'Controller Pseudocode',
            content: this.generateControllerPseudocode(module)
          },
          [`${sectionIndex}.2`]: {
            title: 'Service Layer Pseudocode',
            content: this.generateServicePseudocode(module)
          },
          [`${sectionIndex}.3`]: {
            title: 'Database Model Pseudocode',
            content: this.generateModelPseudocode(module)
          },
          [`${sectionIndex}.4`]: {
            title: 'Validation Logic Pseudocode',
            content: this.generateValidationPseudocode(module)
          },
          [`${sectionIndex}.5`]: {
            title: 'Business Rules Pseudocode',
            content: this.generateBusinessRulesPseudocode(module)
          }
        }
      };
      sectionIndex += 0.1;
    }

    return content;
  }

  generateControllerPseudocode(module) {
    const moduleName = module.name.replace(/\s+/g, '');
    return `// controllers/${module.name.toLowerCase()}/${moduleName}Controller.js
class ${moduleName}Controller {
  async create(req, res) {
    // Step 1: Validate input
    const validation = await validateInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: validation.errors,
        code: 'INVALID_INPUT' 
      });
    }
    
    // Step 2: Check permissions
    const hasPermission = await checkPermission(req.user, 'create_${module.name.toLowerCase()}');
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'No permission',
        code: 'FORBIDDEN' 
      });
    }
    
    // Step 3: Create record
    const record = await ${moduleName}Service.create(req.body);
    
    // Step 4: Log activity
    await ActivityLog.create({
      user_id: req.user.id,
      action: 'CREATE_${module.name.toUpperCase()}',
      entity: '${module.name.toLowerCase()}',
      entity_id: record.id
    });
    
    // Step 5: Return success
    return res.status(201).json({
      success: true,
      data: record,
      message: '${module.name} created successfully'
    });
  }
  
  async read(req, res) {
    // Implementation...
  }
  
  async update(req, res) {
    // Implementation...
  }
  
  async delete(req, res) {
    // Implementation...
  }
}`;
  }

  generateServicePseudocode(module) {
    const moduleName = module.name.replace(/\s+/g, '');
    return `// services/${module.name.toLowerCase()}/${moduleName}Service.js
class ${moduleName}Service {
  async create(data) {
    // Validate input
    await this.validateData(data);
    
    // Check business rules
    await this.checkBusinessRules(data);
    
    // Create record
    const record = await ${moduleName}Model.create(data);
    
    // Trigger side effects
    await this.handleSideEffects(record);
    
    return record;
  }
  
  async validateData(data) {
    // Validation logic
  }
  
  async checkBusinessRules(data) {
    // Business rule checks
  }
  
  async handleSideEffects(record) {
    // Side effects (notifications, cache updates, etc.)
  }
}`;
  }

  generateModelPseudocode(module) {
    const moduleName = module.name.replace(/\s+/g, '');
    const tableName = module.name.toLowerCase().replace(/\s+/g, '_');
    return `// models/${moduleName}.js
class ${moduleName} {
  static table = '${tableName}';
  
  static async create(data) {
    const result = await db.prepare(
      'INSERT INTO ${tableName} (name, created_at) VALUES (?, ?)'
    ).run(data.name, new Date().toISOString());
    
    return {
      id: result.lastInsertRowid,
      ...data
    };
  }
  
  static async findById(id) {
    return await db.prepare(
      'SELECT * FROM ${tableName} WHERE id = ?'
    ).get(id);
  }
  
  static async findAll(filters = {}) {
    // Implementation...
  }
  
  static async update(id, data) {
    // Implementation...
  }
  
  static async delete(id) {
    // Implementation...
  }
}`;
  }

  generateValidationPseudocode(module) {
    return `// validators/${module.name.toLowerCase()}Validator.js
function validate${module.name.replace(/\s+/g, '')}(data) {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (data.name && data.name.length > 255) {
    errors.push('Name must be less than 255 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}`;
  }

  generateBusinessRulesPseudocode(module) {
    return `// business-rules/${module.name.toLowerCase()}Rules.js
class ${module.name.replace(/\s+/g, '')}BusinessRules {
  async checkRules(data) {
    // Business rule 1: Check uniqueness
    const existing = await ${module.name.replace(/\s+/g, '')}Model.findByName(data.name);
    if (existing) {
      throw new Error('Duplicate name not allowed');
    }
    
    // Business rule 2: Validate state transitions
    // Implementation...
    
    // Business rule 3: Check dependencies
    // Implementation...
  }
}`;
  }

  async generateFrontendPseudocode(modules, chainResult) {
    return {
      '19.1': {
        title: 'Component: FormComponent',
        content: this.generateFormComponentPseudocode()
      },
      '19.2': {
        title: 'Component: ListComponent',
        content: this.generateListComponentPseudocode()
      }
    };
  }

  generateFormComponentPseudocode() {
    return `// components/FormComponent.jsx
function FormComponent({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    const validation = validateForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success('Saved successfully');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}`;
  }

  generateListComponentPseudocode() {
    return `// components/ListComponent.jsx
function ListComponent({ items, onEdit, onDelete }) {
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>
          <button onClick={() => onEdit(item)}>Edit</button>
          <button onClick={() => onDelete(item.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}`;
  }

  generateIntegrationImplementation(modules, chainResult) {
    return {
      '20.1': {
        title: 'Third-party Integrations',
        content: 'Integration setup...'
      },
      '20.2': {
        title: 'Payment Gateway Integration',
        content: 'Payment gateway code...'
      },
      '20.3': {
        title: 'Email Service Integration',
        content: 'Email service code...'
      }
    };
  }

  generateTestingImplementation(modules) {
    return {
      '21.1': {
        title: 'Unit Test Scripts',
        content: modules.map(m => `- ${m.name} tests`).join('\n')
      },
      '21.2': {
        title: 'Integration Tests',
        content: 'Integration test scripts...'
      },
      '21.3': {
        title: 'E2E Test Scripts',
        content: 'E2E test scripts...'
      }
    };
  }

  generateDeploymentImplementation(chainResult) {
    return {
      '22.1': {
        title: 'Docker Configuration',
        content: 'Dockerfile and docker-compose.yml'
      },
      '22.2': {
        title: 'CI/CD Pipeline Configuration',
        content: 'CI/CD pipeline setup...'
      },
      '22.3': {
        title: 'Deployment Scripts',
        content: 'Deployment automation scripts...'
      }
    };
  }

  generateCodeIndex(modules) {
    return modules.map((m, idx) => 
      `| ${idx + 1} | ${m.name} | L5-18.${idx + 1} | L5-19.${idx + 1} |`
    ).join('\n');
  }

  generateDependencies(chainResult) {
    return {
      frontend: 'React 18.x, React Router 6.x',
      backend: 'Node.js 18.x, Express 4.x',
      database: 'PostgreSQL 14.x'
    };
  }

  generateTroubleshootingGuide() {
    return 'Common issues and solutions...';
  }

  /**
   * Generate cross-references for a level
   */
  generateCrossReferences(level, lockedScope) {
    const refs = {
      upward: [],
      downward: [],
      lateral: []
    };

    if (level > 1) {
      refs.upward.push({
        from: 'summary',
        to: `Level ${level - 1}`,
        text: `← Summary in Level ${level - 1}`
      });
    }

    if (level < 5) {
      refs.downward.push({
        from: 'details',
        to: `Level ${level + 1}`,
        text: `→ Details in Level ${level + 1}`
      });
    }

    return refs;
  }
}

module.exports = LevelGenerator;

