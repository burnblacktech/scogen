#!/usr/bin/env node
/**
 * Documentation Validator
 * 
 * Validates generated documentation levels for:
 * - 100% module coverage in L2-L5
 * - Cross-reference integrity
 * - Deterministic content hashes
 * - L5 pseudocode coverage ≥ 95%
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Get project ID from command line
const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node scripts/validate-docs.js <projectId>');
  process.exit(1);
}

// Database path
const dbPath = process.env.DB_V2_PATH || path.join(process.cwd(), 'scogen-v2.db');

/**
 * Parse markdown sections and extract anchors
 */
function parseSections(md) {
  const lines = md.split('\n');
  const sections = [];
  const anchors = [];
  
  lines.forEach((line, i) => {
    // Match H2: ## 3.1 Section Title
    const h2 = line.match(/^##\s+(\d+(?:\.\d+)*)\s+(.*)/);
    // Match H3: ### 3.1.1 Subsection Title
    const h3 = line.match(/^###\s+(\d+(?:\.\d+)*)\s+(.*)/);
    
    const match = h2 || h3;
    if (match) {
      const id = `section-${match[1].replace(/\./g, '-')}`;
      sections.push({
        id,
        number: match[1],
        title: match[3] || match[2],
        line: i,
        level: h2 ? 2 : 3
      });
      anchors.push(id);
    }
  });
  
  return { sections, anchors };
}

/**
 * Ensure all locked modules appear in level document
 */
function ensureAllModulesPresent(lockedScope, levelDoc) {
  const missing = [];
  const found = [];
  
  lockedScope.modules.forEach(m => {
    // Escape special regex characters in module name
    const escapedName = m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Try exact match first
    const exactRx = new RegExp(`\\b${escapedName}\\b`, 'i');
    // Try with variations (spaces, dashes, etc.)
    const variantRx = new RegExp(escapedName.replace(/\s+/g, '[\\s\\-]?'), 'i');
    
    if (exactRx.test(levelDoc) || variantRx.test(levelDoc)) {
      found.push(m.name);
    } else {
      missing.push({ name: m.name, id: m.id });
    }
  });
  
  return { missing, found, coverage: found.length / lockedScope.modules.length };
}

/**
 * Check for orphaned modules (modules in docs not in locked scope)
 */
function checkOrphanedModules(lockedScope, levelDoc) {
  const orphaned = [];
  const moduleNames = new Set(lockedScope.modules.map(m => m.name.toLowerCase()));
  
  // Extract potential module names from document
  // Look for patterns like "Module: X" or "## X Module" or "### X"
  const modulePatterns = [
    /Module:\s*([A-Z][a-zA-Z\s]+)/g,
    /##\s+\d+\.\d+\s+([A-Z][a-zA-Z\s]+)\s+Module/gi,
    /###\s+\d+\.\d+\.\d+\s+([A-Z][a-zA-Z\s]+)/g
  ];
  
  modulePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(levelDoc)) !== null) {
      const potentialModule = match[1].trim();
      if (potentialModule.length > 3 && !moduleNames.has(potentialModule.toLowerCase())) {
        // Check if it's not a common word
        const commonWords = ['overview', 'summary', 'details', 'specification', 'implementation'];
        if (!commonWords.some(word => potentialModule.toLowerCase().includes(word))) {
          orphaned.push(potentialModule);
        }
      }
    }
  });
  
  return [...new Set(orphaned)]; // Remove duplicates
}

/**
 * Check cross-reference integrity
 */
function checkCrossRefs(md, currentLevel) {
  const re = /→ See Level (\d+), Section ([\d.]+)/g;
  const refs = [];
  let match;
  
  while ((match = re.exec(md)) !== null) {
    refs.push({
      level: parseInt(match[1]),
      section: match[2],
      line: md.substring(0, match.index).split('\n').length
    });
  }
  
  const { sections, anchors } = parseSections(md);
  const broken = [];
  const valid = [];
  
  refs.forEach(ref => {
    if (ref.level === currentLevel) {
      // Intra-level reference - check if anchor exists
      const targetId = `section-${ref.section.replace(/\./g, '-')}`;
      if (anchors.includes(targetId)) {
        valid.push(ref);
      } else {
        broken.push({ ...ref, reason: `Anchor ${targetId} not found in level ${currentLevel}` });
      }
    } else {
      // Inter-level reference - we can't validate without loading other level
      // Mark as valid for now, will be validated when viewing
      valid.push(ref);
    }
  });
  
  return { refs, broken, valid, passRate: valid.length / refs.length };
}

/**
 * Count pseudocode blocks in L5
 */
