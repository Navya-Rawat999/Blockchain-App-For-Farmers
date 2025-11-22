import utils from './utils.js';

// Update hero button display based on auth status
async function updateHeroButtons() {
  const walletBtn = document.querySelector('.wallet-btn');
  const loginBtn = document.querySelector('.login-btn');
  
  try {
    const isAuth = await utils.checkAuth();
    
    if (isAuth) {
      // User is logged in - show wallet button
      walletBtn.style.display = 'inline-block';
      loginBtn.style.display = 'none';
    } else {
      // User is not logged in - show login button
      walletBtn.style.display = 'none';
      loginBtn.style.display = 'inline-block';
    }
  } catch (error) {
    console.error('Auth check error:', error);
    // Default to showing login button
    walletBtn.style.display = 'none';
    loginBtn.style.display = 'inline-block';
  }
}

function initScrollAnimations() {
  const animatedNodes = document.querySelectorAll('[data-animate]');
  if (!animatedNodes.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animatedNodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px 0px -10% 0px'
  });

  animatedNodes.forEach((node) => observer.observe(node));
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  updateHeroButtons();
  initScrollAnimations();
});
