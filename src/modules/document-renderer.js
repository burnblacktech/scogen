/**
 * Document Renderer
 * 
 * Renders level data into formatted markdown documents with cross-references
 */

const crypto = require('crypto');

class DocumentRenderer {
  constructor(logger) {
    this.logger = logger || console;
  }
  
  /**
   * Calculate content hash for determinism
   * Includes engine version to detect version changes
   */
  calculateContentHash(content, engineVersion = null) {
    const hash = crypto.createHash('sha256');
    hash.update(content);
    if (engineVersion) {
      hash.update(engineVersion);
    }
    return hash.digest('hex');
  }

  /**
   * Render a complete level document
   * @param {Object} levelData - Level data from LevelGenerator
   * @returns {Object} { content: string, hash: string }
   */
  renderLevel(levelData) {
    let markdown = '';

    // Title page
    markdown += this.renderTitlePage(levelData);

    // Table of contents
    markdown += this.renderTableOfContents(levelData);

    // All sections
    markdown += this.renderSections(levelData.sections, levelData.crossReferences);

    // Appendices
    if (levelData.appendices) {
      markdown += this.renderAppendices(levelData.appendices);
    }

    // Calculate content hash (include engine version for determinism)
    const engineVersion = levelData.metadata?.engineVersion || null;
    const contentHash = this.calculateContentHash(markdown, engineVersion);

    return {
      content: markdown,
      hash: contentHash,
      engineVersion: engineVersion
    };
  }

  /**
   * Render title page
   */
  renderTitlePage(levelData) {
    return `# ${levelData.title}

**Level ${levelData.level} Documentation**

Generated: ${new Date(levelData.generatedAt).toLocaleDateString()}

---

`;
  }

  /**
   * Render table of contents
   */
  renderTableOfContents(levelData) {
    let toc = '## Table of Contents\n\n';

    // Add reference to previous levels if included
    if (levelData.includesPreviousLevels && levelData.includesPreviousLevels.length > 0) {
      toc += '**This document includes:**\n';
      levelData.includesPreviousLevels.forEach(level => {
        toc += `- Level ${level} (complete)\n`;
      });
      toc += '\n';
    }

    // Add main sections
    toc += this.generateTOCFromSections(levelData.sections, 0);

    toc += '\n---\n\n';

    return toc;
  }

  /**
   * Generate TOC from sections recursively
   */
  generateTOCFromSections(sections, depth) {
    let toc = '';
    const indent = '  '.repeat(depth);

    Object.entries(sections).forEach(([key, section]) => {
      if (section.title) {
        toc += `${indent}- [${key} ${section.title}](#${this.slugify(section.title)})\n`;
      }

      if (section.content && typeof section.content === 'object') {
        toc += this.generateTOCFromSections(section.content, depth + 1);
      }
    });

    return toc;
  }

  /**
   * Render all sections
   */
  renderSections(sections, crossReferences) {
    let markdown = '';

    Object.entries(sections).forEach(([sectionId, section]) => {
      markdown += this.renderSection(sectionId, section, crossReferences);
    });

    return markdown;
  }

  /**
   * Generate stable anchor ID from section number
   */
  generateAnchorId(sectionNumber) {
    return `section-${sectionNumber.replace(/\./g, '-')}`;
  }

  /**
   * Render a single section
   */
  renderSection(sectionId, section, crossReferences, depth = 2) {
    let markdown = '';

    // Section header with stable anchor ID
    if (section.title) {
      const headingLevel = '#'.repeat(depth);
      const anchorId = section.metadata?.anchorId || this.generateAnchorId(sectionId);
      const moduleTag = section.metadata?.module ? ` data-module="${section.metadata.module}"` : '';
      
      markdown += `${headingLevel} <span id="${anchorId}"${moduleTag}>${sectionId} ${section.title}</span>\n\n`;
    }

    // Section content
    if (typeof section.content === 'string') {
      markdown += `${section.content}\n\n`;
    } else if (Array.isArray(section.content)) {
      section.content.forEach(item => {
        markdown += `- ${item}\n`;
      });
      markdown += '\n';
    } else if (typeof section.content === 'object') {
      // Recursive rendering of nested sections
      Object.entries(section.content).forEach(([subId, subSection]) => {
        markdown += this.renderSection(subId, subSection, crossReferences, depth + 1);
      });
    }

    // Add pseudocode if present
    if (section.pseudocode) {
      markdown += '```javascript\n';
      markdown += section.pseudocode;
      markdown += '\n```\n\n';
    }

    // Add cross-references
    const refs = this.getCrossReferencesForSection(sectionId, crossReferences);
    if (refs.length > 0) {
      markdown += '---\n\n';
      markdown += '**Navigation:**\n\n';
      refs.forEach(ref => {
        markdown += `- ${ref.text}\n`;
      });
      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Get cross-references for a section
   */
  getCrossReferencesForSection(sectionId, crossReferences) {
    if (!crossReferences) return [];

    const refs = [];

    // Upward references
    if (crossReferences.upward) {
      crossReferences.upward.forEach(ref => {
        if (ref.from === sectionId || sectionId.startsWith(ref.from)) {
          refs.push(ref);
        }
      });
    }

    // Downward references
    if (crossReferences.downward) {
      crossReferences.downward.forEach(ref => {
        if (ref.from === sectionId || sectionId.startsWith(ref.from)) {
          refs.push(ref);
        }
      });
    }

    // Lateral references
    if (crossReferences.lateral) {
      crossReferences.lateral.forEach(ref => {
        if (ref.from === sectionId || sectionId.startsWith(ref.from)) {
          refs.push(ref);
        }
      });
    }

    return refs;
  }

  /**
   * Render appendices
   */
  renderAppendices(appendices) {
    let markdown = '\n---\n\n# Appendices\n\n';

    Object.entries(appendices).forEach(([key, appendix]) => {
      markdown += `## ${key} ${appendix.title}\n\n`;
      
      if (typeof appendix.content === 'string') {
        markdown += `${appendix.content}\n\n`;
      } else if (Array.isArray(appendix.content)) {
        appendix.content.forEach(item => {
          markdown += `- ${item}\n`;
        });
        markdown += '\n';
      } else if (typeof appendix.content === 'object') {
        markdown += JSON.stringify(appendix.content, null, 2);
        markdown += '\n\n';
      }
    });

    return markdown;
  }

  /**
   * Slugify string for anchor links
   */
  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Render level summary for preview
   */
  renderLevelSummary(levelData) {
    return {
      level: levelData.level,
      title: levelData.title,
      pages: levelData.pages,
      moduleCount: this.countModules(levelData),
      sections: Object.keys(levelData.sections || {}).length
    };
  }

  /**
   * Count modules in level data
   */
  countModules(levelData) {
    // This is a simplified count - in production, would traverse the structure
    return 0; // Would need to extract from sections
  }
}

module.exports = DocumentRenderer;