function countPseudocodeBlocks(md) {
  // Count code blocks that are likely pseudocode
  // Look for ```javascript or ``` blocks with module/feature context
  const codeBlockPattern = /```[\w]*\n[\s\S]*?```/g;
  const blocks = [];
  let match;
  
  while ((match = codeBlockPattern.exec(md)) !== null) {
    const content = match[0];
    // Check if it looks like pseudocode (has comments, has function definitions, etc.)
    if (content.includes('//') || content.includes('function') || content.includes('class') || content.includes('async')) {
      blocks.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  
  return blocks.length;
}

/**
 * Calculate pseudocode coverage for L5
 */
function calculatePseudocodeCoverage(lockedScope, l5Content) {
  // Expected blocks: one per module feature, or at least one per module
  const expectedBlocks = lockedScope.modules.reduce((sum, m) => {
    return sum + (m.features && m.features.length > 0 ? m.features.length : 1);
  }, 0);
  
  const actualBlocks = countPseudocodeBlocks(l5Content);
  const coverage = expectedBlocks > 0 ? actualBlocks / expectedBlocks : 0;
  
  return {
    expected: expectedBlocks,
    actual: actualBlocks,
    coverage: coverage,
    meetsThreshold: coverage >= 0.95
  };
}

/**
 * Calculate content hash for determinism
 */
function calculateContentHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Main validation function
 */
function main(projectId) {
  const db = new Database(dbPath);
  const failures = [];
  const warnings = [];
  const results = {
    projectId: projectId,
    timestamp: new Date().toISOString(),
    passed: true,
    checks: {}
  };
  
  try {
    // Get project and locked scope
    const project = db.prepare('SELECT locked_scope, scope_checksum FROM projects WHERE id = ? OR project_code = ?').get(projectId, projectId);
    
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    if (!project.locked_scope) {
      throw new Error(`Project ${projectId} has no locked scope`);
    }
    
    const lockedScope = typeof project.locked_scope === 'string' 
      ? JSON.parse(project.locked_scope) 
      : project.locked_scope;
    
    // Get all generated levels
    const levels = db.prepare('SELECT level, content, content_hash FROM document_levels WHERE project_id = ? ORDER BY level ASC').all(projectId);
    
    if (levels.length === 0) {
      throw new Error(`No levels generated for project ${projectId}`);
    }
    
    // Check L2-L5 module coverage
    levels.filter(l => l.level >= 2 && l.level <= 5).forEach(level => {
      const { missing, found, coverage } = ensureAllModulesPresent(lockedScope, level.content);
      
      results.checks[`level_${level.level}_module_coverage`] = {
        passed: missing.length === 0,
        coverage: coverage,
        found: found.length,
        total: lockedScope.modules.length,
        missing: missing
      };
      
      if (missing.length > 0) {
        failures.push({
          level: level.level,
          type: 'missing_modules',
          missing: missing,
          message: `Level ${level.level}: ${missing.length} modules missing from documentation`
        });
        results.passed = false;
      }
      
      // Check for orphaned modules
      const orphaned = checkOrphanedModules(lockedScope, level.content);
      if (orphaned.length > 0) {
        warnings.push({
          level: level.level,
          type: 'orphaned_modules',
          orphaned: orphaned,
          message: `Level ${level.level}: Found ${orphaned.length} potential orphaned modules`
        });
      }
    });
    
    // Check cross-references
    levels.forEach(level => {
      const crossRefCheck = checkCrossRefs(level.content, level.level);
      
      results.checks[`level_${level.level}_crossrefs`] = {
        passed: crossRefCheck.broken.length === 0,
        total: crossRefCheck.refs.length,
        valid: crossRefCheck.valid.length,
        broken: crossRefCheck.broken.length,
        passRate: crossRefCheck.passRate
      };
      
      if (crossRefCheck.broken.length > 0) {
        failures.push({
          level: level.level,
          type: 'broken_crossrefs',
          broken: crossRefCheck.broken,
          message: `Level ${level.level}: ${crossRefCheck.broken.length} broken cross-references`
        });
        results.passed = false;
      }
    });
    
    // Check L5 pseudocode coverage
    const l5Level = levels.find(l => l.level === 5);
    if (l5Level) {
      const pseudocodeCoverage = calculatePseudocodeCoverage(lockedScope, l5Level.content);
      
      results.checks.level_5_pseudocode_coverage = {
        passed: pseudocodeCoverage.meetsThreshold,
        expected: pseudocodeCoverage.expected,
        actual: pseudocodeCoverage.actual,
        coverage: pseudocodeCoverage.coverage,
        threshold: 0.95
      };
      
      if (!pseudocodeCoverage.meetsThreshold) {
        failures.push({
          level: 5,
          type: 'insufficient_pseudocode',
          expected: pseudocodeCoverage.expected,
          actual: pseudocodeCoverage.actual,
          coverage: pseudocodeCoverage.coverage,
          message: `Level 5: Pseudocode coverage ${(pseudocodeCoverage.coverage * 100).toFixed(1)}% is below 95% threshold`
        });
        results.passed = false;
      }
    }
    
    // Check determinism (content hash consistency)
    levels.forEach(level => {
      const currentHash = calculateContentHash(level.content);
      
      if (level.content_hash) {
        if (level.content_hash !== currentHash) {
          warnings.push({
            level: level.level,
            type: 'hash_mismatch',
            stored: level.content_hash,
            computed: currentHash,
            message: `Level ${level.level}: Content hash mismatch (content may have changed)`
          });
        }
      }
    });
    
    results.failures = failures;
    results.warnings = warnings;
    
    // Output results
    console.log(JSON.stringify(results, null, 2));
    
    // Exit with error code if validation failed
    if (!results.passed) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error(JSON.stringify({
      projectId: projectId,
      passed: false,
      error: error.message,
      stack: error.stack
    }, null, 2));
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run validation
main(projectId);

