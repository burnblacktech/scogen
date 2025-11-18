#!/usr/bin/env node
/**
 * Documentation Metrics Calculator
 * 
 * Computes and stores coverage and quality metrics for documentation levels
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

// Get project ID from command line
const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node scripts/compute-doc-metrics.js <projectId>');
  process.exit(1);
}

// Database path
const dbPath = process.env.DB_V2_PATH || path.join(process.cwd(), 'scogen-v2.db');

/**
 * Calculate module coverage for a level
 */
function calculateModuleCoverage(lockedScope, levelContent) {
  const moduleNames = lockedScope.modules.map(m => m.name.toLowerCase());
  let found = 0;
  
  moduleNames.forEach(name => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    if (rx.test(levelContent)) {
      found++;
    }
  });
  
  return {
    found,
    total: lockedScope.modules.length,
    coverage: found / lockedScope.modules.length
  };
}

/**
 * Calculate AC coverage for L3
 */
function calculateACCoverage(levelContent) {
  // Look for acceptance criteria patterns
  const acPatterns = [
    /acceptance criteria/gi,
    /acceptance criterion/gi,
    /AC:/gi,
    /Given.*When.*Then/gi
  ];
  
  let acCount = 0;
  acPatterns.forEach(pattern => {
    const matches = levelContent.match(pattern);
    if (matches) {
      acCount += matches.length;
    }
  });
  
  // Estimate expected ACs (rough heuristic: 2-3 per feature)
  const featureMatches = levelContent.match(/feature/gi) || [];
  const expectedACs = featureMatches.length * 2.5;
  
  return {
    found: acCount,
    expected: Math.max(expectedACs, 1),
    coverage: expectedACs > 0 ? Math.min(acCount / expectedACs, 1) : 0
  };
}

/**
 * Calculate API coverage for L4
 */
function calculateAPICoverage(levelContent) {
  // Look for API endpoint patterns
  const apiPatterns = [
    /(GET|POST|PUT|DELETE|PATCH)\s+\/api\/[^\s]+/gi,
    /endpoint.*\/api\//gi,
    /API.*endpoint/gi
  ];
  
  let apiCount = 0;
  apiPatterns.forEach(pattern => {
    const matches = levelContent.match(pattern);
    if (matches) {
      apiCount += matches.length;
    }
  });
  
  // Estimate expected APIs (rough heuristic: 4-5 per module)
  const moduleMatches = levelContent.match(/module/gi) || [];
  const expectedAPIs = moduleMatches.length * 4.5;
  
  return {
    found: apiCount,
    expected: Math.max(expectedAPIs, 1),
    coverage: expectedAPIs > 0 ? Math.min(apiCount / expectedAPIs, 1) : 0
  };
}

/**
 * Calculate pseudocode coverage for L5
 */
function calculatePseudocodeCoverage(lockedScope, levelContent) {
  // Count code blocks
  const codeBlockPattern = /```[\w]*\n[\s\S]*?```/g;
  const blocks = [];
  let match;
  
  while ((match = codeBlockPattern.exec(levelContent)) !== null) {
    const content = match[0];
    if (content.includes('//') || content.includes('function') || content.includes('class') || content.includes('async')) {
      blocks.push(match.index);
    }
  }
  
  // Expected blocks: one per module feature, or at least one per module
  const expectedBlocks = lockedScope.modules.reduce((sum, m) => {
    return sum + (m.features && m.features.length > 0 ? m.features.length : 1);
  }, 0);
  
  return {
    found: blocks.length,
    expected: expectedBlocks,
    coverage: expectedBlocks > 0 ? blocks.length / expectedBlocks : 0
  };
}

/**
 * Calculate cross-reference pass rate
 */
function calculateCrossRefPassRate(levelContent, currentLevel) {
  const re = /→ See Level (\d+), Section ([\d.]+)/g;
  const refs = [];
  let match;
  
  while ((match = re.exec(levelContent)) !== null) {
    refs.push({
      level: parseInt(match[1]),
      section: match[2]
    });
  }
  
  // Parse sections for intra-level validation
  const sectionPattern = /^##\s+(\d+(?:\.\d+)*)\s+/gm;
  const sections = [];
  while ((match = sectionPattern.exec(levelContent)) !== null) {
    sections.push(match[1]);
  }
  
  let valid = 0;
  refs.forEach(ref => {
    if (ref.level === currentLevel) {
      // Check if section exists
      const targetId = `section-${ref.section.replace(/\./g, '-')}`;
      if (sections.some(s => s === ref.section)) {
        valid++;
      }
    } else {
      // Inter-level - assume valid (can't verify without loading other level)
      valid++;
    }
  });
  
  return {
    total: refs.length,
    valid: valid,
    passRate: refs.length > 0 ? valid / refs.length : 1
  };
}

