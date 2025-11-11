/**
 * Systematic Debug Checker
 * 
 * This script checks for common runtime errors before they happen:
 * - Undefined variables
 * - Missing method calls
 * - Array operations on non-arrays
 * - Missing imports
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '../src/modules');
const errors = [];
const warnings = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Check 1: Undefined variables used before definition
  const undefinedPatterns = [
    /hiddenCosts[^=]/g,
    /combinedInput[^=]/g,
    /enriched\.modules\.map/g,
    /\.map\(/g
  ];
  
  // Check 2: Missing await on async calls
  const missingAwaitPatterns = [
    /this\.requirementsEnricher\.enrich\(/g,
    /this\.hiddenCostCalculator\.calculateHiddenCosts\(/g
  ];
  
  // Check 3: Array operations without validation
  const unsafeArrayOps = [
    /\.map\([^)]*\)/g,
    /\.filter\([^)]*\)/g,
    /\.forEach\([^)]*\)/g,
    /\.some\([^)]*\)/g,
    /\.every\([^)]*\)/g
  ];
  
  // Check 4: Property access without optional chaining
  const unsafePropertyAccess = [
    /conversation\.extractedIntent\.modules/g,
    /estimate\.estimate\.cost/g,
    /enriched\.modules/g
  ];
  
  let lineNum = 1;
  content.split('\n').forEach(line => {
    // Check for undefined variables
    if (line.includes('hiddenCosts') && !line.includes('const') && !line.includes('let') && !line.includes('var') && !line.includes('=')) {
      if (!line.includes('hiddenCosts =') && !line.includes('hiddenCosts:') && !line.includes('hiddenCosts?')) {
        errors.push({
          file: fileName,
          line: lineNum,
          type: 'UNDEFINED_VARIABLE',
          message: `hiddenCosts used but may not be defined: ${line.trim()}`,
          code: line.trim()
        });
      }
    }
    
    // Check for missing await
    if (line.includes('this.requirementsEnricher.enrich(') && !line.includes('await')) {
      warnings.push({
        file: fileName,
        line: lineNum,
        type: 'MISSING_AWAIT',
        message: `Async method called without await: ${line.trim()}`,
        code: line.trim()
      });
    }
    
    // Check for unsafe array operations
    if (line.match(/\.map\(/) && !line.includes('Array.isArray') && !line.includes('|| []')) {
      const context = content.split('\n').slice(Math.max(0, lineNum - 3), lineNum + 1).join('\n');
      if (!context.includes('Array.isArray') && !context.includes('|| []')) {
        warnings.push({
          file: fileName,
          line: lineNum,
          type: 'UNSAFE_ARRAY_OP',
          message: `Array operation without validation: ${line.trim()}`,
          code: line.trim()
        });
      }
    }
    
    lineNum++;
  });
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (file.endsWith('.js')) {
      try {
        checkFile(filePath);
      } catch (error) {
        console.error(`Error checking ${filePath}:`, error.message);
      }
    }
  });
}

console.log('🔍 Running systematic debug check...\n');
scanDirectory(MODULES_DIR);

console.log(`\n📊 Results:\n`);
console.log(`❌ Errors: ${errors.length}`);
console.log(`⚠️  Warnings: ${warnings.length}\n`);

if (errors.length > 0) {
  console.log('❌ ERRORS (must fix):\n');
  errors.forEach((err, i) => {
    console.log(`${i + 1}. ${err.file}:${err.line}`);
    console.log(`   Type: ${err.type}`);
    console.log(`   ${err.message}`);
    console.log(`   Code: ${err.code}\n`);
  });
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS (should fix):\n');
  warnings.slice(0, 10).forEach((warn, i) => {
    console.log(`${i + 1}. ${warn.file}:${warn.line}`);
    console.log(`   Type: ${warn.type}`);
    console.log(`   ${warn.message}`);
    console.log(`   Code: ${warn.code}\n`);
  });
  if (warnings.length > 10) {
    console.log(`... and ${warnings.length - 10} more warnings\n`);
  }
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ No issues found!');
} else {
  process.exit(errors.length > 0 ? 1 : 0);
}

