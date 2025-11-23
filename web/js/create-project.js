// web/js/create-project.js
// Project creation logic

// Import API client (if available)
let api;
if (typeof ApiClient !== 'undefined') {
    api = new ApiClient();
} else {
    console.warn('ApiClient not found, using fetch directly');
}

class ProjectCreator {
    constructor() {
        this.api = api || null;
        this.setupForm();
        this.setupInputMethodToggle();
    }

    setupForm() {
        const form = document.getElementById('createProjectForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createProject();
        });
    }

    setupInputMethodToggle() {
        // Input method selection
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const method = btn.dataset.method;
                const textInput = document.getElementById('textInput');
                const conversationInput = document.getElementById('conversationInput');
                
                if (method === 'conversation') {
                    if (textInput) textInput.style.display = 'none';
                    if (conversationInput) conversationInput.style.display = 'block';
                    this.startConversation();
                } else {
                    if (conversationInput) conversationInput.style.display = 'none';
                    if (textInput) textInput.style.display = 'block';
                    this.stopConversation();
                }
            });
        });

        // Template selection
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                // Load template requirements if not custom
                const template = card.dataset.template;
                if (template !== 'none') {
                    this.loadTemplateRequirements(template);
                } else {
                    // Clear requirements if custom selected
                    document.getElementById('requirements').value = '';
                }
            });
        });
    }

    conversationSessionId = null;
    conversationMessages = [];

    async startConversation() {
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const chatSendBtn = document.getElementById('chatSendBtn');
        const progressContainer = document.getElementById('conversationProgress');
        
        if (!chatMessages || !chatInput) return;

        // Clear previous conversation
        chatMessages.innerHTML = '';
        this.conversationMessages = [];
        
        // Get context
        const clientIndustry = document.getElementById('clientIndustry')?.value || 'other';
        const clientType = document.getElementById('clientType')?.value || 'startup';
        const projectName = document.getElementById('projectName')?.value || 'My Project';

        try {
            // Start conversation session
            let response;
            if (this.api) {
                response = await this.api.post('/v2/conversation/start', {
                    projectName,
                    clientIndustry,
                    clientType
                });
            } else {
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch('/api/v2/conversation/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({
                        projectName,
                        clientIndustry,
                        clientType
                    })
                });
                response = await fetchResponse.json();
            }

            if (response.success) {
                this.conversationSessionId = response.sessionId;
                this.addBotMessage(response.message);
                
                if (response.suggestions && response.suggestions.length > 0) {
                    this.showSuggestions(response.suggestions);
                }
                
                // Enable input
                if (chatInput) chatInput.disabled = false;
                if (chatSendBtn) chatSendBtn.disabled = false;
                if (progressContainer) progressContainer.style.display = 'block';
                
                // Focus input
                if (chatInput) chatInput.focus();
                
                // Update progress
                this.updateProgress(response.completeness || 0);
            } else {
                throw new Error(response.error || 'Failed to start conversation');
            }
        } catch (error) {
            console.error('Failed to start conversation:', error);
            this.addBotMessage('Sorry, I encountered an error. Please try direct input mode instead.');
        }
    }

    stopConversation() {
        this.conversationSessionId = null;
        this.conversationMessages = [];
    }

    addBotMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const div = document.createElement('div');
        div.className = 'chat-message bot';
        div.textContent = message;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addUserMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const div = document.createElement('div');
        div.className = 'chat-message user';
        div.textContent = message;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showSuggestions(suggestions) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages || !suggestions || suggestions.length === 0) return;

        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'suggestions';
        
        suggestions.forEach(suggestion => {
            const chip = document.createElement('div');
            chip.className = 'suggestion-chip';
            chip.textContent = suggestion;
            chip.addEventListener('click', () => {
                document.getElementById('chatInput').value = suggestion;
                document.getElementById('chatSendBtn').click();
            });
            suggestionsDiv.appendChild(chip);
        });
        
        chatMessages.appendChild(suggestionsDiv);
    }

    updateProgress(completeness) {
        const progressFill = document.getElementById('progressFill');
        const completenessPercent = document.getElementById('completenessPercent');
        
        if (progressFill) {
            progressFill.style.width = `${completeness}%`;
        }
        if (completenessPercent) {
            completenessPercent.textContent = `${completeness}%`;
        }
    }

    async processConversationMessage(message) {
        if (!this.conversationSessionId || !message.trim()) return;

        this.addUserMessage(message);
        this.conversationMessages.push({ role: 'user', content: message });

        const chatInput = document.getElementById('chatInput');
        const chatSendBtn = document.getElementById('chatSendBtn');
        
        if (chatInput) chatInput.disabled = true;
        if (chatSendBtn) chatSendBtn.disabled = true;

        try {
            let response;
            if (this.api) {
                response = await this.api.post('/v2/conversation/process', {
                    sessionId: this.conversationSessionId,
                    message
                });
            } else {
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch('/api/v2/conversation/process', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({
                        sessionId: this.conversationSessionId,
                        message
                    })
                });
                response = await fetchResponse.json();
            }

            if (response.success) {
                this.addBotMessage(response.message);
                
                if (response.suggestions && response.suggestions.length > 0) {
                    this.showSuggestions(response.suggestions);
                }
                
                // Update requirements field if extracted
                if (response.extractedRequirements) {
                    document.getElementById('requirements').value = response.extractedRequirements;
                }
                
                // Update progress
                this.updateProgress(response.completeness || 0);
                
                // If complete enough, show option to finish
                if (response.canGenerate) {
                    const finishBtn = document.createElement('div');
                    finishBtn.className = 'chat-message bot';
                    finishBtn.innerHTML = `
                        <strong>Great! I have enough information.</strong><br>
                        <button onclick="projectCreator.finishConversation()" 
                                style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Finish & Create Project
                        </button>
                    `;
                    document.getElementById('chatMessages').appendChild(finishBtn);
                }
            } else {
                throw new Error(response.error || 'Failed to process message');
            }
        } catch (error) {
            console.error('Failed to process message:', error);
            this.addBotMessage('Sorry, I encountered an error. Please try again.');
        } finally {
            if (chatInput) {
                chatInput.disabled = false;
                chatInput.value = '';
                chatInput.focus();
            }
            if (chatSendBtn) chatSendBtn.disabled = false;
        }
    }

    async finishConversation() {
        if (!this.conversationSessionId) return;

        try {
            // Extract final requirements
            let response;
            if (this.api) {
                response = await this.api.post('/v2/conversation/extract', {
                    sessionId: this.conversationSessionId
                });
            } else {
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch('/api/v2/conversation/extract', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({
                        sessionId: this.conversationSessionId
                    })
                });
                response = await fetchResponse.json();
            }

            if (response.success && response.requirements) {
                // Update requirements field
                document.getElementById('requirements').value = response.requirements;
                
                // Switch back to text input mode
                document.querySelector('.method-btn[data-method="text"]').click();
                
                // Show success message
                this.showSuccess('Requirements extracted from conversation! Review and submit when ready.');
            }
        } catch (error) {
            console.error('Failed to extract requirements:', error);
            this.showError('Failed to extract requirements. Please copy them manually.');
        }
    }

    loadTemplateRequirements(template) {
        const templates = {
            ecommerce: `Core E-commerce Platform Requirements:

- User authentication (registration, login, password reset)
- Product catalog with categories and search
- Product details with images, descriptions, variants
- Shopping cart functionality
- Checkout process with address management
- Payment integration (Razorpay/PayU)
- Order management and tracking
- Email notifications for orders
- Admin panel for inventory management
- Sales reports and analytics`,

            saas: `SaaS Platform Requirements:

- User authentication with roles (admin, user)
- Subscription plans (free, pro, enterprise)
- Billing and payment integration
- User dashboard with usage metrics
- API with rate limiting
- Multi-tenant architecture
- Admin panel for user management
- Email notifications
- Usage analytics and reports
- Documentation portal`,

            marketplace: `Marketplace Platform Requirements:

- User registration (buyers and sellers)
- Vendor onboarding and verification
- Product listing management for vendors
- Centralized product catalog
- Shopping cart for multiple vendors
- Commission management
- Payment splitting between vendors
- Order tracking and fulfillment
- Ratings and reviews
- Admin panel for platform management
- Vendor dashboard with analytics`
        };
        
        const requirementsField = document.getElementById('requirements');
        if (requirementsField && templates[template]) {
            requirementsField.value = templates[template];
        }
    }

    async createProject() {
        const projectName = document.getElementById('projectName')?.value;
        const clientName = document.getElementById('clientName')?.value;
        const clientIndustry = document.getElementById('clientIndustry')?.value;
        const clientType = document.getElementById('clientType')?.value;
        const requirements = document.getElementById('requirements')?.value;
        const requiresGST = document.getElementById('requiresGST')?.checked || false;
        const requiresCompliance = document.getElementById('requiresCompliance')?.checked || false;

        if (!projectName || !requirements) {
            this.showError('Project name and requirements are required');
            return;
        }

        // Check auth
        if (this.api && !this.api.getToken()) {
            window.location.href = '/login.html';
            return;
        }

        const submitButton = document.querySelector('button[type="submit"]');
        const form = document.getElementById('createProjectForm');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        if (submitButton) submitButton.disabled = true;
        if (form) form.style.display = 'none';
        if (loadingIndicator) loadingIndicator.style.display = 'block';

        try {
            let response;
            
            if (this.api) {
                response = await this.api.post('/v2/projects/create', {
                    projectName,
                    clientName,
                    clientIndustry,
                    clientType,
                    requirements,
                    requiresGST,
                    requiresCompliance
                });
            } else {
                // Fallback to direct fetch
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch('/api/v2/projects/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({
                        projectName,
                        clientName,
                        clientIndustry,
                        clientType,
                        requirements,
                        requiresGST,
                        requiresCompliance
                    })
                });
                response = await fetchResponse.json();
            }

            if (response.success) {
                // Redirect to project view
                window.location.href = `/intelligent-scope.html?projectId=${response.project.id}`;
            } else {
                throw new Error(response.error || 'Project creation failed');
            }
        } catch (error) {
            console.error('Project creation error:', error);
            this.showError(error.message || 'Failed to create project. Please try again.');
            
            if (submitButton) submitButton.disabled = false;
            if (form) form.style.display = 'block';
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.className = 'error-message show';
            errorDiv.style.display = 'block';
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.className = 'success-message show';
            successDiv.style.display = 'block';
        }
    }
}

// Initialize on page load
let projectCreator;
document.addEventListener('DOMContentLoaded', () => {
    projectCreator = new ProjectCreator();
    
    // Setup conversation input handlers
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !chatInput.disabled) {
                const message = chatInput.value.trim();
                if (message) {
                    projectCreator.processConversationMessage(message);
                }
            }
        });
    }
    
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', () => {
            const message = chatInput?.value.trim();
            if (message && !chatInput.disabled) {
                projectCreator.processConversationMessage(message);
            }
        });
    }
});

