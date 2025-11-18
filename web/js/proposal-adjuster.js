/**
 * Proposal Adjuster UI Component
 * Handles context-triggered visibility and proposal adjustments
 */

class ProposalAdjusterUI {
  constructor(technicalBaseline) {
    this.technicalBaseline = technicalBaseline;
    this.adjustments = {
      margin: 15,
      riskBuffer: 20,
      paymentTerms: 'milestone',
      teamSizeAdjustment: 1.0,
      timelineAdjustment: 1.0,
      budgetOverride: null
    };
    this.isVisible = false;
    this.hoverCount = 0;
    this.timeOnPage = 0;
  }

  /**
   * Check if hint should be shown based on context
   */
  shouldShowHint(result) {
    // Show hint if:
    // 1. Budget is specified and there's a gap
    // 2. User has been on page for > 5 seconds
    // 3. Budget mismatch > 20%
    
    if (!result.dualEstimate) return false;
    
    const { technical, commercial } = result.dualEstimate;
    if (!technical || !commercial) return false;
    
    const gap = (commercial.cost - technical.cost) / technical.cost;
    const budgetSpecified = result.budgetOptimization !== null;
    
    return budgetSpecified || Math.abs(gap) > 0.2 || this.timeOnPage > 5000;
  }

  /**
   * Show adjustment panel (context-triggered)
   */
  showAdjustmentPanel() {
    if (this.isVisible) return;
    
    this.isVisible = true;
    const container = document.getElementById('proposalAdjusterSection');
    if (!container) {
      // Create container if it doesn't exist
      const resultsSection = document.getElementById('resultsSection');
      if (!resultsSection) return;
      
      const newContainer = document.createElement('div');
      newContainer.id = 'proposalAdjusterSection';
      newContainer.className = 'result-card';
      resultsSection.insertBefore(newContainer, resultsSection.firstChild);
    }
    
    const panel = this.buildAdjustmentPanel();
    document.getElementById('proposalAdjusterSection').innerHTML = panel;
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Update preview
    this.updatePreview();
  }

