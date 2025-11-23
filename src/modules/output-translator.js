const chalk = require('chalk');

const { handleError, wrapError, ErrorTypes } = require('../core/errors/ErrorHandler');
const { validateRequired, validateObject } = require('../utils/validators');

class OutputTranslator {
  constructor(library, logger) {
    this.library = library;
    this.logger = logger;
    this.personaFraming = this.loadPersonaFraming();
  }

  loadPersonaFraming() {
    return {
      cautious_solo: {
        leadWith: 'safety',
        emphasize: ['reuse', 'proven', 'low-risk', 'tested'],
        avoid: ['experimental', 'cutting-edge', 'aggressive'],
        confidenceThreshold: 0.75,
        examplePhrases: {
          timeline: 'Safe estimate: {weeks} weeks (buffer included)',
          cost: 'Budget-conscious: ${cost} (no surprises)',
          risks: 'Covered the gotchas: {topRisks}'
        }
      },
      shipping_hustler: {
        leadWith: 'speed',
        emphasize: ['fast', 'ship', 'MVP', 'lean', 'now'],
        avoid: ['slow', 'careful', 'thorough analysis'],
        confidenceThreshold: 0.7,
        examplePhrases: {
          timeline: 'Fast path: {weeks} weeks, ship by {date}',
          cost: '${cost} to launch—let\'s go',
          risks: 'Key risks: {topRisks}—manageable'
        }
      },
      perfectionist: {
        leadWith: 'quality',
        emphasize: ['clean', 'scalable', 'proper', 'architecture'],
        avoid: ['quick', 'hacky', 'good enough'],
        confidenceThreshold: 0.8,
        examplePhrases: {
          timeline: 'Proper build: {weeks} weeks (quality over speed)',
          cost: '${cost} for solid foundation',
          risks: 'Architectural considerations: {topRisks}'
        }
      },
      domain_expert: {
        leadWith: 'expertise',
        emphasize: ['industry-standard', 'compliance', 'best-practices'],
        avoid: ['generic', 'one-size-fits-all'],
        confidenceThreshold: 0.8,
        examplePhrases: {
          timeline: '{industry} typical: {weeks} weeks',
          cost: '${cost} (industry avg: ${domainAvg})',
          risks: '{industry}-specific: {topRisks}'
        }
      },
      funded_visionary: {
        leadWith: 'vision',
        emphasize: ['strategic', 'scalable', 'roadmap', 'growth'],
        avoid: ['small', 'limited', 'MVP-only'],
        confidenceThreshold: 0.75,
        examplePhrases: {
          timeline: 'Phase 1: {weeks} weeks, full roadmap: {totalWeeks} weeks',
          cost: '${cost} for foundation, ${phase2Cost} for scale',
          risks: 'Strategic considerations: {topRisks}'
        }
      }
    };
  }

  translate(technicalOutput, userContext, domainContext, technicalBreakdown = null, scenarios = null, clientProfile = null, hiddenCosts = null) {
    const { plan, estimate, auditedScope } = technicalOutput;
    const { conversationTone, primaryPersona, messagingTone, originalInput } = userContext;

    const summary = this.buildSummary(
      plan,
      estimate,
      primaryPersona,
      conversationTone,
      domainContext
    );

    const formatted = {
      cli: this.formatCLI(plan, estimate, auditedScope, primaryPersona, domainContext, technicalBreakdown, scenarios, clientProfile, hiddenCosts),
      markdown: this.formatMarkdown(plan, estimate, auditedScope, primaryPersona, technicalBreakdown, scenarios, clientProfile, hiddenCosts),
      json: JSON.stringify({ ...technicalOutput, technicalBreakdown, scenarios, clientProfile, hiddenCosts }, null, 2),
      // Add dual views
      internal: clientProfile && hiddenCosts ? this.formatInternalMarkdown(plan, estimate, auditedScope, clientProfile, hiddenCosts) : null,
      client: clientProfile && hiddenCosts ? this.formatClientMarkdown(plan, estimate, auditedScope, clientProfile, hiddenCosts) : null
    };

    const personaTweaks = this.applyPersonaTweaks(
      summary,
      formatted,
      primaryPersona,
      estimate
    );

    return {
      conversationalOutput: {
        summary: personaTweaks.summary,
        formatted: personaTweaks.formatted,
        personaTweaks: {
          [primaryPersona]: this.personaFraming[primaryPersona]
        }
      }
    };
  }

  buildSummary(plan, estimate, persona, tone, domainContext) {
    const framing = this.personaFraming[persona] || this.personaFraming.cautious_solo;
    const casual = tone === 'casual';
    
    let lead = '';
    if (framing.leadWith === 'safety') {
      lead = casual 
        ? `Here's your path: ${estimate.timeline.weeks} weeks, ₹${this.formatIndianCurrency(estimate.cost.total)} all-in for ${this.simplify(plan.overview.summary)}.`
        : `Your plan: ${estimate.timeline.weeks} weeks, ₹${this.formatIndianCurrency(estimate.cost.total)} for ${plan.overview.summary}.`;
    } else if (framing.leadWith === 'speed') {
      lead = casual
        ? `Fast path: ${estimate.timeline.weeks} weeks, ₹${this.formatIndianCurrency(estimate.cost.total)}—let's ship ${this.simplify(plan.overview.summary)}.`
        : `Expedited build: ${estimate.timeline.weeks} weeks, ₹${this.formatIndianCurrency(estimate.cost.total)} for ${plan.overview.summary}.`;
    } else if (framing.leadWith === 'quality') {
      lead = `Solid architecture: ${estimate.timeline.weeks} weeks, ₹${this.formatIndianCurrency(estimate.cost.total)} for ${plan.overview.summary}.`;
    } else if (framing.leadWith === 'expertise') {
      lead = `${domainContext.industry.charAt(0).toUpperCase() + domainContext.industry.slice(1)} build: ${estimate.timeline.weeks} weeks, ₹${this.formatIndianCurrency(estimate.cost.total)} for ${plan.overview.summary}.`;
    } else {
      lead = `Strategic plan: ${estimate.timeline.weeks} weeks (phase 1), ₹${this.formatIndianCurrency(estimate.cost.total)} for ${plan.overview.summary}.`;
    }

    const moduleNames = plan.modules.map(m => m.displayName).join(' + ');
    const moduleSummary = casual 
      ? `${moduleNames}—covers what you need`
      : `Core modules: ${moduleNames}`;

    let savingsNote = '';
    if (estimate.savings.total > 0) {
      savingsNote = casual
        ? ` Safe bet: ${estimate.savings.reuse.modules.length} of ${plan.modules.length} modules use proven templates (saves you ₹${this.formatIndianCurrency(estimate.savings.total)}).`
        : ` Savings: ₹${this.formatIndianCurrency(estimate.savings.total)} via reusable components (${estimate.savings.reuse.modules.join(', ')}).`;
    }

    let confidenceNote = '';
    if (estimate.confidence.overall >= framing.confidenceThreshold) {
      confidenceNote = casual
        ? ` ${Math.round(estimate.confidence.overall * 100)}% confident this nails it`
        : ` Confidence: ${Math.round(estimate.confidence.overall * 100)}%`;
      
      if (domainContext.socialProof) {
        confidenceNote += casual ? ` for ${domainContext.industry}.` : ` (${domainContext.socialProof}).`;
      } else {
        confidenceNote += casual ? `.` : ` based on similar projects.`;
      }
    }

    return `${lead} ${moduleSummary}.${savingsNote}${confidenceNote}`;
  }

