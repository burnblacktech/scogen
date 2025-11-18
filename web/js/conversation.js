/**
 * Conversation Manager
 * 
 * Manages the conversation mode UI and interactions
 * Handles chat interface, completeness tracking, preview, and generation
 */

class ConversationManager {
  constructor() {
    this.conversationId = null;
    this.sessionId = null;
    this.state = null;
    this.isGenerating = false;
    this.prescriptionShown = false;
  }
  
  async init() {
    // Set up event listeners
    const sendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');
    
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }
    
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
    
    // Note: Action buttons are now dynamically created by updateActions()
    // Event listeners are attached via onclick attributes in the HTML strings
    // Legacy button listeners kept for backward compatibility if buttons exist
    
    // Add event listeners for generation option checkboxes
    const genOptions = document.querySelectorAll('input[name="gen-option"]');
    genOptions.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateGenerationTime();
        this.updateSelectionCount();
      });
    });
    
    // Initialize tooltips
    this.initTooltips();
    
    // Start conversation
    await this.startConversation();
  }
  
  initTooltips() {
    // Dynamic tooltips based on context
    this.tooltips = {
      lowCompleteness: {
        preview: "Complete more questions to unlock preview",
        generate: "Answer a few more questions to generate documents"
      },
      mediumCompleteness: {
        preview: "Preview available! See early estimates",
        generate: "Almost ready - just a few more details needed"
      },
      highCompleteness: {
        preview: "Full preview ready with accurate estimates",
        generate: "All set! Generate your documents now"
      }
    };
    
    // Update tooltips based on completeness
    this.updateTooltips = (completeness) => {
      const previewBtn = document.getElementById('preview-btn');
      const generateBtn = document.getElementById('generate-btn');
      
      if (previewBtn && generateBtn) {
        if (completeness < 30) {
          previewBtn.setAttribute('data-tooltip', this.tooltips.lowCompleteness.preview);
          generateBtn.setAttribute('data-tooltip', this.tooltips.lowCompleteness.generate);
        } else if (completeness < 60) {
          previewBtn.setAttribute('data-tooltip', this.tooltips.mediumCompleteness.preview);
          generateBtn.setAttribute('data-tooltip', this.tooltips.mediumCompleteness.generate);
        } else {
          previewBtn.setAttribute('data-tooltip', this.tooltips.highCompleteness.preview);
          generateBtn.setAttribute('data-tooltip', this.tooltips.highCompleteness.generate);
        }
      }
    };
  }
  
  showContextualHelp(stage) {
    const helpMessages = {
      discovery: "I'll ask about your project type and goals. This helps me understand the big picture.",
      scoping: "Now let's define the specific features and requirements.",
      technical: "Let's discuss any technical preferences or constraints.",
      constraints: "Finally, let's talk about budget, timeline, and team size."
    };
    
    if (helpMessages[stage]) {
      this.addMessage(helpMessages[stage], 'bot-info');
    }
  }
  
  updateProgressIndicators(completeness) {
    const indicators = [
      { threshold: 0, message: "Just getting started..." },
      { threshold: 20, message: "Understanding your needs..." },
      { threshold: 40, message: "Building project scope..." },
      { threshold: 60, message: "Preview available!" },
      { threshold: 80, message: "Almost ready to generate!" },
      { threshold: 85, message: "Ready to generate documents!" }
    ];
    
    const current = indicators.filter(i => completeness >= i.threshold).pop();
    if (current) {
      const statusEl = document.getElementById('chat-status');
      if (statusEl) {
        statusEl.textContent = current.message;
      }
    }
    
    // Update actions based on completeness
    this.updateActions(completeness);
  }
  
  updateActions(completeness) {
    const actionContainer = document.querySelector('.chat-actions');
    if (!actionContainer) return;
    
    // Clear all actions first
    actionContainer.innerHTML = '';
    
    if (completeness < 60) {
      // Early stage - just continue with hint
      const questionsNeeded = Math.ceil((60 - completeness) / 10);
      actionContainer.innerHTML = `
        <div class="action-hint" style="text-align: center; padding: 15px; color: #718096; font-size: 14px;">
          💬 Keep chatting - ${questionsNeeded} more questions to unlock preview
        </div>
      `;
    } else if (completeness < 85) {
      // Middle stage - preview available
      actionContainer.innerHTML = `
        <button id="preview-btn" class="btn btn-secondary" onclick="window.conversationManager.showPreview()">
          <span class="btn-icon">👁️</span>
          Preview Scope
        </button>
        <button id="continue-btn" class="btn btn-primary" onclick="document.getElementById('chat-input')?.focus()">
          <span class="btn-icon">💬</span>
          Continue for Better Accuracy
        </button>
      `;
    } else {
      // Ready stage - generate prominent
      actionContainer.innerHTML = `
        <button id="generate-btn" class="btn btn-success btn-large" onclick="window.conversationManager.showGenerationOptions()">
          <span class="btn-icon">✨</span>
          Generate Documents
        </button>
        <div class="secondary-actions" style="margin-top: 10px; text-align: center;">
          <a onclick="window.conversationManager.showPreview()" style="color: #667eea; cursor: pointer; text-decoration: none; margin: 0 10px;">Preview</a> • 
          <a onclick="window.conversationManager.showMenu()" style="color: #667eea; cursor: pointer; text-decoration: none; margin: 0 10px;">Menu</a>
        </div>
      `;
    }
  }
  
  showMenu() {
    // Show menu with Start Over and other options
    const menu = document.createElement('div');
    menu.className = 'action-menu';
    menu.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 10000;
      min-width: 250px;
    `;
    menu.innerHTML = `
      <h3 style="margin-bottom: 15px;">Options</h3>
      <button onclick="window.conversationManager.startOver()" class="btn btn-outline" style="width: 100%; margin-bottom: 10px;">
        🔄 Start Over
      </button>
      <button onclick="window.conversationManager.saveProgress()" class="btn btn-outline" style="width: 100%; margin-bottom: 10px;">
        💾 Save Progress
      </button>
      <button onclick="this.parentElement.remove()" class="btn btn-secondary" style="width: 100%;">
        Close
      </button>
    `;
    document.body.appendChild(menu);
    
    // Close on outside click
    setTimeout(() => {
      const closeOnClick = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeOnClick);
        }
      };
      document.addEventListener('click', closeOnClick);
    }, 100);
  }
  
  autoSave() {
    if (!this.conversationId) return;
    
    // Save conversation state to localStorage
    const saveData = {
      conversationId: this.conversationId,
      sessionId: this.sessionId,
      state: this.state,
      messages: this.getMessages(),
      timestamp: Date.now()
    };
    
    localStorage.setItem(`conversation_${this.conversationId}`, JSON.stringify(saveData));
    
    // Also save to list of conversations
    const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
    const existingIndex = conversations.findIndex(c => c.id === this.conversationId);
    const conversationData = {
      id: this.conversationId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      completeness: this.state?.completeness || 0,
      domain: this.state?.requirements?.domain || 'unknown'
    };
    
    if (existingIndex >= 0) {
      conversations[existingIndex] = conversationData;
    } else {
      conversations.push(conversationData);
    }
    localStorage.setItem('savedConversations', JSON.stringify(conversations));
    
    // Show subtle save indicator
    this.showSaveIndicator();
  }
  
  getMessages() {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return [];
    
    const messages = [];
    messagesDiv.querySelectorAll('.bot-message, .user-message').forEach(msg => {
      messages.push({
        type: msg.classList.contains('bot-message') ? 'bot' : 'user',
        text: msg.textContent
      });
    });
    
    return messages;
  }
  
  showSaveIndicator() {
    // Remove existing indicator if any
    const existing = document.querySelector('.save-indicator');
    if (existing) {
      existing.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'save-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #10B981;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    `;
    indicator.innerHTML = '✓ Saved';
    document.body.appendChild(indicator);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    if (!document.querySelector('style[data-save-indicator]')) {
      style.setAttribute('data-save-indicator', 'true');
      document.head.appendChild(style);
    }
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      if (indicator.parentElement) {
        indicator.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => indicator.remove(), 300);
      }
    }, 2000);
  }
  
  updateStageProgress(stage, stageName) {
    // Update stage indicator if it exists
    const stageEl = document.getElementById('current-stage');
    if (stageEl) {
      stageEl.textContent = `Current Stage: ${stageName || stage}`;
    }
    
    // Update stage progress bars if they exist
    const stages = ['discovery', 'scoping', 'technical', 'constraints'];
    stages.forEach(s => {
      const progressEl = document.getElementById(`stage-${s}-progress`);
      if (progressEl && this.state && this.state.stageProgress) {
        const progress = this.state.stageProgress[s] || 0;
        progressEl.style.width = `${progress}%`;
      }
    });
  }
  
  updateSelectionCount() {
    const checkboxes = document.querySelectorAll('input[name="gen-option"]:checked');
    const countEl = document.getElementById('selected-count');
    const btn = document.getElementById('start-generation-btn');
    
    if (countEl) {
      countEl.textContent = checkboxes.length;
    }
    
    if (btn) {
      if (checkboxes.length === 0) {
        btn.textContent = 'Select Documents to Continue';
        btn.disabled = true;
      } else if (checkboxes.length === 1) {
        btn.textContent = 'Generate 1 Document';
        btn.disabled = false;
      } else {
        btn.textContent = `Generate ${checkboxes.length} Documents`;
        btn.disabled = false;
      }
    }
  }
  
  getSmartHint(input, stage) {
    const hints = {
      budget: {
        vague: "💡 Tip: A specific budget range helps us recommend the right architecture",
        clear: "✓ Great! This budget range gives us clear parameters"
      },
      timeline: {
        tight: "⚠️ Note: This timeline is aggressive. I'll suggest an MVP approach",
        reasonable: "✓ Good timeline! We can build a solid solution"
      },
      features: {
        many: "💡 Tip: We might need to prioritize features for phases",
        focused: "✓ Focused scope! This helps keep costs predictable"
      }
    };
    
    return hints[stage] || null;
  }
  
  async startConversation() {
    try {
      const response = await fetch('/api/conversation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to start conversation');
      }
      
      this.conversationId = data.sessionId;
      this.sessionId = data.sessionId;
      this.state = data.state || {};
      
      // Display initial message
      const initialMessage = "Hi! I'll help you scope your project. What are you looking to build?";
      this.addMessage(initialMessage, 'bot');
      
      // Show initial suggestions if any
      if (data.suggestions && data.suggestions.length > 0) {
        this.showSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      this.addMessage('Failed to start conversation. Please refresh and try again.', 'bot');
    }
  }
  
  async sendMessage(text = null) {
    const input = text || (document.getElementById('chat-input')?.value || '').trim();
    if (!input) return;
    
    // Clear input
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.value = '';
    }
    
    // Display user message
    this.addMessage(input, 'user');
    
    // Hide suggestions
    const suggestionsDiv = document.getElementById('chat-suggestions');
    if (suggestionsDiv) {
      suggestionsDiv.style.display = 'none';
    }
    
    try {
      // Send to backend
      const response = await fetch(`/api/conversation/${this.conversationId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to process message');
      }
      
      // Display bot response
      if (data.botResponse) {
        this.addMessage(data.botResponse, 'bot');
      }
      
      // Update completeness
      if (data.completeness !== undefined) {
        this.updateCompleteness(data.completeness);
        // Update tooltips based on completeness
        if (this.updateTooltips) {
          this.updateTooltips(data.completeness);
        }
        // Update progress indicators (this also calls updateActions)
        this.updateProgressIndicators(data.completeness);
      }
      
      // Auto-save after each message
      this.autoSave();
      
      // Show contextual help if stage changed
      if (data.stage && this.state && this.state.stage !== data.stage) {
        this.showContextualHelp(data.stage);
      }
      
      // Update state (store for preview and resume)
      if (data.state) {
        this.state = data.state;
      } else if (data.requirements) {
        // If state not provided, build it from requirements
        if (!this.state) {
          this.state = { requirements: {} };
        }
        this.state.requirements = data.requirements;
        this.state.completeness = data.completeness || 0;
      }
      
      // Show suggestions if any
      if (data.suggestions && data.suggestions.length > 0) {
        this.showSuggestions(data.suggestions);
      }
      
      // Show next question if available
      if (data.nextQuestion && !data.botResponse.includes(data.nextQuestion)) {
        this.addMessage(data.nextQuestion, 'bot');
      }
      
      // Buttons are now managed by updateActions() which is called via updateProgressIndicators()
      // Legacy code kept for backward compatibility
      
    } catch (error) {
      console.error('Failed to send message:', error);
      this.addMessage('Failed to send message. Please try again.', 'bot');
    }
  }
  
  addMessage(text, type) {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type + '-message';
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
  
  updateCompleteness(value) {
    const fill = document.getElementById('completeness-fill');
    const valueSpan = document.getElementById('completeness-value');
    
    if (fill) {
      fill.style.width = value + '%';
    }
    
    if (valueSpan) {
      valueSpan.textContent = value;
    }
    
    // Update progress indicators (which also updates status)
    this.updateProgressIndicators(value);
  }
  
  showSuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('chat-suggestions');
    if (!suggestionsDiv) return;
    
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.style.display = 'flex';
    
    suggestions.forEach(suggestion => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn';
      btn.textContent = suggestion;
      btn.onclick = () => this.sendMessage(suggestion);
      suggestionsDiv.appendChild(btn);
    });
  }
  
  async showPreview() {
    try {
      const response = await fetch(`/api/conversation/${this.conversationId}/preview`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.preview) {
        throw new Error('Failed to get preview');
      }
      
      const preview = data.preview;
      const completeness = this.state?.completeness || 0;
      
      // If completeness > 60%, also fetch prescription
      if (completeness >= 60 && this.state && this.state.requirements && this.state.requirements.domain) {
        try {
          await this.fetchAndShowPrescription();
        } catch (error) {
          console.warn('Failed to fetch prescription:', error);
        }
      }
      
      // Create human-friendly preview modal
      this.showHumanFriendlyPreview(preview, completeness);
      
    } catch (error) {
      console.error('Failed to get preview:', error);
      alert('Failed to load preview. Please try again.');
    }
  }
  
  showHumanFriendlyPreview(preview, completeness) {
    const modalId = 'preview-modal-friendly';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    const complexity = preview.complexity || 'medium';
    const domain = preview.domain || this.state?.requirements?.domain || 'project';
    const budgetFit = this.getBudgetFit(preview);
    const timelineFit = this.getTimelineFit(preview);
    const questionsNeeded = Math.ceil((85 - completeness) / 15);
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <span class="close" onclick="closeFriendlyPreviewModal()">&times;</span>
        
        <div class="preview-header" style="text-align: center; margin-bottom: 30px;">
          <div class="completeness-ring" style="margin: 0 auto 20px; width: 120px; height: 120px; position: relative;">
            <svg width="120" height="120" style="transform: rotate(-90deg);">
              <circle cx="60" cy="60" r="54" stroke="#e2e8f0" stroke-width="8" fill="none"></circle>
              <circle cx="60" cy="60" r="54" stroke="#667eea" stroke-width="8" fill="none"
                      stroke-dasharray="${2 * Math.PI * 54}"
                      stroke-dashoffset="${2 * Math.PI * 54 * (1 - completeness / 100)}"
                      style="transition: stroke-dashoffset 0.5s ease;"></circle>
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; font-weight: 700; color: #667eea;">
              ${completeness}%
            </div>
          </div>
          <h2 style="margin-bottom: 10px; color: #1a202c;">Your Project Scope</h2>
        </div>
        
        <div class="preview-summary" style="margin-bottom: 25px;">
          <p class="preview-description" style="font-size: 1.1rem; color: #4a5568; margin-bottom: 20px; line-height: 1.6;">
            Based on our conversation, this looks like a 
            <strong style="color: #2d3748;">${complexity}</strong> complexity 
            <strong style="color: #2d3748;">${domain}</strong> project.
          </p>
          
          <div class="preview-fit" style="margin-bottom: 20px;">
            ${budgetFit}
            ${timelineFit}
          </div>
          
          ${completeness < 85 ? `
            <div class="preview-improve" style="background: #FEF3C7; padding: 20px; border-radius: 12px; border-left: 4px solid #F59E0B;">
              <p style="margin-bottom: 15px; color: #78350F;">
                📝 Answer ${questionsNeeded} more question${questionsNeeded > 1 ? 's' : ''} for accurate pricing
              </p>
              <button onclick="continueConversationFromPreview()" class="btn btn-primary" style="width: 100%;">
                Continue Conversation
              </button>
            </div>
          ` : `
            <div class="preview-ready" style="background: #D1FAE5; padding: 20px; border-radius: 12px; border-left: 4px solid #10B981;">
              <p style="margin-bottom: 15px; color: #065F46; font-weight: 600;">
                ✅ Ready to generate full documentation!
              </p>
              <button onclick="proceedToGenerateFromPreview()" class="btn btn-primary" style="width: 100%;">
                Generate Documents
              </button>
            </div>
          `}
        </div>
      </div>
    `;
    
    modal.style.display = 'block';
  }
  
  getBudgetFit(preview) {
    const estimated = this.parseCost(preview.roughCost);
    const budget = this.state?.requirements?.budget;
    
    if (!budget || !estimated) {
      return '';
    }
    
    const budgetValue = this.parseBudget(budget);
    if (!budgetValue) return '';
    
    const ratio = estimated / budgetValue;
    
    if (ratio <= 0.8) {
      return `
        <div class="fit-good" style="background: #D1FAE5; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #10B981;">
          ✅ Comfortably within your ${this.formatCurrency(budgetValue)} budget
          <div style="font-size: 0.9rem; color: #065F46; margin-top: 5px;">
            Estimated: ${this.formatCurrency(estimated)}
          </div>
        </div>
      `;
    } else if (ratio <= 1.0) {
      return `
        <div class="fit-ok" style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #F59E0B;">
          ⚠️ Close to your ${this.formatCurrency(budgetValue)} budget
          <div style="font-size: 0.9rem; color: #78350F; margin-top: 5px;">
            Estimated: ${this.formatCurrency(estimated)} (${Math.round(ratio * 100)}% of budget)
          </div>
        </div>
      `;
    } else {
      return `
        <div class="fit-over" style="background: #FEE2E2; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #EF4444;">
          ❌ Exceeds your budget - let's discuss options
          <div style="font-size: 0.9rem; color: #991B1B; margin-top: 5px;">
            Estimated: ${this.formatCurrency(estimated)} vs Budget: ${this.formatCurrency(budgetValue)}
          </div>
        </div>
      `;
    }
  }
  
  getTimelineFit(preview) {
    const estimated = preview.roughTimeline;
    const deadline = this.state?.requirements?.timeline;
    
    if (!deadline || !estimated) {
      return '';
    }
    
    // Simple comparison - could be enhanced
    return `
      <div class="timeline-fit" style="background: #EFF6FF; padding: 15px; border-radius: 8px; border-left: 4px solid #3B82F6;">
        📅 Timeline: ${estimated}
        ${deadline ? `<div style="font-size: 0.9rem; color: #1E40AF; margin-top: 5px;">Your deadline: ${deadline}</div>` : ''}
      </div>
    `;
  }
  
  parseCost(costStr) {
    if (!costStr) return null;
    if (typeof costStr === 'number') return costStr;
    
    const lakhsMatch = costStr.match(/(\d+)\s*lakh/i);
    const croreMatch = costStr.match(/(\d+)\s*crore/i);
    const numberMatch = costStr.match(/[\d,]+/);
    
    if (croreMatch) {
      return parseInt(croreMatch[1]) * 10000000;
    } else if (lakhsMatch) {
      return parseInt(lakhsMatch[1]) * 100000;
    } else if (numberMatch) {
      return parseInt(numberMatch[0].replace(/,/g, ''));
    }
    
    return null;
  }
  
  parseBudget(budget) {
    if (!budget) return null;
    if (typeof budget === 'number') return budget;
    
    return this.parseCost(budget);
  }
  
  formatCurrency(amount) {
    if (!amount) return 'N/A';
    
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
  }
  
  showGenerationOptions() {
    // First show smart defaults modal
    const projectSize = this.estimateProjectSize();
    const recommendedPackage = this.getRecommendedPackage(projectSize);
    
    // Create simplified generation modal
    const modalId = 'generation-modal-smart';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <span class="close" onclick="closeSmartGenerationModal()">&times;</span>
        <h2>Ready to Generate!</h2>
        <div class="recommended-package" style="margin: 20px 0;">
          <h3 style="margin-bottom: 15px; color: #333;">✨ Recommended for your ${projectSize} project:</h3>
          ${recommendedPackage}
        </div>
        <div class="generation-actions" style="text-align: center; margin-top: 25px;">
          <button onclick="generateRecommended()" class="btn btn-primary btn-large" style="padding: 15px 30px; font-size: 16px; margin-bottom: 15px;">
            Generate Recommended
          </button>
          <div>
            <a onclick="showCustomGenerationOptions()" style="color: #667eea; cursor: pointer; text-decoration: underline;">
              Customize selection
            </a>
          </div>
        </div>
      </div>
    `;
    
    modal.style.display = 'block';
  }
  
  estimateProjectSize() {
    if (!this.state || !this.state.requirements) {
      return 'medium'; // Default
    }
    
    const budget = this.state.requirements.budget;
    if (!budget) {
      // Estimate from other factors
      const scale = this.state.requirements.scale;
      if (scale === 'startup') return 'small';
      if (scale === 'enterprise' || scale === 'enterprise-plus') return 'large';
      return 'medium';
    }
    
    // Parse budget (could be string like "5 lakhs" or number)
    let budgetValue = 0;
    if (typeof budget === 'string') {
      const lakhsMatch = budget.match(/(\d+)\s*lakh/i);
      const croreMatch = budget.match(/(\d+)\s*crore/i);
      if (croreMatch) {
        budgetValue = parseInt(croreMatch[1]) * 10000000;
      } else if (lakhsMatch) {
        budgetValue = parseInt(lakhsMatch[1]) * 100000;
      } else {
        budgetValue = parseInt(budget.replace(/[^\d]/g, '')) || 0;
      }
    } else {
      budgetValue = budget;
    }
    
    if (budgetValue < 1000000) return 'small'; // < ₹10L
    if (budgetValue < 10000000) return 'medium'; // ₹10L - ₹1Cr
    return 'large'; // ₹1Cr+
  }
  
  getRecommendedPackage(size) {
    const packages = {
      small: {
        name: 'Essentials Package',
        items: ['Business Overview', 'Technical Summary'],
        time: '1 minute',
        reason: 'Perfect for projects under ₹10L',
        outputs: ['business', 'technical']
      },
      medium: {
        name: 'Professional Package',
        items: ['Business Document', 'Technical Architecture', 'Cost Breakdown'],
        time: '2 minutes',
        reason: 'Comprehensive docs for ₹10L-₹1Cr projects',
        outputs: ['business', 'technical']
      },
      large: {
        name: 'Enterprise Package',
        items: ['Complete Documentation', 'Blueprint', 'Sprint Plan', 'Risk Analysis'],
        time: '5 minutes',
        reason: 'Everything needed for ₹1Cr+ projects',
        outputs: ['business', 'technical', 'blueprint']
      }
    };
    
    const pkg = packages[size] || packages.medium;
    
    return `
      <div class="package-card" style="background: #f8f9fa; padding: 20px; border-radius: 12px; border: 2px solid #e2e8f0;">
        <h4 style="margin-bottom: 15px; color: #2d3748; font-size: 1.25rem;">${pkg.name}</h4>
        <ul style="list-style: none; padding: 0; margin-bottom: 15px;">
          ${pkg.items.map(item => `<li style="padding: 8px 0; color: #4a5568;">✓ ${item}</li>`).join('')}
        </ul>
        <p class="package-time" style="color: #667eea; font-weight: 600; margin-bottom: 10px;">⏱️ ${pkg.time}</p>
        <small style="color: #718096; font-size: 0.875rem;">${pkg.reason}</small>
      </div>
    `;
  }
  
  updateGenerationTime() {
    const checkboxes = document.querySelectorAll('input[name="gen-option"]:checked');
    const times = {
      business: 30,
      technical: 60,
      blueprint: 120,
      pseudocode: 180
    };
    
    let totalTime = 0;
    checkboxes.forEach(cb => {
      totalTime += times[cb.value] || 0;
    });
    
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    
    let timeText = '';
    if (minutes > 0) timeText += `${minutes} minute${minutes > 1 ? 's' : ''} `;
    if (seconds > 0) timeText += `${seconds} second${seconds > 1 ? 's' : ''}`;
    
    const timeEl = document.getElementById('total-gen-time');
    if (timeEl) {
      timeEl.textContent = timeText.trim() || '0 seconds';
    }
  }
  
  async startGeneration() {
    if (this.isGenerating) return;
    
    const checkboxes = document.querySelectorAll('input[name="gen-option"]:checked');
    const selectedOutputs = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedOutputs.length === 0) {
      alert('Please select at least one document to generate');
      return;
    }
    
    this.isGenerating = true;
    closeGenerationModal();
    
    // Show progress
    this.addMessage('Generating documents... This may take a few minutes.', 'bot');
    
    // Disable buttons
    const generateBtn = document.getElementById('generate-btn');
    const previewBtn = document.getElementById('preview-btn');
    if (generateBtn) generateBtn.disabled = true;
    if (previewBtn) previewBtn.disabled = true;
    
    try {
      const response = await fetch(`/api/conversation/${this.conversationId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputs: selectedOutputs })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const results = await response.json();
      
      if (!results.success) {
        throw new Error(results.message || 'Generation failed');
      }
      
      // Show results
      this.addMessage('Documents generated successfully!', 'bot');
      
      // Check if progressive output is enabled
      const projectId = results.projectId || (results.result && results.result.projectId);
      if (results.progressiveOutputEnabled && projectId) {
        // Show level selector instead of redirecting
        this.showOutputLevelSelector(projectId);
      } else if (projectId) {
        // Store results in sessionStorage for display
        sessionStorage.setItem('conversationResults', JSON.stringify(results.result));
        window.location.href = `/?projectId=${results.result.projectId}`;
      } else {
        // Show results inline if no projectId
        alert('Generation complete! Check the results section.');
      }
      
    } catch (error) {
      console.error('Generation failed:', error);
      this.addMessage('Failed to generate documents. Please try again.', 'bot');
      alert('Generation failed: ' + error.message);
    } finally {
      this.isGenerating = false;
      if (generateBtn) generateBtn.disabled = false;
      if (previewBtn) previewBtn.disabled = false;
    }
  }
  
  async saveProgress() {
    try {
      const response = await fetch(`/api/conversation/${this.conversationId}/save`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.addMessage('Progress saved! You can continue this conversation later.', 'bot');
      } else {
        throw new Error(data.message || 'Failed to save');
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
      this.addMessage('Failed to save progress.', 'bot');
    }
  }
  
  startOver() {
    if (confirm('Are you sure you want to start over? Current progress will be lost.')) {
      window.location.reload();
    }
  }

  /**
   * Select and display output level
   */
  async selectOutputLevel(projectId, level) {
    try {
      this.addMessage(`Loading ${level} output...`, 'bot');
      
      const response = await fetch('/api/output/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, level })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get output');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.output) {
        throw new Error('Invalid output data');
      }
      
      // Close level selector modal
      closeOutputLevelModal();
      
      // Display output
      this.displayProgressiveOutput(data.output, projectId);
      
    } catch (error) {
      console.error('Failed to select output level:', error);
      this.addMessage('Failed to load output. Please try again.', 'bot');
    }
  }

  /**
   * Display progressive output
   */
  displayProgressiveOutput(output, projectId) {
    // Create output display container
    const outputContainer = document.createElement('div');
    outputContainer.className = 'progressive-output-container';
    outputContainer.style.cssText = `
      margin: 20px;
      padding: 25px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    
    outputContainer.innerHTML = `
      <div class="output-header" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e9ecef;">
        <h2 style="margin: 0 0 5px 0; color: #333;">${output.name}</h2>
        <p style="margin: 0; color: #666; font-size: 14px;">${output.tagline}</p>
        <div style="margin-top: 10px;">
          <span style="
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          ">Level ${output.level}</span>
          <span style="
            margin-left: 10px;
            color: #666;
            font-size: 12px;
          ">${(output.depth * 100).toFixed(0)}% of analysis</span>
        </div>
      </div>
      
      <div class="output-content" style="
        line-height: 1.6;
        color: #333;
      ">
        ${this.formatMarkdownToHTML(output.document)}
      </div>
      
      ${output.teaser ? `
        <div class="next-level-teaser" style="
          margin-top: 30px;
          padding: 20px;
          background: #f0f7ff;
          border-left: 4px solid #667eea;
          border-radius: 8px;
        ">
          <h3 style="margin: 0 0 10px 0; color: #333;">Want More Detail?</h3>
          <p style="margin: 0 0 15px 0; color: #666;">${output.teaser}</p>
          <button onclick="upgradeToNextLevel('${projectId}', '${output.level}', '${output.nextLevel}')" style="
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          ">
            Unlock ${this.getNextLevelName(output.nextLevel)} →
          </button>
        </div>
      ` : ''}
      
      <div class="output-actions" style="
        margin-top: 25px;
        padding-top: 20px;
        border-top: 1px solid #e9ecef;
        display: flex;
        gap: 10px;
      ">
        <button onclick="downloadOutput('${projectId}', '${output.level}')" style="
          padding: 10px 20px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        ">
          📥 Download ${output.name}
        </button>
        <button onclick="shareOutput('${projectId}', '${output.level}')" style="
          padding: 10px 20px;
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        ">
          🔗 Share
        </button>
      </div>
    `;
    
    // Add to chat messages
    const messagesDiv = document.getElementById('chat-messages');
    if (messagesDiv) {
      messagesDiv.appendChild(outputContainer);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }

  /**
   * Format markdown to HTML (simple converter)
   */
  formatMarkdownToHTML(markdown) {
    if (!markdown) return '';
    
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gim, '<p>$1</p>');
  }

  /**
   * Get next level name
   */
  getNextLevelName(level) {
    const names = {
      'L2_PLANNING': 'Level 2 Planning',
      'L3_ARCHITECTURE': 'Level 3 Architecture',
      'L4_IMPLEMENTATION': 'Level 4 Implementation',
      'L5_COMPLETE': 'Level 5 Complete'
    };
    return names[level] || 'Next Level';
  }
  
  async fetchAndShowPrescription() {
    if (!this.state || !this.state.requirements || !this.state.requirements.domain) {
      return;
    }
    
    try {
      const response = await fetch('/api/prescribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: this.state.requirements.domain,
          requirements: this.state.requirements
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get prescription');
      }
      
      const data = await response.json();
      
      if (data.success && data.prescription) {
        this.displayPrescription(data.prescription);
      }
    } catch (error) {
      console.error('Failed to fetch prescription:', error);
    }
  }
  
  displayPrescription(prescription) {
    // Use the existing prescription modal from app.js if available
    const modal = document.getElementById('prescription-modal');
    const content = document.getElementById('prescription-content');
    
    if (!modal || !content) {
      // Create modal if it doesn't exist
      this.createPrescriptionModal();
      return this.displayPrescription(prescription); // Retry
    }
    
    let html = '';
    
    if (prescription.matchScore !== undefined) {
      html += `<div class="prescription-match">
        <div class="prescription-match-score">Match Score: ${prescription.matchScore}%</div>
        <div>Confidence: ${(prescription.confidence * 100).toFixed(0)}%</div>
      </div>`;
    }
    
    if (prescription.prescription) {
      const p = prescription.prescription;
      html += `<h3>Recommended Architecture</h3>`;
      
      if (p.architecture) {
        html += `<p><strong>Type:</strong> ${p.architecture.type || p.architecture}</p>`;
        if (p.architecture.pattern) {
          html += `<p><strong>Pattern:</strong> ${p.architecture.pattern}</p>`;
        }
        if (p.architecture.services && Array.isArray(p.architecture.services)) {
          html += `<p><strong>Services:</strong> ${p.architecture.services.join(', ')}</p>`;
        }
      }
      
      if (p.tech) {
        html += `<h3>Technology Stack</h3>`;
        html += `<p><strong>Frontend:</strong> ${p.tech.frontend || 'Not specified'}</p>`;
        html += `<p><strong>Backend:</strong> ${p.tech.backend || 'Not specified'}</p>`;
        html += `<p><strong>Database:</strong> ${p.tech.database || 'Not specified'}</p>`;
        if (p.tech.cache) html += `<p><strong>Cache:</strong> ${p.tech.cache}</p>`;
        if (p.tech.queue) html += `<p><strong>Queue:</strong> ${p.tech.queue}</p>`;
      }
      
      html += `<h3>Team & Timeline</h3>`;
      html += `<p><strong>Team Size:</strong> ${p.team || p.teamSize || 'Not specified'} developers</p>`;
      html += `<p><strong>Timeline:</strong> ${p.timeline || 'Not specified'}</p>`;
      if (p.complexity) html += `<p><strong>Complexity:</strong> ${p.complexity}</p>`;
      if (p.rationale) html += `<p><strong>Rationale:</strong> ${p.rationale}</p>`;
    }
    
    content.innerHTML = html;
    modal.classList.add('active');
  }
  
  createPrescriptionModal() {
    // Create prescription modal if it doesn't exist
    const modalHTML = `
      <div id="prescription-modal" class="checkpoint-modal">
        <div class="checkpoint-modal-content">
          <span class="close" onclick="closePrescriptionModal()">&times;</span>
          <h2>Architecture Prescription</h2>
          <div id="prescription-content"></div>
          <div class="modal-actions">
            <button onclick="closePrescriptionModal()" class="btn btn-secondary">Close</button>
            <button onclick="acceptPrescription()" class="btn btn-primary">Accept & Continue</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
}

