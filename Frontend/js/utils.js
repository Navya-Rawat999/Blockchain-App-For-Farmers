// API Configuration
const API_BASE = 'http://localhost:8000/api/v1';

// Configure axios defaults
axios.defaults.baseURL = API_BASE;
axios.defaults.withCredentials = true;

// Utility Functions
const utils = {
  // API call helper using axios
  async apiCall(endpoint, options = {}) {
    try {
      const { method = 'GET', body, headers = {} } = options;
      
      const config = {
        method,
        url: endpoint,
        headers,
        ...options
      };

      // Handle different body types
      if (body instanceof FormData) {
        config.data = body;
        // Let axios set the Content-Type for FormData
      } else if (body) {
        config.data = typeof body === 'string' ? JSON.parse(body) : body;
        config.headers['Content-Type'] = 'application/json';
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        throw new Error(error.response.data.message || `HTTP error! status: ${error.response.status}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Network error: Unable to reach server');
      } else {
        // Something else happened
        throw new Error(error.message || 'An unexpected error occurred');
      }
    }
  },

  // Auth helpers
  saveAuthToken(token) {
    localStorage.setItem('accessToken', token);
  },

  getAuthToken() {
    return localStorage.getItem('accessToken');
  },

  clearAuthToken() {
    localStorage.removeItem('accessToken');
  },

  // Check authentication by verifying current-user endpoint which uses cookies
  async checkAuth() {
    try {
      const res = await this.apiCall('/api/v1/users/current-user', { method: 'GET' });
      const user = res?.data || null;
      if (user) {
        this.saveUser(user);
        return true;
      }
      this.clearUser();
      return false;
    } catch (err) {
      // Not authenticated or network error
      this.clearUser();
      return false;
    }
  },

  // Compatibility helper (synchronous) — falls back to checking stored user
  isAuthenticated() {
    const user = this.getUser();
    return !!user;
  },

  // User data helpers
  saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  clearUser() {
    localStorage.removeItem('user');
  },

  // Navigation
  redirect(path) {
    // Remove leading slash for relative paths
    const relativePath = path.startsWith('/') ? path.substring(1) : path;
    window.location.href = relativePath;
  },

  // Show/hide elements
  showElement(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  },

  hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  },

  // Show alerts
  showAlert(message, type = 'error') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertContainer.appendChild(alert);

    setTimeout(() => {
      alert.remove();
    }, 5000);
  },

  // Logout
  async logout() {
    try {
      // Call backend logout which will clear cookies server-side
      await this.apiCall('/api/v1/users/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthToken();
      this.clearUser();
      this.redirect('index.html');
    }
  },
};

// Export utils as default
export default utils;