  simplify(text) {
    // Simplify technical terms for casual users
    return text
      .replace(/application/g, 'app')
      .replace(/Retail payroll/g, 'payroll')
      .replace(/\+/g, 'and');
  }

  formatCLI(plan, estimate, auditedScope, persona, domainContext, technicalBreakdown = null, scenarios = null) {
    const framing = this.personaFraming[persona] || this.personaFraming.cautious_solo;
    const timelineStr = `${estimate.timeline.weeks} weeks (${estimate.timeline.days} working days)`;

    let output = '';

    output += chalk.blue.bold(`\n🚀 Frozen Scope: ${this.simplify(plan.overview.summary)}\n\n`);

    output += chalk.white(`📊 Timeline: ${timelineStr}\n`);
    output += chalk.white(`💰 Cost: ₹${this.formatIndianCurrency(estimate.cost.total)}\n`);
    
    // Add technical breakdown if available
    if (technicalBreakdown) {
      output += chalk.cyan(`\n🔧 Technical Breakdown:\n`);
      output += chalk.white(`   Components: ${technicalBreakdown.totalComponents}\n`);
      output += chalk.white(`   Total Effort: ${technicalBreakdown.totalEffort.toFixed(1)} days\n`);
      output += chalk.white(`   Code Files: ${this.countCodeFiles(technicalBreakdown.codeStructure)}\n`);
    }
    
    if (estimate.savings && estimate.savings.total > 0) {
      output += chalk.green(`💾 Savings: ₹${this.formatIndianCurrency(estimate.savings.total)} (${estimate.savings.message})\n`);
    }

    output += '\n';

    output += chalk.white(`✅ Confidence: ${Math.round(estimate.confidence.overall * 100)}%\n`);
    
    if (domainContext.socialProof) {
      output += chalk.gray(`   ${domainContext.socialProof}\n`);
    } else {
      output += chalk.gray(`   ${estimate.confidence.message}\n`);
    }

    output += '\n';

    output += chalk.blue.bold('📦 Your Build:\n');
    plan.steps.slice(0, 3).forEach(step => {
      output += chalk.white(`   Week ${step.week}: ${step.focus}\n`);
      step.tasks.slice(0, 2).forEach(task => {
        output += chalk.gray(`      • ${task}\n`);
      });
    });
    if (plan.steps.length > 3) {
      output += chalk.gray(`   ... (${plan.steps.length - 3} more weeks in full report)\n`);
    }

    output += '\n';

    if (plan.risks.length > 0) {
      output += chalk.yellow.bold('⚠️  Watch for:\n');
      plan.risks.slice(0, 3).forEach(risk => {
        output += chalk.yellow(`   - ${risk.desc}\n`);
        if (risk.mitigation) {
          output += chalk.gray(`     → ${risk.mitigation}\n`);
        }
      });
      if (plan.risks.length > 3) {
        output += chalk.gray(`   ... (${plan.risks.length - 3} more risks in full report)\n`);
      }
    }

    output += '\n';

    if (auditedScope && auditedScope.auditSummary && auditedScope.auditSummary.autoFixed > 0) {
      output += chalk.green(`✨ Auto-fixed ${auditedScope.auditSummary.autoFixed} gaps—scope tightened\n`);
    }

    output += '\n';

    if (framing.leadWith === 'speed') {
      output += chalk.blue.bold('💡 Next: Save this, start building Monday?\n');
    } else if (framing.leadWith === 'safety') {
      output += chalk.blue.bold('💡 Next: Review the plan, questions before we lock it?\n');
    } else {
      output += chalk.blue.bold('💡 Next: Save scope to Desktop, ready to build?\n');
    }

    return output;
  }

