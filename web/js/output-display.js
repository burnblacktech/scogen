/**
 * output-display.js
 * Complete rewrite of output display with new design system and cognitive optimization
 */

class OutputDisplay {
  constructor() {
    this.technicalBaseline = null;
    this.commercialProposal = null;
    this.scenarios = null;
    this.currentView = 'commercial';
    this.selectedStrategy = null;
    this.adjustments = {
      margin: 15,
      risk: 20,
      teamFactor: 1.0,
      budgetOverride: null
    };
  }

  displayDualEstimate(result) {
    const { technical, commercial } = result.dualEstimate || {};
    const scenarios = result.scenarios?.scenarios || [];
    
    if (!technical || !commercial) {
      console.warn('Missing technical or commercial data in dualEstimate');
      return;
    }
    
    this.technicalBaseline = technical;
    this.commercialProposal = commercial;
    this.scenarios = scenarios;
    
    // Store for later use
    window.currentEstimation = this;
    
    const html = `
      <!-- Complete Estimation Display -->
      <div id="estimation-container" class="estimation-wrapper">
        
        ${this.renderProgressHeader()}
        
        <!-- Main Content Area -->
        <div class="estimation-content">
          
          <!-- Left Panel: Primary Proposal -->
          <div class="primary-panel">
            ${this.renderCommercialProposal(commercial, technical, scenarios)}
            ${this.renderTechnicalTruthPanel(technical)}
          </div>
          
          <!-- Right Panel: Adjustment Controls -->
          ${this.renderAdjustmentPanel(technical, commercial)}
        </div>
        
        ${this.renderActionBar(commercial)}
        
        <!-- Hidden Modals -->
        ${this.renderBudgetOptimizationModal()}
        ${this.renderConfirmationModal()}
      </div>
    `;
    
    // Insert into page
    const container = document.getElementById('resultsSection');
    if (!container) {
      console.error('resultsSection not found');
      return;
    }
    
    // Clear existing estimation container if any
    const existing = document.getElementById('estimation-container');
    if (existing) {
      existing.remove();
    }
    
    container.insertAdjacentHTML('afterbegin', html);
    
    // Initialize interactions
    this.initializeInteractions();
    
    // Start progressive disclosure
    this.startProgressiveDisclosure();
    
    return html;
  }

