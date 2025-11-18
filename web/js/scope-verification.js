class ScopeVerificationManager {
  constructor() {
    this.modules = [];
    this.projectId = new URLSearchParams(window.location.search).get('projectId');
    this.currentEditIndex = null;
    this.completenessScore = 0;
    this.clarityScore = 0;
    this.hourlyRate = 85; // Default hourly rate
    this.hoursPerDay = 6;
    
    // Complexity to days mapping
    this.COMPLEXITY_DAYS = { low: 1, med: 2, high: 4, medium: 2 };
    
    this.init();
  }
  
  /**
   * Calculate estimated effort and cost for a module
   */
  calculateModuleEstimate(module) {
    const complexity = (module.complexity || 'medium').toLowerCase();
    const complexityKey = complexity.substring(0, 3);
    const baseDays = this.COMPLEXITY_DAYS[complexityKey] || this.COMPLEXITY_DAYS[complexity] || 2;
    
    let days = baseDays;
    
    // Adjust for reusable modules
    if (module.reusable) {
      days *= 0.5;
    }
    
    // Adjust for dependencies (integration tax)
    if (module.deps && module.deps.length > 0) {
      const integrationTax = Math.min(module.deps.length * 0.1, 0.3);
      days *= (1 + integrationTax);
    }
    
    const cost = days * this.hoursPerDay * this.hourlyRate;
    
    return {
      days: days.toFixed(1),
      cost: Math.ceil(cost),
      formattedCost: this.formatCost(cost)
    };
  }
  
  /**
   * Format cost for display
   */
  formatCost(cost) {
    if (typeof cost === 'number') {
      if (isNaN(cost) || !isFinite(cost)) return 'TBD';
      if (cost === 0) return '₹0';
      if (cost >= 10000000) return `₹${(cost / 10000000).toFixed(1)}Cr`;
      if (cost >= 100000) return `₹${(cost / 100000).toFixed(1)}L`;
      if (cost >= 1000) return `₹${(cost / 1000).toFixed(1)}K`;
      return `₹${Math.round(cost).toLocaleString('en-IN')}`;
    }
    return cost || 'TBD';
  }
  
  /**
   * Calculate total estimated cost
   */
  calculateTotalEstimate() {
    let totalDays = 0;
    let totalCost = 0;
    
    this.modules.forEach(module => {
      const estimate = this.calculateModuleEstimate(module);
      totalDays += parseFloat(estimate.days);
      totalCost += estimate.cost;
    });
    
    return {
      days: totalDays.toFixed(1),
      cost: totalCost,
      formattedCost: this.formatCost(totalCost),
      weeks: Math.ceil(totalDays / 5)
    };
  }
  
  async init() {
    // Load extracted modules
    await this.loadExtractedModules();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Render modules
    this.renderModules();
    
    // Update stats
    this.updateStats();
    
    // Update total estimate
    this.updateTotalEstimate();
  }
  
  async loadExtractedModules() {
    try {
      // Get input from session storage or API
      const input = sessionStorage.getItem('projectInput') || '';
      
      if (!input) {
        // Try to get from project if projectId exists
        if (this.projectId) {
          const projectResponse = await fetch(`/api/projects/${this.projectId}`);
          if (projectResponse.ok) {
            const project = await projectResponse.json();
            if (project.original_input) {
              const response = await fetch('/api/scope/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  input: project.original_input,
                  inputType: project.input_type || 'text',
                  domainContext: {}
                })
              });
              
              const data = await response.json();
              
              if (data.success && data.scope) {
                this.modules = data.scope.modules.map((m, idx) => ({
                  id: m.id || `module_${idx}`,
                  name: m.name,
                  description: m.description || '',
                  category: m.category || 'General',
                  priority: m.priority || 'medium',
                  complexity: m.complexity || 'medium',
                  verified: false
                }));
                
                this.completenessScore = data.scope.completeness?.score || 0;
                this.clarityScore = data.scope.completeness?.score || 0;
              }
            }
          }
        }
      } else {
        const response = await fetch('/api/scope/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            input: input,
            inputType: 'text',
            domainContext: {}
          })
        });
        
        const data = await response.json();
        
        if (data.success && data.scope) {
          this.modules = data.scope.modules.map((m, idx) => ({
            id: m.id || `module_${idx}`,
            name: m.name,
            description: m.description || '',
            category: m.category || 'General',
            priority: m.priority || 'medium',
            complexity: m.complexity || 'medium',
            verified: false
          }));
          
          this.completenessScore = data.scope.completeness?.score || 0;
          this.clarityScore = data.scope.completeness?.score || 0;
        }
      }
      
    } catch (error) {
      console.error('Failed to load modules:', error);
      this.showError('Failed to load extracted modules');
    }
  }
  
  renderModules() {
    const tbody = document.getElementById('modules-tbody');
    tbody.innerHTML = '';
    
    this.modules.forEach((module, index) => {
      const estimate = this.calculateModuleEstimate(module);
      const row = document.createElement('tr');
      row.className = module.verified ? 'verified' : '';
      row.innerHTML = `
        <td>
          <input type="checkbox" 
                 ${module.verified ? 'checked' : ''} 
                 onchange="verificationManager.toggleVerified(${index})">
        </td>
        <td>${index + 1}</td>
        <td>
          <div class="module-name-cell">
            <span class="module-name">${module.name}</span>
            ${module.verified ? '<span class="verified-badge">✓</span>' : ''}
          </div>
        </td>
        <td class="description-cell">${module.description || '<em>No description</em>'}</td>
        <td><span class="category-badge ${module.category.toLowerCase()}">${module.category}</span></td>
        <td><span class="priority-badge ${module.priority}">${module.priority}</span></td>
        <td><span class="complexity-badge ${module.complexity}">${module.complexity}</span></td>
        <td class="effort-cell">
          <span class="effort-value">${estimate.days} days</span>
        </td>
        <td class="cost-cell">
          <span class="cost-value">${estimate.formattedCost}</span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon" onclick="verificationManager.editModule(${index})" 
                    title="Edit">
              ✏️
            </button>
            <button class="btn-icon danger" onclick="verificationManager.deleteModule(${index})" 
                    title="Delete">
              🗑️
            </button>
          </div>
        </td>
      `;
      
      tbody.appendChild(row);
    });
    
    // Update total estimate display
    this.updateTotalEstimate();
  }
  
  updateTotalEstimate() {
    const total = this.calculateTotalEstimate();
    
    // Update stats cards
    const totalCostEl = document.getElementById('total-cost-estimate');
    const totalTimelineEl = document.getElementById('total-timeline-estimate');
    if (totalCostEl) totalCostEl.textContent = total.formattedCost;
    if (totalTimelineEl) totalTimelineEl.textContent = `${total.weeks} weeks`;
    
    // Update or create total estimate display in table
    let totalRow = document.getElementById('total-estimate-row');
    if (!totalRow) {
      totalRow = document.createElement('tr');
      totalRow.id = 'total-estimate-row';
      totalRow.className = 'total-estimate-row';
      document.getElementById('modules-tbody').appendChild(totalRow);
    }
    
    totalRow.innerHTML = `
      <td colspan="5" style="text-align: right; font-weight: 600; padding: 1rem;">
        <strong>Total Estimate:</strong>
      </td>
      <td colspan="2" style="text-align: center; font-weight: 600; padding: 1rem;">
        <span style="color: #2d3436;">${total.days} days (${total.weeks} weeks)</span>
      </td>
      <td colspan="2" style="text-align: center; font-weight: 700; padding: 1rem; font-size: 1.1rem; color: #00b894;">
        ${total.formattedCost}
      </td>
    `;
  }
  
  toggleVerified(index) {
    this.modules[index].verified = !this.modules[index].verified;
    this.renderModules();
    this.updateStats();
    this.updateTotalEstimate();
    this.checkLockEligibility();
  }
  
  toggleSelectAll() {
    const selectAll = document.getElementById('select-all').checked;
    this.modules.forEach(m => m.verified = selectAll);
    this.renderModules();
    this.updateStats();
    this.updateTotalEstimate();
    this.checkLockEligibility();
  }
  
  editModule(index) {
    this.currentEditIndex = index;
    const module = this.modules[index];
    
    // Populate modal
    document.getElementById('edit-module-name').value = module.name;
    document.getElementById('edit-module-description').value = module.description;
    document.getElementById('edit-module-category').value = module.category;
    document.getElementById('edit-module-priority').value = module.priority;
    document.getElementById('edit-module-complexity').value = module.complexity;
    
    // Show modal
    document.getElementById('edit-module-modal').style.display = 'flex';
  }
  
  saveModuleEdit() {
    if (this.currentEditIndex === null) return;
    
    const module = this.modules[this.currentEditIndex];
    module.name = document.getElementById('edit-module-name').value;
    module.description = document.getElementById('edit-module-description').value;
    module.category = document.getElementById('edit-module-category').value;
    module.priority = document.getElementById('edit-module-priority').value;
    module.complexity = document.getElementById('edit-module-complexity').value;
    
    this.renderModules();
    this.updateStats();
    this.updateTotalEstimate();
    this.closeEditModal();
  }
  
  closeEditModal() {
    document.getElementById('edit-module-modal').style.display = 'none';
    this.currentEditIndex = null;
  }
  
  deleteModule(index) {
    if (confirm('Are you sure you want to delete this module?')) {
      this.modules.splice(index, 1);
      this.renderModules();
      this.updateStats();
      this.updateTotalEstimate();
      this.checkLockEligibility();
    }
  }
  
  addModule() {
    this.modules.push({
      id: `module_${Date.now()}`,
      name: 'New Module',
      description: '',
      category: 'General',
      priority: 'medium',
      complexity: 'medium',
      verified: false
    });
    
    this.renderModules();
    this.updateStats();
    this.updateTotalEstimate();
    
    // Auto-open edit modal for new module
    this.editModule(this.modules.length - 1);
  }
  
  updateStats() {
    document.getElementById('total-modules').textContent = this.modules.length;
    document.getElementById('verified-modules').textContent = 
      this.modules.filter(m => m.verified).length;
    document.getElementById('completeness-score').textContent = 
      Math.round(this.completenessScore) + '%';
    document.getElementById('clarity-score').textContent = 
      Math.round(this.clarityScore) + '%';
  }
  
  setupEventListeners() {
    // Checklist items
    const checkboxes = [
      'check-all-verified',
      'check-no-duplicates',
      'check-priorities',
      'check-understand'
    ];
    
    checkboxes.forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.checkLockEligibility();
        });
      }
    });
  }
  
  checkLockEligibility() {
    const allVerified = this.modules.length > 0 && this.modules.every(m => m.verified);
    const allChecked = [
      'check-all-verified',
      'check-no-duplicates',
      'check-priorities',
      'check-understand'
    ].every(id => {
      const checkbox = document.getElementById(id);
      return checkbox && checkbox.checked;
    });
    
    const lockBtn = document.getElementById('lock-scope-btn');
    if (lockBtn) {
      lockBtn.disabled = !(allVerified && allChecked && this.modules.length > 0);
    }
  }
  
  filterModules() {
    const search = document.getElementById('search-modules').value.toLowerCase();
    const rows = document.querySelectorAll('#modules-tbody tr');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(search) ? '' : 'none';
    });
  }
  
  async saveAsDraft() {
    try {
      await fetch('/api/scope/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.projectId,
          modules: this.modules
        })
      });
      
      this.showSuccess('Draft saved successfully');
    } catch (error) {
      this.showError('Failed to save draft');
    }
  }
  
  async lockScope() {
    if (!confirm(
      `You are about to lock ${this.modules.length} modules.\n\n` +
      `Once locked, the scope cannot be modified.\n\n` +
      `All documentation levels will be generated from this scope.\n\n` +
      `Continue?`
    )) {
      return;
    }
    
    // Show loading
    const lockBtn = document.getElementById('lock-scope-btn');
    const originalText = lockBtn.innerHTML;
    lockBtn.innerHTML = '<span class="spinner"></span> Locking Scope...';
    lockBtn.disabled = true;
    
    try {
      // Lock scope
      const lockResponse = await fetch('/api/scope/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.projectId,
          verifiedModules: this.modules,
          metadata: {
            totalModules: this.modules.length,
            verifiedAt: new Date().toISOString()
          }
        })
      });
      
      const lockData = await lockResponse.json();
      
      if (!lockData.success) {
        throw new Error(lockData.error || 'Failed to lock scope');
      }
      
      this.showSuccess('Scope locked successfully!');
      
      // Generate Level 1
      lockBtn.innerHTML = '<span class="spinner"></span> Generating Level 1...';
      
      const level1Response = await fetch('/api/levels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.projectId,
          level: 1,
          lockedScope: lockData.lockedScope,
          previousLevels: [],
          chainResult: {}
        })
      });
      
      const level1Data = await level1Response.json();
      
      if (!level1Data.success) {
        throw new Error(level1Data.error || 'Failed to generate Level 1');
      }
      
      this.showSuccess('Level 1 generated!');
      
      // Redirect to level viewer
      setTimeout(() => {
        window.location.href = `level-viewer.html?projectId=${this.projectId}`;
      }, 1000);
      
    } catch (error) {
      console.error('Failed to lock scope:', error);
      this.showError('Failed to lock scope. Please try again.');
      lockBtn.innerHTML = originalText;
      lockBtn.disabled = false;
    }
  }
  
  showSuccess(message) {
    this.showToast(message, 'success');
  }
  
  showError(message) {
    this.showToast(message, 'error');
  }
  
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize
let verificationManager;

document.addEventListener('DOMContentLoaded', () => {
  verificationManager = new ScopeVerificationManager();
});

// Global functions for inline onclick
function toggleSelectAll() {
  verificationManager.toggleSelectAll();
}

function filterModules() {
  verificationManager.filterModules();
}

function addModule() {
  verificationManager.addModule();
}

function importFromTemplate() {
  alert('Template import coming soon');
}

function closeEditModal() {
  verificationManager.closeEditModal();
}

function saveModuleEdit() {
  verificationManager.saveModuleEdit();
}

function saveAsDraft() {
  verificationManager.saveAsDraft();
}

function lockScope() {
  verificationManager.lockScope();
}

