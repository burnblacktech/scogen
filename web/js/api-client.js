// API Client for communicating with backend

const API_BASE_URL = window.location.origin;

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async createScope(input, options = {}) {
    return this.request('/api/scope', {
      method: 'POST',
      body: JSON.stringify({ input, options })
    });
  }

  async getScopes(limit = 20) {
    return this.request(`/api/scopes?limit=${limit}`);
  }

  async getScope(id) {
    return this.request(`/api/scopes/${id}`);
  }

  async deleteScope(id) {
    return this.request(`/api/scopes/${id}`, {
      method: 'DELETE'
    });
  }

  async healthCheck() {
    return this.request('/api/health');
  }
}

const apiClient = new APIClient();