  formatMarkdown(plan, estimate, auditedScope, persona, technicalBreakdown = null, scenarios = null) {
    try {
      let md = `# ${plan.overview.summary}\n\n`;

      md += `## Overview\n${plan.overview.scope}\n\n`;

      md += `## Timeline\n`;
      md += `- **Total**: ${estimate.timeline.weeks} weeks (${estimate.timeline.days} days)\n`;
      md += `- **Range**: ${estimate.timeline.range.min}-${estimate.timeline.range.max} days\n`;
      md += `- **Confidence**: ${Math.round(estimate.confidence.timeline * 100)}%\n\n`;
      
      // Add technical breakdown section if available
      if (technicalBreakdown) {
        md += this.formatTechnicalBreakdown(technicalBreakdown);
      }

      md += `## Cost\n`;
      md += `- **Total**: ₹${this.formatIndianCurrency(estimate.cost.total)}\n`;
      if (estimate.savings && estimate.savings.total > 0) {
        md += `- **Savings**: ₹${this.formatIndianCurrency(estimate.savings.total)} via reuse\n`;
      }
      md += `- **Breakdown**:\n`;
      Object.entries(estimate.cost.breakdown).forEach(([key, value]) => {
        md += `  - ${key.replace(/_/g, ' ')}: ₹${this.formatIndianCurrency(value)}\n`;
      });
      md += '\n';

      md += `## Build Path\n`;
      plan.steps.forEach(step => {
        md += `### Week ${step.week}: ${step.focus}\n`;
        step.tasks.forEach(task => {
          md += `- ${task}\n`;
        });
        md += `- **Deliverable**: ${step.deliverable}\n\n`;
      });

      md += `## Modules\n`;
      plan.modules.forEach(mod => {
        md += `### ${mod.displayName}\n`;
        md += `${mod.description}\n\n`;
        md += `**Effort**: ${mod.effort}\n\n`;
        if (mod.reusable) {
          md += `**Reuse**: ${mod.reuseNote}\n\n`;
        }
        md += `**Pseudocode (High-Level)**:\n\`\`\`\n${mod.pseudocode.high_level}\n\`\`\`\n\n`;
      });

      if (plan.risks.length > 0) {
        md += `## Risks & Mitigations\n`;
        plan.risks.forEach(risk => {
          md += `- **${risk.desc}**: ${risk.mitigation}\n`;
        });
        md += '\n';
      }

      md += `## Confidence Notes\n`;
      md += `${estimate.confidence.message}\n\n`;

      // Add scenarios section if available
      if (scenarios && scenarios.scenarios && scenarios.scenarios.length > 0) {
        md += this.formatScenariosMarkdown(scenarios);
      }

      return md;

    } catch (error) {
      this.logger.warn('Markdown generation failed, using plain text');
      return this.formatPlainText(plan, estimate);
    }
  }

  formatPlainText(plan, estimate) {
    let text = `${plan.overview.summary}\n\n`;
    text += `Timeline: ${estimate.timeline.weeks} weeks\n`;
    text += `Cost: ₹${this.formatIndianCurrency(estimate.cost.total)}\n`;
    text += `Confidence: ${Math.round(estimate.confidence.overall * 100)}%\n\n`;
    text += `Modules: ${plan.modules.map(m => m.displayName).join(', ')}\n`;
    return text;
  }

  /**
   * Format technical breakdown for markdown output
   */
  formatTechnicalBreakdown(technicalBreakdown) {
    if (!technicalBreakdown || !technicalBreakdown.technicalBreakdowns) {
      return '';
    }

    let md = `## Technical Breakdown\n\n`;
    md += `**Total Components**: ${technicalBreakdown.totalComponents}\n`;
    md += `**Total Effort**: ${technicalBreakdown.totalEffort.toFixed(1)} days\n`;
    md += `**Total Cost**: ₹${technicalBreakdown.totalCost.toLocaleString('en-IN')}\n\n`;

    // Code structure
    if (technicalBreakdown.codeStructure) {
      md += `### Code Structure\n\n`;
      Object.entries(technicalBreakdown.codeStructure).forEach(([dir, files]) => {
        if (files.length > 0) {
          md += `**${dir}**\n`;
          files.forEach(file => {
            md += `- ${file}\n`;
          });
          md += `\n`;
        }
      });
    }

    // Component details by business module
    md += `### Component Details\n\n`;
    technicalBreakdown.technicalBreakdowns.forEach(breakdown => {
      md += `#### ${breakdown.displayName || breakdown.businessModule}\n\n`;
      md += `- **Total Effort**: ${breakdown.totalEffort.toFixed(1)} days\n`;
      md += `- **Total Cost**: ₹${breakdown.totalCost.toLocaleString('en-IN')}\n\n`;

      if (breakdown.technicalComponents && breakdown.technicalComponents.length > 0) {
        breakdown.technicalComponents.forEach(component => {
          md += `**${component.component}** (${component.layer})\n`;
          md += `- Effort: ${(component.adjustedEffort || component.baseEffort).toFixed(1)} days\n`;
          md += `- Complexity: ${component.complexity}\n`;
          
          if (component.files && component.files.length > 0) {
            md += `- Files:\n`;
            component.files.forEach(file => {
              md += `  - ${file}\n`;
            });
          }
          
          if (component.functions && component.functions.length > 0) {
            md += `- Functions:\n`;
            component.functions.slice(0, 5).forEach(func => {
              md += `  - ${func}\n`;
            });
            if (component.functions.length > 5) {
              md += `  - ... and ${component.functions.length - 5} more\n`;
            }
          }
          md += `\n`;
        });
      }

      // Integration points
      if (breakdown.integrationPoints && breakdown.integrationPoints.length > 0) {
        md += `**Integration Points**:\n`;
        breakdown.integrationPoints.forEach(point => {
          md += `- ${point.service || point} (${point.type || 'external'})\n`;
        });
        md += `\n`;
      }

      // Edge cases
      if (breakdown.edgeCases && breakdown.edgeCases.length > 0) {
        md += `**Edge Cases & Risks**:\n`;
        breakdown.edgeCases.slice(0, 3).forEach(edgeCase => {
          md += `- ${edgeCase.description || edgeCase.risk}: ${edgeCase.impact || edgeCase.mitigation}\n`;
        });
        md += `\n`;
      }
    });

    return md;
  }

