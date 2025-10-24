// API Configuration
const API_BASE = 'http://localhost:8000';

// Utility Functions
const utils = {
  // API call helper
  async apiCall(endpoint, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    // If body is FormData, remove Content-Type header
    if (options.body instanceof FormData) {
      delete defaultOptions.headers['Content-Type'];
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
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

  isAuthenticated() {
    return !!this.getAuthToken();
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
    window.location.href = path;
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
      await this.apiCall('/api/v1/users/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthToken();
      this.clearUser();
      this.redirect('/index.html');
    }
  },
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = utils;
}
