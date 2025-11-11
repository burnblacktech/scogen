const fs = require('fs');
const path = require('path');

class DomainKnowledgeManager {
  constructor(logger) {
    this.logger = logger;
    this.knowledgeDir = path.join(__dirname, '../../data/domain-knowledge');
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.knowledgeDir)) {
      fs.mkdirSync(this.knowledgeDir, { recursive: true });
      this.logger.info('Created domain knowledge directory', { path: this.knowledgeDir });
    }
  }

  /**
   * Save domain knowledge to JSON file
   */
  saveDomainKnowledge(domainKnowledge) {
    try {
      const { domain, platformType } = domainKnowledge;
      
      // Use platformType if available, otherwise domain
      const fileName = (platformType || domain || 'generic') + '.json';
      const filePath = path.join(this.knowledgeDir, fileName);
      
      // Validate structure
      if (!domainKnowledge.technicalPatterns) {
        throw new Error('Missing required field: technicalPatterns');
      }
      
      // Read existing if it exists and merge
      let existing = {};
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          existing = JSON.parse(content);
          this.logger.info('Merging with existing domain knowledge', { file: fileName });
        } catch (error) {
          this.logger.warn('Failed to read existing file, creating new', { error: error.message });
        }
      }
      
      // Merge patterns (new patterns override existing ones with same name)
      const merged = {
        ...existing,
        ...domainKnowledge,
        technicalPatterns: {
          ...(existing.technicalPatterns || {}),
          ...domainKnowledge.technicalPatterns
        }
      };
      
      // Write to file
      fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
      
      this.logger.info('Domain knowledge saved', {
        file: fileName,
        patterns: Object.keys(merged.technicalPatterns).length
      });
      
      return {
        success: true,
        file: fileName,
        path: filePath,
        patterns: Object.keys(merged.technicalPatterns).length
      };
    } catch (error) {
      this.logger.error('Failed to save domain knowledge', { error: error.message });
      throw error;
    }
  }

  /**
   * Get domain knowledge by domain/platformType
   */
  getDomainKnowledge(domainOrPlatformType) {
    try {
      const fileName = domainOrPlatformType + '.json';
      const filePath = path.join(this.knowledgeDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Failed to get domain knowledge', {
        domain: domainOrPlatformType,
        error: error.message
      });
      return null;
    }
  }

  /**
   * List all available domain knowledge files
   */
  listDomainKnowledge() {
    try {
      const files = fs.readdirSync(this.knowledgeDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.knowledgeDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const knowledge = JSON.parse(content);
            return {
              file: file,
              domain: knowledge.domain || file.replace('.json', ''),
              platformType: knowledge.platformType,
              patterns: Object.keys(knowledge.technicalPatterns || {}).length,
              lastModified: fs.statSync(filePath).mtime
            };
          } catch (error) {
            this.logger.warn('Failed to parse domain knowledge file', { file, error: error.message });
            return null;
          }
        })
        .filter(item => item !== null);
      
      return files;
    } catch (error) {
      this.logger.error('Failed to list domain knowledge', { error: error.message });
      return [];
    }
  }

  /**
   * Delete a pattern from domain knowledge
   */
  deletePattern(domainOrPlatformType, patternName) {
    try {
      const fileName = domainOrPlatformType + '.json';
      const filePath = path.join(this.knowledgeDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Domain knowledge file not found: ${fileName}`);
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const knowledge = JSON.parse(content);
      
      if (!knowledge.technicalPatterns || !knowledge.technicalPatterns[patternName]) {
        throw new Error(`Pattern not found: ${patternName}`);
      }
      
      delete knowledge.technicalPatterns[patternName];
      
      fs.writeFileSync(filePath, JSON.stringify(knowledge, null, 2), 'utf8');
      
      this.logger.info('Pattern deleted', { domain: domainOrPlatformType, pattern: patternName });
      
      return { success: true, pattern: patternName };
    } catch (error) {
      this.logger.error('Failed to delete pattern', { error: error.message });
      throw error;
    }
  }

  /**
   * Update a specific pattern in domain knowledge
   */
  updatePattern(domainOrPlatformType, patternName, patternData) {
    try {
      const fileName = domainOrPlatformType + '.json';
      const filePath = path.join(this.knowledgeDir, fileName);
      
      // Read existing
      let knowledge = {};
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        knowledge = JSON.parse(content);
      } else {
        // Create new if doesn't exist
        knowledge = {
          domain: domainOrPlatformType,
          platformType: domainOrPlatformType,
          technicalPatterns: {},
          architectureDefaults: {}
        };
      }
      
      // Update pattern
      if (!knowledge.technicalPatterns) {
        knowledge.technicalPatterns = {};
      }
      
      knowledge.technicalPatterns[patternName] = patternData;
      
      // Write back
      fs.writeFileSync(filePath, JSON.stringify(knowledge, null, 2), 'utf8');
      
      this.logger.info('Pattern updated', { domain: domainOrPlatformType, pattern: patternName });
      
      return { success: true, pattern: patternName };
    } catch (error) {
      this.logger.error('Failed to update pattern', { error: error.message });
      throw error;
    }
  }
}

module.exports = DomainKnowledgeManager;

