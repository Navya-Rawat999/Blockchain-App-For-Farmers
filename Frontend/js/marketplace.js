import utils from '../js/utils.js';
import centralizedWallet, { CONTRACT_ABI } from '../js/wallet.js';
import { ethers } from 'ethers';

// Marketplace - Browse and purchase produce
let allProducts = [];
let currentPage = 1;
let totalPages = 1;
let cart = [];

// Load all products from database
async function loadProducts(page = 1, search = '', status = 'available') {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">Loading products...</p>';

  try {
    const searchParams = new URLSearchParams({
      page: page,
      limit: 12,
      search: search,
      status: status,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    const response = await utils.apiCall(`/api/v1/produce/marketplace?${searchParams}`, {
      method: 'GET'
    });

    if (response.success) {
      allProducts = response.data.items || [];
      currentPage = response.data.pagination.currentPage;
      totalPages = response.data.pagination.totalPages;
      
      displayProducts(allProducts);
      updatePagination(response.data.pagination);
    } else {
      throw new Error(response.message || 'Failed to load products');
    }

  } catch (error) {
    console.error('Error loading products:', error);
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
        <div style="color: var(--error); font-size: 1.125rem; margin-bottom: 1rem;">Failed to load products</div>
        <button onclick="window.location.reload()" class="btn btn-primary">🔄 Retry</button>
      </div>
    `;
  }
}

// Display products in grid
function displayProducts(products) {
  const grid = document.getElementById('products-grid');

  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🌾</div>
        <h3>No products available</h3>
        <p>Check back later for fresh produce from our farmers!</p>
      </div>
    `;
    return;
  }

  const productsHTML = products.map(product => {
    const priceInEth = ethers.formatEther(product.priceInWei || '0');
    const isAvailable = product.isAvailable && product.currentStatus !== 'Sold';
    const statusClass = isAvailable ? 'status-available' : 'status-sold';
    const date = new Date(product.createdAt);

    // Get reviews for this product (from localStorage)
    const reviews = getProduceReviews(product.id || product.blockchainId);
    const averageRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    return `
      <div class="product-card">
        <div class="product-image">
          🌾
        </div>
        
        <div class="product-header">
          <h3 class="product-name">${product.name}</h3>
          <span class="product-status ${statusClass}">${product.currentStatus}</span>
        </div>

        ${reviews.length > 0 ? `
          <div class="product-rating">
            <span style="color: #ffd700;">⭐ ${averageRating}</span>
            <span style="color: var(--text-secondary); font-size: 0.875rem;">
              (${reviews.length} review${reviews.length !== 1 ? 's' : ''})
            </span>
          </div>
        ` : ''}

        <div class="product-details">
          <div class="detail-row">
            <span class="detail-label">Origin:</span>
            <span class="detail-value">${product.originFarm}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Farmer:</span>
            <span class="detail-value farmer-address">
              ${product.originalFarmer ? `${product.originalFarmer.slice(0, 8)}...` : 'Unknown'}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">QR Code:</span>
            <span class="detail-value">${product.qrCode || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Listed:</span>
            <span class="detail-value">${date.toLocaleDateString()}</span>
          </div>
        </div>

        <div class="product-footer">
          <div class="product-price">
            <div class="price-label">Price</div>
            <div class="price-value">${priceInEth} ETH</div>
            <div class="price-usd">~$${(parseFloat(priceInEth) * 2500).toFixed(2)}</div>
          </div>
          
          <div class="product-actions">
            <button 
              class="btn btn-outline view-product-btn"
              onclick="viewProduct('${product.id || product.blockchainId}')"
            >
              👁️ View
            </button>
            ${isAvailable ? `
              <button 
                class="btn btn-primary add-to-cart-btn"
                onclick="addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})"
              >
                🛒 Add to Cart
              </button>
            ` : `
              <button class="btn btn-ghost" disabled>
                ❌ Sold Out
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.innerHTML = productsHTML;
}

// Update pagination controls
function updatePagination(pagination) {
  const paginationEl = document.getElementById('pagination');
  if (!paginationEl) return;

  if (pagination.totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let paginationHTML = '';

  // Previous button
  if (pagination.hasPrev) {
    paginationHTML += `<button onclick="loadProducts(${pagination.currentPage - 1})" class="btn btn-outline">← Previous</button>`;
  }

  // Page numbers
  const startPage = Math.max(1, pagination.currentPage - 2);
  const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === pagination.currentPage;
    paginationHTML += `
      <button 
        onclick="loadProducts(${i})" 
        class="btn ${isActive ? 'btn-primary' : 'btn-outline'}"
      >
        ${i}
      </button>
    `;
  }

  // Next button
  if (pagination.hasNext) {
    paginationHTML += `<button onclick="loadProducts(${pagination.currentPage + 1})" class="btn btn-outline">Next →</button>`;
  }

  paginationEl.innerHTML = paginationHTML;
}

// Search products
function searchProducts() {
  const searchTerm = document.getElementById('search-input').value.trim();
  loadProducts(1, searchTerm);
}

// Get reviews from localStorage
function getProduceReviews(produceId) {
  const saved = localStorage.getItem('produce_reviews');
  const allReviews = saved ? JSON.parse(saved) : [];
  return allReviews.filter(review => review.produceId === produceId);
}

// Cart management
function loadCart() {
  const savedCart = localStorage.getItem('kissan_cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartBadge();
  }
}

function saveCart() {
  localStorage.setItem('kissan_cart', JSON.stringify(cart));
  updateCartBadge();
  updateCartModal();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (cart.length > 0) {
    badge.textContent = cart.length;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function addToCart(product) {
  const exists = cart.find(item => (item.id || item.blockchainId) === (product.id || product.blockchainId));
  if (exists) {
    utils.showAlert('This item is already in your cart!', 'warning');
    return;
  }

  if (product.currentStatus === 'Sold' || !product.isAvailable) {
    utils.showAlert('This item is no longer available!', 'error');
    return;
  }

  cart.push(product);
  saveCart();
  utils.showAlert(`${product.name} added to cart!`, 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(item => (item.id || item.blockchainId) !== productId);
  saveCart();
}

// View product details
function viewProduct(productId) {
  // Increment view count
  utils.apiCall(`/api/v1/produce/${productId}/view`, { method: 'POST' }).catch(console.error);
  
  // Navigate to product page
  utils.redirect(`product.html?id=${productId}`);
}

// Cart modal functions
function openCart() {
  const modal = document.getElementById('cart-modal');
  if (modal) {
    modal.style.display = 'flex';
    updateCartModal();
  }
}

function closeCart() {
  const modal = document.getElementById('cart-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function updateCartModal() {
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');

  if (cart.length === 0) {
    cartItems.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Your cart is empty</p>';
    cartTotal.textContent = '0 ETH';
    return;
  }

  let total = BigInt(0);
  const itemsHTML = cart.map(item => {
    total += BigInt(item.priceInWei || '0');
    const priceInEth = ethers.formatEther(item.priceInWei || '0');
    
    return `
      <div class="cart-item">
        <div>
          <div class="cart-item-title">${item.name}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">
            From: ${item.originFarm}
          </div>
          <div class="cart-item-price">${priceInEth} ETH</div>
        </div>
        <button 
          onclick="removeFromCart('${item.id || item.blockchainId}')"
          class="remove-cart-btn"
        >
          🗑️
        </button>
      </div>
    `;
  }).join('');

  cartItems.innerHTML = itemsHTML;
  cartTotal.textContent = `${ethers.formatEther(total)} ETH`;
}

// Checkout function
async function checkout() {
  if (cart.length === 0) {
    utils.showAlert('Your cart is empty!', 'warning');
    return;
  }

  await centralizedWallet.waitForReady();
  
  if (!centralizedWallet.isWalletConnected()) {
    utils.showAlert('Please connect your wallet first', 'error');
    return;
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = 'Processing...';

  try {
    for (const item of cart) {
      // Navigate to transaction page for each item
      sessionStorage.setItem('transactionProductId', item.id || item.blockchainId);
      utils.redirect(`transaction.html?productId=${item.id || item.blockchainId}`);
      break; // Process one item at a time
    }
  } catch (error) {
    console.error('Checkout error:', error);
    utils.showAlert('Checkout failed. Please try again.', 'error');
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Checkout';
  }
}

function clearCart() {
  if (confirm('Are you sure you want to clear your cart?')) {
    cart = [];
    saveCart();
    utils.showAlert('Cart cleared!', 'success');
  }
}

// Global functions
window.searchProducts = searchProducts;
window.viewProduct = viewProduct;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.openCart = openCart;
window.closeCart = closeCart;
window.checkout = checkout;
window.clearCart = clearCart;
window.loadProducts = loadProducts;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await utils.checkAuth())) {
    utils.redirect('login.html');
    return;
  }

  // Load cart from storage
  loadCart();

  // Load initial products
  await loadProducts();

  // Setup search functionality
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchProducts();
      }
    });
  }

  // Close modal when clicking outside
  const cartModal = document.getElementById('cart-modal');
  if (cartModal) {
    cartModal.addEventListener('click', (e) => {
      if (e.target.id === 'cart-modal') {
        closeCart();
      }
    });
  }
});
