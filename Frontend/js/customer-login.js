// Customer Login Form Handler
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('customer-login-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

    try {
      // Login with username and password only (backend role is 'consumer')
      const loginData = await utils.apiCall('/api/v1/users/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          role: 'consumer',
        }),
      });

      // Save auth tokens and user data
      if (loginData.data.AccessToken) {
        utils.saveAuthToken(loginData.data.AccessToken);
      }
      if (loginData.data.user) {
        utils.saveUser(loginData.data.user);
      }

      // Redirect to customer dashboard
      utils.redirect('/customer.html');
    } catch (error) {
      utils.showAlert(error.message || 'Login failed. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });
});
