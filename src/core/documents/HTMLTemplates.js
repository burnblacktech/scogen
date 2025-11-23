/**
 * HTML Templates for PDF Generation
 * 
 * Provides HTML templates for all document types (cost, business, technical)
 * and all levels (L1-L5) with professional styling
 */

class HTMLTemplates {
  /**
   * Generate cost proposal HTML for a specific level
   */
  costProposalL1(data) {
    return this.wrapHTML(`
      <div class="header">
        <h1>Project Cost Proposal</h1>
        <p class="subtitle">${data.projectName || 'Project'}</p>
        <p class="level-badge">Level 1: Discovery</p>
      </div>
      
      <div class="summary-box">
        <h2>Executive Summary</h2>
        <div class="cost-highlight">
          <span class="label">Total Investment:</span>
          <span class="amount">₹${this.formatCurrency(data.cost?.totalCost || 0)}</span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Timeline:</span>
            <span class="value">${data.technical?.timeline?.recommendedDays || data.cost?.timeline || 'N/A'} days</span>
          </div>
          <div class="info-item">
            <span class="label">Team Size:</span>
            <span class="value">${data.technical?.teamSize || 'N/A'} developers</span>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>Top Features</h2>
        <ul class="feature-list">
          ${this.getTopFeatures(data.scope, 10).map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
      
      <div class="section">
        <h2>Budget Breakdown</h2>
        <div class="breakdown">
          <div class="breakdown-item">
            <span>Development</span>
            <span>₹${this.formatCurrency((data.cost?.totalCost || 0) * 0.7)}</span>
          </div>
          <div class="breakdown-item">
            <span>Testing</span>
            <span>₹${this.formatCurrency((data.cost?.totalCost || 0) * 0.15)}</span>
          </div>
          <div class="breakdown-item">
            <span>Project Management</span>
            <span>₹${this.formatCurrency((data.cost?.totalCost || 0) * 0.10)}</span>
          </div>
        </div>
      </div>
    `);
  }

