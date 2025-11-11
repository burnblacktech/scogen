// Domain Knowledge Form Management

let patterns = [];
let editingDomain = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDomains();
    initializeForm();
});

// Load existing domains
async function loadDomains() {
    try {
        const response = await fetch('/api/domain-knowledge');
        const data = await response.json();
        
        if (data.success && data.domains) {
            displayDomains(data.domains);
        }
    } catch (error) {
        showAlert('Failed to load domains: ' + error.message, 'error');
    }
}

// Display domains list
function displayDomains(domains) {
    const container = document.getElementById('domainsList');
    
    if (domains.length === 0) {
        container.innerHTML = '<p>No domain knowledge files found. Create one using the form below.</p>';
        return;
    }
    
    container.innerHTML = domains.map(domain => `
        <div class="domain-card">
            <h3>${domain.domain || domain.file.replace('.json', '')}</h3>
            <p><strong>Platform:</strong> ${domain.platformType || 'N/A'}</p>
            <p><strong>Patterns:</strong> ${domain.patterns || 0}</p>
            <p><strong>Last Modified:</strong> ${new Date(domain.lastModified).toLocaleString()}</p>
            <div class="actions">
                <button class="btn btn-primary" onclick="loadDomain('${domain.domain || domain.file.replace('.json', '')}')">Edit</button>
                <button class="btn btn-secondary" onclick="viewDomain('${domain.domain || domain.file.replace('.json', '')}')">View</button>
            </div>
        </div>
    `).join('');
}

// Load domain for editing
async function loadDomain(domainName) {
    try {
        const response = await fetch(`/api/domain-knowledge/${domainName}`);
        const data = await response.json();
        
        if (data.success && data.knowledge) {
            editingDomain = domainName;
            document.getElementById('formTitle').textContent = `Edit Domain: ${domainName}`;
            document.getElementById('domain').value = data.knowledge.domain || domainName;
            document.getElementById('platformType').value = data.knowledge.platformType || '';
            
            // Load patterns
            patterns = [];
            if (data.knowledge.technicalPatterns) {
                Object.entries(data.knowledge.technicalPatterns).forEach(([name, pattern]) => {
                    patterns.push({ name, ...pattern });
                });
            }
            
            renderPatterns();
            showAlert('Domain loaded for editing', 'success');
        }
    } catch (error) {
        showAlert('Failed to load domain: ' + error.message, 'error');
    }
}

// View domain (read-only)
async function viewDomain(domainName) {
    try {
        const response = await fetch(`/api/domain-knowledge/${domainName}`);
        const data = await response.json();
        
        if (data.success && data.knowledge) {
            const jsonStr = JSON.stringify(data.knowledge, null, 2);
            const newWindow = window.open();
            newWindow.document.write(`<pre>${escapeHtml(jsonStr)}</pre>`);
        }
    } catch (error) {
        showAlert('Failed to view domain: ' + error.message, 'error');
    }
}

// Initialize form
function initializeForm() {
    document.getElementById('domainKnowledgeForm').addEventListener('submit', handleSubmit);
    addPattern(); // Add one empty pattern by default
}

// Add new pattern
function addPattern() {
    const pattern = {
        name: '',
        components: []
    };
    patterns.push(pattern);
    renderPatterns();
}

// Remove pattern
function removePattern(index) {
    patterns.splice(index, 1);
    renderPatterns();
}

// Render patterns
function renderPatterns() {
    const container = document.getElementById('patternsContainer');
    
    if (patterns.length === 0) {
        container.innerHTML = '<p>No patterns added. Click "Add Pattern" to create one.</p>';
        return;
    }
    
    container.innerHTML = patterns.map((pattern, patternIndex) => `
        <div class="component-item">
            <h4>Pattern ${patternIndex + 1}</h4>
            <button type="button" class="btn btn-danger remove-btn" onclick="removePattern(${patternIndex})">Remove</button>
            
            <div class="form-group">
                <label>Pattern Name *</label>
                <input type="text" class="pattern-name" data-index="${patternIndex}" 
                       value="${pattern.name || ''}" 
                       placeholder="e.g., salary_structure, statutory_compliance" required>
            </div>
            
            <div class="form-group">
                <label>Components (JSON)</label>
                <textarea class="pattern-components" data-index="${patternIndex}" 
                          placeholder='[{"layer": "data", "component": "ModelName", "baselineEffort": {"simple": 1, "custom": 2}, "requiredFiles": ["models/File.js"], "requiredFunctions": ["create()"]}]'
                          rows="8">${JSON.stringify(pattern.components || [], null, 2)}</textarea>
                <small>Enter components as JSON array. See existing patterns for reference.</small>
            </div>
            
            <div class="form-group">
                <label>Integration Points (comma-separated)</label>
                <input type="text" class="pattern-integrations" data-index="${patternIndex}" 
                       value="${(pattern.integrationPoints || []).join(', ')}"
                       placeholder="e.g., EmployeeService, TaxEngine">
            </div>
            
            <div class="form-group">
                <label>Known Risks (JSON)</label>
                <textarea class="pattern-risks" data-index="${patternIndex}" 
                          placeholder='[{"risk": "Risk description", "impact": "Impact description", "effortBuffer": 2}]'
                          rows="4">${JSON.stringify(pattern.knownRisks || [], null, 2)}</textarea>
            </div>
        </div>
    `).join('');
    
    // Attach event listeners
    container.querySelectorAll('.pattern-name').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            patterns[index].name = e.target.value;
        });
    });
    
    container.querySelectorAll('.pattern-components').forEach(textarea => {
        textarea.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            try {
                patterns[index].components = JSON.parse(e.target.value);
            } catch (error) {
                showAlert('Invalid JSON in components', 'error');
            }
        });
    });
    
    container.querySelectorAll('.pattern-integrations').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            patterns[index].integrationPoints = e.target.value.split(',').map(s => s.trim()).filter(s => s);
        });
    });
    
    container.querySelectorAll('.pattern-risks').forEach(textarea => {
        textarea.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            try {
                patterns[index].knownRisks = JSON.parse(e.target.value);
            } catch (error) {
                showAlert('Invalid JSON in risks', 'error');
            }
        });
    });
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    const domain = document.getElementById('domain').value;
    const platformType = document.getElementById('platformType').value || domain;
    
    // Build technical patterns object
    const technicalPatterns = {};
    patterns.forEach(pattern => {
        if (pattern.name) {
            technicalPatterns[pattern.name] = {
                components: pattern.components || [],
                integrationPoints: pattern.integrationPoints || [],
                knownRisks: pattern.knownRisks || []
            };
        }
    });
    
    const domainKnowledge = {
        domain: domain,
        platformType: platformType,
        technicalPatterns: technicalPatterns,
        architectureDefaults: {
            pattern: 'monolith',
            database: 'postgresql',
            apiStyle: 'REST',
            frontend: 'React'
        }
    };
    
    try {
        const response = await fetch('/api/domain-knowledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(domainKnowledge)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`Domain knowledge saved successfully! File: ${data.file}`, 'success');
            resetForm();
            loadDomains(); // Reload list
        } else {
            showAlert('Failed to save: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        showAlert('Failed to save domain knowledge: ' + error.message, 'error');
    }
}

// Reset form
function resetForm() {
    editingDomain = null;
    document.getElementById('formTitle').textContent = 'Add New Domain Knowledge';
    document.getElementById('domainKnowledgeForm').reset();
    patterns = [];
    addPattern();
}

// Show alert
function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.innerHTML = '';
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

