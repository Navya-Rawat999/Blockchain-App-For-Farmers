import utils from '../js/utils.js';

// Navigation component - included on all pages. Dynamically shows links based on auth.
async function initNavbar() {
  // Always check auth on navbar init to ensure tokens are fresh
  const isAuth = await utils.checkAuth();
  const user = utils.getUser();

  const authLinks = isAuth ? `
      <a href="marketplace.html" class="btn btn-ghost">🛒 Marketplace</a>
      <a href="scan.html" class="btn btn-ghost">📱 Scan</a>
      <a href="farmer.html" class="btn btn-ghost">🧑‍🌾 Farmer</a>
      <a href="customer.html" class="btn btn-ghost">👤 Customer</a>
      <a href="profile.html" class="btn btn-ghost">⚙️ Profile</a>
      <a href="wallet.html" class="btn btn-primary">🦊 Wallet</a>
      <button id="logout-btn" class="btn btn-outline btn-sm">Logout</button>
    ` : `
      <a href="marketplace.html" class="btn btn-ghost">🛒 Marketplace</a>
      <a href="scan.html" class="btn btn-ghost">📱 Scan</a>
      <a href="farmer.html" class="btn btn-ghost">🧑‍🌾 Farmer</a>
      <a href="customer.html" class="btn btn-ghost">👤 Customer</a>
      <a href="login.html" class="btn btn-outline btn-sm">Login</a>
      <a href="register.html" class="btn btn-outline btn-sm">Register</a>
    `;

  const navbarHTML = `
    <nav class="navbar">
      <div class="navbar-container">
        <a href="index.html" class="navbar-brand">Kissan Sathi 🌾</a>
        <div class="navbar-links">
          ${authLinks}
        </div>
      </div>
    </nav>
  `;

  const navbarContainer = document.getElementById('navbar');
  if (navbarContainer) {
    navbarContainer.innerHTML = navbarHTML;

    // Attach logout handler if present - use more robust event handling
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
      
      // Also make it available globally for debugging
      window.handleLogout = handleLogout;
    }
  }
}

// Separate logout function for better error handling
async function handleLogout() {
  try {
    // Show loading state
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Logging out...';
    }

    // Disconnect wallet if connected
    if (window.walletService && window.walletService.isConnected) {
      try {
        await window.walletService.disconnectWallet();
      } catch (walletError) {
        console.error('Wallet disconnect error:', walletError);
        // Continue with logout even if wallet disconnect fails
      }
    }

    // Call backend logout API
    await utils.logout();
    
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if API call fails, clear local data and redirect
    utils.clearAuthToken();
    utils.clearUser();
    
    // Show error but still redirect
    if (utils.showAlert) {
      utils.showAlert('Logout completed with errors', 'warning');
    }
    
    // Force redirect after a short delay
    setTimeout(() => {
      utils.redirect('login.html');
    }, 1000);
  }
}

// Initialize navbar when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavbar);
} else {
  initNavbar();
}

// Export for global access
window.initNavbar = initNavbar;
window.handleLogout = handleLogout;
