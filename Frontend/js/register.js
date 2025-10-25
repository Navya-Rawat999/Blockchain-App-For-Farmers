import utils from '../js/utils.js';

// Unified Registration Handler
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('submit-btn');
  const roleSelect = document.getElementById('role');
  const idProofGroup = document.getElementById('id-proof-group');
  const idProofLabel = document.getElementById('id-proof-label');
  const idProofInput = document.getElementById('idProof');
  const idProofHelp = document.getElementById('id-proof-help');

  // Handle role selection changes
  roleSelect.addEventListener('change', () => {
    const selectedRole = roleSelect.value;
    
    if (selectedRole === 'farmer') {
      idProofGroup.style.display = 'block';
      idProofLabel.textContent = 'Kisan card photo';
      idProofInput.required = true;
      idProofInput.setAttribute('accept', 'image/*,.pdf');
      idProofHelp.textContent = 'Upload your Kisan card (images or PDF accepted). Used for farmer verification.';
      submitBtn.textContent = 'Create Farmer Account';
    } else if (selectedRole === 'customer') {
      idProofGroup.style.display = 'block';
      idProofLabel.textContent = 'FSSAI licence photo';
      idProofInput.required = true;
      idProofInput.setAttribute('accept', 'image/*,.pdf');
      idProofHelp.textContent = 'Upload your FSSAI licence (images or PDF accepted). Used for customer verification.';
      submitBtn.textContent = 'Create Customer Account';
    } else {
      idProofGroup.style.display = 'none';
      idProofInput.required = false;
      idProofInput.value = '';
      submitBtn.textContent = 'Create Account';
    }
  });

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const role = roleSelect.value;
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const profilePic = document.getElementById('profilePic').files[0];
    const idProof = document.getElementById('idProof').files[0];

    // Validate role selection
    if (!role) {
      utils.showAlert('Please select your role (Farmer or Customer)', 'warning');
      return;
    }

    // Validate required files
    if (!profilePic) {
      utils.showAlert('Please upload a profile picture', 'warning');
      return;
    }

    // Validate ID proof upload based on role
    if (!idProof) {
      const idType = role === 'farmer' ? 'Kisan card' : 'FSSAI licence';
      utils.showAlert(`Please upload your ${idType}`, 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('username', username);
      formData.append('password', password);
      formData.append('role', role);
      formData.append('profilePic', profilePic);
      formData.append('valid_id_proof', idProof); // Backend expects this field name

      // Make API call
      await utils.apiCall('/api/v1/users/register', {
        method: 'POST',
        body: formData,
      });

      utils.showAlert('Registration successful! Please login to continue.', 'success');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        utils.redirect('login.html');
      }, 1500);

    } catch (error) {
      utils.showAlert(error.message || 'Registration failed. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = role ? `Create ${role.charAt(0).toUpperCase() + role.slice(1)} Account` : 'Create Account';
    }
  });
});