  /**
   * Format scenarios for markdown output
   */
  formatScenariosMarkdown(scenarios) {
    if (!scenarios || !scenarios.scenarios || scenarios.scenarios.length === 0) {
      return '';
    }

    let md = `## Delivery Options\n\n`;
    
    if (scenarios.constraints && (scenarios.constraints.maxBudget || scenarios.constraints.targetDeadline)) {
      md += `### Your Constraints\n\n`;
      if (scenarios.constraints.maxBudget) {
        md += `- **Budget**: ₹${this.formatIndianCurrency(scenarios.constraints.maxBudget)}\n`;
      }
      if (scenarios.constraints.targetDeadline) {
        md += `- **Deadline**: ${scenarios.constraints.targetDeadline}\n`;
      }
      md += `\n`;
    }

    md += `### Baseline\n\n`;
    md += `- **Cost**: ₹${this.formatIndianCurrency(scenarios.baseline.cost)}\n`;
    md += `- **Timeline**: ${scenarios.baseline.timeline} weeks\n`;
    md += `- **Modules**: ${scenarios.baseline.modules}\n\n`;

    md += `### Available Options\n\n`;
    
    scenarios.scenarios.forEach((scenario, index) => {
      const fitIcon = scenario.fitsConstraints ? '✅' : '⚠️';
      const recommended = scenario.type === scenarios.recommendation ? ' ⭐ **RECOMMENDED**' : '';
      
      md += `#### ${index + 1}. ${fitIcon} ${scenario.name}${recommended}\n\n`;
      md += `- **Cost**: ₹${this.formatIndianCurrency(scenario.cost)}\n`;
      md += `- **Timeline**: ${scenario.timeline} weeks\n`;
      
      if (scenario.gap && (scenario.gap.budget > 0 || scenario.gap.timeline > 0)) {
        md += `- **Gap**: `;
        if (scenario.gap.budget > 0) {
          md += `₹${this.formatIndianCurrency(scenario.gap.budget)} over budget`;
        }
        if (scenario.gap.timeline > 0) {
          md += scenario.gap.budget > 0 ? `, ` : ``;
          md += `${scenario.gap.timeline} weeks over deadline`;
        }
        md += `\n`;
      }
      
      if (scenario.tradeoffs) {
        md += `\n**Pros:**\n`;
        scenario.tradeoffs.pros.forEach(pro => {
          md += `- ${pro}\n`;
        });
        md += `\n**Cons:**\n`;
        scenario.tradeoffs.cons.forEach(con => {
          md += `- ${con}\n`;
        });
      }
      
      if (scenario.recommendation) {
        md += `\n> 💡 ${scenario.recommendation}\n`;
      }
      
      md += `\n`;
    });

    return md;
  }

  /**
   * Count total code files from structure
   */
  countCodeFiles(codeStructure) {
    if (!codeStructure) return 0;
    return Object.values(codeStructure).reduce((sum, files) => sum + files.length, 0);
  }

  formatIndianCurrency(amount) {
    const Formatters = require('../utils/formatters');
    return Formatters.formatIndianCurrency(amount, { showSymbol: false });
  }

  applyPersonaTweaks(summary, formatted, persona, estimate) {
    const framing = this.personaFraming[persona] || this.personaFraming.cautious_solo;

    let tweakedSummary = summary;

    // Ensure summary aligns with persona
    if (framing.leadWith === 'safety' && summary.includes('aggressive')) {
      tweakedSummary = summary.replace(/aggressive/g, 'safe');
    }

    return {
      summary: tweakedSummary,
      formatted
    };
  }

  /**
   * OUTPUT V2 - Professional Document Generation
   */

  /**
   * Main V2 translation method
   * @param {Object} chainResult - Complete chain execution result
   * @param {Object} options - Options: { level, format }
   * @returns {Object} Professional output document
   */
  translateV2(chainResult, options = {}) {
    const { level = 'detailed', format = 'html' } = options;

    // Extract data from chain result
    const scope = chainResult.technical?.plan || {};
    const estimate = chainResult.technical?.estimate || {};
    const clientProfile = chainResult.clientProfile || null;
    const hiddenCosts = chainResult.hiddenCosts || null;
    const scenarios = chainResult.scenarios || null;
    const assumptions = chainResult.assumptions || [];

    // Generate professional output based on level
    const output = {
      business: this.generateBusinessDocumentV2({
        scope,
        estimate,
        clientProfile,
        hiddenCosts,
        scenarios,
        assumptions
      }, level),
      technical: this.generateTechnicalDocumentV2({
        scope,
        estimate,
        technicalBreakdown: chainResult.technical?.technicalBreakdown || null
      }, level),
      metadata: {
        version: '2.0',
        generated: new Date().toISOString(),
        level,
        confidence: estimate?.confidence?.overall || estimate?.confidence || 'N/A'
      }
    };

    if (format === 'html') {
      output.html = this.wrapInHTML(output.business, output.technical);
    }

    return output;
  }

  /**
   * Generate business document V2
   * @param {Object} data - Project data
   * @param {string} level - Output level: executive, detailed, comprehensive
   * @returns {string} Markdown business document
   */
  generateBusinessDocumentV2(data, level) {
    const { scope, estimate, clientProfile, hiddenCosts, scenarios, assumptions } = data;

    const levels = {
      executive: () => this.generateExecutiveV2(scope, estimate),
      detailed: () => this.generateDetailedV2(scope, estimate, clientProfile, hiddenCosts, scenarios, assumptions),
      comprehensive: () => this.generateComprehensiveV2(data)
    };

    return levels[level] ? levels[level]() : levels.detailed();
  }

  /**
   * Generate executive summary V2
   */
  generateExecutiveV2(scope, estimate) {
    const projectName = scope?.overview?.summary || 'Project';
    const totalCost = (estimate?.cost?.total || 0) + (estimate?.hiddenCosts?.total || 0);
    const timeline = estimate?.timeline?.weeks || estimate?.timeline?.days || 'TBD';

    return `
# ${projectName} - Executive Summary

## Investment Overview

- **Total Investment**: ${this.formatCurrency(totalCost)}
- **Timeline**: ${typeof timeline === 'number' ? `${timeline} weeks` : timeline}
- **Confidence Level**: ${Math.round((estimate?.confidence?.overall || estimate?.confidence || 0) * 100)}%

## Key Highlights

${scope?.overview?.scope || 'Project scope details'}

---

*Generated by SCOGEN on ${new Date().toLocaleString('en-IN')}*
    `.trim();
  }

