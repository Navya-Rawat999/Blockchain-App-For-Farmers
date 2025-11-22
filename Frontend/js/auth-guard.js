// Immediate authentication check - runs before page content loads
// This prevents users from seeing protected pages even for a moment

(function() {
  'use strict';
  
  // Check if user has authentication token
  const token = localStorage.getItem('AccessToken');
  const userStr = localStorage.getItem('user');
  
  // If no token or user, redirect to login
  if (!token || !userStr) {
    window.location.replace('/HTML/login.html');
    return;
  }
  
  // Parse user data
  let user;
  try {
    user = JSON.parse(userStr);
  } catch (e) {
    console.error('Invalid user data');
    localStorage.removeItem('AccessToken');
    localStorage.removeItem('user');
    window.location.replace('/HTML/login.html');
    return;
  }
  
  // Check role-based access if needed
  const currentPage = window.location.pathname;
  
  if (currentPage.includes('farmer.html') && user.role !== 'farmer') {
    alert('Access denied. Farmer account required.');
    window.location.replace('/HTML/index.html');
    return;
  }
  
  if (currentPage.includes('customer.html') && user.role !== 'customer') {
    alert('Access denied. Customer account required.');
    window.location.replace('/HTML/index.html');
    return;
  }
})();
