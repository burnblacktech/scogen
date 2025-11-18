/**
 * estimation-interactions.js
 * Interactive behaviors for the psychology-driven estimation display
 */

class EstimationUI {
  constructor() {
    this.technicalCost = 0;
    this.commercialCost = 0;
    this.adjustments = {
      margin: 15,
      risk: 20,
      teamFactor: 1.0,
      budgetOverride: null,
      paymentTerms: 'milestone'
    };
    
    this.init();
  }
  
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.attachEventListeners();
        this.initializeAnimations();
        this.setupProgressiveDisclosure();
      });
    } else {
      this.attachEventListeners();
      this.initializeAnimations();
      this.setupProgressiveDisclosure();
    }
  }
  
  attachEventListeners() {
    // Truth reveal button
    const revealBtn = document.querySelector('.reveal-truth-btn');
    if (revealBtn) {
      revealBtn.addEventListener('click', () => {
        this.revealTruth();
      });
    }
    
    // Close truth panel
    const closeBtn = document.querySelector('.close-truth-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideTruth();
      });
    }
    
    // Panel toggle
    const panelToggle = document.querySelector('.panel-toggle');
    if (panelToggle) {
      panelToggle.addEventListener('click', () => {
        this.toggleAdjustmentPanel();
      });
    }
    
    // Sliders
    const marginSlider = document.getElementById('margin-slider');
    if (marginSlider) {
      marginSlider.addEventListener('input', (e) => {
        this.updateMargin(e.target.value);
      });
    }
    
    const riskSlider = document.getElementById('risk-slider');
    if (riskSlider) {
      riskSlider.addEventListener('input', (e) => {
        this.updateRisk(e.target.value);
      });
    }
    
    const teamSlider = document.getElementById('team-slider');
    if (teamSlider) {
      teamSlider.addEventListener('input', (e) => {
        this.updateTeamFactor(e.target.value);
      });
    }
    
    // Budget override
    const budgetOverride = document.getElementById('budget-override');
    if (budgetOverride) {
      budgetOverride.addEventListener('input', (e) => {
        this.updateBudgetOverride(e.target.value);
      });
    }
    
    // Payment terms
    const paymentRadios = document.querySelectorAll('input[name="payment"]');
    paymentRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.updatePaymentTerms(e.target.value);
      });
    });
    
    // Apply adjustments
    const applyBtn = document.querySelector('.btn-apply-adjustments');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyAdjustments();
      });
    }
    
    // Reset button
    const resetBtn = document.querySelector('.btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetToDefaults();
      });
    }
    
    // Strategy selection
    document.querySelectorAll('.select-strategy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectStrategy(e.target);
      });
    });
    
    // Optimize button
    const optimizeBtn = document.querySelector('.optimize-btn');
    if (optimizeBtn) {
      optimizeBtn.addEventListener('click', () => {
        this.showOptimizationPanel();
      });
    }
  }
  
  revealTruth() {
    const truthPanel = document.querySelector('.truth-panel');
    if (!truthPanel) return;
    
    truthPanel.style.display = 'block';
    
    // Animate the variance bar
    setTimeout(() => {
      this.animateVarianceBar();
    }, 300);
    
    // Track behavior
    this.trackEvent('truth_revealed');
  }
  
  hideTruth() {
    const truthPanel = document.querySelector('.truth-panel');
    if (truthPanel) {
      truthPanel.style.display = 'none';
    }
  }
  
  toggleAdjustmentPanel() {
    const panel = document.querySelector('.adjustment-panel');
    if (!panel) return;
    
    panel.classList.toggle('collapsed');
    
    // Mobile: toggle expanded class
    if (window.innerWidth <= 768) {
      panel.classList.toggle('expanded');
    }
    
    if (!panel.classList.contains('collapsed')) {
      this.trackEvent('adjustments_opened');
    }
  }
  
  updateMargin(value) {
    this.adjustments.margin = parseFloat(value);
    const marginValue = document.getElementById('margin-value');
    if (marginValue) {
      marginValue.textContent = `${value}%`;
    }
    this.updatePreview();
  }
  
  updateRisk(value) {
    this.adjustments.risk = parseFloat(value);
    const riskValue = document.getElementById('risk-value');
    if (riskValue) {
      riskValue.textContent = `${value}%`;
    }
    this.updatePreview();
  }
  
  updateTeamFactor(value) {
    this.adjustments.teamFactor = parseFloat(value);
    const teamValue = document.getElementById('team-value');
    if (teamValue) {
      teamValue.textContent = `${value}x`;
    }
    
    // Update team size and timeline
    const baseTeam = 6;
    const baseTimeline = 45;
    
    const adjustedTeam = Math.ceil(baseTeam * this.adjustments.teamFactor);
    const adjustedTimeline = Math.ceil(baseTimeline / this.adjustments.teamFactor);
    
    const teamSizeEl = document.getElementById('team-size');
    if (teamSizeEl) {
      teamSizeEl.textContent = adjustedTeam;
    }
    
    const adjustedTimelineEl = document.getElementById('adjusted-timeline');
    if (adjustedTimelineEl) {
      adjustedTimelineEl.textContent = adjustedTimeline;
    }
    
    this.updatePreview();
  }
  
  updateBudgetOverride(value) {
    this.adjustments.budgetOverride = value ? parseFloat(value) : null;
    
    if (value && this.technicalCost && value < this.technicalCost) {
      this.showBudgetOptimization(value);
    }
    
    this.updatePreview();
  }
  
  updatePaymentTerms(value) {
    this.adjustments.paymentTerms = value;
    this.updatePreview();
  }
  
  showBudgetOptimization(budget) {
    if (!this.technicalCost) return;
    
    const shortfall = ((this.technicalCost - budget) / this.technicalCost * 100).toFixed(0);
    
    // Show budget fit indicator
    const indicator = document.querySelector('.budget-fit-indicator');
    if (indicator) {
      indicator.style.display = 'block';
      
      // Update message
      const message = indicator.querySelector('.fit-message span:last-child');
      if (message) {
        message.textContent = `Budget is ${shortfall}% below standard cost`;
      }
      
      // Animate the optimize button
      const optimizeBtn = indicator.querySelector('.optimize-btn');
      if (optimizeBtn) {
        optimizeBtn.classList.add('pulse-animation');
      }
    }
  }
  
  updatePreview() {
    if (!this.technicalCost) return;
    
    // Calculate new commercial cost
    const base = this.technicalCost;
    const marginAmount = base * (this.adjustments.margin / 100);
    const riskAmount = base * (this.adjustments.risk / 100);
    
    const calculated = base + marginAmount + riskAmount;
    const finalCost = this.adjustments.budgetOverride || calculated;
    
    // Update display
    this.animateValueChange('.amount-value', finalCost);
    
    // Update context badge
    this.updateContextBadge(finalCost);
  }
  
  animateValueChange(selector, newValue) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    const currentText = element.textContent.replace(/[^0-9]/g, '');
    const currentValue = parseInt(currentText) || 0;
    
    const duration = 800;
    const steps = 30;
    const increment = (newValue - currentValue) / steps;
    
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const value = Math.round(currentValue + (increment * step));
      element.textContent = this.formatCurrency(value);
      
      if (step >= steps) {
        clearInterval(interval);
        element.textContent = this.formatCurrency(newValue);
      }
    }, duration / steps);
  }
  
  updateContextBadge(cost) {
    if (!this.technicalCost) return;
    
    const badge = document.querySelector('.context-badge');
    if (!badge) return;
    
    const ratio = cost / this.technicalCost;
    
    badge.classList.remove('standard', 'premium', 'competitive', 'strategic');
    
    if (ratio >= 1.2) {
      badge.textContent = 'Premium Pricing';
      badge.classList.add('premium');
    } else if (ratio >= 0.9) {
      badge.textContent = 'Standard Pricing';
      badge.classList.add('standard');
    } else if (ratio >= 0.7) {
      badge.textContent = 'Competitive Pricing';
      badge.classList.add('competitive');
    } else {
      badge.textContent = 'Strategic Pricing';
      badge.classList.add('strategic');
    }
  }
  
  applyAdjustments() {
    // Show success animation
    const btn = document.querySelector('.btn-apply-adjustments');
    if (btn) {
      btn.classList.add('success-animation');
    }
    
    // Update main display
    this.updatePreview();
    
    // Show confirmation
    this.showToast('Adjustments applied successfully');
    
    // Track
    this.trackEvent('adjustments_applied', this.adjustments);
    
    setTimeout(() => {
      if (btn) {
        btn.classList.remove('success-animation');
      }
    }, 600);
  }
  
  resetToDefaults() {
    this.adjustments = {
      margin: 15,
      risk: 20,
      teamFactor: 1.0,
      budgetOverride: null,
      paymentTerms: 'milestone'
    };
    
    // Reset UI elements
    const marginSlider = document.getElementById('margin-slider');
    if (marginSlider) marginSlider.value = 15;
    
    const riskSlider = document.getElementById('risk-slider');
    if (riskSlider) riskSlider.value = 20;
    
    const teamSlider = document.getElementById('team-slider');
    if (teamSlider) teamSlider.value = 1.0;
    
    const budgetOverride = document.getElementById('budget-override');
    if (budgetOverride) budgetOverride.value = '';
    
    const milestoneRadio = document.querySelector('input[value="milestone"]');
    if (milestoneRadio) milestoneRadio.checked = true;
    
    // Update displays
    this.updateMargin(15);
    this.updateRisk(20);
    this.updateTeamFactor(1.0);
    this.updatePaymentTerms('milestone');
    
    this.showToast('Reset to default values');
  }
  
  selectStrategy(button) {
    // Remove active from all
    document.querySelectorAll('.select-strategy-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active to selected
    button.classList.add('active');
    
    // Update summary
    const strategyCard = button.closest('.strategy-card');
    if (strategyCard) {
      const strategyName = strategyCard.querySelector('h4')?.textContent || 'Selected Strategy';
      const summaryValue = document.querySelector('.summary-item .value');
      if (summaryValue) {
        summaryValue.textContent = strategyName;
      }
      
      // Animate selection
      strategyCard.classList.add('selected-animation');
      
      setTimeout(() => {
        strategyCard.classList.remove('selected-animation');
      }, 400);
    }
    
    this.trackEvent('strategy_selected', { strategy: button.textContent });
  }
  
  showOptimizationPanel() {
    // Expand adjustment panel if collapsed
    const panel = document.querySelector('.adjustment-panel');
    if (panel && panel.classList.contains('collapsed')) {
      this.toggleAdjustmentPanel();
    }
    
    // Scroll to adjustment panel
    panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    this.trackEvent('optimization_requested');
  }
  
  setupProgressiveDisclosure() {
    // Show optimize button after 5 seconds if budget mismatch exists
    setTimeout(() => {
      const optimizeBtn = document.querySelector('.optimize-btn');
      if (optimizeBtn && optimizeBtn.closest('.budget-fit-indicator')?.style.display !== 'none') {
        optimizeBtn.classList.add('gentle-pulse');
      }
    }, 5000);
    
    // Show truth hint after hovering on price 3 times
    let hoverCount = 0;
    const priceAmount = document.querySelector('.price-amount');
    if (priceAmount) {
      priceAmount.addEventListener('mouseenter', () => {
        hoverCount++;
        if (hoverCount === 3) {
          const revealBtn = document.querySelector('.reveal-truth-btn');
          if (revealBtn) {
            revealBtn.classList.add('hint-animation');
          }
        }
      });
    }
  }
  
  initializeAnimations() {
    // Observe elements for scroll animations
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-animation');
          }
        });
      }, { threshold: 0.1 });
      
      document.querySelectorAll('.strategy-card').forEach(card => {
        observer.observe(card);
      });
    }
  }
  
  animateVarianceBar() {
    const actualMarker = document.querySelector('.actual-cost-marker');
    const proposedMarker = document.querySelector('.proposed-cost-marker');
    
    if (actualMarker) {
      actualMarker.style.animation = 'slideInLeft 0.8s ease-out';
    }
    if (proposedMarker) {
      proposedMarker.style.animation = 'slideInLeft 1s ease-out';
    }
  }
  
  showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  formatCurrency(value) {
    if (!value) return '0';
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(value);
  }
  
  trackEvent(eventName, data = {}) {
    // Analytics tracking
    console.log('Track:', eventName, data);
    
    // Send to analytics service if available
    if (window.analytics) {
      window.analytics.track(eventName, data);
    }
  }
  
  // Public method to set costs from result data
  setCosts(technicalCost, commercialCost) {
    this.technicalCost = technicalCost;
    this.commercialCost = commercialCost;
    this.updatePreview();
  }
}