  /**
   * Generate detailed business document V2
   */
  generateDetailedV2(scope, estimate, clientProfile, hiddenCosts, scenarios, assumptions) {
    const projectName = scope?.overview?.summary || 'Project';
    const baseCost = estimate?.cost?.total || 0;
    const hiddenCostsTotal = hiddenCosts?.total || 0;
    const totalCost = baseCost + hiddenCostsTotal;
    const confidence = Math.round((estimate?.confidence?.overall || estimate?.confidence || 0) * 100);

    return `
# ${projectName} - Professional Scope Analysis

## Executive Summary

${this.generateExecutiveSummaryV2(scope, estimate)}

## Investment Analysis

### Development Investment

- **Base Development**: ${this.formatCurrency(baseCost)}
- **Timeline**: ${this.formatTimeline(estimate?.timeline)}
- **Confidence Level**: ${confidence}%

### Project Overheads (Hidden Costs)

${this.generateHiddenCostsNarrativeV2(hiddenCosts)}

**Total Hidden Costs**: ${this.formatCurrency(hiddenCostsTotal)}
**Total Project Investment**: ${this.formatCurrency(totalCost)}

## Detailed Scope Breakdown

${this.generateScopeBreakdownV2(scope)}

## Scenario Analysis

${this.generateScenarioComparisonV2(scenarios)}

## Risk Assessment

${this.generateRiskAssessmentV2(scope)}

## Key Assumptions

${(assumptions && assumptions.length > 0) 
  ? assumptions.map(a => `- ${typeof a === 'string' ? a : (a.description || a)}`).join('\n')
  : '- No assumptions defined'}

## Success Factors

${this.generateSuccessFactorsV2(scope, clientProfile)}

## Next Steps

${this.generateNextStepsV2(scope)}

---

*Generated by SCOGEN on ${new Date().toLocaleString('en-IN')}*

*Confidence Score: ${confidence}% | Based on pattern analysis*
    `.trim();
  }

  /**
   * Generate comprehensive business document V2
   */
  generateComprehensiveV2(data) {
    const detailed = this.generateDetailedV2(
      data.scope,
      data.estimate,
      data.clientProfile,
      data.hiddenCosts,
      data.scenarios,
      data.assumptions
    );

    return `${detailed}

## Additional Details

### Client Profile Analysis

${this.generateClientProfileSummary(data.clientProfile)}

### Technical Considerations

${this.generateTechnicalConsiderations(data.scope)}

### Implementation Roadmap

${this.generateImplementationRoadmap(data.scope)}
    `.trim();
  }

  /**
   * Generate executive summary narrative
   */
  generateExecutiveSummaryV2(scope, estimate) {
    const projectName = scope?.overview?.summary || 'Project';
    const totalCost = (estimate?.cost?.total || 0) + (estimate?.hiddenCosts?.total || 0);
    const timeline = estimate?.timeline?.weeks || estimate?.timeline?.days || 'TBD';
    const modules = scope?.modules || [];
    const moduleCount = modules.length;

    return `
This document outlines the professional scope, investment, and delivery plan for **${projectName}**.

**Investment**: ${this.formatCurrency(totalCost)} | **Timeline**: ${typeof timeline === 'number' ? `${timeline} weeks` : timeline} | **Modules**: ${moduleCount}

${scope?.overview?.scope || 'Comprehensive project scope analysis based on requirements and industry best practices.'}
    `.trim();
  }

  /**
   * Generate hidden costs narrative with justifications
   */
  generateHiddenCostsNarrativeV2(hiddenCosts) {
    if (!hiddenCosts?.breakdown) {
      return '- No additional overheads identified';
    }

    const narratives = {
      clientCoordination: (data) => `
### Client Coordination (${data.percentage || 0}% - ${this.formatCurrency(data.amount || 0)})

Based on ${(data.factors || []).join(', ') || 'project parameters'}, additional coordination effort is required.

This includes regular status updates, stakeholder alignment meetings, and progress demonstrations.`,

      scopeCreep: (data) => `
### Scope Management Buffer (${data.percentage || 0}% - ${this.formatCurrency(data.amount || 0)})

Analysis indicates ${(data.factors || []).join(', ') || 'requirement volatility'}. This buffer handles
typical clarifications and minor adjustments that emerge during development.`,

      testing: (data) => `
### Quality Assurance (${data.percentage || 0}% - ${this.formatCurrency(data.amount || 0)})

Comprehensive testing across ${(data.factors || []).join(', ') || 'all modules'} to ensure
reliability, performance, and user experience standards.`,

      documentation: (data) => `
### Documentation & Knowledge Transfer (${data.percentage || 0}% - ${this.formatCurrency(data.amount || 0)})

Creating technical documentation, user guides, and conducting knowledge transfer sessions
for ${(data.factors || []).join(', ') || 'your team'}.`,

      deployment: (data) => `
### Deployment & DevOps (${data.percentage || 0}% - ${this.formatCurrency(data.amount || 0)})

Setting up deployment pipelines, environments, and monitoring for
${(data.factors || []).join(', ') || 'production readiness'}.`,

      postLaunch: (data) => `
### Post-Launch Support (${data.percentage || 0}% - ${this.formatCurrency(data.amount || 0)})

Initial support period covering bug fixes, minor adjustments, and user assistance
for ${(data.factors || []).join(', ') || 'smooth adoption'}.`,

      projectManagement: (data) => `
### Project Management (${data.percentage || 0}% - ${this.formatCurrency(data.amount || 0)})

Dedicated project management to ensure smooth execution, risk mitigation, and
timely delivery across ${(data.factors || []).join(', ') || 'all project phases'}.`,

      knowledgeTransfer: (data) => `
### Knowledge Transfer (${data.percentage || 0}% - ${this.formatCurrency(data.amount || 0)})

Comprehensive knowledge transfer sessions, documentation, and training
for ${(data.factors || []).join(', ') || 'your development team'}.`
    };

    return Object.entries(hiddenCosts.breakdown)
      .map(([component, data]) => {
        const narrative = narratives[component];
        if (narrative) {
          return narrative(data);
        }
        // Fallback for unknown components
        return `### ${component.replace(/([A-Z])/g, ' $1').trim()} (${data.percentage || 0}% - ${this.formatCurrency(data.amount || 0)})

Based on project requirements and complexity factors.`;
      })
      .join('\n\n');
  }