  /**
   * Build adjustment panel HTML
   */
  buildAdjustmentPanel() {
    const techCost = this.technicalBaseline?.actualCost || this.technicalBaseline?.cost?.total || 0;
    const techTimeline = this.technicalBaseline?.actualTimeline || this.technicalBaseline?.timeline?.base || 60;
    const techTeam = this.technicalBaseline?.actualTeamSize || this.technicalBaseline?.teamSize || 5;
    
    return `
      <div class="proposal-adjustment-panel">
        <h3>⚙️ Proposal Adjustments</h3>
        <p class="tech-truth" style="color: #666; font-size: 14px; margin-bottom: 20px;">
          Technical Reality: ₹${this.formatCurrency(techCost)} / ${techTimeline} days / ${techTeam} people
        </p>
        
        <div class="adjustment-controls" style="display: grid; gap: 20px;">
          <!-- Margin Adjustment -->
          <div class="control-group">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Margin Adjustment</label>
            <div style="display: flex; align-items: center; gap: 15px;">
              <input type="range" id="margin-slider" min="-20" max="50" value="${this.adjustments.margin}" 
                     style="flex: 1;" oninput="proposalAdjusterUI.updateMargin(this.value)">
              <span id="margin-value" style="min-width: 50px; font-weight: bold;">${this.adjustments.margin}%</span>
            </div>
          </div>
          
          <!-- Risk Buffer -->
          <div class="control-group">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Risk Buffer</label>
            <div style="display: flex; align-items: center; gap: 15px;">
              <input type="range" id="risk-slider" min="0" max="50" value="${this.adjustments.riskBuffer}" 
                     style="flex: 1;" oninput="proposalAdjusterUI.updateRiskBuffer(this.value)">
              <span id="risk-value" style="min-width: 50px; font-weight: bold;">${this.adjustments.riskBuffer}%</span>
            </div>
          </div>
          
          <!-- Client Budget Override -->
          <div class="control-group">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Client Budget (Optional)</label>
            <input type="number" id="budget-override" placeholder="Leave empty for calculated price" 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                   oninput="proposalAdjusterUI.updateBudgetOverride(this.value)">
          </div>
          
          <!-- Payment Terms -->
          <div class="control-group">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Payment Terms</label>
            <select id="payment-terms" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                    onchange="proposalAdjusterUI.updatePaymentTerms(this.value)">
              <option value="milestone" ${this.adjustments.paymentTerms === 'milestone' ? 'selected' : ''}>Milestone Based</option>
              <option value="monthly" ${this.adjustments.paymentTerms === 'monthly' ? 'selected' : ''}>Monthly</option>
              <option value="upfront" ${this.adjustments.paymentTerms === 'upfront' ? 'selected' : ''}>100% Upfront</option>
              <option value="5050" ${this.adjustments.paymentTerms === '5050' ? 'selected' : ''}>50% Upfront, 50% Delivery</option>
            </select>
          </div>
          
          <!-- Team Size Adjustment -->
          <div class="control-group">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Team Size Factor</label>
            <div style="display: flex; align-items: center; gap: 15px;">
              <input type="range" id="team-slider" min="0.5" max="2" step="0.1" value="${this.adjustments.teamSizeAdjustment}" 
                     style="flex: 1;" oninput="proposalAdjusterUI.updateTeamSize(this.value)">
              <span id="team-value" style="min-width: 150px; font-weight: bold;">
                ${this.adjustments.teamSizeAdjustment}x (${Math.ceil(techTeam * this.adjustments.teamSizeAdjustment)} people)
              </span>
            </div>
          </div>
        </div>
        
        <div class="proposal-preview" style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h4 style="margin-top: 0;">Proposal Preview</h4>
          <div id="proposal-summary">
            <!-- Dynamic content -->
          </div>
        </div>
        
        <div class="adjustment-actions" style="margin-top: 20px; display: flex; gap: 10px;">
          <button onclick="proposalAdjusterUI.applyAdjustments()" 
                  style="flex: 1; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
            Generate Adjusted Proposal
          </button>
          <button onclick="proposalAdjusterUI.resetToBaseline()" 
                  style="flex: 1; padding: 12px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
            Reset to Technical Truth
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Calculate adjusted proposal
   */
  calculateAdjustedProposal() {
    const base = this.technicalBaseline?.actualCost || this.technicalBaseline?.cost?.total || 0;
    const margin = base * (this.adjustments.margin / 100);
    const risk = base * (this.adjustments.riskBuffer / 100);
    
    const calculated = base + margin + risk;
    const budgetOverride = document.getElementById('budget-override')?.value;
    const finalCost = budgetOverride ? parseFloat(budgetOverride) : calculated;
    
    // Calculate timeline based on team size adjustment
    const teamFactor = this.adjustments.teamSizeAdjustment;
    const baseTimeline = this.technicalBaseline?.actualTimeline || this.technicalBaseline?.timeline?.base || 60;
    const adjustedTimeline = Math.ceil(baseTimeline / teamFactor);
    const baseTeamSize = this.technicalBaseline?.actualTeamSize || this.technicalBaseline?.teamSize || 5;
    const adjustedTeamSize = Math.ceil(baseTeamSize * teamFactor);
    
    // Generate narrative
    const ratio = finalCost / base;
    let narrative = {
      tone: 'standard',
      message: 'Standard professional service delivery',
      justification: 'Optimal balance of quality, cost, and timeline'
    };
    
    if (ratio >= 1.2) {
      narrative = {
        tone: 'premium',
        message: 'Premium service with enhanced support and faster delivery',
        justification: 'Includes dedicated team, priority support, and comprehensive documentation'
      };
    } else if (ratio >= 0.9) {
      narrative = {
        tone: 'standard',
        message: 'Standard professional service delivery',
        justification: 'Optimal balance of quality, cost, and timeline'
      };
    } else if (ratio >= 0.7) {
      narrative = {
        tone: 'competitive',
        message: 'Competitive pricing with adjusted approach',
        justification: 'Optimized resource allocation and phased delivery'
      };
    } else {
      narrative = {
        tone: 'strategic',
        message: 'Strategic partnership pricing',
        justification: 'Long-term partnership with shared risk model'
      };
    }
    
    return {
      technicalCost: base,
      proposedCost: finalCost,
      margin: margin,
      riskBuffer: risk,
      timeline: adjustedTimeline,
      teamSize: adjustedTeamSize,
      paymentTerms: this.adjustments.paymentTerms,
      narrative: narrative
    };
  }

  /**
   * Update preview display
   */
  updatePreview() {
    const proposal = this.calculateAdjustedProposal();
    const summary = document.getElementById('proposal-summary');
    if (!summary) return;
    
    const gap = (proposal.proposedCost - proposal.technicalCost) / proposal.technicalCost;
    const gapPercent = (gap * 100).toFixed(0);
    
    summary.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
        <div>
          <div style="font-size: 12px; color: #666;">Proposed Cost</div>
          <div style="font-size: 24px; font-weight: bold; color: #4CAF50;">₹${this.formatCurrency(proposal.proposedCost)}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #666;">Timeline</div>
          <div style="font-size: 24px; font-weight: bold;">${proposal.timeline} days</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #666;">Team Size</div>
          <div style="font-size: 24px; font-weight: bold;">${proposal.teamSize} people</div>
        </div>
      </div>
      <div style="padding: 15px; background: white; border-radius: 4px; border-left: 4px solid #4CAF50;">
        <div style="font-weight: 600; margin-bottom: 5px;">${proposal.narrative.message}</div>
        <div style="font-size: 14px; color: #666;">${proposal.narrative.justification}</div>
      </div>
      ${gap < 0 ? `
        <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px; color: #856404;">
          ⚠️ Proposed price is ${Math.abs(gapPercent)}% below technical cost
        </div>
      ` : `
        <div style="margin-top: 15px; padding: 10px; background: #d4edda; border-radius: 4px; color: #155724;">
          ✅ Healthy margin of ${gapPercent}%
        </div>
      `}
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Update preview on any change
    const inputs = ['margin-slider', 'risk-slider', 'team-slider', 'budget-override', 'payment-terms'];
    inputs.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', () => this.updatePreview());
        element.addEventListener('change', () => this.updatePreview());
      }
    });
  }

  /**
   * Update methods
   */
  updateMargin(value) {
    this.adjustments.margin = parseFloat(value);
    document.getElementById('margin-value').textContent = `${this.adjustments.margin}%`;
    this.updatePreview();
  }

  updateRiskBuffer(value) {
    this.adjustments.riskBuffer = parseFloat(value);
    document.getElementById('risk-value').textContent = `${this.adjustments.riskBuffer}%`;
    this.updatePreview();
  }

  updateBudgetOverride(value) {
    this.adjustments.budgetOverride = value ? parseFloat(value) : null;
    this.updatePreview();
  }

  updatePaymentTerms(value) {
    this.adjustments.paymentTerms = value;
    this.updatePreview();
  }

  updateTeamSize(value) {
    this.adjustments.teamSizeAdjustment = parseFloat(value);
    const techTeam = this.technicalBaseline?.actualTeamSize || this.technicalBaseline?.teamSize || 5;
    document.getElementById('team-value').textContent = 
      `${this.adjustments.teamSizeAdjustment}x (${Math.ceil(techTeam * this.adjustments.teamSizeAdjustment)} people)`;
    this.updatePreview();
  }

  /**
   * Apply adjustments
   */
  applyAdjustments() {
    const proposal = this.calculateAdjustedProposal();
    // Trigger custom event for other components to listen
    const event = new CustomEvent('proposalAdjusted', { detail: proposal });
    document.dispatchEvent(event);
    alert('Proposal adjustments applied! The estimate will be updated.');
  }

  /**
   * Reset to baseline
   */
  resetToBaseline() {
    this.adjustments = {
      margin: 15,
      riskBuffer: 20,
      paymentTerms: 'milestone',
      teamSizeAdjustment: 1.0,
      timelineAdjustment: 1.0,
      budgetOverride: null
    };
    
    // Reset UI
    if (document.getElementById('margin-slider')) {
      document.getElementById('margin-slider').value = 15;
      document.getElementById('risk-slider').value = 20;
      document.getElementById('team-slider').value = 1.0;
      document.getElementById('budget-override').value = '';
      document.getElementById('payment-terms').value = 'milestone';
    }
    
    this.updatePreview();
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    if (!amount) return '0';
    if (amount >= 10000000) {
      return (amount / 10000000).toFixed(2) + 'Cr';
    } else if (amount >= 100000) {
      return (amount / 100000).toFixed(2) + 'L';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toLocaleString('en-IN');
  }
}

// Global instance (will be initialized when result is available)
let proposalAdjusterUI = null;

