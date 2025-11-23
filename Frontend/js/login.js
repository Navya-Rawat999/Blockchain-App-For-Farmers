import utils from '../js/utils.js';

// Unified Login Form Handler
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');
  const roleSelect = document.getElementById('role');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  // Clear error styling on input
  [usernameInput, passwordInput, roleSelect].forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('input-error');
      clearErrorMessage();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const role = roleSelect.value;

    // Clear previous errors
    clearErrorMessage();
    clearInputErrors();

    // Validate role selection
    if (!role) {
      showError('Please select your role (Farmer or Customer)', roleSelect);
      return;
    }

    // Validate username
    if (!username) {
      showError('Please enter your username or email', usernameInput);
      return;
    }

    // Validate password
    if (!password) {
      showError('Please enter your password', passwordInput);
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

    try {
      // Login API call with role
      const loginData = await utils.apiCall('/users/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          role,
        }),
      });

      // Save auth tokens and user data
      if (loginData.data && loginData.data.user) {
        utils.saveUser(loginData.data.user);
        console.log('User saved:', loginData.data.user);
      }
      
      // Save the access token to localStorage for Authorization header
      if (loginData.data && loginData.data.AccessToken) {
        utils.saveAuthToken(loginData.data.AccessToken);
        console.log('Access token saved');
      }

      utils.showAlert('Login successful! Redirecting...', 'success');

      // Redirect based on role immediately
      console.log('Redirecting to', role, 'dashboard...');
      setTimeout(() => {
        if (role === 'farmer') {
          utils.redirect('farmer.html');
        } else if (role === 'customer') {
          utils.redirect('customer.html');
        }
      }, 500);

    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      let errorInput = null;
      
      // Parse error message for specific issues
      if (error.message) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes('no') && msg.includes('account found')) {
          errorMessage = error.message;
          errorInput = usernameInput;
        } else if (msg.includes('incorrect password')) {
          errorMessage = error.message;
          errorInput = passwordInput;
        } else if (msg.includes('role')) {
          errorMessage = error.message;
          errorInput = roleSelect;
        } else if (msg.includes('username') || msg.includes('email')) {
          errorMessage = error.message;
          errorInput = usernameInput;
        } else {
          errorMessage = error.message;
        }
      }
      
      showError(errorMessage, errorInput);
      
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      const role = roleSelect.value;
      if (role) {
        submitBtn.textContent = `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`;
      } else {
        submitBtn.textContent = 'Login';
      }
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

  // Helper functions
  function showError(message, inputElement = null) {
    utils.showAlert(message, 'error');
    
    if (inputElement) {
      inputElement.classList.add('input-error');
      inputElement.focus();
    }
  }

  function clearErrorMessage() {
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
      alertContainer.innerHTML = '';
    }
  }

  function clearInputErrors() {
    [usernameInput, passwordInput, roleSelect].forEach(input => {
      input.classList.remove('input-error');
    });
  }
});