  /**
   * Generate scope breakdown narrative
   */
  generateScopeBreakdownV2(scope) {
    if (!scope?.modules || scope.modules.length === 0) {
      return 'No modules defined in scope.';
    }

    let breakdown = '### Core Modules\n\n';
    
    scope.modules.forEach((module, index) => {
      const moduleName = module.displayName || module.name || `Module ${index + 1}`;
      const effort = module.effort || module.days || 'TBD';
      const description = module.description || 'Module functionality';
      
      breakdown += `**${moduleName}**\n`;
      breakdown += `- Description: ${description}\n`;
      breakdown += `- Estimated Effort: ${typeof effort === 'number' ? `${effort} days` : effort}\n`;
      
      if (module.reusable) {
        breakdown += `- Reusable Component: Yes (reduces development time)\n`;
      }
      
      if (module.deps && module.deps.length > 0) {
        breakdown += `- Dependencies: ${module.deps.join(', ')}\n`;
      }
      
      breakdown += '\n';
    });

    return breakdown.trim();
  }

  /**
   * Generate scenario comparison narrative
   */
  generateScenarioComparisonV2(scenarios) {
    if (!scenarios || !scenarios.scenarios || scenarios.scenarios.length === 0) {
      return 'No alternative scenarios available.';
    }

    let comparison = '### Available Delivery Options\n\n';
    
    if (scenarios.baseline) {
      comparison += `**Baseline Scenario**\n`;
      comparison += `- Cost: ${this.formatCurrency(scenarios.baseline.cost || 0)}\n`;
      comparison += `- Timeline: ${scenarios.baseline.timeline || 'N/A'} weeks\n`;
      comparison += `- Modules: ${scenarios.baseline.modules || 'All'}\n\n`;
    }

    scenarios.scenarios.forEach((scenario, index) => {
      const recommended = scenario.type === scenarios.recommendation ? ' ⭐ **RECOMMENDED**' : '';
      const fitsIcon = scenario.fitsConstraints ? '✅' : '⚠️';
      
      comparison += `**${index + 1}. ${fitsIcon} ${scenario.name}${recommended}**\n`;
      comparison += `- Cost: ${this.formatCurrency(scenario.cost || 0)}\n`;
      comparison += `- Timeline: ${scenario.timeline || 'N/A'} weeks\n`;
      
      if (scenario.tradeoffs) {
        if (scenario.tradeoffs.pros && scenario.tradeoffs.pros.length > 0) {
          comparison += `- Pros: ${scenario.tradeoffs.pros.join(', ')}\n`;
        }
        if (scenario.tradeoffs.cons && scenario.tradeoffs.cons.length > 0) {
          comparison += `- Cons: ${scenario.tradeoffs.cons.join(', ')}\n`;
        }
      }
      
      if (scenario.recommendation) {
        comparison += `- Note: ${scenario.recommendation}\n`;
      }
      
      comparison += '\n';
    });

    return comparison.trim();
  }

  /**
   * Generate risk assessment narrative
   */
  generateRiskAssessmentV2(scope) {
    if (!scope?.risks || scope.risks.length === 0) {
      return 'No significant risks identified at this stage.';
    }

    let risks = '### Identified Risks\n\n';
    
    scope.risks.forEach((risk, index) => {
      const riskDesc = typeof risk === 'string' ? risk : (risk.desc || risk.description || 'Risk');
      const mitigation = risk.mitigation || risk.mitigationPlan || 'Mitigation plan to be discussed';
      
      risks += `**${index + 1}. ${riskDesc}**\n`;
      risks += `- Mitigation: ${mitigation}\n\n`;
    });

    return risks.trim();
  }

  /**
   * Generate success factors
   */
  generateSuccessFactorsV2(scope, clientProfile) {
    const factors = [];

    if (scope?.modules && scope.modules.length > 0) {
      factors.push('Clear module definitions and scope boundaries');
    }

    if (clientProfile?.techSavvy === 'high') {
      factors.push('Technical client with clear understanding of requirements');
    } else if (clientProfile?.techSavvy === 'low') {
      factors.push('Enhanced communication and documentation protocols');
    }

    if (clientProfile?.decisionMaker) {
      factors.push('Direct decision maker involvement');
    }

    factors.push('Regular progress reviews and milestone-based delivery');
    factors.push('Comprehensive testing and quality assurance');

    return factors.map(f => `- ${f}`).join('\n') || '- Standard project management practices';
  }

  /**
   * Generate next steps
   */
  generateNextStepsV2(scope) {
    const steps = [
      'Review and approve this scope document',
      'Finalize project timeline and milestones',
      'Set up project communication channels',
      'Schedule kickoff meeting',
      'Begin development phase'
    ];

    return steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  }

  /**
   * Generate client profile summary
   */
  generateClientProfileSummary(clientProfile) {
    if (!clientProfile) {
      return 'No client profile data available.';
    }

    let summary = '';
    
    if (clientProfile.techSavvy) {
      summary += `- Technical Knowledge: ${clientProfile.techSavvy}\n`;
    }
    
    if (clientProfile.riskLevel) {
      summary += `- Risk Level: ${clientProfile.riskLevel}\n`;
    }
    
    if (clientProfile.clientSize) {
      summary += `- Client Size: ${clientProfile.clientSize}\n`;
    }

    return summary || 'Standard client profile';
  }

  /**
   * Generate technical considerations
   */
  generateTechnicalConsiderations(scope) {
    if (!scope?.modules || scope.modules.length === 0) {
      return 'Technical considerations to be discussed during planning phase.';
    }

    return `- Total Modules: ${scope.modules.length}
- Integration Points: ${scope.modules.filter(m => m.deps && m.deps.length > 0).length}
- Reusable Components: ${scope.modules.filter(m => m.reusable).length}
- Estimated Complexity: ${this.assessComplexity(scope.modules)}`;
  }

  /**
   * Assess overall complexity
   */
  assessComplexity(modules) {
    if (!modules || modules.length === 0) return 'Low';
    if (modules.length <= 3) return 'Low';
    if (modules.length <= 7) return 'Medium';
    return 'High';
  }