// Modal functions
function closePreviewModal() {
  const modal = document.getElementById('preview-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function closeGenerationModal() {
  const modal = document.getElementById('generation-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function proceedToGenerate() {
  closePreviewModal();
  if (window.conversationManager) {
    window.conversationManager.showGenerationOptions();
  }
}

function startGeneration() {
  if (window.conversationManager) {
    window.conversationManager.startGeneration();
  }
}

function closePrescriptionModal() {
  const modal = document.getElementById('prescription-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function acceptPrescription() {
  closePrescriptionModal();
  // Prescription is already stored in state, continue with generation
  if (window.conversationManager) {
    window.conversationManager.showGenerationOptions();
  }
}

function closeBlueprintModal() {
  const modal = document.getElementById('blueprint-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function closeSprintPlanModal() {
  const modal = document.getElementById('sprint-plan-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function closeSmartGenerationModal() {
  const modal = document.getElementById('generation-modal-smart');
  if (modal) {
    modal.style.display = 'none';
  }
}

function generateRecommended() {
  if (!window.conversationManager) return;
  
  const projectSize = window.conversationManager.estimateProjectSize();
  const packages = {
    small: ['business', 'technical'],
    medium: ['business', 'technical'],
    large: ['business', 'technical', 'blueprint']
  };
  
  const selectedOutputs = packages[projectSize] || packages.medium;
  
  // Close smart modal
  closeSmartGenerationModal();
  
  // Start generation with recommended outputs
  window.conversationManager.startGenerationWithOutputs(selectedOutputs);
}

function showCustomGenerationOptions() {
  // Close smart modal
  closeSmartGenerationModal();
  
  // Show full generation modal with all options
  const modal = document.getElementById('generation-modal');
  if (modal && window.conversationManager) {
    modal.style.display = 'block';
    window.conversationManager.updateGenerationTime();
    window.conversationManager.updateSelectionCount();
    
    // Update confidence if available
    const confidenceEl = document.getElementById('gen-confidence');
    if (confidenceEl && window.conversationManager.state && window.conversationManager.state.completeness) {
      const confidence = Math.min(95, Math.max(60, window.conversationManager.state.completeness + 5));
      confidenceEl.textContent = confidence + '%';
    }
  }
}

function downloadBlueprint() {
  // TODO: Implement blueprint download
  alert('Blueprint download feature coming soon');
}

function showResumeConversationModal() {
  const modal = document.getElementById('resume-conversation-modal');
  if (!modal) return;
  
  // Load saved conversations from localStorage
  const savedConversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
  const listEl = document.getElementById('saved-conversations-list');
  
  if (!listEl) return;
  
  if (savedConversations.length === 0) {
    listEl.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No saved conversations found.</p>';
  } else {
    listEl.innerHTML = savedConversations.map(conv => `
      <div class="saved-conversation-item" style="padding: 15px; margin: 10px 0; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6; cursor: pointer;" onclick="resumeConversation('${conv.id}')">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${conv.domain || 'Unknown Domain'}</strong>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">
              ${conv.completeness || 0}% complete • ${new Date(conv.timestamp).toLocaleString()}
            </div>
          </div>
          <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;">Resume</button>
        </div>
      </div>
    `).join('');
  }
  
  modal.style.display = 'block';
}

function closeResumeConversationModal() {
  const modal = document.getElementById('resume-conversation-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function resumeConversation(conversationId) {
  closeResumeConversationModal();
  
  if (window.conversationManager) {
    window.conversationManager.resumeConversation(conversationId);
  } else {
    // Initialize conversation manager if not already done
    window.conversationManager = new ConversationManager();
    window.conversationManager.init().then(() => {
      window.conversationManager.resumeConversation(conversationId);
    });
  }
}

  /**
   * Show output level selector after generation
   */
  async showOutputLevelSelector(projectId) {
    try {
      // Fetch available levels
      const response = await fetch(`/api/output/levels/${projectId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to get output levels');
      }
      
      const levels = data.levels || [];
      const trainingMode = data.trainingMode || false;
      
      // Create and show modal
      this.createLevelSelectorModal(levels, projectId, trainingMode);
    } catch (error) {
      console.error('Failed to show level selector:', error);
      this.addMessage('Failed to load output levels. Redirecting to results...', 'bot');
      // Fallback to regular results
      if (projectId) {
        window.location.href = `/?projectId=${projectId}`;
      }
    }
  }

  /**
   * Create level selector modal
   */
  createLevelSelectorModal(levels, projectId, trainingMode) {
    // Remove existing modal if any
    const existingModal = document.getElementById('output-level-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'output-level-modal';
    modal.className = 'modal';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; justify-content: center; align-items: center;';
    
    const levelCards = levels.map(level => {
      const isFree = trainingMode || level.price === 0 || level.level === 'L1_DISCOVERY';
      const isRecommended = level.level === 'L1_DISCOVERY';
      
      return `
        <div class="level-card ${isRecommended ? 'recommended' : ''}" style="
          background: white;
          border-radius: 12px;
          padding: 25px;
          margin: 15px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          max-width: 300px;
          flex: 1;
          min-width: 250px;
          ${isRecommended ? 'border: 2px solid #4CAF50;' : 'border: 1px solid #ddd;'}
        ">
          <div class="level-header" style="margin-bottom: 15px;">
            <h3 style="margin: 0 0 5px 0; color: #333; font-size: 20px;">${level.name}</h3>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #666; font-size: 14px;">${level.tagline}</span>
              <span class="level-price" style="
                background: ${isFree ? '#4CAF50' : '#667eea'};
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
              ">${isFree ? 'FREE' : `₹${level.price.toLocaleString()}`}</span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 15px;">${level.description}</p>
          
          <div class="level-depth" style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <small style="color: #999; font-size: 12px;">Analysis Depth</small>
              <small style="color: #999; font-size: 12px;">${(level.depth * 100).toFixed(0)}%</small>
            </div>
            <div style="
              width: 100%;
              height: 8px;
              background: #e9ecef;
              border-radius: 4px;
              overflow: hidden;
            ">
              <div style="
                width: ${level.depth * 100}%;
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                transition: width 0.3s;
              "></div>
            </div>
          </div>
          
          <button onclick="selectOutputLevel('${projectId}', '${level.level}')" class="btn-select-level" style="
            width: 100%;
            padding: 12px;
            background: ${isRecommended ? '#4CAF50' : '#667eea'};
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            ${isRecommended ? 'Start Here (Free)' : 'Select This Level'}
          </button>
        </div>
      `;
    }).join('');
    
    modal.innerHTML = `
      <div class="modal-content" style="
        background: white;
        border-radius: 16px;
        padding: 30px;
        max-width: 1200px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <div>
            <h2 style="margin: 0 0 8px 0; color: #333; font-size: 28px;">Your Analysis is Ready!</h2>
            <p style="margin: 0; color: #666; font-size: 16px;">Choose how much detail you need:</p>
          </div>
          <span class="close" onclick="closeOutputLevelModal()" style="
            font-size: 32px;
            color: #999;
            cursor: pointer;
            line-height: 1;
          ">&times;</span>
        </div>
        
        <div class="level-selector" style="
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
        ">
          ${levelCards}
        </div>
        
        ${trainingMode ? `
          <div class="training-mode-notice" style="
            margin-top: 25px;
            padding: 15px;
            background: #f0f7ff;
            border-left: 4px solid #4CAF50;
            border-radius: 8px;
            text-align: center;
          ">
            <strong>🎓 Training Mode:</strong> All levels are accessible for testing
          </div>
        ` : ''}
        
        <div class="level-progression" style="
          margin-top: 25px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          text-align: center;
        ">
          <p style="margin: 0; color: #495057; font-size: 14px;">
            💡 <strong>Smart Progression:</strong> Start with Level 1 to validate, then upgrade as needed. Each level includes everything from previous levels.
          </p>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
}

// Global functions for level selector and output actions
function upgradeToNextLevel(projectId, fromLevel, toLevel) {
  if (window.conversationManager) {
    window.conversationManager.selectOutputLevel(projectId, toLevel);
  }
}

function downloadOutput(projectId, level) {
  // TODO: Implement download functionality
  alert(`Download ${level} output for project ${projectId} - Coming soon!`);
}

function shareOutput(projectId, level) {
  // TODO: Implement share functionality
  const url = `${window.location.origin}/?projectId=${projectId}&level=${level}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('Link copied to clipboard!');
  }).catch(() => {
    prompt('Copy this link:', url);
  });
}

// Global functions for level selector
function selectOutputLevel(projectId, level) {
  if (window.conversationManager) {
    window.conversationManager.selectOutputLevel(projectId, level);
  }
}

function closeOutputLevelModal() {
  const modal = document.getElementById('output-level-modal');
  if (modal) {
    modal.remove();
  }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if conversation mode is selected
  const modeSelector = document.querySelector('input[name="executionMode"]:checked');
  if (modeSelector && modeSelector.value === 'conversation') {
    // Only initialize if not already initialized by app.js
    if (!window.conversationManager) {
      window.conversationManager = new ConversationManager();
      window.conversationManager.init();
    }
  }
});

