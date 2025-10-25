// Navigation component - included on all pages
function initNavbar() {
  const navbarHTML = `
    <nav class="navbar">
      <div class="navbar-container">
        <a href="index.html" class="navbar-brand">Kissan Sathi 🌾</a>
        <div class="navbar-links">
          <a href="scan.html" class="btn btn-ghost">Scan</a>
          <a href="farmer.html" class="btn btn-ghost">Farmer</a>
          <a href="customer.html" class="btn btn-ghost">Customer</a>
          <a href="login.html" class="btn btn-outline btn-sm">Login</a>
          <a href="register.html" class="btn btn-outline btn-sm">Register</a>
          <a href="wallet.html" class="btn btn-primary">Connect Wallet</a>
        </div>
      </div>
    </nav>
  `;

  const navbarContainer = document.getElementById('navbar');
  if (navbarContainer) {
    navbarContainer.innerHTML = navbarHTML;
  }
}

// Initialize navbar when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavbar);
} else {
  initNavbar();
}