  /**
   * Generate implementation roadmap
   */
  generateImplementationRoadmap(scope) {
    if (!scope?.steps || scope.steps.length === 0) {
      return 'Implementation roadmap to be finalized during planning phase.';
    }

    let roadmap = '';
    
    scope.steps.forEach((step, index) => {
      roadmap += `**Week ${step.week || index + 1}: ${step.focus || 'Development Phase'}**\n`;
      roadmap += `- Deliverable: ${step.deliverable || 'TBD'}\n`;
      if (step.tasks && step.tasks.length > 0) {
        roadmap += `- Key Tasks: ${step.tasks.slice(0, 3).join(', ')}\n`;
      }
      roadmap += '\n';
    });

    return roadmap.trim();
  }

  /**
   * Generate technical document V2
   */
  generateTechnicalDocumentV2(data, level) {
    const { scope, estimate, technicalBreakdown } = data;

    if (level === 'executive') {
      return `# Technical Overview

${technicalBreakdown ? `Total Components: ${technicalBreakdown.totalComponents || 0}` : 'Technical details available in comprehensive view.'}
      `.trim();
    }

    let technical = `# Technical Implementation Details

## Architecture Overview

${this.generateArchitectureOverview(scope, technicalBreakdown)}

## Component Breakdown

${this.generateComponentBreakdown(technicalBreakdown)}

## Technology Stack

${this.generateTechnologyStack(scope, technicalBreakdown)}
    `.trim();

    if (level === 'comprehensive' && technicalBreakdown) {
      technical += `\n\n## Code Structure\n\n${this.generateCodeStructure(technicalBreakdown)}`;
      
      // Add development blueprint section
      try {
        const blueprint = this.generateDevelopmentBlueprint({ technicalBreakdown }, 'comprehensive');
        technical += `\n\n## Development Blueprint\n\n${blueprint}`;
      } catch (error) {
        this.logger.warn('Failed to generate blueprint in technical document', { error: error.message });
      }
    }

    return technical;
  }

  /**
   * Generate architecture overview
   */
  generateArchitectureOverview(scope, technicalBreakdown) {
    if (technicalBreakdown) {
      return `The system consists of ${technicalBreakdown.totalComponents || 0} technical components organized across multiple layers (API, Business Logic, Database, Frontend).`;
    }

    if (scope?.modules) {
      return `The system is organized into ${scope.modules.length} core modules with defined interfaces and dependencies.`;
    }

    return 'Architecture details to be finalized during technical design phase.';
  }

  /**
   * Generate component breakdown
   */
  generateComponentBreakdown(technicalBreakdown) {
    if (!technicalBreakdown?.technicalBreakdowns) {
      return 'Component breakdown available in detailed technical specification.';
    }

    let breakdown = '';
    
    technicalBreakdown.technicalBreakdowns.forEach(bd => {
      breakdown += `**${bd.displayName || bd.businessModule}**\n`;
      breakdown += `- Components: ${bd.technicalComponents?.length || 0}\n`;
      breakdown += `- Total Effort: ${bd.totalEffort?.toFixed(1) || 0} days\n`;
      breakdown += `- Total Cost: ${this.formatCurrency(bd.totalCost || 0)}\n\n`;
    });

    return breakdown.trim();
  }

  /**
   * Generate technology stack
   */
  generateTechnologyStack(scope, technicalBreakdown) {
    // Extract tech stack from technical breakdown if available
    if (technicalBreakdown?.techStack) {
      return Object.entries(technicalBreakdown.techStack)
        .map(([layer, tech]) => `- **${layer}**: ${Array.isArray(tech) ? tech.join(', ') : tech}`)
        .join('\n');
    }

    return 'Technology stack to be finalized based on requirements and best practices.';
  }

  /**
   * Generate code structure
   */
  generateCodeStructure(technicalBreakdown) {
    if (!technicalBreakdown?.codeStructure) {
      return 'Code structure details available in implementation phase.';
    }

    let structure = '';
    
    Object.entries(technicalBreakdown.codeStructure).forEach(([dir, files]) => {
      if (files && files.length > 0) {
        structure += `**${dir}**\n`;
        files.slice(0, 10).forEach(file => {
          structure += `- ${file}\n`;
        });
        if (files.length > 10) {
          structure += `- ... and ${files.length - 10} more files\n`;
        }
        structure += '\n';
      }
    });

    return structure.trim();
  }

  /**
   * Generate development blueprint
   * @param {Object} chainResult - Complete chain execution result
   * @param {string} depth - Depth level: 'executive', 'detailed', 'comprehensive'
   * @returns {string} Blueprint as markdown
   */
  generateDevelopmentBlueprint(chainResult, depth = 'detailed') {
    try {
      const BlueprintGenerator = require('./blueprint-generator');
      const SprintPlanner = require('./sprint-planner');
      
      const blueprintGen = new BlueprintGenerator(this.logger);
      const sprintPlanner = new SprintPlanner(this.logger);
      
      // Prepare project data for blueprint generation
      const projectData = {
        technicalBreakdown: chainResult.technicalBreakdown || chainResult.technical?.technicalBreakdown,
        refinedScope: chainResult.refinedScope || chainResult.technical?.plan,
        estimate: chainResult.estimate || chainResult.technical?.estimate
      };
      
      // Generate blueprint
      const blueprint = blueprintGen.generateBlueprint(projectData, depth);
      
      // Generate sprint plan if comprehensive
      let sprintPlan = null;
      if (depth === 'comprehensive') {
        try {
          sprintPlan = sprintPlanner.generateSprints(projectData, 5); // Default team size: 5
        } catch (error) {
          this.logger.warn('Sprint planning failed', { error: error.message });
        }
      }
      
      // Format as markdown
      let markdown = `# Development Blueprint\n\n`;
      markdown += `*Generated on ${new Date().toLocaleString('en-IN')}*\n\n`;
      
      markdown += `## Folder Structure\n\n`;
      markdown += `\`\`\`\n${blueprint.folderStructure}\n\`\`\`\n\n`;
      
      markdown += `## Database Schema\n\n`;
      markdown += `\`\`\`sql\n${blueprint.databaseSchema}\n\`\`\`\n\n`;
      
      markdown += `## API Endpoints\n\n`;
      markdown += `${blueprint.apiEndpoints}\n\n`;
      
      markdown += `## Implementation Pseudocode\n\n`;
      if (blueprint.pseudocode && blueprint.pseudocode.length > 0) {
        blueprint.pseudocode.forEach(pseudo => {
          markdown += `### ${pseudo.component}\n\n`;
          markdown += `**Setup:**\n\`\`\`javascript\n${pseudo.setup}\n\`\`\`\n\n`;
          markdown += `**Implementation:**\n\`\`\`javascript\n${pseudo.implementation}\n\`\`\`\n\n`;
          if (pseudo.tests) {
            markdown += `**Tests:**\n\`\`\`javascript\n${pseudo.tests}\n\`\`\`\n\n`;
          }
        });
      } else {
        markdown += `Pseudocode will be generated during implementation phase.\n\n`;
      }
      
      markdown += `## Deployment Configuration\n\n`;
      markdown += `\`\`\`yaml\n${blueprint.deploymentConfig}\n\`\`\`\n\n`;
      
      if (depth === 'comprehensive') {
        if (blueprint.codeStructure) {
          markdown += `## Code Structure Details\n\n`;
          Object.entries(blueprint.codeStructure).forEach(([dir, files]) => {
            if (files && files.length > 0) {
              markdown += `**${dir}**\n`;
              files.slice(0, 10).forEach(file => {
                markdown += `- ${file}\n`;
              });
              if (files.length > 10) {
                markdown += `- ... and ${files.length - 10} more files\n`;
              }
              markdown += '\n';
            }
          });
          markdown += '\n';
        }
        
        if (blueprint.testingStrategy) {
          markdown += `## Testing Strategy\n\n${blueprint.testingStrategy}\n\n`;
        }
        
        if (blueprint.ciCdConfig) {
          markdown += `## CI/CD Configuration\n\n`;
          markdown += `\`\`\`yaml\n${blueprint.ciCdConfig}\n\`\`\`\n\n`;
        }
        
        if (sprintPlan) {
          markdown += `## Sprint Plan\n\n`;
          markdown += sprintPlanner.generateSprintSummary(sprintPlan);
        }
      }
      
      return markdown.trim();
    } catch (error) {
      this.logger.error('Development blueprint generation failed', { error: error.message });
      return `# Development Blueprint\n\n*Blueprint generation failed: ${error.message}*`;
    }
  }

