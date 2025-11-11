// UI Components for rendering results and progress

class UIComponents {
  static renderProgress(currentStep, totalSteps, stepName) {
    const progress = (currentStep / totalSteps) * 100;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressSteps = document.getElementById('progressSteps');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = stepName || `Step ${currentStep} of ${totalSteps}`;
    }

    if (progressSteps) {
      const steps = [
        { name: 'LLM Conversation', key: 'conversation' },
        { name: 'Psychological Profiler', key: 'profiler' },
        { name: 'Parser', key: 'parser' },
        { name: 'Refiner', key: 'refiner' },
        { name: 'Generator', key: 'generator' },
        { name: 'Estimator', key: 'estimator' },
        { name: 'Auditor', key: 'auditor' },
        { name: 'Translator', key: 'translator' }
      ];

      progressSteps.innerHTML = steps.map((step, index) => {
        const stepNum = index + 1;
        let status = '';
        if (stepNum < currentStep) status = 'completed';
        else if (stepNum === currentStep) status = 'active';

        return `
          <div class="progress-step ${status}">
            <div class="progress-step-icon">
              ${stepNum < currentStep ? '✓' : stepNum === currentStep ? '⟳' : '○'}
            </div>
            <div>
              <div class="progress-step-name">${step.name}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  static renderResults(result) {
    const { output, technical } = result;
    const { plan, estimate, auditedScope } = technical;

    const content = document.getElementById('resultsContent');
    if (!content) return;

    let html = '';

    // Overview Card
    html += `
      <div class="result-card">
        <h3>Overview</h3>
        <div class="result-item">
          <span class="result-label">Summary</span>
          <span class="result-value">${plan.overview.summary || 'N/A'}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Scope</span>
          <span class="result-value">${plan.overview.scope || 'N/A'}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Feasibility</span>
          <span class="result-value">${plan.overview.feasibility || 'N/A'}</span>
        </div>
      </div>
    `;

    // Timeline & Cost Card
    html += `
      <div class="result-card">
        <h3>Timeline & Cost</h3>
        <div class="result-item">
          <span class="result-label">Timeline</span>
          <span class="result-value">${estimate.timeline.weeks} weeks (${estimate.timeline.days} days)</span>
        </div>
        <div class="result-item">
          <span class="result-label">Range</span>
          <span class="result-value">${estimate.timeline.range.min}-${estimate.timeline.range.max} days</span>
        </div>
        <div class="result-item">
          <span class="result-label">Total Cost</span>
          <span class="result-value">${formatCurrency(estimate.cost.total)}</span>
        </div>
        ${estimate.savings.total > 0 ? `
        <div class="result-item">
          <span class="result-label">Savings</span>
          <span class="result-value" style="color: var(--success-color);">${formatCurrency(estimate.savings.total)}</span>
        </div>
        ` : ''}
        <div class="result-item">
          <span class="result-label">Confidence</span>
          <span class="result-value">${Math.round(estimate.confidence.overall * 100)}%</span>
        </div>
      </div>
    `;

    // Modules Card
    if (plan.modules && plan.modules.length > 0) {
      html += `
        <div class="result-card">
          <h3>Modules</h3>
          <div class="module-list">
            ${plan.modules.map(m => `<span class="module-tag">${m.displayName}</span>`).join('')}
          </div>
        </div>
      `;
    }

    // Risks Card
    if (plan.risks && plan.risks.length > 0) {
      html += `
        <div class="result-card">
          <h3>Risks & Mitigations</h3>
          ${plan.risks.map(risk => `
            <div class="risk-item">
              <h4>${risk.desc}</h4>
              <div class="risk-mitigation">→ ${risk.mitigation}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Build Steps Card
    if (plan.steps && plan.steps.length > 0) {
      html += `
        <div class="result-card">
          <h3>Build Path</h3>
          ${plan.steps.map(step => `
            <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
              <h4 style="margin-bottom: 0.5rem;">Week ${step.week}: ${step.focus}</h4>
              <ul style="margin-left: 1.5rem; color: var(--text-secondary);">
                ${step.tasks.map(task => `<li>${task}</li>`).join('')}
              </ul>
              <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                <strong>Deliverable:</strong> ${step.deliverable}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    content.innerHTML = html;
  }

  static renderHistory(scopes) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    if (scopes.length === 0) {
      historyList.innerHTML = '<div class="loading">No scopes found</div>';
      return;
    }

    historyList.innerHTML = scopes.map(scope => `
      <div class="history-item" data-scope-id="${scope.id}">
        <div class="history-item-header">
          <div class="history-item-title">${scope.input.substring(0, 50)}${scope.input.length > 50 ? '...' : ''}</div>
          <div class="history-item-date">${formatDate(scope.createdAt)}</div>
        </div>
        <div class="history-item-meta">
          <span>${scope.industry || 'generic'}</span>
          <span>${scope.estimatedDays || '?'} days</span>
          <span>${scope.estimatedCost ? formatCurrency(scope.estimatedCost) : '?'}</span>
        </div>
      </div>
    `).join('');

    // Add click handlers
    historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const scopeId = item.dataset.scopeId;
        loadScopeFromHistory(scopeId);
      });
    });
  }
}

// Helper function for history loading
async function loadScopeFromHistory(scopeId) {
  try {
    const result = await apiClient.getScope(scopeId);
    if (result.success && result.scope) {
      // Convert scope format to result format
      const formattedResult = {
        success: true,
        sessionId: scopeId,
        output: {
          summary: result.scope.outputFull?.summary || result.scope.input,
          formatted: {
            cli: '',
            markdown: '',
            json: JSON.stringify(result.scope, null, 2)
          }
        },
        technical: {
          plan: result.scope.plan || {},
          estimate: {
            timeline: {
              weeks: Math.ceil((result.scope.estimatedDays || 0) / 5),
              days: result.scope.estimatedDays || 0,
              range: { min: 0, max: 0 }
            },
            cost: {
              total: result.scope.estimatedCost || 0
            },
            confidence: {
              overall: result.scope.confidence || 0.7
            }
          },
          auditedScope: {
            modules: result.scope.modules || [],
            edges: result.scope.risks || []
          }
        }
      };

      showResults(formattedResult);
      closeSidebar('historySidebar');
    }
  } catch (error) {
    showNotification('Failed to load scope: ' + error.message, 'error');
  }
}

