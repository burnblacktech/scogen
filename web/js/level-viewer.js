class LevelViewerManager {
  constructor() {
    this.projectId = new URLSearchParams(window.location.search).get('projectId');
    this.currentLevel = parseInt(new URLSearchParams(window.location.search).get('level')) || 1;
    this.levels = [];
    this.lockedScope = null;
    this.scopeChecksum = null;
    this.scopeLockedAt = null;
    this.staleLevels = [];
    this.scopeChangedAt = null;
    
    this.init();
  }
  
  async init() {
    // Load locked scope
    await this.loadLockedScope();
    
    // Load available levels
    await this.loadLevels();
    
    // Render level navigator
    this.renderLevelNavigator();
    
    // Load and display current level
    await this.displayLevel(this.currentLevel);
    
    // Initialize module search
    this.initModuleSearch();
  }
  
  async loadLockedScope() {
    try {
      const response = await fetch(`/api/projects/${this.projectId}`);
      if (response.ok) {
        const project = await response.json();
        
        if (project.locked_scope) {
          this.lockedScope = typeof project.locked_scope === 'string' 
            ? JSON.parse(project.locked_scope) 
            : project.locked_scope;
        }
        this.scopeChecksum = project.scope_checksum;
        this.scopeLockedAt = project.scope_locked_at;
        this.staleLevels = project.stale_levels ? JSON.parse(project.stale_levels) : [];
        this.scopeChangedAt = project.scope_locked_at; // Use locked_at as proxy for change date
        
        // Show sticky warning if levels are stale
        if (this.staleLevels && this.staleLevels.length > 0) {
          this.showStaleWarning();
        }
      }
    } catch (error) {
      console.error('Failed to load scope:', error);
    }
  }
  
  async loadLevels() {
    try {
      const response = await fetch(`/api/levels/${this.projectId}`);
      if (response.ok) {
        const data = await response.json();
        this.levels = data.levels || [];
      }
    } catch (error) {
      console.error('Failed to load levels:', error);
    }
  }
  
  renderLevelNavigator() {
    const levelList = document.getElementById('level-list');
    
    const levelDefinitions = [
      { level: 1, name: 'Executive Summary', pages: '3-5', icon: '📄' },
      { level: 2, name: 'Business Scope', pages: '15-20', icon: '📊' },
      { level: 3, name: 'Detailed Planning', pages: '40-50', icon: '📋' },
      { level: 4, name: 'Technical Blueprint', pages: '80-100', icon: '🏗️' },
      { level: 5, name: 'Implementation Guide', pages: '150-200', icon: '💻' }
    ];
    
    levelList.innerHTML = levelDefinitions.map(def => {
      const levelData = this.levels.find(l => l.level === def.level);
      const isGenerated = !!levelData;
      const isCurrent = this.currentLevel === def.level;
      const isLocked = def.level > 1 && !this.levels.find(l => l.level === def.level - 1);
      const isStale = this.staleLevels && this.staleLevels.includes(def.level);
      
      return `
        <div class="level-item ${isCurrent ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isStale ? 'stale' : ''}" 
             onclick="levelViewer.selectLevel(${def.level})">
          <div class="level-header">
            <span class="level-icon">${def.icon}</span>
            <div class="level-info">
              <span class="level-title">Level ${def.level}</span>
              <span class="level-name">${def.name}</span>
            </div>
            ${isStale ? '<span class="status-badge stale" title="Scope changed. Please regenerate.">⚠️</span>' :
              isGenerated ? '<span class="status-badge generated">✓</span>' : 
              isLocked ? '<span class="status-badge locked">🔒</span>' : 
              '<span class="status-badge pending">…</span>'}
          </div>
          <div class="level-meta">
            <span class="level-pages">${def.pages} pages</span>
            ${isGenerated ? `<span class="level-time">${this.formatTime(levelData.generatedAt)}</span>` : ''}
          </div>
          ${isStale ? `
            <div class="stale-warning">Scope changed. Please regenerate.</div>
            <button class="btn-regenerate-level" onclick="levelViewer.generateLevel(${def.level}); event.stopPropagation();">
              Regenerate
            </button>
          ` : !isGenerated && !isLocked ? `
            <button class="btn-generate-level" onclick="levelViewer.generateLevel(${def.level}); event.stopPropagation();">
              Generate
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  }
  
  async selectLevel(level) {
    const levelData = this.levels.find(l => l.level === level);
    if (!levelData) {
      this.showError(`Level ${level} not generated yet`);
      return;
    }
    
    this.currentLevel = level;
    await this.displayLevel(level);
    this.renderLevelNavigator(); // Update active state
  }
  
  async displayLevel(level) {
    try {
      const response = await fetch(`/api/levels/${this.projectId}/${level}`);
      if (!response.ok) {
        throw new Error('Level not found');
      }
      
      const levelData = await response.json();
      
      if (!levelData.success) {
        throw new Error(levelData.error || 'Failed to load level');
      }
      
      // Update header
      const levelNames = {
        1: 'Executive Summary',
        2: 'Business Scope',
        3: 'Detailed Planning',
        4: 'Technical Blueprint',
        5: 'Implementation Guide'
      };
      
      document.getElementById('document-title').textContent = 
        `Level ${level}: ${levelNames[level]}`;
      
      document.getElementById('page-count').textContent = 
        levelData.metadata?.pages || 'N/A';
      
      // Render markdown content
      const contentDiv = document.getElementById('document-content');
      if (typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(levelData.content);
      } else {
        contentDiv.innerHTML = `<pre>${levelData.content}</pre>`;
      }
      
      // Add module badges to sections
      this.addModuleBadges(contentDiv);
      
      // Generate TOC
      this.generateTOC(contentDiv);
      
      // Add cross-reference click handlers
      this.setupCrossReferences(levelData.crossReferences);
      
      // Update cross-reference sidebar
      this.updateCrossRefSidebar(levelData.crossReferences, level);
      
      // Update metadata
      document.getElementById('generated-at').textContent = 
        levelData.generatedAt ? new Date(levelData.generatedAt).toLocaleString() : '-';
      document.getElementById('module-count').textContent = 
        this.lockedScope?.modules?.length || '-';
      document.getElementById('checksum').textContent = 
        this.scopeChecksum ? this.scopeChecksum.substring(0, 8) + '...' : '-';
      
      // Update navigation buttons
      document.getElementById('prev-level-btn').disabled = level === 1;
      const nextLevelExists = this.levels.find(l => l.level === level + 1);
      const nextLevelBtn = document.getElementById('next-level-btn');
      if (nextLevelBtn) {
        nextLevelBtn.innerHTML = 
          nextLevelExists ? 
            `Next Level (${level + 1}) →` : 
            level < 5 ? `Generate Level ${level + 1} →` : '';
        nextLevelBtn.style.display = 
          level === 5 ? 'none' : 'block';
      }
    } catch (error) {
      console.error('Failed to display level:', error);
      this.showError(`Level ${level} not found`);
    }
  }
  
  generateTOC(contentDiv) {
    const headings = contentDiv.querySelectorAll('h2, h3');
    const tocContent = document.getElementById('toc-content');
    
    tocContent.innerHTML = Array.from(headings).map(h => {
      const level = h.tagName === 'H2' ? 'toc-level-2' : 'toc-level-3';
      const id = h.id || this.generateId(h.textContent);
      h.id = id;
      
      return `
        <a href="#${id}" class="toc-link ${level}">
          ${h.textContent}
        </a>
      `;
    }).join('');
  }
  
  setupCrossReferences(crossRefs) {
    if (!crossRefs) return;
    
    // Parse cross-references and make them clickable
    const refs = typeof crossRefs === 'string' ? JSON.parse(crossRefs) : crossRefs;
    
    // Find elements with cross-reference markers
    // Example: "→ See Level 2, Section 3.0"
    const pattern = /→ See Level (\d+), Section ([\d\.]+)/g;
    
    document.querySelectorAll('.document-content p, .document-content li').forEach(el => {
      el.innerHTML = el.innerHTML.replace(pattern, (match, level, section) => {
        return `<a href="#" class="cross-reference" 
                   onclick="levelViewer.navigateToCrossRef(${level}, '${section}'); return false;">
                  → See Level ${level}, Section ${section}
                </a>`;
      });
    });
  }
  
  addModuleBadges(contentDiv) {
    // Find all sections with data-module attribute
    contentDiv.querySelectorAll('[data-module]').forEach(el => {
      const moduleName = el.getAttribute('data-module');
      const badge = document.createElement('span');
      badge.className = 'module-badge';
      badge.textContent = moduleName;
      badge.title = `Module: ${moduleName}`;
      el.appendChild(badge);
    });
  }
  
  updateCrossRefSidebar(crossRefs, currentLevel) {
    const sidebar = document.getElementById('crossref-sidebar');
    if (!sidebar) return;
    
    if (!crossRefs) {
      sidebar.innerHTML = '<p class="no-refs">No cross-references</p>';
      return;
    }
    
    const refs = typeof crossRefs === 'string' ? JSON.parse(crossRefs) : crossRefs;
    let html = '<h3>Cross-References</h3>';
    
    // Upward references (to previous levels)
    if (refs.upward && refs.upward.length > 0) {
      html += '<div class="crossref-group"><h4>↑ Previous Levels</h4><ul>';
      refs.upward.forEach(ref => {
        html += `<li><a href="#" onclick="levelViewer.navigateToLevel(${ref.to.replace('Level ', '')}); return false;">${ref.text}</a></li>`;
      });
      html += '</ul></div>';
    }
    
    // Downward references (to deeper levels)
    if (refs.downward && refs.downward.length > 0) {
      html += '<div class="crossref-group"><h4>↓ Deeper Levels</h4><ul>';
      refs.downward.forEach(ref => {
        html += `<li><a href="#" onclick="levelViewer.navigateToLevel(${ref.to.replace('Level ', '')}); return false;">${ref.text}</a></li>`;
      });
      html += '</ul></div>';
    }
    
    // Lateral references (within same level)
    if (refs.lateral && refs.lateral.length > 0) {
      html += '<div class="crossref-group"><h4>↔ Related Sections</h4><ul>';
      refs.lateral.forEach(ref => {
        html += `<li><a href="#" onclick="levelViewer.navigateToSection('${ref.to}'); return false;">${ref.text}</a></li>`;
      });
      html += '</ul></div>';
    }
    
    sidebar.innerHTML = html;
  }
  
  navigateToLevel(level) {
    this.selectLevel(level);
  }
  
  navigateToSection(sectionId) {
    const heading = document.querySelector(`#section-${sectionId.replace(/\./g, '-')}`);
    if (heading) {
      heading.scrollIntoView({ behavior: 'smooth' });
      heading.classList.add('highlight');
      setTimeout(() => heading.classList.remove('highlight'), 2000);
    }
  }
  
  async navigateToCrossRef(level, section) {
    // Load the target level
    await this.selectLevel(level);
    
    // Scroll to section after a brief delay
    setTimeout(() => {
      const heading = document.querySelector(`#section-${section.replace(/\./g, '-')}`);
      if (heading) {
        heading.scrollIntoView({ behavior: 'smooth' });
        heading.classList.add('highlight');
        setTimeout(() => heading.classList.remove('highlight'), 2000);
      }
    }, 500);
  }
  
  // Module search functionality
  initModuleSearch() {
    const searchInput = document.getElementById('module-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query.length < 2) {
        this.clearSearchHighlights();
        return;
      }
      
      this.highlightModules(query);
    });
  }
  
  highlightModules(query) {
    const contentDiv = document.getElementById('document-content');
    if (!contentDiv) return;
    
    // Clear previous highlights
    this.clearSearchHighlights();
    
    // Find all module badges and sections
    contentDiv.querySelectorAll('[data-module]').forEach(el => {
      const moduleName = el.getAttribute('data-module').toLowerCase();
      if (moduleName.includes(query)) {
        el.classList.add('search-highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
  
  clearSearchHighlights() {
    document.querySelectorAll('.search-highlight').forEach(el => {
      el.classList.remove('search-highlight');
    });
  }
  
  showStaleWarning() {
    // Remove existing warning
    const existing = document.getElementById('stale-warning-banner');
    if (existing) existing.remove();
    
    const warning = document.createElement('div');
    warning.id = 'stale-warning-banner';
    warning.style.cssText = `
      position: sticky;
      top: 0;
      background: #ffeaa7;
      color: #d63031;
      padding: 1rem;
      text-align: center;
      font-weight: 600;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    warning.innerHTML = `
      ⚠️ Scope changed on ${this.scopeChangedAt ? new Date(this.scopeChangedAt).toLocaleDateString() : 'recently'}. 
      Levels ${this.staleLevels.join(', ')} are stale. Please regenerate.
      <button onclick="levelViewer.generateAllLevels()" style="margin-left: 1rem; padding: 0.5rem 1rem; background: #d63031; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Regenerate All
      </button>
    `;
    document.body.insertBefore(warning, document.body.firstChild);
  }
  
  async generateAllLevels() {
    if (!confirm(`Generate all levels (1-5)? This may take 5-10 minutes.`)) {
      return;
    }
    
    this.showLoading('Generating all levels...');
    
    try {
      // Ensure locked scope is loaded
      if (!this.lockedScope) {
        await this.loadLockedScope();
      }
      
      const progressDiv = document.createElement('div');
      progressDiv.id = 'generation-progress';
      progressDiv.style.cssText = 'margin: 1rem 0; padding: 1rem; background: #f0f0f0; border-radius: 4px;';
      document.getElementById('loading-overlay')?.appendChild(progressDiv) || document.body.appendChild(progressDiv);
      
      const previousLevels = [];
      
      for (let level = 1; level <= 5; level++) {
        progressDiv.innerHTML = `Generating Level ${level}/5...`;
        
        const response = await fetch('/api/levels/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: this.projectId,
            level: level,
            lockedScope: this.lockedScope,
            previousLevels: previousLevels,
            chainResult: {}
          })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || `Failed to generate Level ${level}`);
        }
        
        previousLevels.push(data.level);
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      progressDiv.innerHTML = 'All levels generated! Reloading...';
      
      // Reload levels and display L1
      await this.loadLevels();
      await this.displayLevel(1);
      this.renderLevelNavigator();
      
      this.hideLoading();
      progressDiv.remove();
      this.showSuccess('All levels generated successfully!');
      
    } catch (error) {
      console.error('Failed to generate all levels:', error);
      this.hideLoading();
      this.showError(`Failed to generate all levels: ${error.message}`);
    }
  }
  
  async generateLevel(level) {
    const prevLevel = this.levels.find(l => l.level === level - 1);
    if (level > 1 && !prevLevel) {
      this.showError(`Please generate Level ${level - 1} first`);
      return;
    }
    
    if (!confirm(`Generate Level ${level}? This may take 1-3 minutes depending on the level.`)) {
      return;
    }
    
    this.showLoading(`Generating Level ${level}...`);
    
    try {
      // Get locked scope if not already loaded
      if (!this.lockedScope) {
        await this.loadLockedScope();
      }
      
      const response = await fetch('/api/levels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.projectId,
          level: level,
          lockedScope: this.lockedScope,
          previousLevels: this.levels.filter(l => l.level < level).map(l => l.level),
          chainResult: {}
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate level');
      }
      
      // Reload levels
      await this.loadLevels();
      
      // Display the new level
      await this.displayLevel(level);
      
      // Update navigator
      this.renderLevelNavigator();
      
      this.hideLoading();
      this.showSuccess(`Level ${level} generated successfully!`);
      
    } catch (error) {
      console.error('Failed to generate level:', error);
      this.hideLoading();
      this.showError(`Failed to generate Level ${level}: ${error.message}`);
    }
  }
  
  async navigateNextLevel() {
    const nextLevel = this.currentLevel + 1;
    if (nextLevel > 5) return;
    
    const nextLevelData = this.levels.find(l => l.level === nextLevel);
    
    if (nextLevelData) {
      await this.selectLevel(nextLevel);
    } else {
      await this.generateLevel(nextLevel);
    }
  }
  
  navigatePrevLevel() {
    if (this.currentLevel > 1) {
      this.selectLevel(this.currentLevel - 1);
    }
  }
  
  viewScopeDetails() {
    const modal = document.getElementById('scope-details-modal');
    
    // Populate scope details
    document.getElementById('scope-total-modules').textContent = 
      this.lockedScope?.modules?.length || 0;
    document.getElementById('scope-locked-at').textContent = 
      this.scopeLockedAt ? new Date(this.scopeLockedAt).toLocaleString() : '-';
    document.getElementById('scope-checksum').textContent = 
      this.scopeChecksum || '-';
    
    // Populate modules table
    const tbody = document.getElementById('scope-modules-tbody');
    if (this.lockedScope?.modules) {
      tbody.innerHTML = this.lockedScope.modules.map((m, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${m.name}</td>
          <td><span class="category-badge ${(m.category || 'general').toLowerCase()}">${m.category || 'General'}</span></td>
          <td><span class="priority-badge ${m.priority || 'medium'}">${m.priority || 'medium'}</span></td>
          <td><span class="complexity-badge ${m.complexity || 'medium'}">${m.complexity || 'medium'}</span></td>
        </tr>
      `).join('');
    }
    
    modal.style.display = 'flex';
  }
  
  closeScopeModal() {
    document.getElementById('scope-details-modal').style.display = 'none';
  }
  
  async downloadCurrent() {
    try {
      const response = await fetch(`/api/levels/${this.projectId}/${this.currentLevel}`);
      const levelData = await response.json();
      
      if (!levelData.success) return;
      
      const blob = new Blob([levelData.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Level-${this.currentLevel}-${this.projectId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.showError('Failed to download level');
    }
  }
  
  async downloadAllLevels() {
    try {
      // Create combined markdown file
      const combined = await Promise.all(
        this.levels
          .sort((a, b) => a.level - b.level)
          .map(async (l) => {
            const response = await fetch(`/api/levels/${this.projectId}/${l.level}`);
            const data = await response.json();
            return data.success ? data.content : '';
          })
      );
      
      const fullContent = combined.filter(c => c).join('\n\n---\n\n');
      
      const blob = new Blob([fullContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Complete-Documentation-${this.projectId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.showError('Failed to download all levels');
    }
  }
  
  printCurrent() {
    window.print();
  }
  
  shareCurrent() {
    const url = `${window.location.origin}/level-viewer.html?projectId=${this.projectId}&level=${this.currentLevel}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showSuccess('Share link copied to clipboard');
    }).catch(() => {
      this.showError('Failed to copy link');
    });
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
  
  toggleTOC() {
    const panel = document.getElementById('toc-panel');
    panel.classList.toggle('collapsed');
  }
  
  generateId(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }
  
  showLoading(message) {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  
  hideLoading() {
    document.getElementById('loading-overlay')?.remove();
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
let levelViewer;

document.addEventListener('DOMContentLoaded', () => {
  levelViewer = new LevelViewerManager();
});

// Global functions
function toggleTOC() {
  levelViewer.toggleTOC();
}

function viewScopeDetails() {
  levelViewer.viewScopeDetails();
}

function closeScopeModal() {
  levelViewer.closeScopeModal();
}

function downloadCurrent() {
  levelViewer.downloadCurrent();
}

function downloadAllLevels() {
  levelViewer.downloadAllLevels();
}

function printCurrent() {
  levelViewer.printCurrent();
}

function shareCurrent() {
  levelViewer.shareCurrent();
}

function toggleFullscreen() {
  levelViewer.toggleFullscreen();
}

function navigateNextLevel() {
  levelViewer.navigateNextLevel();
}

function navigatePrevLevel() {
  levelViewer.navigatePrevLevel();
}

