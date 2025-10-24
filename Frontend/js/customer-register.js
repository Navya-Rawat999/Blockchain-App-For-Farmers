// Customer Registration Handler
// Submits multipart form: profilePic + valid_id_proof at registration

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('customer-register-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const profilePic = document.getElementById('profilePic').files[0];
    const fssaiLicense = document.getElementById('fssaiLicense').files[0];

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

    try {
      const fd = new FormData();
      fd.append('fullName', fullName);
      fd.append('email', email);
      fd.append('username', username);
      fd.append('password', password);
      fd.append('role', 'consumer'); // backend expects 'consumer'
      fd.append('profilePic', profilePic);
      fd.append('valid_id_proof', fssaiLicense);

      await utils.apiCall('/api/v1/users/register', {
        method: 'POST',
        body: fd,
      });

      utils.showAlert('Registration successful! Please login to continue.', 'success');
      setTimeout(() => utils.redirect('/customer-login.html'), 800);
    } catch (error) {
      utils.showAlert(error.message || 'Registration failed. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });
});
