// Use fetch API with axios-like interface to avoid module resolution issues
// This completely bypasses any axios module resolution

// API Configuration
const API_BASE = import.meta?.env?.BACKEND_API_BASE_URL || 'http://localhost:8000/api/v1';

// Create axios-like interface using fetch
const createAxiosInterface = () => {
  const instance = async (config) => {
    const { url, method = 'GET', data, headers = {} } = config;
    
    const fetchConfig = {
      method: method.toUpperCase(),
      credentials: 'include', // equivalent to withCredentials: true
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      if (data instanceof FormData) {
        fetchConfig.body = data;
        delete fetchConfig.headers['Content-Type']; // Let browser set it for FormData
      } else {
        fetchConfig.body = typeof data === 'string' ? data : JSON.stringify(data);
      }
    }

    const response = await fetch(url, fetchConfig);
    
    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage;
      try {
        const parsed = JSON.parse(errorData);
        errorMessage = parsed.message || `HTTP error! status: ${response.status}`;
      } catch {
        errorMessage = errorData || `HTTP error! status: ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return { data: result };
  };

  // Add default properties
  instance.defaults = {
    baseURL: API_BASE,
    withCredentials: true
  };

  return instance;
};

// Create the axios-like instance
const axios = window.axios || createAxiosInterface();

// Utility Functions
const utils = {
  // API call helper using our axios-like interface
  async apiCall(endpoint, options = {}) {
    try {
      const { method = 'GET', body, headers = {}, ...otherOptions } = options;
      
      // Ensure endpoint doesn't have duplicate /api/v1
      const cleanEndpoint = endpoint.startsWith('/api/v1') ? endpoint.substring(7) : endpoint;
      
      // Add auth token if available
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Construct full URL
      const fullUrl = `${API_BASE}${cleanEndpoint}`;
      
      const config = {
        url: fullUrl,
        method,
        headers: { ...headers },
        ...otherOptions
      };

      // Handle different body types
      if (body instanceof FormData) {
        config.data = body;
      } else if (body) {
        config.data = typeof body === 'string' ? JSON.parse(body) : body;
        config.headers['Content-Type'] = 'application/json';
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      // Handle fetch errors or our custom errors
      if (error.message.includes('HTTP error!') || error.message.includes('Network error')) {
        throw error;
      } else {
        // Generic error handling
        throw new Error(error.message || 'An unexpected error occurred');
      }
    }
  },

  // Auth helpers
  saveAuthToken(token) {
    localStorage.setItem('AccessToken', token);
  },

  getAuthToken() {
    return localStorage.getItem('AccessToken');
  },

  clearAuthToken() {
    localStorage.removeItem('AccessToken');
  },

  // Refresh access token using refresh token from cookies
  async refreshAccessToken() {
    try {
      const res = await this.apiCall('/users/refresh-token', { method: 'POST' });
      if (res?.data?.AccessToken) {
        this.saveAuthToken(res.data.AccessToken);
        return true;
      }
      return false;
    } catch (error) {
      // Silently fail - this is expected when not logged in
      return false;
    }
  },

  // Check authentication by verifying current-user endpoint which uses cookies
  async checkAuth() {
    try {
      // Only try to refresh if we have an existing token or user
      const existingToken = this.getAuthToken();
      const existingUser = this.getUser();
      
      if (existingToken || existingUser) {
        // Try to refresh the access token using refresh token from cookies
        await this.refreshAccessToken();
      }
      
      // Try to fetch current user
      const res = await this.apiCall('/users/current-user', { method: 'GET' });
      const user = res?.data || null;
      if (user) {
        this.saveUser(user);
        return true;
      }
      this.clearUser();
      this.clearAuthToken();
      return false;
    } catch (err) {
      // Not authenticated or network error - clear everything
      this.clearUser();
      this.clearAuthToken();
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
      console.log('Starting logout process...');
      
      // Call backend logout which will clear cookies server-side
      await this.apiCall('/users/logout', { method: 'POST' });
      
      console.log('Backend logout successful');
    } catch (error) {
      console.error('Backend logout error:', error);
      // Don't throw here - we still want to clear local data
    }
    
    // Always clear local data regardless of API success
    try {
      this.clearAuthToken();
      this.clearUser();
      
      // Clear any other stored data
      localStorage.removeItem('kissan_cart');
      localStorage.removeItem('produce_reviews');
      localStorage.removeItem('saved_wallet_address');
      
      console.log('Local data cleared');
      
      // Show success message
      if (this.showAlert) {
        this.showAlert('Logged out successfully', 'success');
      }
      
      // Redirect to login page
      setTimeout(() => {
        this.redirect('login.html');
      }, 500);
      
    } catch (localError) {
      console.error('Error clearing local data:', localError);
      
      // Force redirect even if local clearing fails
      window.location.href = 'login.html';
    }
  },
};

// Export utils as default
export default utils;