  renderProgressHeader() {
    const steps = [
      { id: 'analysis', label: 'Analysis', status: 'completed', icon: '✓' },
      { id: 'estimation', label: 'Estimation', status: 'completed', icon: '✓' },
      { id: 'proposal', label: 'Proposal', status: 'active', icon: '3' },
      { id: 'delivery', label: 'Delivery', status: 'pending', icon: '4' }
    ];
    
    return `
      <div class="progress-header">
        <div class="progress-steps">
          ${steps.map(step => `
            <div class="step ${step.status}" data-step="${step.id}">
              <span class="step-icon">${step.icon}</span>
              <span class="step-label">${step.label}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="progress-context" style="text-align: center; margin-top: var(--space-4); color: #6b7280; font-size: var(--text-sm);">
          <span class="context-text">Preparing your customized proposal</span>
        </div>
      </div>
    `;
  }

  renderCommercialProposal(commercial, technical, scenarios) {
    const pricingContext = this.determinePricingContext(commercial.cost, technical.cost);
    const budgetFit = this.assessBudgetFit(commercial, technical);
    
    return `
      <div class="proposal-card commercial-view" id="commercial-view">
        <!-- Header with Trust Indicators -->
        <div class="card-header">
          <div class="header-left" style="display: flex; align-items: center; gap: var(--space-4);">
            <div class="header-badge">Commercial Proposal</div>
            <div class="confidence-score" style="display: flex; flex-direction: column; align-items: center;">
              <span class="confidence-value" style="font-size: var(--text-lg); font-weight: 700; color: var(--primary-700);">${commercial.confidence || 92}%</span>
              <span class="confidence-label" style="font-size: var(--text-xs); color: #6b7280;">confidence</span>
            </div>
          </div>
          <div class="trust-indicator">
            <span class="trust-icon">🛡️</span>
            <span class="trust-text">Based on ${technical.historicalProjects || 247} similar projects</span>
          </div>
        </div>
        
        <!-- Price Display with Context -->
        <div class="price-display-container">
          <div class="price-label">Proposed Investment</div>
          <div class="price-amount" data-amount="${commercial.cost}">
            <span class="currency">₹</span>
            <span class="amount-value">${this.formatCurrency(commercial.cost)}</span>
          </div>
          
          <div class="price-context">
            <span class="context-badge ${pricingContext.class}">${pricingContext.label}</span>
            <button class="reveal-truth-btn" onclick="currentEstimation.revealTruth()">
              <span class="icon">👁️</span>
              <span class="text">View Technical Analysis</span>
            </button>
          </div>
          
          ${budgetFit.show ? `
            <div class="budget-fit-indicator ${budgetFit.class}">
              <div class="fit-message">
                <span class="icon">${budgetFit.icon}</span>
                <span>${budgetFit.message}</span>
              </div>
              ${budgetFit.showOptimize ? `
                <button class="optimize-btn" onclick="currentEstimation.showBudgetOptimization()">
                  <span class="magic-icon">✨</span>
                  <span>Optimize Proposal</span>
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <!-- Key Metrics Display -->
        <div class="timeline-display">
          <div class="timeline-item">
            <span class="timeline-icon">📅</span>
            <span class="timeline-label">Timeline</span>
            <span class="timeline-value">${commercial.timeline} days</span>
          </div>
          <div class="timeline-item">
            <span class="timeline-icon">👥</span>
            <span class="timeline-label">Team Size</span>
            <span class="timeline-value">${commercial.teamSize || technical.teamSize || 6} developers</span>
          </div>
          <div class="timeline-item">
            <span class="timeline-icon">📊</span>
            <span class="timeline-label">Modules</span>
            <span class="timeline-value">${technical.modules || commercial.modules?.length || 72} features</span>
          </div>
        </div>
        
        <!-- Integrated Delivery Strategies -->
        ${this.renderDeliveryStrategies(scenarios, commercial)}
        
        <!-- Payment Structure -->
        <div class="payment-structure" style="margin-top: var(--space-8); padding-top: var(--space-8); border-top: 1px solid #e5e7eb;">
          <h3 class="section-title">Payment Structure</h3>
          <div class="payment-options" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3);">
            ${this.renderPaymentOptions(commercial)}
          </div>
        </div>
        
        <!-- Trust Builders -->
        <div class="trust-builders" style="margin-top: var(--space-6); padding: var(--space-4); background: #f9fafb; border-radius: 12px; display: flex; justify-content: space-around; flex-wrap: wrap; gap: var(--space-4);">
          <div class="trust-item" style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm);">
            <span class="trust-check" style="color: var(--success-green); font-weight: bold;">✓</span>
            <span>Fixed price guarantee</span>
          </div>
          <div class="trust-item" style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm);">
            <span class="trust-check" style="color: var(--success-green); font-weight: bold;">✓</span>
            <span>No hidden costs</span>
          </div>
          <div class="trust-item" style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm);">
            <span class="trust-check" style="color: var(--success-green); font-weight: bold;">✓</span>
            <span>30-day post-launch support</span>
          </div>
        </div>
      </div>
    `;
  }

  renderDeliveryStrategies(scenarios, commercial) {
    if (!scenarios || scenarios.length === 0) {
      // Generate default strategies if none exist
      scenarios = this.generateDefaultStrategies(commercial);
    }
    
    return `
      <div class="delivery-strategies">
        <div class="section-header" style="margin-bottom: var(--space-4);">
          <h3 class="section-title">Delivery Strategies</h3>
          <span class="section-subtitle" style="color: #6b7280; font-size: var(--text-sm);">Choose how you want to build this</span>
        </div>
        
        <div class="strategy-cards">
          ${scenarios.slice(0, 3).map((scenario, index) => {
            const isRecommended = scenario.recommended || index === 0;
            const fitScore = this.calculateScenarioFit(scenario, commercial);
            const scenarioCost = typeof scenario.cost === 'object' ? scenario.cost.total || scenario.cost.withContingency : scenario.cost;
            const scenarioTimeline = typeof scenario.timeline === 'object' ? scenario.timeline.days : scenario.timeline;
            
            return `
              <div class="strategy-card ${isRecommended ? 'recommended' : ''}" 
                   data-scenario-id="${scenario.id || index}">
                ${isRecommended ? '<div class="recommendation-badge">Recommended</div>' : ''}
                
                <div class="strategy-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-3);">
                  <h4>${scenario.name || scenario.type || 'Full Delivery'}</h4>
                  <div class="fit-score" style="text-align: right;">
                    <span class="score-value" style="font-size: var(--text-lg); font-weight: 700; color: var(--primary-700); display: block;">${fitScore}%</span>
                    <span class="score-label" style="font-size: var(--text-xs); color: #6b7280;">fit</span>
                  </div>
                </div>
                
                <div class="strategy-details">
                  ${scenario.description ? `<p class="strategy-description" style="color: #6b7280; font-size: var(--text-sm); margin-bottom: var(--space-3);">${escapeHtml(scenario.description)}</p>` : ''}
                  
                  <div class="detail-items" style="display: grid; gap: var(--space-2); margin-bottom: var(--space-4);">
                    <div class="detail-item">
                      <span class="icon">💰</span>
                      <span class="label" style="color: #6b7280;">Cost</span>
                      <span class="value" style="font-weight: 600;">₹${this.formatCurrency(scenarioCost || commercial.cost)}</span>
                    </div>
                    <div class="detail-item">
                      <span class="icon">⏱️</span>
                      <span class="label" style="color: #6b7280;">Timeline</span>
                      <span class="value" style="font-weight: 600;">${scenarioTimeline || commercial.timeline} days</span>
                    </div>
                    <div class="detail-item">
                      <span class="icon">📦</span>
                      <span class="label" style="color: #6b7280;">Delivery</span>
                      <span class="value" style="font-weight: 600;">${scenario.phases ? `${scenario.phases.length} phases` : 'Single Phase'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="icon">⚠️</span>
                      <span class="label" style="color: #6b7280;">Risk</span>
                      <span class="value risk-${scenario.riskLevel || 'medium'}" style="font-weight: 600;">${(scenario.riskLevel || 'Medium').charAt(0).toUpperCase() + (scenario.riskLevel || 'Medium').slice(1)}</span>
                    </div>
                  </div>
                  
                  ${scenario.keyBenefits ? `
                    <div class="strategy-benefits" style="margin-bottom: var(--space-4);">
                      ${scenario.keyBenefits.map(benefit => `
                        <div class="benefit-item" style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1); font-size: var(--text-sm);">
                          <span class="benefit-icon" style="color: var(--success-green);">✓</span>
                          <span>${escapeHtml(benefit)}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
                
                <button class="select-strategy-btn ${isRecommended ? 'primary' : ''}"
                        onclick="currentEstimation.selectStrategy('${scenario.id || index}')">
                  ${isRecommended ? 'Select Recommended' : 'Select This'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- Budget Optimization Section (if needed) -->
        ${commercial.budgetConstrained ? this.renderBudgetOptimizationSection(commercial) : ''}
      </div>
    `;
  }

  generateDefaultStrategies(commercial) {
    return [
      {
        id: 'full',
        name: 'Full Delivery',
        description: 'Complete project delivery in single phase',
        cost: commercial.cost,
        timeline: commercial.timeline,
        phases: null,
        riskLevel: 'medium',
        recommended: true,
        keyBenefits: ['All features included', 'Single phase', 'Fastest delivery']
      },
      {
        id: 'phased',
        name: 'Phased Delivery',
        description: 'Deliver in multiple phases for lower risk',
        cost: commercial.cost * 1.1,
        timeline: commercial.timeline * 1.3,
        phases: 3,
        riskLevel: 'low',
        keyBenefits: ['Lower risk', 'Incremental value', 'Flexible timeline']
      },
      {
        id: 'mvp',
        name: 'MVP First',
        description: 'Start with core features, expand later',
        cost: commercial.cost * 0.6,
        timeline: commercial.timeline * 0.5,
        phases: 2,
        riskLevel: 'medium',
        keyBenefits: ['Lower initial cost', 'Fast launch', 'Market validation']
      }
    ];
  }

  renderBudgetOptimizationSection(commercial) {
    return `
      <div class="budget-optimization-section" style="margin-top: var(--space-6); padding: var(--space-4); background: #fef3c7; border-radius: 12px;">
        <div class="optimization-header" style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-4);">
          <span class="optimization-icon" style="font-size: var(--text-xl);">💡</span>
          <h4 style="margin: 0; font-size: var(--text-base); font-weight: 600;">Budget Optimization Options</h4>
        </div>
        
        <div class="optimization-strategies" style="display: grid; gap: var(--space-3);">
          <div class="optimization-card" style="padding: var(--space-3); background: white; border-radius: 8px;">
            <h5 style="margin: 0 0 var(--space-2) 0; font-size: var(--text-sm); font-weight: 600;">Extended Timeline</h5>
            <p style="margin: 0 0 var(--space-3) 0; font-size: var(--text-xs); color: #6b7280;">Reduce cost by 20% with smaller team over longer period</p>
            <button class="apply-optimization" onclick="currentEstimation.applyOptimization('timeline')" style="width: 100%; padding: var(--space-2); background: var(--primary-500); color: white; border: none; border-radius: 6px; font-size: var(--text-sm); font-weight: 600; cursor: pointer;">
              Apply This
            </button>
          </div>
          
          <div class="optimization-card" style="padding: var(--space-3); background: white; border-radius: 8px;">
            <h5 style="margin: 0 0 var(--space-2) 0; font-size: var(--text-sm); font-weight: 600;">Resource Optimization</h5>
            <p style="margin: 0 0 var(--space-3) 0; font-size: var(--text-xs); color: #6b7280;">Mix senior and junior developers to reduce cost by 15%</p>
            <button class="apply-optimization" onclick="currentEstimation.applyOptimization('resources')" style="width: 100%; padding: var(--space-2); background: var(--primary-500); color: white; border: none; border-radius: 6px; font-size: var(--text-sm); font-weight: 600; cursor: pointer;">
              Apply This
            </button>
          </div>
          
          <div class="optimization-card" style="padding: var(--space-3); background: white; border-radius: 8px;">
            <h5 style="margin: 0 0 var(--space-2) 0; font-size: var(--text-sm); font-weight: 600;">Phased Delivery</h5>
            <p style="margin: 0 0 var(--space-3) 0; font-size: var(--text-xs); color: #6b7280;">Start with core features, add rest in phase 2</p>
            <button class="apply-optimization" onclick="currentEstimation.applyOptimization('phased')" style="width: 100%; padding: var(--space-2); background: var(--primary-500); color: white; border: none; border-radius: 6px; font-size: var(--text-sm); font-weight: 600; cursor: pointer;">
              Apply This
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderPaymentOptions(commercial) {
    const options = [
      { value: 'milestone', label: 'Milestone Based', description: 'Pay as you progress' },
      { value: 'monthly', label: 'Monthly', description: 'Fixed monthly payments' },
      { value: '5050', label: '50-50 Split', description: '50% upfront, 50% on delivery' }
    ];
    
    return options.map(option => `
      <div class="payment-option" style="padding: var(--space-3); border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
        <div style="font-weight: 600; margin-bottom: var(--space-1);">${option.label}</div>
        <div style="font-size: var(--text-xs); color: #6b7280;">${option.description}</div>
      </div>
    `).join('');
  }

  renderTechnicalTruthPanel(technical) {
    return `
      <div class="truth-panel" id="truth-panel" style="display: none;">
        <div class="truth-header">
          <h3>
            <span class="truth-icon">🔧</span>
            Technical Analysis
          </h3>
          <button class="close-truth-btn" onclick="currentEstimation.hideTruth()">×</button>
        </div>
        
        <div class="truth-content">
          <!-- Core Metrics -->
          <div class="truth-metrics" style="margin-bottom: var(--space-6);">
            <div class="truth-metric primary" style="padding: var(--space-4); background: #f9fafb; border-radius: 12px; margin-bottom: var(--space-3);">
              <span class="metric-label" style="display: block; font-size: var(--text-sm); color: #6b7280; margin-bottom: var(--space-1);">Actual Development Cost</span>
              <span class="metric-value" style="display: block; font-size: var(--text-2xl); font-weight: 700; color: var(--primary-900);">₹${this.formatCurrency(technical.cost)}</span>
              <span class="metric-context" style="display: block; font-size: var(--text-xs); color: #9ca3af; margin-top: var(--space-1);">Based on standard rates</span>
            </div>
            
            <div class="truth-metric" style="display: flex; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid #f3f4f6;">
              <div>
                <span class="metric-label" style="display: block; font-size: var(--text-sm); color: #6b7280;">Required Timeline</span>
                <span class="metric-value" style="display: block; font-size: var(--text-lg); font-weight: 600; color: var(--primary-900);">${technical.timeline} days</span>
              </div>
              <span class="metric-context" style="font-size: var(--text-xs); color: #9ca3af;">With optimal team</span>
            </div>
            
            <div class="truth-metric" style="display: flex; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid #f3f4f6;">
              <div>
                <span class="metric-label" style="display: block; font-size: var(--text-sm); color: #6b7280;">Optimal Team Size</span>
                <span class="metric-value" style="display: block; font-size: var(--text-lg); font-weight: 600; color: var(--primary-900);">${technical.teamSize} developers</span>
              </div>
              <span class="metric-context" style="font-size: var(--text-xs); color: #9ca3af;">For best velocity</span>
            </div>
            
            <div class="truth-metric" style="display: flex; justify-content: space-between; padding: var(--space-3) 0;">
              <div>
                <span class="metric-label" style="display: block; font-size: var(--text-sm); color: #6b7280;">Technical Complexity</span>
                <span class="metric-value complexity-${technical.complexity}" style="display: block; font-size: var(--text-lg); font-weight: 600; color: var(--primary-900);">${technical.complexity || 'medium'}</span>
              </div>
              <span class="metric-context" style="font-size: var(--text-xs); color: #9ca3af;">${technical.modules || 0} modules</span>
            </div>
          </div>
          
          <!-- Variance Visualization -->
          <div class="variance-display">
            <h4 style="margin-bottom: var(--space-3); font-size: var(--text-base); font-weight: 600;">Cost Breakdown Analysis</h4>
            <div class="variance-chart">
              ${this.renderVarianceChart(technical, this.commercialProposal)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderVarianceChart(technical, commercial) {
    if (!commercial) return '';
    
    const ratio = commercial.cost / technical.cost;
    const marginPercent = ((commercial.cost - technical.cost) / technical.cost * 100).toFixed(0);
    
    return `
      <div class="variance-bar" style="position: relative; height: 8px; background: #e5e7eb; border-radius: 4px; margin-bottom: var(--space-3);">
        <div class="actual-cost-marker" style="position: absolute; top: 0; left: 0; width: ${(1 / ratio * 100).toFixed(0)}%; height: 100%; background: var(--truth-purple); border-radius: 4px;"></div>
        <div class="proposed-cost-marker" style="position: absolute; top: 0; left: 100%; width: 4px; height: 100%; background: var(--commercial-blue); border-radius: 2px;"></div>
      </div>
      <div class="variance-label" style="font-size: var(--text-xs); color: #6b7280; text-align: center;">
        Commercial price includes ${marginPercent}% margin + risk buffer
      </div>
    `;
  }

  renderAdjustmentPanel(technical, commercial) {
    return `
      <div class="adjustment-panel collapsed" id="adjustment-panel">
        <button class="panel-toggle" onclick="currentEstimation.toggleAdjustmentPanel()">
          <span class="toggle-icon">⚙️</span>
          <span class="toggle-text">Customize Proposal</span>
        </button>
        
        <div class="panel-content">
          <div class="panel-header" style="margin-bottom: var(--space-4);">
            <h3 style="margin: 0 0 var(--space-1) 0; font-size: var(--text-lg); font-weight: 600; color: var(--primary-900);">Proposal Adjustments</h3>
            <span class="panel-subtitle" style="font-size: var(--text-sm); color: #6b7280;">Fine-tune your proposal</span>
          </div>
          
          <!-- Quick Presets -->
          <div class="adjustment-presets" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); margin-bottom: var(--space-6);">
            <button class="preset-btn" onclick="currentEstimation.applyPreset('competitive')" style="padding: var(--space-2); background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
              <span class="preset-icon">🎯</span>
              <span style="font-size: var(--text-xs);">Competitive</span>
            </button>
            <button class="preset-btn" onclick="currentEstimation.applyPreset('standard')" style="padding: var(--space-2); background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
              <span class="preset-icon">📊</span>
              <span style="font-size: var(--text-xs);">Standard</span>
            </button>
            <button class="preset-btn" onclick="currentEstimation.applyPreset('premium')" style="padding: var(--space-2); background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
              <span class="preset-icon">⭐</span>
              <span style="font-size: var(--text-xs);">Premium</span>
            </button>
          </div>
          
          <!-- Budget Override -->
          <div class="control-group">
            <label class="control-label">
              Client Budget
              <span class="tooltip" data-tip="Override calculated price with specific budget">
                <span class="tooltip-icon">?</span>
              </span>
            </label>
            <div class="input-wrapper" style="position: relative;">
              <span class="currency-prefix">₹</span>
              <input type="number" 
                     id="budget-override" 
                     placeholder="Auto-calculated"
                     onchange="currentEstimation.updateBudgetOverride(this.value)"
                     style="width: 100%; padding: var(--space-3) var(--space-3) var(--space-3) calc(var(--space-3) + 1.5rem); border: 1px solid #e5e7eb; border-radius: 8px;">
              <button class="clear-input" onclick="currentEstimation.clearBudgetOverride()" style="position: absolute; right: var(--space-2); top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: var(--text-lg); color: #9ca3af;">×</button>
            </div>
            <div class="budget-feedback" id="budget-feedback" style="margin-top: var(--space-2); font-size: var(--text-xs);"></div>
          </div>
          
          <!-- Margin Slider -->
          <div class="control-group">
            <label class="control-label">
              Profit Margin
              <span class="value-display" id="margin-value">15%</span>
            </label>
            <div class="slider-wrapper">
              <input type="range" 
                     id="margin-slider" 
                     min="-10" 
                     max="40" 
                     value="15"
                     oninput="currentEstimation.updateMargin(this.value)"
                     style="width: 100%;">
              <div class="slider-labels">
                <span class="label-negative">Strategic</span>
                <span class="label-zero">Break-even</span>
                <span class="label-positive">Premium</span>
              </div>
            </div>
          </div>
          
          <!-- Risk Buffer -->
          <div class="control-group">
            <label class="control-label">
              Risk Buffer
              <span class="value-display" id="risk-value">20%</span>
            </label>
            <div class="slider-wrapper">
              <input type="range" 
                     id="risk-slider" 
                     min="0" 
                     max="40" 
                     value="20"
                     oninput="currentEstimation.updateRisk(this.value)"
                     style="width: 100%;">
              <div class="slider-labels">
                <span>Minimal</span>
                <span>Standard</span>
                <span>Conservative</span>
              </div>
            </div>
          </div>
          
          <!-- Team & Timeline Adjustment -->
          <div class="control-group">
            <label class="control-label">
              Team & Timeline Balance
              <span class="value-display" id="team-value">Balanced</span>
            </label>
            <div class="balance-selector" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2);">
              <button class="balance-option" data-value="0.7" onclick="currentEstimation.setTeamBalance(0.7)" style="padding: var(--space-3); background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; text-align: center;">
                <span class="option-icon" style="display: block; font-size: var(--text-xl); margin-bottom: var(--space-1);">🐌</span>
                <span class="option-label" style="display: block; font-weight: 600; font-size: var(--text-sm);">Smaller Team</span>
                <span class="option-detail" style="display: block; font-size: var(--text-xs); color: #6b7280;">Longer timeline</span>
              </button>
              <button class="balance-option active" data-value="1.0" onclick="currentEstimation.setTeamBalance(1.0)" style="padding: var(--space-3); background: var(--primary-100); border: 2px solid var(--primary-500); border-radius: 8px; cursor: pointer; text-align: center;">
                <span class="option-icon" style="display: block; font-size: var(--text-xl); margin-bottom: var(--space-1);">⚖️</span>
                <span class="option-label" style="display: block; font-weight: 600; font-size: var(--text-sm);">Balanced</span>
                <span class="option-detail" style="display: block; font-size: var(--text-xs); color: #6b7280;">Optimal mix</span>
              </button>
              <button class="balance-option" data-value="1.5" onclick="currentEstimation.setTeamBalance(1.5)" style="padding: var(--space-3); background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; text-align: center;">
                <span class="option-icon" style="display: block; font-size: var(--text-xl); margin-bottom: var(--space-1);">🚀</span>
                <span class="option-label" style="display: block; font-weight: 600; font-size: var(--text-sm);">Larger Team</span>
                <span class="option-detail" style="display: block; font-size: var(--text-xs); color: #6b7280);">Faster delivery</span>
              </button>
            </div>
          </div>
          
          <!-- Live Preview -->
          <div class="adjustment-preview" style="margin-top: var(--space-6); padding: var(--space-4); background: #f9fafb; border-radius: 12px;">
            <h4 style="margin: 0 0 var(--space-3) 0; font-size: var(--text-base); font-weight: 600;">Preview</h4>
            <div class="preview-metrics" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2);">
              <div class="preview-metric">
                <span class="metric-label" style="display: block; font-size: var(--text-xs); color: #6b7280;">New Price</span>
                <span class="metric-value" id="preview-price" style="display: block; font-size: var(--text-base); font-weight: 600; color: var(--primary-900);">₹${this.formatCurrency(commercial.cost)}</span>
              </div>
              <div class="preview-metric">
                <span class="metric-label" style="display: block; font-size: var(--text-xs); color: #6b7280;">Timeline</span>
                <span class="metric-value" id="preview-timeline" style="display: block; font-size: var(--text-base); font-weight: 600; color: var(--primary-900);">${commercial.timeline} days</span>
              </div>
              <div class="preview-metric">
                <span class="metric-label" style="display: block; font-size: var(--text-xs); color: #6b7280;">Team Size</span>
                <span class="metric-value" id="preview-team" style="display: block; font-size: var(--text-base); font-weight: 600; color: var(--primary-900);">${commercial.teamSize || 6}</span>
              </div>
              <div class="preview-metric">
                <span class="metric-label" style="display: block; font-size: var(--text-xs); color: #6b7280;">Margin Impact</span>
                <span class="metric-value" id="preview-margin" style="display: block; font-size: var(--text-base); font-weight: 600; color: var(--primary-900);">+₹${this.formatCurrency(0)}</span>
              </div>
            </div>
          </div>
          
          <!-- Apply Actions -->
          <div class="panel-actions">
            <button class="btn-apply-adjustments" onclick="currentEstimation.applyAdjustments()">
              Apply Changes
              <span class="icon">→</span>
            </button>
            <button class="btn-reset" onclick="currentEstimation.resetAdjustments()">
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderActionBar(commercial) {
    return `
      <div class="action-bar" id="action-bar">
        <div class="action-left">
          <button class="btn-secondary" onclick="currentEstimation.goBack()">
            <span class="icon">←</span>
            <span>Back to Requirements</span>
          </button>
        </div>
        
        <div class="action-center">
          <div class="selection-summary">
            <div class="summary-item">
              <span class="label">Investment</span>
              <span class="value" id="summary-investment">₹${this.formatCurrency(commercial.cost)}</span>
            </div>
            <div class="summary-divider">•</div>
            <div class="summary-item">
              <span class="label">Timeline</span>
              <span class="value" id="summary-timeline">${commercial.timeline} days</span>
            </div>
            <div class="summary-divider">•</div>
            <div class="summary-item">
              <span class="label">Strategy</span>
              <span class="value" id="summary-strategy">${this.selectedStrategy?.name || 'Full Delivery'}</span>
            </div>
          </div>
        </div>
        
        <div class="action-right">
          <button class="btn-download" onclick="currentEstimation.downloadProposal()" style="padding: var(--space-3) var(--space-4); background: white; border: 1px solid var(--primary-200); color: var(--primary-700); border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: var(--space-2);">
            <span class="icon">📥</span>
            <span>Download</span>
          </button>
          <button class="btn-primary large" onclick="currentEstimation.generateFinalProposal()" style="padding: var(--space-4) var(--space-8); background: var(--primary-500); color: white; border: none; border-radius: 8px; font-size: var(--text-lg); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: var(--space-2);">
            <span>Generate Final Proposal</span>
            <span class="icon">→</span>
          </button>
        </div>
      </div>
    `;
  }

  renderBudgetOptimizationModal() {
    return `
      <div class="modal budget-optimization-modal" id="budget-optimization-modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2 style="margin: 0; font-size: var(--text-xl); font-weight: 600;">Budget Optimization Strategies</h2>
            <button class="modal-close" onclick="currentEstimation.closeBudgetModal()">×</button>
          </div>
          
          <div class="modal-body" style="padding: var(--space-6);">
            <p class="optimization-intro" style="color: #6b7280; margin-bottom: var(--space-6);">
              Your budget is below the standard cost. Here are three ways to make it work:
            </p>
            
            <div class="optimization-options" style="display: grid; gap: var(--space-4);">
              ${this.renderOptimizationOptions()}
            </div>
          </div>
          
          <div class="modal-footer" style="padding: var(--space-4) var(--space-6); border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end;">
            <button class="btn-secondary" onclick="currentEstimation.closeBudgetModal()">
              Keep Current Proposal
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderOptimizationOptions() {
    return `
      <div class="optimization-option" style="padding: var(--space-4); border: 2px solid var(--primary-500); border-radius: 12px; background: var(--primary-100);">
        <h4 style="margin: 0 0 var(--space-2) 0;">Extended Timeline Approach</h4>
        <p style="margin: 0 0 var(--space-3) 0; color: #6b7280; font-size: var(--text-sm);">Reduce team size and extend timeline by 40%</p>
        <button onclick="currentEstimation.applyOptimization('timeline')" style="padding: var(--space-2) var(--space-4); background: var(--primary-500); color: white; border: none; border-radius: 6px; cursor: pointer;">Apply</button>
      </div>
    `;
  }

  renderConfirmationModal() {
    return `
      <div class="modal confirmation-modal" id="confirmation-modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Confirm Proposal</h2>
            <button class="modal-close" onclick="currentEstimation.closeConfirmationModal()">×</button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to generate the final proposal?</p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="currentEstimation.closeConfirmationModal()">Cancel</button>
            <button class="btn-primary" onclick="currentEstimation.confirmProposal()">Confirm</button>
          </div>
        </div>
      </div>
    `;
  }

  // Utility Methods
  determinePricingContext(commercial, technical) {
    const ratio = commercial / technical;
    
    if (ratio >= 1.3) {
      return { label: 'Premium Pricing', class: 'premium' };
    } else if (ratio >= 1.1) {
      return { label: 'Standard Pricing', class: 'standard' };
    } else if (ratio >= 0.9) {
      return { label: 'Competitive Pricing', class: 'competitive' };
    } else {
      return { label: 'Strategic Pricing', class: 'strategic' };
    }
  }

  assessBudgetFit(commercial, technical) {
    const budget = commercial.userBudget;
    if (!budget) {
      return { show: false };
    }
    
    const ratio = budget / technical.cost;
    
    if (ratio >= 1.2) {
      return {
        show: true,
        class: 'good',
        icon: '✅',
        message: 'Budget comfortably covers the project',
        showOptimize: false
      };
    } else if (ratio >= 1.0) {
      return {
        show: true,
        class: 'ok',
        icon: '🔵',
        message: 'Budget is sufficient with standard margins',
        showOptimize: false
      };
    } else if (ratio >= 0.8) {
      return {
        show: true,
        class: 'warning',
        icon: '⚠️',
        message: `Budget is ${Math.round((1 - ratio) * 100)}% below standard cost`,
        showOptimize: true
      };
    } else {
      return {
        show: true,
        class: 'critical',
        icon: '🔴',
        message: `Budget requires significant adjustments`,
        showOptimize: true
      };
    }
  }

  calculateScenarioFit(scenario, commercial) {
    let fitScore = 100;
    
    const scenarioCost = typeof scenario.cost === 'object' ? scenario.cost.total || scenario.cost.withContingency : scenario.cost;
    const userBudget = commercial.userBudget || commercial.cost;
    
    // Cost fit
    if (scenarioCost > userBudget * 1.1) {
      fitScore -= 30;
    } else if (scenarioCost > userBudget) {
      fitScore -= 15;
    }
    
    // Timeline fit
    const scenarioTimeline = typeof scenario.timeline === 'object' ? scenario.timeline.days : scenario.timeline;
    const desiredTimeline = commercial.desiredTimeline || commercial.timeline;
    if (scenarioTimeline > desiredTimeline * 1.2) {
      fitScore -= 20;
    }
    
    // Risk fit
    if (scenario.riskLevel === 'high' && commercial.riskTolerance === 'low') {
      fitScore -= 25;
    }
    
    return Math.max(0, Math.min(100, fitScore));
  }

  formatCurrency(value) {
    if (!value) return '0';
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(value);
  }

  // Interaction Methods
  initializeInteractions() {
    // Initialize the interaction handler
    if (window.EstimationInteractions) {
      this.interactionHandler = new window.EstimationInteractions(this);
    }
    
    // Start behavioral tracking
    this.startBehavioralTracking();
  }

  startProgressiveDisclosure() {
    // Reveal features based on user engagement
    setTimeout(() => {
      const panelToggle = document.querySelector('.panel-toggle');
      if (panelToggle) {
        panelToggle.classList.add('pulse-animation');
        setTimeout(() => panelToggle.classList.remove('pulse-animation'), 2000);
      }
    }, 5000);
    
    // Track hover patterns
    this.trackHoverPatterns();
  }

  startBehavioralTracking() {
    let timeOnPage = 0;
    setInterval(() => {
      timeOnPage++;
    }, 1000);
  }

  trackHoverPatterns() {
    // Implementation for hover tracking
  }

  // Public methods for interactions
  revealTruth() {
    if (this.interactionHandler) {
      this.interactionHandler.revealTruth();
    } else {
      const panel = document.getElementById('truth-panel');
      if (panel) {
        panel.style.display = 'block';
        panel.classList.add('slide-in-right');
      }
    }
  }

  hideTruth() {
    if (this.interactionHandler) {
      this.interactionHandler.hideTruth();
    } else {
      const panel = document.getElementById('truth-panel');
      if (panel) {
        panel.style.display = 'none';
      }
    }
  }

  toggleAdjustmentPanel() {
    const panel = document.getElementById('adjustment-panel');
    if (panel) {
      panel.classList.toggle('collapsed');
      panel.classList.toggle('expanded');
    }
  }

  selectStrategy(strategyId) {
    this.selectedStrategy = { id: strategyId };
    if (this.interactionHandler) {
      this.interactionHandler.selectStrategy(strategyId);
    }
  }

  showBudgetOptimization() {
    const modal = document.getElementById('budget-optimization-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('fade-in');
    }
  }

  closeBudgetModal() {
    const modal = document.getElementById('budget-optimization-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  applyOptimization(strategy) {
    if (this.interactionHandler) {
      this.interactionHandler.applyOptimization(strategy);
    }
  }

  applyPreset(type) {
    if (this.interactionHandler) {
      this.interactionHandler.applyPreset(type);
    }
  }

  updateBudgetOverride(value) {
    this.adjustments.budgetOverride = value ? parseFloat(value) : null;
    if (this.interactionHandler) {
      this.interactionHandler.updateLivePreview();
    }
  }

  clearBudgetOverride() {
    const input = document.getElementById('budget-override');
    if (input) {
      input.value = '';
      this.updateBudgetOverride('');
    }
  }

  updateMargin(value) {
    this.adjustments.margin = parseFloat(value);
    const display = document.getElementById('margin-value');
    if (display) display.textContent = `${value}%`;
    if (this.interactionHandler) {
      this.interactionHandler.updateLivePreview();
    }
  }

  updateRisk(value) {
    this.adjustments.risk = parseFloat(value);
    const display = document.getElementById('risk-value');
    if (display) display.textContent = `${value}%`;
    if (this.interactionHandler) {
      this.interactionHandler.updateLivePreview();
    }
  }

  setTeamBalance(value) {
    this.adjustments.teamFactor = value;
    const display = document.getElementById('team-value');
    if (display) {
      if (value < 1) display.textContent = 'Smaller Team';
      else if (value > 1) display.textContent = 'Larger Team';
      else display.textContent = 'Balanced';
    }
    // Update active state
    document.querySelectorAll('.balance-option').forEach(btn => {
      btn.classList.remove('active');
      if (parseFloat(btn.dataset.value) === value) {
        btn.classList.add('active');
      }
    });
    if (this.interactionHandler) {
      this.interactionHandler.updateLivePreview();
    }
  }

  applyAdjustments() {
    if (this.interactionHandler) {
      this.interactionHandler.showToast('Adjustments applied successfully');
    }
  }

  resetAdjustments() {
    this.adjustments = { margin: 15, risk: 20, teamFactor: 1.0, budgetOverride: null };
    const marginSlider = document.getElementById('margin-slider');
    const riskSlider = document.getElementById('risk-slider');
    if (marginSlider) marginSlider.value = 15;
    if (riskSlider) riskSlider.value = 20;
    this.updateMargin(15);
    this.updateRisk(20);
    this.setTeamBalance(1.0);
    this.clearBudgetOverride();
  }

  goBack() {
    window.history.back();
  }

  downloadProposal() {
    alert('Download functionality will be implemented');
  }

  generateFinalProposal() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  closeConfirmationModal() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  confirmProposal() {
    alert('Proposal generation will be implemented');
    this.closeConfirmationModal();
  }
}

// Helper function for HTML escaping
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
window.OutputDisplay = OutputDisplay;