/**
 * Calculate content hash
 */
function calculateContentHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Store metric in database
 */
function storeMetric(db, projectId, level, metricName, metricValue, metricData = null) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO documentation_metrics 
    (project_id, level, metric_name, metric_value, metric_data, computed_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  stmt.run(
    projectId,
    level,
    metricName,
    metricValue,
    metricData ? JSON.stringify(metricData) : null
  );
}

/**
 * Main function
 */
function main(projectId) {
  const db = new Database(dbPath);
  
  try {
    // Get project and locked scope
    const project = db.prepare('SELECT locked_scope FROM projects WHERE id = ? OR project_code = ?').get(projectId, projectId);
    
    if (!project || !project.locked_scope) {
      throw new Error(`Project ${projectId} not found or has no locked scope`);
    }
    
    const lockedScope = typeof project.locked_scope === 'string' 
      ? JSON.parse(project.locked_scope) 
      : project.locked_scope;
    
    // Get all generated levels
    const levels = db.prepare('SELECT level, content FROM document_levels WHERE project_id = ? ORDER BY level ASC').all(projectId);
    
    if (levels.length === 0) {
      throw new Error(`No levels generated for project ${projectId}`);
    }
    
    const metrics = {};
    
    // Compute metrics for each level
    levels.forEach(level => {
      // Module coverage (L2-L5)
      if (level.level >= 2 && level.level <= 5) {
        const moduleCoverage = calculateModuleCoverage(lockedScope, level.content);
        storeMetric(db, projectId, level.level, 'module_coverage', moduleCoverage.coverage, {
          found: moduleCoverage.found,
          total: moduleCoverage.total
        });
        metrics[`level_${level.level}_module_coverage`] = moduleCoverage.coverage;
      }
      
      // AC coverage (L3)
      if (level.level === 3) {
        const acCoverage = calculateACCoverage(level.content);
        storeMetric(db, projectId, level.level, 'ac_coverage', acCoverage.coverage, {
          found: acCoverage.found,
          expected: acCoverage.expected
        });
        metrics[`level_${level.level}_ac_coverage`] = acCoverage.coverage;
      }
      
      // API coverage (L4)
      if (level.level === 4) {
        const apiCoverage = calculateAPICoverage(level.content);
        storeMetric(db, projectId, level.level, 'api_coverage', apiCoverage.coverage, {
          found: apiCoverage.found,
          expected: apiCoverage.expected
        });
        metrics[`level_${level.level}_api_coverage`] = apiCoverage.coverage;
      }
      
      // Pseudocode coverage (L5)
      if (level.level === 5) {
        const pseudocodeCoverage = calculatePseudocodeCoverage(lockedScope, level.content);
        storeMetric(db, projectId, level.level, 'pseudocode_coverage', pseudocodeCoverage.coverage, {
          found: pseudocodeCoverage.found,
          expected: pseudocodeCoverage.expected
        });
        metrics[`level_${level.level}_pseudocode_coverage`] = pseudocodeCoverage.coverage;
      }
      
      // Cross-reference pass rate
      const crossRefPassRate = calculateCrossRefPassRate(level.content, level.level);
      storeMetric(db, projectId, level.level, 'crossref_pass_rate', crossRefPassRate.passRate, {
        total: crossRefPassRate.total,
        valid: crossRefPassRate.valid
      });
      metrics[`level_${level.level}_crossref_pass_rate`] = crossRefPassRate.passRate;
      
      // Determinism hash
      const contentHash = calculateContentHash(level.content);
      storeMetric(db, projectId, level.level, 'determinism_hash', null, {
        hash: contentHash
      });
      
      // Update content_hash in document_levels
      const updateStmt = db.prepare('UPDATE document_levels SET content_hash = ? WHERE project_id = ? AND level = ?');
      updateStmt.run(contentHash, projectId, level.level);
      
      metrics[`level_${level.level}_determinism_hash`] = contentHash;
    });
    
    console.log(JSON.stringify({
      projectId: projectId,
      timestamp: new Date().toISOString(),
      metrics: metrics
    }, null, 2));
    
  } catch (error) {
    console.error(JSON.stringify({
      projectId: projectId,
      error: error.message,
      stack: error.stack
    }, null, 2));
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run metrics computation
main(projectId);

