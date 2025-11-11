const chalk = require('chalk');

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
    if (!amount && amount !== 0) return '0';
    const numAmount = typeof amount === 'object' ? (amount.total || amount.amount || 0) : amount;
    if (numAmount >= 10000000) {
      return (numAmount / 10000000).toFixed(2) + 'Cr';
    } else if (numAmount >= 100000) {
      return (numAmount / 100000).toFixed(2) + 'L';
    } else if (numAmount >= 1000) {
      return (numAmount / 1000).toFixed(1) + 'K';
    }
    return numAmount.toLocaleString('en-IN');
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
}

module.exports = OutputTranslator;

