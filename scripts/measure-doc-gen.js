#!/usr/bin/env node
/**
 * Documentation Generation Performance Measurement
 * 
 * Measures generation time for each level and compares to targets
 */

const Database = require('better-sqlite3');
const path = require('path');

// Get project ID from command line
const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node scripts/measure-doc-gen.js <projectId>');
  process.exit(1);
}

// Performance targets (in seconds)
const TARGETS = {
  1: parseInt(process.env.DOC_TARGETS_L1) || 10,
  2: parseInt(process.env.DOC_TARGETS_L2) || 20,
  3: parseInt(process.env.DOC_TARGETS_L3) || 40,
  4: parseInt(process.env.DOC_TARGETS_L4) || 60,
  5: parseInt(process.env.DOC_TARGETS_L5) || 120
};

const PERF_STRICT = process.env.PERF_STRICT === 'true';

// Database path
const dbPath = process.env.DB_V2_PATH || path.join(process.cwd(), 'scogen-v2.db');

/**
 * Main function
 */
function main(projectId) {
  const db = new Database(dbPath);
  
  try {
    // Get level metadata with generation times
    const levels = db.prepare(`
      SELECT level, metadata, generated_at 
      FROM document_levels 
      WHERE project_id = ? 
      ORDER BY level ASC
    `).all(projectId);
    
    if (levels.length === 0) {
      throw new Error(`No levels found for project ${projectId}`);
    }
    
    const measurements = {};
    const warnings = [];
    let failed = false;
    
    levels.forEach(level => {
      const metadata = typeof level.metadata === 'string' 
        ? JSON.parse(level.metadata) 
        : level.metadata;
      
      // Try to get generation time from metadata
      let generationTime = null;
      
      if (metadata.generationTime) {
        generationTime = metadata.generationTime;
      } else if (metadata.generatedAt) {
        // Calculate from generated_at timestamp (rough estimate)
        const generatedAt = new Date(metadata.generatedAt || level.generated_at);
        const now = new Date();
        generationTime = (now - generatedAt) / 1000; // Convert to seconds
      }
      
      const target = TARGETS[level.level];
      const passed = generationTime !== null && generationTime <= target;
      
      measurements[`level_${level.level}`] = {
        time: generationTime,
        target: target,
        passed: passed,
        exceeded: generationTime !== null && generationTime > target ? generationTime - target : 0
      };
      
      if (generationTime !== null && generationTime > target) {
        warnings.push({
          level: level.level,
          time: generationTime,
          target: target,
          exceeded: generationTime - target
        });
        
        if (PERF_STRICT) {
          failed = true;
        }
      }
    });
    
    const result = {
      projectId: projectId,
      timestamp: new Date().toISOString(),
      measurements: measurements,
      warnings: warnings,
      passed: !failed
    };
    
    console.log(JSON.stringify(result, null, 2));
    
    // Log warnings
    if (warnings.length > 0) {
      console.error('\n⚠️  Performance Warnings:');
      warnings.forEach(w => {
        console.error(`  Level ${w.level}: ${w.time.toFixed(2)}s (target: ${w.target}s, exceeded by ${w.exceeded.toFixed(2)}s)`);
      });
    }
    
    if (failed) {
      process.exit(1);
    }
    
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

// Run measurement
main(projectId);

