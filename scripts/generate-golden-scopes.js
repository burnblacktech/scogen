#!/usr/bin/env node
/**
 * Golden Dataset Generator
 * 
 * Generates 3 locked scopes for regression testing:
 * - HRMS (72 modules)
 * - Small SaaS (12 modules)
 * - E-commerce (45 modules)
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

// Ensure directories exist
if (!fs.existsSync(goldenDir)) fs.mkdirSync(goldenDir, { recursive: true });
if (!fs.existsSync(scopesDir)) fs.mkdirSync(scopesDir, { recursive: true });
if (!fs.existsSync(hashesDir)) fs.mkdirSync(hashesDir, { recursive: true });

/**
 * Generate HRMS modules (72 modules)
 */
function generateHRMSModules() {
  const categories = {
    'Core HR': [
      'Employee Management', 'Employee Onboarding', 'Employee Offboarding',
      'Employee Database', 'Employee Profiles', 'Employee Directory',
      'Employee Self-Service', 'Employee Portal', 'Employee Records'
    ],
    'Payroll': [
      'Payroll Processing', 'Salary Management', 'Payroll Reports',
      'Tax Calculations', 'Deductions Management', 'Payroll Integration',
      'Payroll History', 'Payroll Approval', 'Payroll Disbursement'
    ],
    'Time & Attendance': [
      'Time Tracking', 'Attendance Management', 'Leave Management',
      'Shift Management', 'Overtime Management', 'Timesheet Approval',
      'Time Reports', 'Attendance Reports', 'Leave Balance'
    ],
    'Recruitment': [
      'Job Posting', 'Applicant Tracking', 'Interview Scheduling',
      'Candidate Management', 'Offer Management', 'Onboarding Workflow',
      'Recruitment Analytics', 'Resume Parser', 'Background Check'
    ],
    'Performance': [
      'Performance Reviews', 'Goal Setting', '360 Feedback',
      'Performance Analytics', 'Competency Management', 'Performance Ratings',
      'Performance Reports', 'Development Plans', 'Career Pathing'
    ],
    'Learning': [
      'Learning Management', 'Course Management', 'Training Programs',
      'Certification Tracking', 'Learning Analytics', 'Skill Assessment',
      'Learning Paths', 'Training Calendar', 'E-Learning'
    ],
    'Benefits': [
      'Benefits Administration', 'Benefits Enrollment', 'Benefits Portal',
      'Benefits Reports', 'Insurance Management', 'Retirement Plans',
      'Benefits Analytics', 'Benefits Communication', 'Benefits Compliance'
    ],
    'Compliance': [
      'Compliance Management', 'Policy Management', 'Audit Trail',
      'Document Management', 'Compliance Reports', 'Regulatory Tracking',
      'Compliance Alerts', 'Compliance Training', 'Compliance Dashboard'
    ]
  };

  const modules = [];
  let id = 1;

  Object.entries(categories).forEach(([category, moduleNames]) => {
    moduleNames.forEach(name => {
      modules.push({
        id: `HRMS-${id++}`,
        name: name,
        description: `${name} module for HRMS system`,
        category: category,
        priority: id <= 20 ? 'critical' : id <= 40 ? 'high' : 'medium',
        complexity: id % 3 === 0 ? 'high' : id % 3 === 1 ? 'medium' : 'low',
        features: [`${name} Feature 1`, `${name} Feature 2`]
      });
    });
  });

  return modules;
}

/**
 * Generate Small SaaS modules (12 modules)
 */
