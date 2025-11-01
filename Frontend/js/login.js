import utils from '../js/utils.js';

// Unified Login Form Handler
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');
  const roleSelect = document.getElementById('role');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = roleSelect.value;

    // Validate role selection
    if (!role) {
      utils.showAlert('Please select your role (Farmer or Customer)', 'warning');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

    try {
      // Login API call with role
      const loginData = await utils.apiCall('/api/v1/users/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          role,
        }),
      });

      // Save auth tokens and user data
      // Backend sets tokens as cookies. Save only user info from response.
      if (loginData.data && loginData.data.user) {
        utils.saveUser(loginData.data.user);
      }

      utils.showAlert('Login successful! Redirecting...', 'success');

      // Redirect based on role
      setTimeout(() => {
        if (role === 'farmer') {
          utils.redirect('farmer.html');
        } else if (role === 'customer') {
          utils.redirect('customer.html');
        }
      }, 1000);

    } catch (error) {
      utils.showAlert(error.message || 'Login failed. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });

  // Update button text based on role selection
  roleSelect.addEventListener('change', () => {
    const role = roleSelect.value;
    if (role) {
      submitBtn.textContent = `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`;
    } else {
      submitBtn.textContent = 'Login';
    }
  });
});
