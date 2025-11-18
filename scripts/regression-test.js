#!/usr/bin/env node
/**
 * Regression Test Script
 * 
 * Generates all 5 levels for each golden scope and compares content hashes
 * with expected hashes to detect drift.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Database path
const dbPath = process.env.DB_V2_PATH || path.join(process.cwd(), 'scogen-v2.db');

// Golden dataset directory
const goldenDir = path.join(process.cwd(), 'docs', 'golden');
const scopesDir = path.join(goldenDir, 'scopes');
const hashesDir = path.join(goldenDir, 'expected-hashes');

// Ensure hashes directory exists
if (!fs.existsSync(hashesDir)) fs.mkdirSync(hashesDir, { recursive: true });

/**
 * Generate all levels for a project
 */
async function generateLevels(projectId, lockedScope) {
  const LevelGenerator = require('../src/modules/level-generator');
  const DocumentRenderer = require('../src/modules/document-renderer');
  const Library = require('../src/modules/library');
  
  const logger = console;
  const library = new Library(logger);
  const levelGenerator = new LevelGenerator(logger, library);
  const renderer = new DocumentRenderer(logger);
  
  const levels = {};
  const previousLevels = [];
  
  for (let level = 1; level <= 5; level++) {
    console.log(`  Generating Level ${level}...`);
    
    const levelData = await levelGenerator.generateLevel(
      level,
      lockedScope,
      previousLevels,
      {} // chainResult
    );
    
    const renderResult = renderer.renderLevel(levelData);
    const content = renderResult.content || renderResult;
    const hash = renderResult.hash || crypto.createHash('sha256').update(content).digest('hex');
    
    levels[level] = {
      content: content,
      hash: hash,
      metadata: levelData.metadata || {}
    };
    
    previousLevels.push(levelData);
  }
  
  return levels;
}

/**
 * Load expected hashes
 */
function loadExpectedHashes(projectCode) {
  const hashFile = path.join(hashesDir, `${projectCode}.json`);
  
  if (fs.existsSync(hashFile)) {
    return JSON.parse(fs.readFileSync(hashFile, 'utf8'));
  }
  
  return null;
}

/**
 * Save expected hashes
 */
function saveExpectedHashes(projectCode, hashes) {
  const hashFile = path.join(hashesDir, `${projectCode}.json`);
  fs.writeFileSync(hashFile, JSON.stringify(hashes, null, 2));
}

/**
 * Main function
 */
async function main() {
  const db = new Database(dbPath);
  
  try {
    // Get all golden projects
    const projects = db.prepare(`
      SELECT id, project_code, name, locked_scope 
      FROM projects 
      WHERE project_code LIKE 'GOLDEN-%'
      ORDER BY project_code
    `).all();
    
    if (projects.length === 0) {
      console.error('No golden projects found. Run "npm run docs:golden" first.');
      process.exit(1);
    }
    
    console.log(`Found ${projects.length} golden project(s)\n`);
    
    const results = [];
    let totalDrift = 0;
    
    for (const project of projects) {
      console.log(`Testing ${project.name} (${project.project_code})...`);
      
      const lockedScope = typeof project.locked_scope === 'string'
        ? JSON.parse(project.locked_scope)
        : project.locked_scope;
      
      // Generate all levels
      const generatedLevels = await generateLevels(project.id, lockedScope);
      
      // Load expected hashes
      const expectedHashes = loadExpectedHashes(project.project_code);
      
      // Compare hashes
      const drift = {};
      let hasDrift = false;
      
      for (let level = 1; level <= 5; level++) {
        const generatedHash = generatedLevels[level].hash;
        const expectedHash = expectedHashes?.[level]?.hash;
        
        if (expectedHash && generatedHash !== expectedHash) {
          drift[level] = {
            expected: expectedHash,
            actual: generatedHash,
            message: `Level ${level} content hash mismatch`
          };
          hasDrift = true;
          totalDrift++;
          console.log(`  ❌ Level ${level}: Hash mismatch`);
        } else {
          console.log(`  ✓ Level ${level}: Hash matches`);
        }
      }
      
      // Save hashes if first run or if no drift
      if (!expectedHashes || !hasDrift) {
        const hashes = {};
        for (let level = 1; level <= 5; level++) {
          hashes[level] = {
            hash: generatedLevels[level].hash,
            generatedAt: new Date().toISOString()
          };
        }
        saveExpectedHashes(project.project_code, hashes);
        if (!expectedHashes) {
          console.log(`  ℹ Saved expected hashes for future comparison`);
        }
      }
      
      results.push({
        projectCode: project.project_code,
        name: project.name,
        hasDrift: hasDrift,
        drift: drift
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Regression Test Summary');
    console.log('='.repeat(60));
    
    results.forEach(r => {
      if (r.hasDrift) {
        console.log(`\n❌ ${r.name} (${r.projectCode}): DRIFT DETECTED`);
        Object.entries(r.drift).forEach(([level, info]) => {
          console.log(`   Level ${level}: ${info.message}`);
          console.log(`     Expected: ${info.expected.substring(0, 16)}...`);
          console.log(`     Actual:   ${info.actual.substring(0, 16)}...`);
        });
      } else {
        console.log(`\n✓ ${r.name} (${r.projectCode}): No drift`);
      }
    });
    
    if (totalDrift > 0) {
      console.log(`\n❌ Regression test FAILED: ${totalDrift} level(s) with drift`);
      process.exit(1);
    } else {
      console.log(`\n✅ Regression test PASSED: All levels match expected hashes`);
      process.exit(0);
    }
    
  } catch (error) {
    console.error('Regression test failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run regression test
main();