function generateSmallSaaSModules() {
  return [
    { id: 'SAAS-1', name: 'User Authentication', category: 'Core', priority: 'critical', complexity: 'medium', features: ['Login', 'Signup', 'Password Reset'] },
    { id: 'SAAS-2', name: 'User Management', category: 'Core', priority: 'critical', complexity: 'medium', features: ['User Profiles', 'User Settings'] },
    { id: 'SAAS-3', name: 'Dashboard', category: 'Core', priority: 'high', complexity: 'low', features: ['Overview', 'Analytics'] },
    { id: 'SAAS-4', name: 'Billing', category: 'Payment', priority: 'critical', complexity: 'high', features: ['Subscription', 'Invoices', 'Payments'] },
    { id: 'SAAS-5', name: 'Notifications', category: 'Core', priority: 'medium', complexity: 'low', features: ['Email', 'In-App'] },
    { id: 'SAAS-6', name: 'Settings', category: 'Admin', priority: 'medium', complexity: 'low', features: ['General', 'Security'] },
    { id: 'SAAS-7', name: 'Reports', category: 'Reporting', priority: 'medium', complexity: 'medium', features: ['Export', 'Analytics'] },
    { id: 'SAAS-8', name: 'API Management', category: 'Integration', priority: 'high', complexity: 'high', features: ['API Keys', 'Rate Limiting'] },
    { id: 'SAAS-9', name: 'Data Export', category: 'Reporting', priority: 'low', complexity: 'medium', features: ['CSV', 'JSON'] },
    { id: 'SAAS-10', name: 'Audit Log', category: 'Admin', priority: 'medium', complexity: 'medium', features: ['Activity Log', 'History'] },
    { id: 'SAAS-11', name: 'Help Center', category: 'General', priority: 'low', complexity: 'low', features: ['Documentation', 'Support'] },
    { id: 'SAAS-12', name: 'Multi-tenancy', category: 'Core', priority: 'high', complexity: 'high', features: ['Tenant Isolation', 'Tenant Settings'] }
  ];
}

/**
 * Generate E-commerce modules (45 modules)
 */
function generateEcommerceModules() {
  const categories = {
    'Core': [
      'Product Catalog', 'Product Management', 'Product Search',
      'Shopping Cart', 'Checkout', 'Order Management',
      'Payment Processing', 'Shipping Management', 'Inventory Management'
    ],
    'User': [
      'User Registration', 'User Authentication', 'User Profiles',
      'Address Management', 'Wishlist', 'Order History',
      'Account Settings', 'Password Management', 'Social Login'
    ],
    'Admin': [
      'Admin Dashboard', 'Product Admin', 'Order Admin',
      'Customer Admin', 'Inventory Admin', 'Reports Admin',
      'Settings Admin', 'Content Management', 'User Management'
    ],
    'Payment': [
      'Payment Gateway', 'Payment Methods', 'Payment History',
      'Refund Processing', 'Payment Analytics', 'Subscription Billing'
    ],
    'Analytics': [
      'Sales Analytics', 'Product Analytics', 'Customer Analytics',
      'Traffic Analytics', 'Conversion Analytics', 'Revenue Analytics'
    ],
    'Integration': [
      'Email Integration', 'SMS Integration', 'Shipping API',
      'Payment Gateway API', 'Analytics Integration', 'CRM Integration'
    ]
  };

  const modules = [];
  let id = 1;

  Object.entries(categories).forEach(([category, moduleNames]) => {
    moduleNames.forEach(name => {
      modules.push({
        id: `ECOMM-${id++}`,
        name: name,
        description: `${name} module for e-commerce platform`,
        category: category,
        priority: id <= 15 ? 'critical' : id <= 30 ? 'high' : 'medium',
        complexity: id % 3 === 0 ? 'high' : id % 3 === 1 ? 'medium' : 'low',
        features: [`${name} Feature 1`, `${name} Feature 2`]
      });
    });
  });

  return modules;
}

/**
 * Create locked scope object
 */
function createLockedScope(modules, projectName) {
  const checksum = crypto.createHash('sha256')
    .update(JSON.stringify(modules.map(m => ({ id: m.id, name: m.name, category: m.category })).sort((a, b) => a.id.localeCompare(b.id))))
    .digest('hex');

  return {
    modules: modules,
    categories: modules.reduce((acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m.name);
      return acc;
    }, {}),
    metadata: {
      projectName: projectName,
      lockedAt: new Date().toISOString(),
      totalModules: modules.length,
      totalCategories: new Set(modules.map(m => m.category)).size
    },
    locked: true,
    checksum: checksum
  };
}

