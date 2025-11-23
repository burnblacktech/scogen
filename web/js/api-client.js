// web/js/api-client.js
// API client for frontend to connect to backend

class ApiClient {
  constructor() {
    this.baseUrl = '/api';
    this.token = localStorage.getItem('token');
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  /**
   * Get authentication token
   */
  getToken() {
    return this.token || localStorage.getItem('token');
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        this.setToken(null);
        if (window.location.pathname !== '/login.html') {
          window.location.href = '/login.html';
        }
        throw new Error('Authentication required');
      }

      // Parse JSON response
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  /**
   * Login user
   */
  async login(email, password) {
    const response = await this.post('/auth/login', { email, password });
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  /**
   * Register user
   */
  async register(email, password, name, company_name) {
    const response = await this.post('/auth/register', {
      email,
      password,
      name,
      company_name
    });
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await this.post('/auth/logout', {});
    } catch (error) {
      // Continue even if logout fails
      console.warn('Logout request failed:', error);
    }
    this.setToken(null);
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    return this.get('/auth/me');
  }

  // ============================================================================
  // SCOPE & PROJECT METHODS
  // ============================================================================

  /**
   * Get project scope
   */
  async getScope(projectId) {
    return this.get(`/v2/scopes/${projectId}`);
  }

  /**
   * Analyze scope with intelligence system
   */
  async analyzeScope(projectId) {
    return this.post(`/v2/intelligence/analyze-scope/${projectId}`, {});
  }

  /**
   * Get project with intelligence data
   */
  async getProjectWithIntelligence(projectId) {
    return this.get(`/v2/projects/${projectId}/intelligence`);
  }

  // ============================================================================
  // INTELLIGENCE METHODS
  // ============================================================================

  /**
   * Analyze module complexity
   */
  async analyzeComplexity(module, projectContext = {}) {
    return this.post('/v2/intelligence/analyze-complexity', {
      module,
      projectContext
    });
  }

  /**
   * Calculate dynamic cost
   */
  async calculateCost(module, projectContext = {}) {
    return this.post('/v2/intelligence/calculate-cost', {
      module,
      projectContext
    });
  }

  /**
   * Generate intelligent timeline
   */
  async generateTimeline(modules, resources = {}, projectContext = {}) {
    return this.post('/v2/intelligence/generate-timeline', {
      modules,
      resources,
      projectContext
    });
  }

  /**
   * Generate context-aware scenarios
   */
  async generateScenarios(project, modules, resources = {}) {
    return this.post('/v2/intelligence/generate-scenarios', {
      project,
      modules,
      resources
    });
  }

  // ============================================================================
  // LEARNING METHODS
  // ============================================================================

  /**
   * Complete project and capture actuals
   */
  async completeProject(projectId, actuals) {
    return this.post('/v2/learning/complete-project', {
      projectId,
      actuals
    });
  }

  /**
   * Get component matches for requirements
   */
  async matchComponents(requirements) {
    return this.post('/v2/learning/match-components', {
      requirements
    });
  }

  // ============================================================================
  // TEMPLATE METHODS
  // ============================================================================

  /**
   * List industry templates
   */
  async listTemplates() {
    return this.get('/v2/templates');
  }

  /**
   * Get template details
   */
  async getTemplate(templateId) {
    return this.get(`/v2/templates/${templateId}`);
  }

  /**
   * Create project from template
   */
  async createProjectFromTemplate(templateId, customizations = {}) {
    return this.post(`/v2/templates/${templateId}/create-project`, {
      customizations
    });
  }
}

// Create singleton instance
const api = new ApiClient();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
