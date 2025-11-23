// scripts/cleanup-unused-files.js
// Script to identify and optionally delete unused files

const fs = require('fs');
const path = require('path');

const UNUSED_HTML = [
    'web/index.html', // Old entry point (redirects to dashboard)
    'web/scope-verification.html', // Replaced by intelligent-scope.html
    'web/level-viewer.html', // Replaced by progressive output in intelligent-scope.html
    'web/live-call.html', // Not integrated yet
    'web/metrics-dashboard.html', // Not integrated yet
    'web/domain-knowledge.html' // Admin feature, not main flow
];

const UNUSED_JS = [
    'web/js/app.js', // Old main app logic
    'web/js/conversation.js', // Old conversation logic
    'web/js/estimation-interactions.js', // Old estimation UI
    'web/js/output-display.js', // Old output display
    'web/js/scenario-display.js', // Old scenario display
    'web/js/proposal-adjuster.js', // Old proposal logic
    'web/js/assumption-panel.js', // Not used
    'web/js/scenario-refinement.js', // Not used
    'web/js/domain-knowledge-form.js', // Admin feature
    'web/js/ui-components.js', // Not used
    'web/js/verification-tests.js', // Test file
    'web/js/scope-verification.js', // Replaced
    'web/js/level-viewer.js', // Replaced
    'web/js/live-call.js' // Not integrated yet
];

const UNUSED_CSS = [
    'web/css/scope-verification.css',
    'web/css/level-viewer.css',
    'web/css/live-call.css'
];

const REDUNDANT_DOCS = [
    'docs/00-GAP-ANALYSIS.md', // Merge with implementation version
    'docs/00-CORE-FLOW-COMPLETE.md', // Merge with implementation version
    'docs/00-PHASE-2-COMPLETE.md', // Archive
    'docs/00-PHASE-3-COMPLETE.md', // Archive
    'docs/00-PHASE-3-PROGRESS.md', // Archive
    'docs/00-PROPOSED-USER-FLOW.md', // Archive
    'docs/00-USER-FLOW-ANALYSIS.md', // Archive
    'docs/00-USER-FLOW-CLARIFICATION.md', // Archive
    'docs/00-SYNC-REPORT.md', // Archive
    'docs/00-DATABASE-SYNC-COMPLETE.md', // Archive
    'docs/00-CONSOLIDATION-PLAN.md', // Archive after cleanup
    'docs/00-CODE-CLEANUP-STATUS.md' // Archive after cleanup
];

function checkFileExists(filePath) {
    return fs.existsSync(path.join(process.cwd(), filePath));
}

function checkFileReferences(filePath) {
    // Check if file is referenced in any HTML or JS files
    const fileName = path.basename(filePath);
    const searchDirs = ['web'];
    
    for (const dir of searchDirs) {
        const files = fs.readdirSync(dir, { recursive: true });
        for (const file of files) {
            if (file.endsWith('.html') || file.endsWith('.js')) {
                const content = fs.readFileSync(path.join(dir, file), 'utf8');
                if (content.includes(fileName)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function analyzeCleanup() {
    console.log('========================================');
    console.log('CLEANUP ANALYSIS');
    console.log('========================================\n');

    const results = {
        html: { safe: [], check: [] },
        js: { safe: [], check: [] },
        css: { safe: [], check: [] },
        docs: { safe: [], check: [] }
    };

    // Analyze HTML files
    console.log('HTML FILES:');
    UNUSED_HTML.forEach(file => {
        const exists = checkFileExists(file);
        const referenced = checkFileReferences(file);
        
        if (exists && !referenced) {
            results.html.safe.push(file);
            console.log(`  [SAFE TO DELETE] ${file}`);
        } else if (exists && referenced) {
            results.html.check.push(file);
            console.log(`  [CHECK REFERENCES] ${file} - might be referenced`);
        } else if (!exists) {
            console.log(`  [NOT FOUND] ${file}`);
        }
    });

    // Analyze JS files
    console.log('\nJAVASCRIPT FILES:');
    UNUSED_JS.forEach(file => {
        const exists = checkFileExists(file);
        const referenced = checkFileReferences(file);
        
        if (exists && !referenced) {
            results.js.safe.push(file);
            console.log(`  [SAFE TO DELETE] ${file}`);
        } else if (exists && referenced) {
            results.js.check.push(file);
            console.log(`  [CHECK REFERENCES] ${file} - might be referenced`);
        } else if (!exists) {
            console.log(`  [NOT FOUND] ${file}`);
        }
    });

    // Analyze CSS files
    console.log('\nCSS FILES:');
    UNUSED_CSS.forEach(file => {
        const exists = checkFileExists(file);
        const referenced = checkFileReferences(file);
        
        if (exists && !referenced) {
            results.css.safe.push(file);
            console.log(`  [SAFE TO DELETE] ${file}`);
        } else if (exists && referenced) {
            results.css.check.push(file);
            console.log(`  [CHECK REFERENCES] ${file} - might be referenced`);
        } else if (!exists) {
            console.log(`  [NOT FOUND] ${file}`);
        }
    });

    // Analyze docs
    console.log('\nDOCUMENTATION FILES:');
    REDUNDANT_DOCS.forEach(file => {
        const exists = checkFileExists(file);
        if (exists) {
            results.docs.safe.push(file);
            console.log(`  [SAFE TO ARCHIVE] ${file}`);
        } else {
            console.log(`  [NOT FOUND] ${file}`);
        }
    });

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`HTML files safe to delete: ${results.html.safe.length}`);
    console.log(`JS files safe to delete: ${results.js.safe.length}`);
    console.log(`CSS files safe to delete: ${results.css.safe.length}`);
    console.log(`Docs safe to archive: ${results.docs.safe.length}`);
    console.log(`\nTotal files to clean: ${results.html.safe.length + results.js.safe.length + results.css.safe.length + results.docs.safe.length}`);

    return results;
}

// Run analysis
if (require.main === module) {
    const results = analyzeCleanup();
    
    // Save results to file
    const reportPath = path.join(process.cwd(), 'docs', '00-CLEANUP-ANALYSIS.md');
    const report = `# Cleanup Analysis Report

Generated: ${new Date().toISOString()}

## Files Safe to Delete

### HTML Files (${results.html.safe.length})
${results.html.safe.map(f => `- ${f}`).join('\n')}

### JavaScript Files (${results.js.safe.length})
${results.js.safe.map(f => `- ${f}`).join('\n')}

### CSS Files (${results.css.safe.length})
${results.css.safe.map(f => `- ${f}`).join('\n')}

### Documentation Files (${results.docs.safe.length})
${results.docs.safe.map(f => `- ${f}`).join('\n')}

## Files to Check (Might be Referenced)

### HTML Files
${results.html.check.length > 0 ? results.html.check.map(f => `- ${f}`).join('\n') : 'None'}

### JavaScript Files
${results.js.check.length > 0 ? results.js.check.map(f => `- ${f}`).join('\n') : 'None'}

### CSS Files
${results.css.check.length > 0 ? results.css.check.map(f => `- ${f}`).join('\n') : 'None'}
`;

    fs.writeFileSync(reportPath, report);
    console.log(`\nReport saved to: ${reportPath}`);
}

module.exports = { analyzeCleanup };

