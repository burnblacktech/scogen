// web/js/dashboard.js
// Dashboard logic

// Import API client (if available)
let api;
if (typeof ApiClient !== 'undefined') {
    api = new ApiClient();
} else {
    console.warn('ApiClient not found, using fetch directly');
}

class Dashboard {
    constructor() {
        this.api = api || null;
        this.projects = [];
        this.init();
    }

    async init() {
        // Setup create button FIRST so it works immediately
        this.setupCreateButton();
        // Then load projects (this might take time or fail)
        try {
            await this.loadProjects();
        } catch (error) {
            console.error('[ERROR] Failed to load projects:', error);
            // Button should still work even if projects fail to load
        }
    }

    async loadProjects() {
        const container = document.getElementById('projectsList');
        if (!container) return;

        container.innerHTML = '<p>Loading projects...</p>';

        try {
            // Check auth
            if (this.api && !this.api.getToken()) {
                window.location.href = '/login.html';
                return;
            }

            let response;
            
            if (this.api) {
                response = await this.api.get('/v2/projects');
            } else {
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch('/api/v2/projects', {
                    headers: {
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    }
                });
                response = await fetchResponse.json();
            }

            if (response.success) {
                this.projects = response.projects || [];
                this.updateStats();
                this.renderProjects();
            } else {
                throw new Error(response.error || 'Failed to load projects');
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
            if (error.message.includes('401')) {
                window.location.href = '/login.html';
                return;
            }
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        Failed to load projects: ${error.message}
                    </div>
                `;
            }
        }
    }

    async updateStats() {
        const totalProjects = this.projects.length;
        document.getElementById('totalProjects').textContent = totalProjects;

        const totalValue = this.projects.reduce((sum, p) => sum + (p.totalCost || 0), 0);
        document.getElementById('totalValue').textContent = totalValue >= 100000 
            ? '₹' + (totalValue / 100000).toFixed(1) + 'L'
            : '₹' + totalValue.toLocaleString('en-IN');

        const avgConfidence = this.projects.length > 0
            ? this.projects.reduce((sum, p) => sum + (p.avg_confidence || 0), 0) / this.projects.length
            : 0;
        document.getElementById('avgAccuracy').textContent = (avgConfidence * 100).toFixed(0) + '%';

        const activeCount = this.projects.filter(p => 
            p.project_status === 'in_progress' || p.project_status === 'scoping'
        ).length;
        document.getElementById('activeProjects').textContent = activeCount;

        // Load learning metrics if available
        await this.loadLearningMetrics();
    }

    async loadLearningMetrics() {
        try {
            let response;
            if (this.api) {
                response = await this.api.request('/v2/learning/metrics');
            } else {
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch('/api/v2/learning/metrics', {
                    headers: {
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    }
                });
                response = await fetchResponse.json();
            }

            if (response.success) {
                // Update system accuracy if element exists
                const systemAccuracyEl = document.getElementById('systemAccuracy');
                if (systemAccuracyEl) {
                    systemAccuracyEl.textContent = response.accuracy 
                        ? `${(response.accuracy * 100).toFixed(0)}%` 
                        : 'Learning...';
                }

                // Update projects learned if element exists
                const projectsLearnedEl = document.getElementById('projectsLearned');
                if (projectsLearnedEl) {
                    projectsLearnedEl.textContent = response.completedProjects || 0;
                }
            }
        } catch (error) {
            console.error('Failed to load learning metrics:', error);
        }
    }

    renderProjects() {
        const container = document.getElementById('projectsList');
        if (!container) return;

        if (this.projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No projects yet</h3>
                    <p>Create your first project to get started!</p>
                    <a href="create-project.html" class="btn-primary">Create Project</a>
                </div>
            `;
            return;
        }

        const html = this.projects.map(project => {
            const statusClass = this.getStatusClass(project.project_status);
            const createdDate = new Date(project.created_at).toLocaleDateString();
            
            return `
                <div class="project-card">
                    <div class="project-header">
                        <h3>${project.project_name || 'Unnamed Project'}</h3>
                        <span class="status-badge ${statusClass}">${project.project_status || 'draft'}</span>
                    </div>
                    <div class="project-details">
                        ${project.client_name ? `<p><strong>Client:</strong> ${project.client_name}</p>` : ''}
                        <p><strong>Industry:</strong> ${project.client_industry || 'N/A'}</p>
                        <p><strong>Features:</strong> ${project.feature_count || 0}</p>
                        ${project.total_hours ? `<p><strong>Total Hours:</strong> ${Math.round(project.total_hours)}h</p>` : ''}
                        ${project.totalCost ? `<p><strong>Total Cost:</strong> ₹${this.formatCurrency(project.totalCost)}</p>` : ''}
                        <p><strong>Created:</strong> ${createdDate}</p>
                    </div>
                    <div class="project-actions">
                        <a href="intelligent-scope.html?projectId=${project.id}" class="btn-view">View Analysis →</a>
                        ${(project.project_status === 'approved' || project.project_status === 'in_progress') ? `
                            <a href="project-completion.html?id=${project.id}" 
                               style="background: #10b981; color: white; padding: 8px 16px; 
                                      border-radius: 6px; text-decoration: none; display: inline-block; 
                                      margin-top: 10px; font-size: 0.875rem;">
                                Complete & Learn
                            </a>
                        ` : ''}
                    </div>
                    ${project.totalCost ? `
                        <p style="margin-top: 10px; color: #2563eb; font-weight: 600;">
                            ₹${this.formatCurrency(project.totalCost)}
                        </p>
                    ` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    getStatusClass(status) {
        const statusMap = {
            'draft': 'status-draft',
            'scoping': 'status-scoping',
            'review': 'status-review',
            'approved': 'status-approved',
            'in_progress': 'status-progress',
            'completed': 'status-completed'
        };
        return statusMap[status] || 'status-draft';
    }

    formatCurrency(value) {
        if (value >= 100000) {
            return `${(value / 100000).toFixed(2)}L`;
        }
        return value.toLocaleString('en-IN');
    }

    setupCreateButton() {
        const createButton = document.getElementById('createProjectBtn');
        if (createButton) {
            // Ensure href is set correctly
            if (!createButton.href || createButton.href === '#' || createButton.href.endsWith('#')) {
                createButton.href = 'create-project.html';
            }
            // The href should work naturally - no need to prevent default
        } else {
            console.error('[ERROR] Create project button not found');
        }
    }
}

// Logout function
function logout() {
    if (api) {
        api.logout();
    } else {
        localStorage.removeItem('token');
    }
    window.location.href = '/login.html';
}

// Refresh every 30 seconds
setInterval(() => {
    if (dashboard) {
        dashboard.loadProjects();
    }
}, 30000);

// Initialize on page load
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    try {
        dashboard = new Dashboard();
    } catch (error) {
        console.error('[ERROR] Failed to initialize dashboard:', error);
        // Ensure create button still works even if dashboard fails
        const createButton = document.getElementById('createProjectBtn');
        if (createButton) {
            if (!createButton.href || createButton.href === '#' || createButton.href.endsWith('#')) {
                createButton.href = 'create-project.html';
            }
        }
    }
});