  /**
   * Wrap markdown content in professional HTML
   */
  wrapInHTML(businessContent, technicalContent) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SCOGEN - Project Analysis</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: #f5f6fa;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .confidence-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: 600;
        }
        .content {
            padding: 40px;
        }
        h1 { color: #2c3e50; margin: 30px 0 20px; font-size: 2em; }
        h2 { color: #34495e; margin: 25px 0 15px; font-size: 1.5em; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }
        h3 { color: #7f8c8d; margin: 20px 0 10px; font-size: 1.2em; }
        p { margin: 10px 0; }
        ul { margin: 10px 0 10px 30px; }
        li { margin: 5px 0; }
        
        .investment-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .hidden-cost-section {
            background: #fff;
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
        }
        
        .hidden-cost-section h3 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .success-factors {
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
        }
        
        .risk-item {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 10px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th {
            background: #34495e;
            color: white;
            padding: 12px;
            text-align: left;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
        }
        
        .tabs {
            display: flex;
            background: #34495e;
            margin-bottom: -1px;
        }
        
        .tab-button {
            background: none;
            border: none;
            color: white;
            padding: 15px 30px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
        }
        
        .tab-button:hover {
            background: rgba(255,255,255,0.1);
        }
        
        .tab-button.active {
            background: white;
            color: #34495e;
        }
        
        .tab-content {
            display: none;
            padding: 30px;
        }
        
        .tab-content.active {
            display: block;
        }
        
        @media print {
            .tabs, .no-print { display: none; }
            .tab-content { display: block !important; }
            body { background: white; }
            .container { max-width: 100%; }
        }
        
        .footer {
            background: #34495e;
            color: white;
            text-align: center;
            padding: 20px;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Project Scope & Investment Analysis</h1>
            <div class="confidence-badge">Professional Estimate</div>
        </div>
        
        <div class="tabs">
            <button class="tab-button active" onclick="showTab('business')">Business Overview</button>
            <button class="tab-button" onclick="showTab('technical')">Technical Details</button>
        </div>
        
        <div id="business" class="tab-content active">
            <div class="content">
                ${this.markdownToHTML(businessContent)}
            </div>
        </div>
        
        <div id="technical" class="tab-content">
            <div class="content">
                ${this.markdownToHTML(technicalContent || 'Technical details pending...')}
            </div>
        </div>
        
        <div class="footer no-print">
            Generated by SCOGEN | ${new Date().toLocaleString('en-IN')}
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('active');
            });
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }
    </script>
</body>
</html>
    `.trim();
  }

  /**
   * Convert markdown to HTML (basic conversion)
   */
  markdownToHTML(markdown) {
    if (!markdown) return '';

    // Escape HTML first
    const Formatters = require('../utils/formatters');
    let html = Formatters.escapeHtml(markdown);

    // Convert markdown to HTML
    html = html
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^\- (.+)$/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^([^<].*)$/gim, '<p>$1</p>');

    // Wrap consecutive list items in ul tags
    html = html.replace(/(<li>.*?<\/li>)(?=\s*<li>|$)/gs, (match) => {
      if (!match.includes('<ul>')) {
        return `<ul>${match}</ul>`;
      }
      return match;
    });

    return html;
  }

  /**
   * Format currency for V2 output
   */
  formatCurrency(amount) {
    const Formatters = require('../utils/formatters');
    return Formatters.formatIndianCurrency(amount, { showSymbol: true });
  }

  /**
   * Format timeline for V2 output
   */
  formatTimeline(timeline) {
    if (!timeline) return 'Not specified';
    
    if (typeof timeline === 'object') {
      if (timeline.weeks) {
        return `${timeline.weeks} weeks${timeline.days ? ` (${timeline.days} days)` : ''}`;
      }
      if (timeline.days) {
        return `${timeline.days} days`;
      }
      if (timeline.range) {
        return `${timeline.range.min}-${timeline.range.max} days`;
      }
    }
    
    if (typeof timeline === 'number') {
      return `${timeline} days`;
    }
    
    return String(timeline);
  }
}

module.exports = OutputTranslator;