  costProposalL2(data) {
    return this.wrapHTML(`
      ${this.costProposalL1(data)}
      
      <div class="section">
        <h2>Complete Feature List</h2>
        <div class="module-grid">
          ${this.getAllModules(data.scope).map(m => `
            <div class="module-card">
              <h3>${m}</h3>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="section">
        <h2>Milestones & Phases</h2>
        ${this.getPhases(data.technical).map(phase => `
          <div class="phase-card">
            <h3>${phase.name}</h3>
            <p>Duration: ${phase.duration} days</p>
            <p>Cost: ₹${this.formatCurrency(phase.cost)}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Team Composition</h2>
        <div class="team-grid">
          ${this.getTeamComposition(data.technical).map(member => `
            <div class="team-member">
              <strong>${member.role}</strong>
              <span>${member.count} ${member.count > 1 ? 'members' : 'member'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `);
  }

  costProposalL3(data) {
    return this.wrapHTML(`
      ${this.costProposalL2(data)}
      
      <div class="section">
        <h2>System Architecture Overview</h2>
        <div class="architecture-diagram">
          ${this.getArchitectureOverview(data.technical)}
        </div>
      </div>
      
      <div class="section">
        <h2>Database Design</h2>
        <div class="database-info">
          <p><strong>Primary Database:</strong> ${data.technical?.database || 'PostgreSQL'}</p>
          <p><strong>Estimated Tables:</strong> ${data.technical?.tableCount || 'N/A'}</p>
        </div>
      </div>
      
      <div class="section">
        <h2>API Specifications</h2>
        <div class="api-list">
          <p><strong>Total Endpoints:</strong> ${data.technical?.apiCount || 'N/A'}</p>
          <p><strong>Authentication:</strong> JWT/OAuth2</p>
        </div>
      </div>
      
      <div class="section">
        <h2>Tech Stack</h2>
        <div class="tech-stack">
          ${this.getTechStack(data.technical).map(tech => `
            <div class="tech-item">
              <strong>${tech.category}:</strong> ${tech.technologies.join(', ')}
            </div>
          `).join('')}
        </div>
      </div>
    `);
  }

  costProposalL4(data) {
    return this.wrapHTML(`
      ${this.costProposalL3(data)}
      
      <div class="section">
        <h2>Component Breakdown</h2>
        ${this.getComponents(data.technical).map(component => `
          <div class="component-card">
            <h3>${component.name}</h3>
            <p>Type: ${component.type}</p>
            <p>Complexity: ${component.complexity}</p>
            <p>Estimated Hours: ${component.hours}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Sprint Planning</h2>
        ${this.getSprints(data.technical).map(sprint => `
          <div class="sprint-card">
            <h3>Sprint ${sprint.number}</h3>
            <p>Duration: ${sprint.duration} days</p>
            <p>Features: ${sprint.features.join(', ')}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Testing Strategy</h2>
        <div class="testing-info">
          <p><strong>Unit Testing:</strong> ${data.technical?.testing?.unit || 'Yes'}</p>
          <p><strong>Integration Testing:</strong> ${data.technical?.testing?.integration || 'Yes'}</p>
          <p><strong>E2E Testing:</strong> ${data.technical?.testing?.e2e || 'Yes'}</p>
        </div>
      </div>
    `);
  }

  costProposalL5(data) {
    return this.wrapHTML(`
      ${this.costProposalL4(data)}
      
      <div class="section">
        <h2>Detailed Pseudocode (95% Complete)</h2>
        ${this.getPseudocode(data.technical).map(code => `
          <div class="pseudocode-block">
            <h3>${code.module}</h3>
            <pre><code>${code.code}</code></pre>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Deployment Plan</h2>
        <div class="deployment-info">
          <p><strong>Infrastructure:</strong> ${data.technical?.deployment?.infrastructure || 'Cloud (AWS/Azure)'}</p>
          <p><strong>CI/CD:</strong> ${data.technical?.deployment?.cicd || 'GitHub Actions'}</p>
          <p><strong>Monitoring:</strong> ${data.technical?.deployment?.monitoring || 'Application Insights'}</p>
        </div>
      </div>
      
      <div class="section">
        <h2>Documentation</h2>
        <ul class="doc-list">
          <li>API Documentation</li>
          <li>Database Schema Documentation</li>
          <li>User Manual</li>
          <li>Admin Guide</li>
          <li>Deployment Guide</li>
        </ul>
      </div>
      
      ${data.amcPackages ? this.renderAMCSection(data.amcPackages) : ''}
    `);
  }

  /**
   * Generate business document HTML for a specific level
   */
  businessDocumentL1(data) {
    return this.wrapHTML(`
      <div class="header">
        <h1>Business Document</h1>
        <p class="subtitle">${data.projectName || 'Project'}</p>
        <p class="level-badge">Level 1: Discovery</p>
      </div>
      
      <div class="section">
        <h2>Business Overview</h2>
        <p>${this.getBusinessOverview(data.scope)}</p>
      </div>
      
      <div class="section">
        <h2>Key Features</h2>
        <ul class="feature-list">
          ${this.getTopFeatures(data.scope, 10).map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
      
      <div class="section">
        <h2>Investment Summary</h2>
        <div class="investment-box">
          <div class="investment-item">
            <span class="label">Total Cost:</span>
            <span class="value">₹${this.formatCurrency(data.cost?.totalCost || 0)}</span>
          </div>
          <div class="investment-item">
            <span class="label">Timeline:</span>
            <span class="value">${data.technical?.timeline?.recommendedDays || 'N/A'} days</span>
          </div>
        </div>
      </div>
    `);
  }

  businessDocumentL2(data) {
    return this.wrapHTML(`
      ${this.businessDocumentL1(data)}
      
      <div class="section">
        <h2>Complete Feature Set</h2>
        ${this.getAllModules(data.scope).map(module => `
          <div class="feature-card">
            <h3>${module}</h3>
            <p>${this.getFeatureDescription(module, data.scope)}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>User Stories</h2>
        ${this.getUserStories(data.scope).map(story => `
          <div class="user-story">
            <p><strong>As a</strong> ${story.role}, <strong>I want</strong> ${story.want}, <strong>so that</strong> ${story.soThat}</p>
          </div>
        `).join('')}
      </div>
    `);
  }

  businessDocumentL3(data) {
    return this.wrapHTML(`
      ${this.businessDocumentL2(data)}
      
      <div class="section">
        <h2>Process Flows</h2>
        ${this.getProcessFlows(data.scope).map(flow => `
          <div class="process-flow">
            <h3>${flow.name}</h3>
            <ol>
              ${flow.steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Reports & Analytics</h2>
        <ul class="report-list">
          ${this.getReports(data.scope).map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    `);
  }

  businessDocumentL4(data) {
    return this.wrapHTML(`
      ${this.businessDocumentL3(data)}
      
      <div class="section">
        <h2>Detailed User Workflows</h2>
        ${this.getDetailedWorkflows(data.scope).map(workflow => `
          <div class="workflow">
            <h3>${workflow.name}</h3>
            <div class="workflow-steps">
              ${workflow.steps.map((step, idx) => `
                <div class="workflow-step">
                  <span class="step-number">${idx + 1}</span>
                  <div class="step-content">
                    <strong>${step.action}</strong>
                    <p>${step.description}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `);
  }

  businessDocumentL5(data) {
    return this.wrapHTML(`
      ${this.businessDocumentL4(data)}
      
      <div class="section">
        <h2>Complete Business Rules</h2>
        ${this.getBusinessRules(data.scope).map(rule => `
          <div class="business-rule">
            <h3>${rule.category}</h3>
            <ul>
              ${rule.rules.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
      
      ${data.amcPackages ? this.renderAMCSection(data.amcPackages) : ''}
    `);
  }

  /**
   * Generate technical blueprint HTML for a specific level
   */
  technicalBlueprintL1(data) {
    return this.wrapHTML(`
      <div class="header">
        <h1>Technical Blueprint</h1>
        <p class="subtitle">${data.projectName || 'Project'}</p>
        <p class="level-badge">Level 1: Discovery</p>
      </div>
      
      <div class="section">
        <h2>Technical Overview</h2>
        <p>${data.technical?.description || 'Comprehensive technical solution with modern architecture and best practices'}</p>
      </div>
      
      <div class="section">
        <h2>Architecture Pattern</h2>
        <p><strong>${data.technical?.architecture || 'Modular Monolith'}</strong></p>
      </div>
      
      <div class="section">
        <h2>Technology Stack</h2>
        <div class="tech-stack">
          ${this.getTechStack(data.technical).map(tech => `
            <div class="tech-item">
              <strong>${tech.category}:</strong> ${tech.technologies.join(', ')}
            </div>
          `).join('')}
        </div>
      </div>
    `);
  }

  technicalBlueprintL2(data) {
    return this.wrapHTML(`
      ${this.technicalBlueprintL1(data)}
      
      <div class="section">
        <h2>System Architecture</h2>
        <div class="architecture-diagram">
          ${this.getArchitectureOverview(data.technical)}
        </div>
      </div>
      
      <div class="section">
        <h2>Module Structure</h2>
        ${this.getAllModules(data.scope).map(module => `
          <div class="module-structure">
            <h3>${module}</h3>
            <p>Components: ${this.getModuleComponents(module, data.technical).length}</p>
          </div>
        `).join('')}
      </div>
    `);
  }

  technicalBlueprintL3(data) {
    return this.wrapHTML(`
      ${this.technicalBlueprintL2(data)}
      
      <div class="section">
        <h2>Database Schema</h2>
        <div class="database-schema">
          ${this.getDatabaseSchema(data.technical).map(table => `
            <div class="table-schema">
              <h3>${table.name}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Constraints</th>
                  </tr>
                </thead>
                <tbody>
                  ${table.columns.map(col => `
                    <tr>
                      <td>${col.name}</td>
                      <td>${col.type}</td>
                      <td>${col.constraints || ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="section">
        <h2>API Endpoints</h2>
        <div class="api-endpoints">
          ${this.getAPIEndpoints(data.technical).map(endpoint => `
            <div class="endpoint">
              <span class="method">${endpoint.method}</span>
              <span class="path">${endpoint.path}</span>
              <span class="description">${endpoint.description}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `);
  }

  technicalBlueprintL4(data) {
    return this.wrapHTML(`
      ${this.technicalBlueprintL3(data)}
      
      <div class="section">
        <h2>Component Architecture</h2>
        ${this.getComponents(data.technical).map(component => `
          <div class="component-detail">
            <h3>${component.name}</h3>
            <p><strong>Type:</strong> ${component.type}</p>
            <p><strong>Dependencies:</strong> ${component.dependencies?.join(', ') || 'None'}</p>
            <p><strong>Interfaces:</strong> ${component.interfaces?.join(', ') || 'N/A'}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Pseudocode (50% Complete)</h2>
        ${this.getPseudocode(data.technical, 0.5).map(code => `
          <div class="pseudocode-block">
            <h3>${code.module}</h3>
            <pre><code>${code.code}</code></pre>
          </div>
        `).join('')}
      </div>
    `);
  }

  technicalBlueprintL5(data) {
    return this.wrapHTML(`
      ${this.technicalBlueprintL4(data)}
      
      <div class="section">
        <h2>Complete Pseudocode (95%)</h2>
        ${this.getPseudocode(data.technical, 0.95).map(code => `
          <div class="pseudocode-block">
            <h3>${code.module}</h3>
            <pre><code>${code.code}</code></pre>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Deployment Architecture</h2>
        <div class="deployment-arch">
          <p><strong>Infrastructure:</strong> ${data.technical?.deployment?.infrastructure || 'Cloud'}</p>
          <p><strong>Scaling Strategy:</strong> ${data.technical?.deployment?.scaling || 'Horizontal'}</p>
          <p><strong>Monitoring:</strong> ${data.technical?.deployment?.monitoring || 'APM + Logging'}</p>
        </div>
      </div>
      
      <div class="section">
        <h2>DevOps Pipeline</h2>
        <div class="devops-pipeline">
          <ol>
            <li>Code Commit → GitHub</li>
            <li>Automated Tests → CI/CD</li>
            <li>Build → Docker Image</li>
            <li>Deploy → Staging</li>
            <li>Integration Tests</li>
            <li>Deploy → Production</li>
          </ol>
        </div>
      </div>
      
      ${data.amcPackages ? this.renderAMCSection(data.amcPackages) : ''}
    `);
  }

  /**
   * Wrap HTML content with styles and structure
   */
  wrapHTML(content) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 40px;
            background: #f9fafb;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .level-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 5px 15px;
            border-radius: 20px;
            margin-top: 10px;
            font-size: 0.9em;
        }
        
        .section {
            background: white;
            padding: 30px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .section h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.8em;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        
        .summary-box {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .cost-highlight {
            text-align: center;
            margin: 20px 0;
        }
        
        .cost-highlight .label {
            display: block;
            font-size: 1.2em;
            color: #6b7280;
            margin-bottom: 10px;
        }
        
        .cost-highlight .amount {
            display: block;
            font-size: 3em;
            font-weight: bold;
            color: #2563eb;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-top: 20px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 15px;
            background: white;
            border-radius: 6px;
        }
        
        .info-item .label {
            color: #6b7280;
        }
        
        .info-item .value {
            font-weight: bold;
            color: #1f2937;
        }
        
        .feature-list {
            list-style: none;
            padding: 0;
        }
        
        .feature-list li {
            padding: 10px;
            margin: 5px 0;
            background: #f9fafb;
            border-left: 4px solid #667eea;
            border-radius: 4px;
        }
        
        .breakdown {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .breakdown-item {
            display: flex;
            justify-content: space-between;
            padding: 15px;
            background: #f9fafb;
            border-radius: 6px;
        }
        
        .module-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .module-card {
            padding: 20px;
            background: #f9fafb;
            border-radius: 6px;
            text-align: center;
        }
        
        .module-card h3 {
            color: #667eea;
            font-size: 1.1em;
        }
        
        .phase-card {
            padding: 20px;
            background: #f9fafb;
            border-radius: 6px;
            margin-bottom: 15px;
        }
        
        .phase-card h3 {
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .team-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .team-member {
            padding: 15px;
            background: #f9fafb;
            border-radius: 6px;
            text-align: center;
        }
        
        .tech-stack {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .tech-item {
            padding: 15px;
            background: #f9fafb;
            border-radius: 6px;
        }
        
        .pseudocode-block {
            margin-bottom: 30px;
        }
        
        .pseudocode-block h3 {
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .pseudocode-block pre {
            background: #1f2937;
            color: #f9fafb;
            padding: 20px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
        }
        
        .pseudocode-block code {
            font-size: 0.9em;
            line-height: 1.5;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        table th, table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        
        table th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        
        @media print {
            body {
                background: white;
                padding: 20px;
            }
            
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>
    `;
  }

  /**
   * Helper methods for data extraction
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(amount);
  }

  getTopFeatures(scope, count = 10) {
    const modules = scope?.modules || [];
    return modules.slice(0, count);
  }

  getAllModules(scope) {
    return scope?.modules || [];
  }

  getPhases(technical) {
    if (!technical?.phases) {
      return [
        { name: 'Phase 1: Foundation', duration: 30, cost: 0 },
        { name: 'Phase 2: Core Features', duration: 45, cost: 0 },
        { name: 'Phase 3: Integration', duration: 30, cost: 0 }
      ];
    }
    return technical.phases;
  }

  getTeamComposition(technical) {
    if (!technical?.team) {
      return [
        { role: 'Backend Developer', count: 2 },
        { role: 'Frontend Developer', count: 2 },
        { role: 'QA Engineer', count: 1 },
        { role: 'Project Manager', count: 1 }
      ];
    }
    return technical.team;
  }

  getArchitectureOverview(technical) {
    return technical?.architecture || 'Modular Monolith Architecture';
  }

  getTechStack(technical) {
    return [
      { category: 'Frontend', technologies: ['React', 'TypeScript'] },
      { category: 'Backend', technologies: ['Node.js', 'Express'] },
      { category: 'Database', technologies: ['PostgreSQL'] },
      { category: 'Cache', technologies: ['Redis'] }
    ];
  }

  getComponents(technical) {
    return technical?.components || [];
  }

  getSprints(technical) {
    if (!technical?.sprints) {
      return [
        { number: 1, duration: 14, features: ['Auth', 'Dashboard'] },
        { number: 2, duration: 14, features: ['Core Features'] }
      ];
    }
    return technical.sprints;
  }

  getPseudocode(technical, coverage = 0.95) {
    return technical?.pseudocode || [
      { module: 'Authentication', code: '// Pseudocode will be generated here' }
    ];
  }

  getBusinessOverview(scope) {
    return scope?.description || 'Complete business solution';
  }

  getFeatureDescription(module, scope) {
    return `Detailed description for ${module}`;
  }

  getUserStories(scope) {
    return scope?.userStories || [];
  }

  getProcessFlows(scope) {
    return scope?.processFlows || [];
  }

  getReports(scope) {
    return scope?.reports || ['Dashboard', 'Analytics', 'Reports'];
  }

  getDetailedWorkflows(scope) {
    return scope?.workflows || [];
  }

  getBusinessRules(scope) {
    return scope?.businessRules || [];
  }

  getModuleComponents(module, technical) {
    return technical?.components?.filter(c => c.module === module) || [];
  }

  getDatabaseSchema(technical) {
    return technical?.databaseSchema || [];
  }

  getAPIEndpoints(technical) {
    return technical?.apiEndpoints || [];
  }

  /**
   * Render AMC section for documents
   */
  renderAMCSection(amcPackages) {
    if (!amcPackages || !amcPackages.basic) {
      return '';
    }

    return `
      <div class="section amc-section">
        <h2>Post-Development Support (AMC)</h2>
        
        <div class="amc-intro">
          <p>Annual Maintenance Contract (AMC) packages provide ongoing support, maintenance, and updates for your system.</p>
        </div>
        
        <div class="amc-packages">
          <div class="amc-package basic">
            <h3>${amcPackages.basic.name}</h3>
            <div class="package-price">
              <span class="annual">₹${this.formatCurrency(amcPackages.basic.annualCost)}/year</span>
              <span class="monthly">or ₹${this.formatCurrency(amcPackages.basic.monthlyCost)}/month</span>
            </div>
            <ul class="package-features">
              ${amcPackages.basic.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <p class="suitable-for"><strong>Suitable for:</strong> ${amcPackages.basic.suitableFor}</p>
          </div>
          
          <div class="amc-package standard">
            <h3>${amcPackages.standard.name}</h3>
            <div class="package-price">
              <span class="annual">₹${this.formatCurrency(amcPackages.standard.annualCost)}/year</span>
              <span class="monthly">or ₹${this.formatCurrency(amcPackages.standard.monthlyCost)}/month</span>
            </div>
            <ul class="package-features">
              ${amcPackages.standard.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <p class="suitable-for"><strong>Suitable for:</strong> ${amcPackages.standard.suitableFor}</p>
          </div>
          
          <div class="amc-package premium">
            <h3>${amcPackages.premium.name}</h3>
            <div class="package-price">
              <span class="annual">₹${this.formatCurrency(amcPackages.premium.annualCost)}/year</span>
              <span class="monthly">or ₹${this.formatCurrency(amcPackages.premium.monthlyCost)}/month</span>
            </div>
            <ul class="package-features">
              ${amcPackages.premium.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <p class="suitable-for"><strong>Suitable for:</strong> ${amcPackages.premium.suitableFor}</p>
          </div>
        </div>
        
        <div class="amc-sla">
          <h3>Service Level Agreements (SLA)</h3>
          <table>
            <thead>
              <tr>
                <th>Package</th>
                <th>Uptime</th>
                <th>Response Time</th>
                <th>Resolution Time</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic</td>
                <td>${amcPackages.sla.basic.uptime}</td>
                <td>${amcPackages.sla.basic.responseTime}</td>
                <td>${amcPackages.sla.basic.resolutionTime}</td>
                <td>${amcPackages.sla.basic.availability}</td>
              </tr>
              <tr>
                <td>Standard</td>
                <td>${amcPackages.sla.standard.uptime}</td>
                <td>${amcPackages.sla.standard.responseTime}</td>
                <td>${amcPackages.sla.standard.resolutionTime}</td>
                <td>${amcPackages.sla.standard.availability}</td>
              </tr>
              <tr>
                <td>Premium</td>
                <td>${amcPackages.sla.premium.uptime}</td>
                <td>${amcPackages.sla.premium.responseTime}</td>
                <td>${amcPackages.sla.premium.resolutionTime}</td>
                <td>${amcPackages.sla.premium.availability}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="amc-terms">
          <h3>Terms & Conditions</h3>
          <ul>
            <li><strong>Contract Duration:</strong> ${amcPackages.terms.contractDuration}</li>
            <li><strong>Payment Terms:</strong> ${amcPackages.terms.paymentTerms}</li>
            <li><strong>Cancellation:</strong> ${amcPackages.terms.cancellation}</li>
            <li><strong>Renewal:</strong> ${amcPackages.terms.renewal}</li>
          </ul>
        </div>
      </div>
      
      <style>
        .amc-section {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        }
        
        .amc-packages {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        
        .amc-package {
          background: white;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .amc-package h3 {
          color: #667eea;
          margin-bottom: 15px;
          font-size: 1.5em;
        }
        
        .package-price {
          margin-bottom: 20px;
        }
        
        .package-price .annual {
          display: block;
          font-size: 1.8em;
          font-weight: bold;
          color: #2563eb;
        }
        
        .package-price .monthly {
          display: block;
          font-size: 0.9em;
          color: #6b7280;
          margin-top: 5px;
        }
        
        .package-features {
          list-style: none;
          padding: 0;
          margin: 20px 0;
        }
        
        .package-features li {
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .package-features li:before {
          content: "✓ ";
          color: #10b981;
          font-weight: bold;
          margin-right: 8px;
        }
        
        .suitable-for {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 2px solid #e5e7eb;
          font-size: 0.9em;
          color: #6b7280;
        }
        
        .amc-sla {
          margin-top: 30px;
        }
        
        .amc-terms {
          margin-top: 30px;
        }
        
        .amc-terms ul {
          list-style: none;
          padding: 0;
        }
        
        .amc-terms li {
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
      </style>
    `;
  }
}

module.exports = HTMLTemplates;