/**
 * Main function
 */
async function main() {
  const db = new Database(dbPath);
  
  try {
    // Ensure a default client exists for golden projects
    try {
      const existingClient = db.prepare('SELECT id FROM clients WHERE client_identifier = ?').get('GOLDEN-CLIENT');
      if (!existingClient) {
        db.prepare(`
          INSERT INTO clients (client_identifier, company_name, contact_name, email, created_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run('GOLDEN-CLIENT', 'Golden Test Client', 'Test User', 'test@golden.local');
      }
      const client = db.prepare('SELECT id FROM clients WHERE client_identifier = ?').get('GOLDEN-CLIENT');
      const defaultClientId = client.id;
      
      // Update the function to use this client ID
      const originalGenerate = generateHRMSModules;
    } catch (e) {
      console.warn('  ⚠ Could not create default client:', e.message);
    }
    
    const goldenProjects = [
      {
        name: 'HRMS',
        modules: generateHRMSModules(),
        projectCode: 'GOLDEN-HRMS'
      },
      {
        name: 'Small SaaS',
        modules: generateSmallSaaSModules(),
        projectCode: 'GOLDEN-SAAS'
      },
      {
        name: 'E-commerce',
        modules: generateEcommerceModules(),
        projectCode: 'GOLDEN-ECOMM'
      }
    ];

    const results = [];

    for (const project of goldenProjects) {
      console.log(`Generating golden scope for ${project.name}...`);
      
      // Create locked scope
      const lockedScope = createLockedScope(project.modules, project.name);
      
      // Save scope JSON
      const scopeFile = path.join(scopesDir, `${project.projectCode}.json`);
      fs.writeFileSync(scopeFile, JSON.stringify(lockedScope, null, 2));
      console.log(`  ✓ Saved scope to ${scopeFile}`);
      
      // Ensure migrations are applied - add columns if they don't exist
      try {
        const tableInfo = db.prepare(`PRAGMA table_info(projects)`).all();
        const columnNames = tableInfo.map(col => col.name);
        
        if (!columnNames.includes('locked_scope')) {
          db.prepare('ALTER TABLE projects ADD COLUMN locked_scope TEXT').run();
        }
        if (!columnNames.includes('scope_checksum')) {
          db.prepare('ALTER TABLE projects ADD COLUMN scope_checksum TEXT').run();
        }
        if (!columnNames.includes('scope_locked_at')) {
          db.prepare('ALTER TABLE projects ADD COLUMN scope_locked_at DATETIME').run();
        }
        if (!columnNames.includes('generated_levels')) {
          db.prepare('ALTER TABLE projects ADD COLUMN generated_levels TEXT').run();
        }
        if (!columnNames.includes('stale_levels')) {
          db.prepare('ALTER TABLE projects ADD COLUMN stale_levels TEXT').run();
        }
      } catch (e) {
        console.warn('  ⚠ Migration check failed:', e.message);
      }
      
      // Create or update project in database
      const existingProject = db.prepare('SELECT id FROM projects WHERE project_code = ?').get(project.projectCode);
      
      // Check what columns exist
      const tableInfo = db.prepare(`PRAGMA table_info(projects)`).all();
      const hasLockedScope = tableInfo.some(col => col.name === 'locked_scope');
      
      if (existingProject) {
        if (hasLockedScope) {
          const updateStmt = db.prepare(`
            UPDATE projects 
            SET locked_scope = ?, scope_checksum = ?, scope_locked_at = CURRENT_TIMESTAMP
            WHERE project_code = ?
          `);
          updateStmt.run(JSON.stringify(lockedScope), lockedScope.checksum, project.projectCode);
          console.log(`  ✓ Updated project ${project.projectCode} in database`);
        } else {
          console.log(`  ⚠ Project ${project.projectCode} exists but locked_scope column not found. Skipping update.`);
        }
      } else {
        // Check what columns exist
        const tableInfo = db.prepare(`PRAGMA table_info(projects)`).all();
        const hasName = tableInfo.some(col => col.name === 'name');
        const hasTitle = tableInfo.some(col => col.name === 'title');
        
        // Get all required columns
        const requiredColumns = tableInfo.filter(col => col.notnull && !col.dflt_value && col.name !== 'id');
        const requiredColNames = requiredColumns.map(col => col.name);
        
        // Build insert statement dynamically
        const insertCols = ['project_code'];
        const insertVals = [project.projectCode];
        
        // Add project_name (required)
        if (requiredColNames.includes('project_name') || tableInfo.some(col => col.name === 'project_name')) {
          insertCols.push('project_name');
          insertVals.push(project.name);
        } else if (hasName) {
          insertCols.push('name');
          insertVals.push(project.name);
        } else if (hasTitle) {
          insertCols.push('title');
          insertVals.push(project.name);
        }
        
        // Add required columns with defaults
        if (requiredColNames.includes('client_id')) {
          // Get or create golden client
          let clientId = 1;
          try {
            const client = db.prepare('SELECT id FROM clients WHERE client_identifier = ?').get('GOLDEN-CLIENT');
            if (client) {
              clientId = client.id;
            } else {
              // Create client if doesn't exist
              const insertClient = db.prepare(`
                INSERT INTO clients (client_identifier, company_name, contact_name, email, created_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              `).run('GOLDEN-CLIENT', 'Golden Test Client', 'Test User', 'test@golden.local');
              clientId = insertClient.lastInsertRowid;
            }
          } catch (e) {
            console.warn('  ⚠ Could not get/create client, using ID 1');
          }
          insertCols.push('client_id');
          insertVals.push(clientId);
        }
        if (requiredColNames.includes('consultant_id')) {
          insertCols.push('consultant_id');
          insertVals.push(1); // Default consultant ID
        }
        if (requiredColNames.includes('status')) {
          insertCols.push('status');
          insertVals.push('draft');
        }
        
        // Add optional columns
        if (hasLockedScope) {
          insertCols.push('locked_scope', 'scope_checksum', 'scope_locked_at');
          insertVals.push(JSON.stringify(lockedScope), lockedScope.checksum, new Date().toISOString());
        }
        
        insertCols.push('created_at');
        insertVals.push(new Date().toISOString());
        
        const placeholders = insertVals.map(() => '?').join(', ');
        const insertStmt = db.prepare(`
          INSERT INTO projects (${insertCols.join(', ')})
          VALUES (${placeholders})
        `);
        insertStmt.run(...insertVals);
        console.log(`  ✓ Created project ${project.projectCode} in database`);
      }
      
      results.push({
        projectCode: project.projectCode,
        name: project.name,
        moduleCount: project.modules.length,
        checksum: lockedScope.checksum,
        scopeFile: scopeFile
      });
    }

    // Create README
    const readme = `# Golden Dataset

This directory contains locked scopes and expected content hashes for regression testing.

## Projects

${results.map(r => `- **${r.name}** (${r.projectCode}): ${r.moduleCount} modules`).join('\n')}

## Usage

Run regression tests:
\`\`\`bash
npm run docs:regression
\`\`\`

Generate new golden scopes:
\`\`\`bash
npm run docs:golden
\`\`\`

## Structure

- \`scopes/\`: Locked scope JSON files
- \`expected-hashes/\`: Expected content hashes per level (generated after first regression run)
`;

    fs.writeFileSync(path.join(goldenDir, 'README.md'), readme);
    console.log(`\n✓ Created README.md`);

    console.log('\n✅ Golden dataset generation complete!');
    console.log('\nGenerated projects:');
    results.forEach(r => {
      console.log(`  - ${r.name}: ${r.moduleCount} modules, checksum: ${r.checksum.substring(0, 16)}...`);
    });

  } catch (error) {
    console.error('Error generating golden dataset:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run generator
main();