// Enhanced Interaction Handler Class
class EstimationInteractions {
  constructor(displayInstance) {
    this.display = displayInstance;
    this.behaviorTracking = {
      hoverCount: {},
      timeOnPage: 0,
      interactions: [],
      scrollDepth: 0
    };
    
    this.init();
  }
  
  init() {
    this.attachEventListeners();
    this.initializeAnimations();
    this.setupKeyboardShortcuts();
    this.startEngagementTracking();
  }
  
  attachEventListeners() {
    // Additional event listeners can be added here
  }
  
  initializeAnimations() {
    // Animation initialization
  }
  
  setupKeyboardShortcuts() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideTruth();
        this.closeBudgetModal();
      }
    });
  }
  
  startEngagementTracking() {
    setInterval(() => {
      this.behaviorTracking.timeOnPage++;
    }, 1000);
  }
  
  revealTruth() {
    const panel = document.getElementById('truth-panel');
    const commercialView = document.getElementById('commercial-view');
    
    if (panel) {
      panel.style.display = 'block';
      panel.classList.add('slide-in-right');
      
      this.track('truth_revealed', {
        timeToReveal: this.behaviorTracking.timeOnPage,
        triggerType: 'button_click'
      });
      
      this.animateComparison();
    }
  }
  
  hideTruth() {
    const panel = document.getElementById('truth-panel');
    if (panel) {
      panel.classList.add('slide-out-right');
      
      setTimeout(() => {
        panel.style.display = 'none';
        panel.classList.remove('slide-in-right', 'slide-out-right');
      }, 300);
    }
  }
  
  animateComparison() {
    // Animate variance chart
    const markers = document.querySelectorAll('.actual-cost-marker, .proposed-cost-marker');
    markers.forEach((marker, index) => {
      setTimeout(() => {
        marker.style.animation = 'slideInLeft 0.8s ease-out';
      }, index * 200);
    });
  }
  
  selectStrategy(strategyId) {
    document.querySelectorAll('.strategy-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    const selectedCard = document.querySelector(`[data-scenario-id="${strategyId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
      selectedCard.classList.add('pulse-once');
      setTimeout(() => selectedCard.classList.remove('pulse-once'), 600);
      
      const strategyName = selectedCard.querySelector('h4')?.textContent || 'Selected Strategy';
      const summaryValue = document.getElementById('summary-strategy');
      if (summaryValue) {
        summaryValue.textContent = strategyName;
      }
      
      this.display.selectedStrategy = { id: strategyId, name: strategyName };
    }
    
    this.track('strategy_selected', { strategyId });
  }
  
  applyOptimization(strategy) {
    const optimizations = {
      timeline: () => {
        this.display.setTeamBalance(0.7);
        this.display.updateMargin(10);
        this.showToast('Timeline extended with smaller team');
      },
      resources: () => {
        this.display.updateMargin(5);
        this.display.updateRisk(15);
        this.showToast('Resource mix optimized');
      },
      phased: () => {
        this.selectStrategy('phased');
        this.showToast('Switched to phased delivery');
      }
    };
    
    if (optimizations[strategy]) {
      optimizations[strategy]();
      this.updateLivePreview();
      this.track('optimization_applied', { strategy });
    }
  }
  
  applyPreset(type) {
    const presets = {
      competitive: { margin: 5, risk: 10, teamFactor: 0.8 },
      standard: { margin: 15, risk: 20, teamFactor: 1.0 },
      premium: { margin: 30, risk: 25, teamFactor: 1.3 }
    };
    
    const preset = presets[type];
    if (!preset) return;
    
    this.animateSliderChange('margin-slider', preset.margin);
    this.animateSliderChange('risk-slider', preset.risk);
    this.display.setTeamBalance(preset.teamFactor);
    
    this.showPresetApplied(type);
    this.updateLivePreview();
  }
  
  showPresetApplied(type) {
    this.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} preset applied`);
  }
  
  animateSliderChange(sliderId, newValue) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;
    
    const current = parseFloat(slider.value);
    const duration = 300;
    const steps = 15;
    const increment = (newValue - current) / steps;
    
    let step = 0;
    const interval = setInterval(() => {
      step++;
      slider.value = current + (increment * step);
      slider.dispatchEvent(new Event('input'));
      
      if (step >= steps) {
        clearInterval(interval);
        slider.value = newValue;
      }
    }, duration / steps);
  }
  
  updateLivePreview() {
    const technical = this.display.technicalBaseline?.cost || 0;
    const margin = parseFloat(document.getElementById('margin-slider')?.value || 15);
    const risk = parseFloat(document.getElementById('risk-slider')?.value || 20);
    const budgetOverride = document.getElementById('budget-override')?.value;
    
    const marginAmount = technical * (margin / 100);
    const riskAmount = technical * (risk / 100);
    const calculated = technical + marginAmount + riskAmount;
    const final = budgetOverride ? parseFloat(budgetOverride) : calculated;
    
    this.animateValue('preview-price', final);
    this.animateValue('preview-margin', marginAmount);
    this.animateValue('summary-investment', final);
    
    this.updatePricingContext(final, technical);
  }
  
  animateValue(elementId, newValue, prefix = '₹') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentText = element.textContent.replace(/[^0-9.-]/g, '');
    const current = parseFloat(currentText) || 0;
    const duration = 500;
    const steps = 20;
    const increment = (newValue - current) / steps;
    
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const value = current + (increment * step);
      element.textContent = `${prefix}${this.formatCurrency(Math.round(value))}`;
      
      if (step >= steps) {
        clearInterval(interval);
        element.textContent = `${prefix}${this.formatCurrency(newValue)}`;
      }
    }, duration / steps);
  }
  
  updatePricingContext(cost, technical) {
    const ratio = cost / technical;
    const badge = document.querySelector('.context-badge');
    if (!badge) return;
    
    badge.classList.remove('standard', 'premium', 'competitive', 'strategic');
    
    if (ratio >= 1.3) {
      badge.textContent = 'Premium Pricing';
      badge.classList.add('premium');
    } else if (ratio >= 1.1) {
      badge.textContent = 'Standard Pricing';
      badge.classList.add('standard');
    } else if (ratio >= 0.9) {
      badge.textContent = 'Competitive Pricing';
      badge.classList.add('competitive');
    } else {
      badge.textContent = 'Strategic Pricing';
      badge.classList.add('strategic');
    }
  }
  
  showBudgetOptimization() {
    const modal = document.getElementById('budget-optimization-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('fade-in');
      this.track('budget_optimization_opened');
    }
  }
  
  closeBudgetModal() {
    const modal = document.getElementById('budget-optimization-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : '!'}</span>
      <span class="toast-message">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  formatCurrency(value) {
    if (!value) return '0';
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(value);
  }
  
  track(event, data = {}) {
    this.behaviorTracking.interactions.push({
      event,
      data,
      timestamp: Date.now()
    });
    
    if (window.analytics) {
      window.analytics.track(event, data);
    }
    
    console.log('Track:', event, data);
  }
}

// Global instance
let estimationUI = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    estimationUI = new EstimationUI();
  });
} else {
  estimationUI = new EstimationUI();
}

// Export for use in OutputDisplay
window.EstimationInteractions = EstimationInteractions;

