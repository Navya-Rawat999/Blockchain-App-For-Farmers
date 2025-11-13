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

    // Get form values
    const role = roleSelect.value;
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const profilePic = document.getElementById('profilePic').files[0];
    const idProof = document.getElementById('idProof').files[0];

    console.log('Form submission data:', {
      role, fullName, email, username, 
      profilePic: profilePic?.name, 
      idProof: idProof?.name
    });

    // Validate role selection
    if (!role) {
      utils.showAlert('Please select your role (Farmer or Customer)', 'warning');
      return;
    }

    // Validate basic fields
    if (!fullName || !email || !username || !password) {
      utils.showAlert('Please fill in all required fields', 'warning');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      utils.showAlert('Password must be at least 6 characters long', 'warning');
      return;
    }

    // Validate required files
    if (!profilePic) {
      utils.showAlert('Please upload a profile picture', 'warning');
      return;
    }

    // Validate profile picture file type
    if (!profilePic.type.startsWith('image/')) {
      utils.showAlert('Profile picture must be an image file', 'warning');
      return;
    }

    // Validate ID proof upload based on role
    if (!idProof) {
      const idType = role === 'farmer' ? 'Kisan card' : 'FSSAI licence';
      utils.showAlert(`Please upload your ${idType}`, 'warning');
      return;
    }

    // Show loading state
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

      // Log form data for debugging
      console.log('Submitting registration data...');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: ${value.name} (${value.type}, ${value.size} bytes)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      // Make API call
      const result = await utils.apiCall('/users/register', {
        method: 'POST',
        body: formData,
      });

      console.log('Registration successful:', result);

      // Show success message
      utils.showAlert('Account created successfully! Redirecting to login...', 'success');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        utils.redirect('login.html');
      }, 2000);

    } catch (error) {
      console.error('Registration error details:', error);
      
      // Show detailed error message
      let errorMessage = 'Failed to create account';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      utils.showAlert(errorMessage, 'error');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      const buttonText = role === 'farmer' ? 'Create Farmer Account' : 
                        role === 'customer' ? 'Create Customer Account' : 'Create Account';
      submitBtn.textContent = buttonText;
    }
  });
});
