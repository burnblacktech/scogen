// Intelligent Scope View JavaScript
// Uses API client for backend communication

// Import API client (if available)
let api;
if (typeof ApiClient !== 'undefined') {
    api = new ApiClient();
} else {
    // Fallback: load API client from script
    console.warn('ApiClient not found, using fetch directly');
}

class IntelligentScopeView {
    constructor() {
        this.projectId = this.getProjectIdFromURL();
        this.scope = null;
        this.scenarios = null;
        this.suggestedComponents = [];
        this.activeTab = 'overview';
        this.api = api || null;
        this.currentLevel = 'L1';
        this.levelData = null;
        
        this.init();
    }

    getProjectIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('projectId') || params.get('id') || 'demo';
    }

    async init() {
        this.setupTabs();
        await this.loadIntelligentScope();
        
        // Load L1 by default
        const urlParams = new URLSearchParams(window.location.search);
        const levelParam = urlParams.get('level') || 'L1';
        await this.selectLevel(levelParam);
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');

        this.activeTab = tabName;

        // Load tab-specific data if needed
        if (tabName === 'scenarios' && !this.scenarios) {
            this.loadScenarios();
        } else if (tabName === 'components' && this.suggestedComponents.length === 0) {
            this.loadComponentSuggestions();
        }
    }

    async loadIntelligentScope() {
        try {
            // Load scope data using API client or fetch
            if (this.api) {
                try {
                    const scopeData = await this.api.getScope(this.projectId);
                    this.scope = scopeData.result || scopeData;
                } catch (error) {
                    console.warn('API client failed, trying direct fetch:', error);
                    const scopeResponse = await fetch(`/api/v2/scopes/${this.projectId}`);
                    if (scopeResponse.ok) {
                        const data = await scopeResponse.json();
                        this.scope = data.result || data;
                    }
                }
            } else {
                const scopeResponse = await fetch(`/api/v2/scopes/${this.projectId}`);
                if (scopeResponse.ok) {
                    const data = await scopeResponse.json();
                    this.scope = data.result || data;
                }
            }

            // If scope loaded, analyze it with intelligence system
            if (this.scope && this.api) {
                try {
                    await this.api.analyzeScope(this.projectId);
                } catch (error) {
                    console.warn('Intelligence analysis failed:', error);
                }
            }

            // Load scenarios
            await this.loadScenarios();

            // Load component suggestions
            await this.loadComponentSuggestions();

            // Render UI
            this.render();
        } catch (error) {
            console.error('[ERROR] Failed to load intelligent scope', error);
            this.renderError(error);
        }
    }

    async loadScenarios() {
        try {
            if (this.api) {
                try {
                    const data = await this.api.generateScenarios(
                        this.scope?.project || { domain: 'generic' },
                        this.scope?.modules || [],
                        {}
                    );
                    this.scenarios = data.scenarios;
                    this.renderScenarios();
                    return;
                } catch (error) {
                    console.warn('API client scenario generation failed:', error);
                }
            }

            // Fallback to direct fetch
            const response = await fetch('/api/v2/intelligence/generate-scenarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project: this.scope?.project || { domain: 'generic' },
                    modules: this.scope?.modules || [],
                    resources: {}
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.scenarios = data.scenarios;
                this.renderScenarios();
            }
        } catch (error) {
            console.error('[ERROR] Failed to load scenarios', error);
        }
    }

    async loadComponentSuggestions() {
        try {
            const requirements = (this.scope?.modules || []).map(m => ({
                name: m.name || m.module,
                category: m.category
            }));

            const response = await fetch('/api/v2/learning/match-components', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requirements })
            });

            if (response.ok) {
                const data = await response.json();
                this.suggestedComponents = data.matches || [];
                this.renderComponentsAlert();
                this.renderComponentSuggestions();
            }
        } catch (error) {
            console.error('[ERROR] Failed to load component suggestions', error);
        }
    }

    render() {
        this.renderHeader();
        this.renderOverview();
        this.renderComplexity();
    }

    renderHeader() {
        const projectName = document.getElementById('projectName');
        const clientName = document.getElementById('clientName');
        const confidenceScore = document.getElementById('confidenceScore');
        const historicalProjects = document.getElementById('historicalProjects');

        if (this.scope) {
            projectName.textContent = this.scope.projectName || this.scope.name || 'Project';
            clientName.textContent = this.scope.client || this.scope.clientName || '';
            
            const confidence = this.scope.confidence || 0.7;
            confidenceScore.textContent = `${(confidence * 100).toFixed(0)}%`;
            confidenceScore.className = 'confidence-value';
            
            historicalProjects.textContent = `Based on ${this.scope.historicalProjects || 0} similar projects`;
        } else {
            projectName.textContent = 'Loading Project...';
            confidenceScore.textContent = 'Calculating...';
        }
    }

    renderOverview() {
        if (!this.scope) return;

        // Render cost breakdown
        this.renderCostBreakdown();
        
        // Render quick metrics
        this.renderQuickMetrics();
    }

    renderCostBreakdown() {
        const container = document.getElementById('costBreakdown');
        const confidenceBadge = document.getElementById('costConfidence');
        const explanation = document.getElementById('costExplanation');

        if (!this.scope?.costBreakdown) {
            container.innerHTML = '<p class="text-gray-500">Cost breakdown not available</p>';
            return;
        }

        const breakdown = this.scope.costBreakdown;
        const confidence = this.scope.confidence || 0.7;

        let html = '';
        
        if (breakdown.development) {
            html += `<div class="cost-item">
                <span class="cost-label">Development</span>
                <span class="cost-value">₹${this.formatCurrency(breakdown.development)}</span>
            </div>`;
        }
        
        if (breakdown.testing) {
            html += `<div class="cost-item">
                <span class="cost-label">Testing (30%)</span>
                <span class="cost-value">₹${this.formatCurrency(breakdown.testing)}</span>
            </div>`;
        }
        
        if (breakdown.documentation) {
            html += `<div class="cost-item">
                <span class="cost-label">Documentation (10%)</span>
                <span class="cost-value">₹${this.formatCurrency(breakdown.documentation)}</span>
            </div>`;
        }
        
        if (breakdown.projectManagement) {
            html += `<div class="cost-item">
                <span class="cost-label">Project Management (15%)</span>
                <span class="cost-value">₹${this.formatCurrency(breakdown.projectManagement)}</span>
            </div>`;
        }
        
        if (breakdown.riskBuffer) {
            html += `<div class="cost-item">
                <span class="cost-label">Risk Buffer</span>
                <span class="cost-value">₹${this.formatCurrency(breakdown.riskBuffer)}</span>
            </div>`;
        }
        
        if (breakdown.gst) {
            html += `<div class="cost-item">
                <span class="cost-label">GST (18%)</span>
                <span class="cost-value">₹${this.formatCurrency(breakdown.gst)}</span>
            </div>`;
        }
        
        if (breakdown.totalWithGST) {
            html += `<div class="cost-item">
                <span class="cost-label">Total</span>
                <span class="cost-value">₹${this.formatCurrency(breakdown.totalWithGST)}</span>
            </div>`;
        }

        container.innerHTML = html;

        // Confidence badge
        confidenceBadge.textContent = `${(confidence * 100).toFixed(0)}% Confidence`;
        confidenceBadge.className = 'confidence-badge';

        // Explanation
        if (this.scope.costExplanation) {
            explanation.textContent = this.scope.costExplanation;
        } else if (this.scope.factors) {
            explanation.textContent = Array.isArray(this.scope.factors) 
                ? this.scope.factors.join('\n')
                : this.scope.factors;
        }
    }

    renderQuickMetrics() {
        const container = document.getElementById('quickMetrics');
        
        if (!this.scope) {
            container.innerHTML = '<p class="text-gray-500">Metrics not available</p>';
            return;
        }

        const metrics = [
            { label: 'Total Modules', value: this.scope.modules?.length || 0 },
            { label: 'Timeline', value: `${this.scope.timeline?.weeks || 0} weeks` },
            { label: 'Total Cost', value: `₹${this.formatCurrency(this.scope.totalCost || 0)}` },
            { label: 'Complexity', value: `${(this.scope.averageComplexity || 3).toFixed(1)}/5` }
        ];

        let html = '<div class="metric-grid">';
        metrics.forEach(metric => {
            html += `
                <div class="metric-item">
                    <div class="metric-value">${metric.value}</div>
                    <div class="metric-label">${metric.label}</div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    renderComplexity() {
        const container = document.getElementById('complexityModules');
        
        if (!this.scope?.modules || this.scope.modules.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No modules to display</p>';
            return;
        }

        let html = '';
        this.scope.modules.forEach(module => {
            const complexity = module.complexity || module.complexityScore || 3;
            const complexityClass = complexity < 2.5 ? 'low' : complexity < 3.5 ? 'medium' : 'high';
            
            html += `
                <div class="complexity-card">
                    <h4>${module.name || module.module}</h4>
                    <div class="complexity-score ${complexityClass}">${complexity.toFixed(1)}/5</div>
                    ${module.complexityBreakdown ? this.renderComplexityBreakdown(module.complexityBreakdown) : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderComplexityBreakdown(breakdown) {
        if (!breakdown) return '';

        let html = '<div class="complexity-breakdown">';
        
        if (breakdown.functional !== undefined) {
            html += `<div class="complexity-factor">
                <span>Functional</span>
                <span>${breakdown.functional.toFixed(1)}</span>
            </div>`;
        }
        
        if (breakdown.technical !== undefined) {
            html += `<div class="complexity-factor">
                <span>Technical</span>
                <span>${breakdown.technical.toFixed(1)}</span>
            </div>`;
        }
        
        if (breakdown.integration !== undefined) {
            html += `<div class="complexity-factor">
                <span>Integration</span>
                <span>${breakdown.integration.toFixed(1)}</span>
            </div>`;
        }

        html += '</div>';
        return html;
    }

    renderScenarios() {
        const container = document.getElementById('scenariosComparison');
        
        if (!this.scenarios) {
            container.innerHTML = '<p class="text-gray-500">Loading scenarios...</p>';
            return;
        }

        let html = '<div class="scenarios-grid">';

        // Optimistic
        if (this.scenarios.optimistic) {
            html += this.renderScenarioCard('optimistic', this.scenarios.optimistic, false);
        }

        // Realistic
        if (this.scenarios.realistic) {
            html += this.renderScenarioCard('realistic', this.scenarios.realistic, false);
        }

        // Pessimistic
        if (this.scenarios.pessimistic) {
            html += this.renderScenarioCard('pessimistic', this.scenarios.pessimistic, false);
        }

        // Recommended
        if (this.scenarios.recommended) {
            html += this.renderScenarioCard('recommended', this.scenarios.recommended, true);
        }

        html += '</div>';
        container.innerHTML = html;
    }

    renderScenarioCard(type, scenario, isRecommended) {
        const cardClass = isRecommended ? 'scenario-card recommended' : 'scenario-card';
        const badge = isRecommended ? '<span class="scenario-badge">⭐ Recommended</span>' : '';
        
        return `
            <div class="${cardClass}">
                <h4>${scenario.name || type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                ${badge}
                <div class="scenario-metric">
                    <span>Total Hours</span>
                    <span class="scenario-value">${scenario.totalHours || 0}</span>
                </div>
                <div class="scenario-metric">
                    <span>Total Cost</span>
                    <span class="scenario-value">₹${this.formatCurrency(scenario.totalCost || 0)}</span>
                </div>
                <div class="scenario-metric">
                    <span>Duration</span>
                    <span class="scenario-value">${scenario.duration || 0} days</span>
                </div>
                <div class="scenario-metric">
                    <span>Confidence</span>
                    <span class="scenario-value">${((scenario.confidence || 0.7) * 100).toFixed(0)}%</span>
                </div>
                ${scenario.probability ? `
                    <div class="scenario-metric">
                        <span>Probability</span>
                        <span class="scenario-value">${(scenario.probability * 100).toFixed(0)}%</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderComponentSuggestions() {
        const container = document.getElementById('componentSuggestions');
        
        if (this.suggestedComponents.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No reusable components found</p>';
            return;
        }

        let html = '<div class="component-list">';
        
        this.suggestedComponents.forEach(component => {
            html += `
                <div class="component-item">
                    <div class="component-info">
                        <h4>${component.component?.component_name || component.requirement}</h4>
                        <p>Match Score: ${((component.matchScore || 0) * 100).toFixed(0)}%</p>
                        <p>Customization Points: ${component.customizationPoints?.length || 0}</p>
                    </div>
                    <div class="component-savings">
                        <div class="savings-value">-${component.savings || 0}h</div>
                        <div class="savings-label">Time Saved</div>
                        <button class="apply-button" onclick="scopeView.applyComponent('${component.component?.id || ''}')">
                            Apply Component
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderComponentsAlert() {
        if (this.suggestedComponents.length === 0) {
            document.getElementById('componentsAlert').style.display = 'none';
            return;
        }

        const alert = document.getElementById('componentsAlert');
        const count = document.getElementById('componentsCount');
        const savings = document.getElementById('componentsSavings');

        const totalSavings = this.suggestedComponents.reduce((sum, c) => sum + (c.savings || 0), 0);

        count.textContent = `Found ${this.suggestedComponents.length} reusable components`;
        savings.textContent = `Save ~${totalSavings} hours`;

        alert.style.display = 'block';
    }

    renderError(error = null) {
        const projectNameEl = document.getElementById('projectName');
        const confidenceScoreEl = document.getElementById('confidenceScore');
        
        if (projectNameEl) {
            projectNameEl.textContent = 'Error Loading Project';
        }
        if (confidenceScoreEl) {
            confidenceScoreEl.textContent = 'N/A';
        }
        
        // Show error message if available
        if (error) {
            console.error('Scope loading error:', error);
            // Could add a toast notification here
        }
    }

    formatCurrency(value) {
        if (value >= 100000) {
            return `${(value / 100000).toFixed(2)}L`;
        }
        return value.toLocaleString('en-IN');
    }

    async applyComponent(componentId) {
        // Placeholder for component application
        alert(`Applying component ${componentId}...`);
    }

    async selectLevel(level) {
        // Update UI
        document.querySelectorAll('.level-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const tab = document.querySelector(`[data-level="${level}"]`);
        if (tab) {
            tab.classList.add('active');
        }

        this.currentLevel = level;

        // Load level content
        await this.loadLevelContent(level);
    }

    async loadLevelContent(level) {
        const container = document.getElementById('levelContent');
        if (!container) return;

        container.innerHTML = '<p>Loading level content...</p>';

        try {
            let response;
            if (this.api) {
                response = await this.api.request(`/v2/progressive/${this.projectId}/level/${level}`);
            } else {
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch(`/api/v2/progressive/${this.projectId}/level/${level}`, {
                    headers: {
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    }
                });
                
                if (fetchResponse.status === 403) {
                    const errorData = await fetchResponse.json();
                    this.displayUpgradePrompt(level, errorData);
                    return;
                }
                
                response = await fetchResponse.json();
            }

            if (response.success) {
                this.levelData = response;
                this.displayLevelContent(response);
            } else {
                throw new Error(response.error || 'Failed to load level');
            }
        } catch (error) {
            console.error('[ERROR] Failed to load level:', error);
            if (error.message.includes('403') || error.message.includes('Upgrade')) {
                this.displayUpgradePrompt(level);
            } else {
                container.innerHTML = `<p class="text-red-500">Error loading level: ${error.message}</p>`;
            }
        }
    }

    displayLevelContent(data) {
        const container = document.getElementById('levelContent');
        if (!container) return;

        let html = `
            <div class="level-content">
                <h3>${data.levelName} Output</h3>
        `;

        // Summary
        if (data.data.summary) {
            html += `
                <div class="section" style="margin-top: 20px;">
                    <h4>Executive Summary</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 10px;">
                        <div><strong>Project:</strong> ${data.data.summary.projectName}</div>
                        <div><strong>Client:</strong> ${data.data.summary.client || 'N/A'}</div>
                        <div><strong>Industry:</strong> ${data.data.summary.industry || 'N/A'}</div>
                        <div><strong>Features:</strong> ${data.data.summary.featureCount}</div>
                        <div><strong>Estimated Hours:</strong> ${data.data.summary.estimatedHours}</div>
                        <div><strong>Complexity:</strong> ${data.data.summary.complexity}/5</div>
                    </div>
                </div>
            `;
        }

        // Features
        if (data.data.features && data.data.features.length > 0) {
            html += `
                <div class="section" style="margin-top: 20px;">
                    <h4>Features (${data.data.features.length})</h4>
                    <div class="level-features">
                        ${data.data.features.map(f => `
                            <div class="feature-item included">
                                <span>✓</span>
                                <div>
                                    <strong>${f.name}</strong>
                                    <div style="font-size: 0.875rem; color: #6b7280; margin-top: 5px;">
                                        ${f.hours} hours • Complexity: ${f.complexity}/5
                                    </div>
                                    ${f.description && f.description !== f.name ? `
                                        <div style="font-size: 0.875rem; color: #6b7280; margin-top: 5px;">
                                            ${f.description}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Cost
        if (data.data.cost) {
            html += `
                <div class="section" style="margin-top: 20px;">
                    <h4>Cost Estimate</h4>
                    <p style="font-size: 1.5rem; font-weight: bold; color: #2563eb;">${data.data.cost.total}</p>
                    ${data.data.cost.breakdown ? `
                        <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 8px;">
                            <div style="display: grid; gap: 10px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span>Development:</span>
                                    <strong>₹${(data.data.cost.breakdown.development/100000).toFixed(2)}L</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>Testing:</span>
                                    <strong>₹${(data.data.cost.breakdown.testing/100000).toFixed(2)}L</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>Management:</span>
                                    <strong>₹${(data.data.cost.breakdown.management/100000).toFixed(2)}L</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>GST (18%):</span>
                                    <strong>₹${(data.data.cost.breakdown.gst/100000).toFixed(2)}L</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; border-top: 2px solid #e5e7eb; padding-top: 10px; margin-top: 10px;">
                                    <span><strong>Total:</strong></span>
                                    <strong>₹${(data.data.cost.breakdown.total/100000).toFixed(2)}L</strong>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Timeline
        if (data.data.timeline) {
            html += `
                <div class="section" style="margin-top: 20px;">
                    <h4>Timeline</h4>
                    <p><strong>Duration:</strong> ${data.data.timeline.estimatedWeeks}</p>
                    <p><strong>Start:</strong> ${data.data.timeline.startDate || 'TBD'}</p>
                    <p><strong>End:</strong> ${data.data.timeline.endDate || 'TBD'}</p>
                </div>
            `;
        }

        // Architecture
        if (data.data.architecture) {
            html += `
                <div class="section" style="margin-top: 20px;">
                    <h4>Architecture</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 10px;">
                        <div><strong>Type:</strong> ${data.data.architecture.type}</div>
                        <div><strong>Frontend:</strong> ${data.data.architecture.frontend}</div>
                        <div><strong>Backend:</strong> ${data.data.architecture.backend}</div>
                        <div><strong>Database:</strong> ${data.data.architecture.database}</div>
                        ${data.data.architecture.deployment ? `<div><strong>Deployment:</strong> ${data.data.architecture.deployment}</div>` : ''}
                    </div>
                </div>
            `;
        }

        // Pseudocode
        if (data.data.pseudocode && Object.keys(data.data.pseudocode).length > 0) {
            html += `
                <div class="section pseudocode-section" style="margin-top: 20px;">
                    <h4>Pseudocode Samples (${(data.data.pseudocode[Object.keys(data.data.pseudocode)[0]]?.completeness || 0) * 100}% complete)</h4>
                    ${Object.entries(data.data.pseudocode).map(([name, item]) => `
                        <details>
                            <summary>${name}</summary>
                            <pre>${this.escapeHtml(typeof item === 'string' ? item : item.code)}</pre>
                        </details>
                    `).join('')}
                </div>
            `;
        }

        // Sprints
        if (data.data.sprints && data.data.sprints.length > 0) {
            html += `
                <div class="section" style="margin-top: 20px;">
                    <h4>Sprint Plan (${data.data.sprints.length} sprints)</h4>
                    <div style="display: grid; gap: 10px; margin-top: 10px;">
                        ${data.data.sprints.map(sprint => `
                            <div style="padding: 15px; background: white; border-radius: 8px;">
                                <strong>Sprint ${sprint.sprintNumber}</strong>
                                <div style="font-size: 0.875rem; color: #6b7280; margin-top: 5px;">
                                    ${sprint.startDate} - ${sprint.endDate} (${sprint.workingDays} days)
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Unlock next level button
        const nextLevel = this.getNextLevel(this.currentLevel);
        if (nextLevel) {
            html += `
                <button class="unlock-button" onclick="scopeView.upgradeLevel('${nextLevel}')">
                    Unlock ${nextLevel} →
                </button>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    displayUpgradePrompt(level, errorData = null) {
        const container = document.getElementById('levelContent');
        if (!container) return;

        const prices = {
            L2: '₹2,500',
            L3: '₹10,000', 
            L4: '₹25,000',
            L5: '₹50,000'
        };

        container.innerHTML = `
            <div class="level-content" style="text-align: center; padding: 40px;">
                <h3>Upgrade to ${level} Required</h3>
                <p style="color: #6b7280; margin: 20px 0;">
                    Get access to advanced features and detailed implementation guides.
                </p>
                <p style="font-size: 2rem; font-weight: bold; margin: 20px 0; color: #2563eb;">
                    ${prices[level] || 'Contact Us'}
                </p>
                <button class="unlock-button" onclick="scopeView.upgradeLevel('${level}')">
                    Upgrade Now
                </button>
            </div>
        `;
    }

    async upgradeLevel(level) {
        try {
            let response;
            if (this.api) {
                response = await this.api.request(`/v2/progressive/${this.projectId}/upgrade/${level}`, {
                    method: 'POST'
                });
            } else {
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch(`/api/v2/progressive/${this.projectId}/upgrade/${level}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    }
                });
                response = await fetchResponse.json();
            }

            if (response.success) {
                alert(`Upgrade successful! You now have access to ${response.levelName}.`);
                await this.selectLevel(level);
                // Update URL
                const url = new URL(window.location);
                url.searchParams.set('level', level);
                window.history.pushState({}, '', url);
            } else {
                throw new Error(response.error || 'Upgrade failed');
            }
        } catch (error) {
            alert('Upgrade failed: ' + error.message);
            console.error('[ERROR] Upgrade failed:', error);
        }
    }

    getNextLevel(currentLevel) {
        const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
        const currentIndex = levels.indexOf(currentLevel);
        return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize on page load
let scopeView;
document.addEventListener('DOMContentLoaded', () => {
    scopeView = new IntelligentScopeView();
});

