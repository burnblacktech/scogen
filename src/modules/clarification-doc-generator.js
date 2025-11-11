/**
 * Clarification Document Generator
 * 
 * Purpose: Generate scope clarification documents for low-quality inputs
 * Output: Markdown document with partial scope, assumptions, missing items
 */

class ClarificationDocGenerator {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Main generator method
   * @param {Object} partialScope - What was extracted from vague input
   * @param {Object} missingItems - Missing critical/important/nice-to-have items
   * @param {Object} assumptions - What we're assuming
   * @param {string} suggestedTemplate - Suggested template file name
   * @returns {string} Markdown clarification document
   */
  generate(partialScope, missingItems, assumptions, suggestedTemplate) {
    this.logger.info('Generating clarification document', {
      hasPartialScope: !!partialScope,
      missingCriticalCount: missingItems?.critical?.length || 0
    });

    const sections = [];

    // Header
    sections.push('# Project Scope Analysis');
    sections.push('');
    sections.push('*This document was generated because your requirements need more detail for accurate estimation.*');
    sections.push('');

    // What We Understood
    sections.push('## What We Understood');
    sections.push('');
    sections.push(this.formatPartialScope(partialScope));
    sections.push('');

    // Critical Information Needed
    if (missingItems?.critical && missingItems.critical.length > 0) {
      sections.push('## Critical Information Needed');
      sections.push('');
      sections.push('To provide an accurate estimate, we need clarification on:');
      sections.push('');
      missingItems.critical.forEach((item, index) => {
        sections.push(`${index + 1}. ${item}`);
      });
      sections.push('');
    }

    // Important Information (if any)
    if (missingItems?.important && missingItems.important.length > 0) {
      sections.push('## Important Information (Recommended)');
      sections.push('');
      sections.push('These details will help us provide a more accurate estimate:');
      sections.push('');
      missingItems.important.forEach((item, index) => {
        sections.push(`${index + 1}. ${item}`);
      });
      sections.push('');
    }

    // What We're Assuming
    if (assumptions && Object.keys(assumptions).length > 0) {
      sections.push('## What We\'re Assuming (change if incorrect)');
      sections.push('');
      sections.push(this.formatAssumptions(assumptions));
      sections.push('');
    }

    // Recommended Modules
    if (partialScope?.modules && partialScope.modules.length > 0) {
      sections.push('## Recommended Modules');
      sections.push('');
      sections.push(this.formatRecommendations(partialScope));
      sections.push('');
    }

    // Next Steps
    sections.push('## Next Steps');
    sections.push('');
    sections.push('1. **Review assumptions above** - Let us know if anything is incorrect');
    sections.push('2. **Clarify critical information** - Answer the questions in "Critical Information Needed"');
    sections.push('3. **Download our template** - Use the Excel template for structured requirements');
    sections.push('4. **Resubmit** - We\'ll prepare a detailed estimate');
    sections.push('');

    if (suggestedTemplate) {
      sections.push(`**📥 Download Template**: [${suggestedTemplate}](/api/templates/${suggestedTemplate})`);
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Format partial scope extracted
   */
  formatPartialScope(partialScope) {
    if (!partialScope) {
      return 'We were unable to extract specific details from your input.';
    }

    const parts = [];

    if (partialScope.industry) {
      parts.push(`- **Industry**: ${partialScope.industry}`);
    }

    if (partialScope.useCase) {
      parts.push(`- **Use Case**: ${partialScope.useCase}`);
    }

    if (partialScope.platformType) {
      parts.push(`- **Platform Type**: ${partialScope.platformType}`);
    }

    if (partialScope.modules && partialScope.modules.length > 0) {
      parts.push(`- **Detected Modules**: ${partialScope.modules.join(', ')}`);
    }

    if (partialScope.scale) {
      parts.push(`- **Scale**: ${partialScope.scale}`);
    }

    if (parts.length === 0) {
      return 'We detected a project request but need more details to proceed.';
    }

    return parts.join('\n');
  }

  /**
   * Format assumptions
   */
  formatAssumptions(assumptions) {
    const parts = [];

    if (assumptions.platform) {
      parts.push(`- **Platform**: ${assumptions.platform}`);
    }

    if (assumptions.scale) {
      parts.push(`- **Scale**: ${assumptions.scale}`);
    }

    if (assumptions.businessModel) {
      parts.push(`- **Business Model**: ${assumptions.businessModel}`);
    }

    if (assumptions.userTypes) {
      parts.push(`- **User Types**: ${assumptions.userTypes.join(', ')}`);
    }

    if (assumptions.integrations) {
      parts.push(`- **Integrations**: ${assumptions.integrations.join(', ')}`);
    }

    if (parts.length === 0) {
      return 'No specific assumptions made.';
    }

    return parts.join('\n');
  }

  /**
   * Format recommendations
   */
  formatRecommendations(partialScope) {
    const parts = [];

    if (partialScope.modules && partialScope.modules.length > 0) {
      parts.push('### Phase 1 (Must Have)');
      parts.push('');
      
      // Categorize modules (simple heuristic)
      const criticalModules = partialScope.modules.slice(0, Math.min(5, partialScope.modules.length));
      const otherModules = partialScope.modules.slice(5);

      criticalModules.forEach(module => {
        parts.push(`- ${module}`);
      });

      if (otherModules.length > 0) {
        parts.push('');
        parts.push('### Phase 2 (Good to Have)');
        parts.push('');
        otherModules.forEach(module => {
          parts.push(`- ${module}`);
        });
      }
    }

    return parts.join('\n');
  }

  /**
   * Generate quick form questions for medium-quality input
   */
  generateQuickForm(missingItems, analysis) {
    const questions = [];

    // Critical questions first
    if (missingItems.critical && missingItems.critical.length > 0) {
      missingItems.critical.forEach(item => {
        questions.push({
          id: this.generateQuestionId(item),
          label: item,
          type: this.determineQuestionType(item),
          required: true
        });
      });
    }

    // Important questions (optional)
    if (missingItems.important && missingItems.important.length > 0) {
      missingItems.important.slice(0, 3).forEach(item => {
        questions.push({
          id: this.generateQuestionId(item),
          label: item,
          type: this.determineQuestionType(item),
          required: false
        });
      });
    }

    return {
      questions,
      message: 'Just need a few clarifications to proceed:'
    };
  }

  /**
   * Generate question ID from label
   */
  generateQuestionId(label) {
    return label.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }

  /**
   * Determine question type from label
   */
  determineQuestionType(label) {
    const lower = label.toLowerCase();

    if (lower.includes('number') || lower.includes('how many') || lower.includes('count')) {
      return 'number';
    }

    if (lower.includes('yes') || lower.includes('no') || lower.includes('need')) {
      return 'radio';
    }

    if (lower.includes('which') || lower.includes('what type') || lower.includes('select')) {
      return 'select';
    }

    return 'text';
  }
}

module.exports = ClarificationDocGenerator;

