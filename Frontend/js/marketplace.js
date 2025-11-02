import utils from '../js/utils.js';

// Marketplace - Browse and purchase produce
let contract = null;
let provider = null;
let signer = null;
let allProducts = [];
let cart = [];

// Contract ABI - Updated to match new contract
const CONTRACT_ABI = [
  "function getProduceDetails(uint256 _id) public view returns (uint256 id, string memory name, address originalFarmer, address currentSeller, string memory currentStatus, uint256 priceInWei, string memory originFarm, string memory qrCode, uint256 registrationTimestamp)",
  "function buyProduce(uint256 _id) public payable",
  "function getSaleHistory(uint256 _id) public view returns (tuple(uint256 ProduceId, address buyer, address seller, uint256 pricePaidInWei, uint256 SaleTimeStamp)[] memory)",
  "function nextProduceId() public view returns (uint256)",
  "function getProduceIdsByName(string memory _name) public view returns (uint256[] memory)"
];

const CONTRACT_ADDRESS = '0x...'; // Replace with your deployed contract address

// Initialize Web3 connection
async function initWeb3() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = await provider.getSigner();
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      return true;
    } catch (error) {
      console.error('Web3 initialization error:', error);
      return false;
    }
  } else {
    utils.showAlert('Please install MetaMask to use blockchain features', 'warning');
    return false;
  }
}

// Load cart from localStorage
function loadCart() {
  const savedCart = localStorage.getItem('kissan_cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartBadge();
  }
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem('kissan_cart', JSON.stringify(cart));
  updateCartBadge();
  updateCartModal();
}

// Update cart badge count
function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (cart.length > 0) {
    badge.textContent = cart.length;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// Add to cart
function addToCart(product) {
  // Check if already in cart
  const exists = cart.find(item => item.id === product.id);
  if (exists) {
    utils.showAlert('This item is already in your cart!', 'warning');
    return;
  }

  // Check if sold
  if (product.currentStatus === 'Sold') {
    utils.showAlert('This item is no longer available!', 'error');
    return;
  }

  cart.push(product);
  saveCart();
  utils.showAlert(`${product.name} added to cart!`, 'success');
}

// Remove from cart
function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
}

// Clear cart
function clearCart() {
  if (confirm('Are you sure you want to clear your cart?')) {
    cart = [];
    saveCart();
    utils.showAlert('Cart cleared!', 'success');
  }
}

// Open cart modal
function openCart() {
  document.getElementById('cart-modal').classList.add('active');
  updateCartModal();
}

// Close cart modal
function closeCart() {
  document.getElementById('cart-modal').classList.remove('active');
}

// Update cart modal content
function updateCartModal() {
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');

  if (cart.length === 0) {
    cartItems.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Your cart is empty</p>';
    cartTotal.textContent = '0 ETH';
    return;
  }

  let total = BigInt(0);
  const itemsHTML = cart.map(item => {
    total += BigInt(item.priceInWei);
    const priceInEth = ethers.formatEther(item.priceInWei);
    
    return `
      <div class="cart-item">
        <div>
          <div style="font-weight: 600; margin-bottom: 0.25rem;">${item.name}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">
            From: ${item.originFarm}
          </div>
          <div style="font-size: 0.875rem; color: var(--primary-color); margin-top: 0.25rem;">
            ${priceInEth} ETH
          </div>
        </div>
        <button 
          onclick="removeFromCart('${item.id}')" 
          class="btn btn-ghost"
          style="padding: 0.5rem; color: var(--error);"
        >
          🗑️
        </button>
      </div>
    `;
  }).join('');

  cartItems.innerHTML = itemsHTML;
  cartTotal.textContent = `${ethers.formatEther(total)} ETH`;
}

// Checkout - Purchase all items in cart
async function checkout() {
  if (cart.length === 0) {
    utils.showAlert('Your cart is empty!', 'warning');
    return;
  }

  if (!contract) {
    const initialized = await initWeb3();
    if (!initialized) {
      utils.showAlert('Please connect your wallet first', 'error');
      return;
    }
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  checkoutBtn.disabled = true;
  checkoutBtn.innerHTML = '<span class="spinner"></span> Processing...';

  try {
    // Process each item in cart
    for (const item of cart) {
      utils.showAlert(`Purchasing ${item.name}...`, 'warning');
      
      const tx = await contract.buyProduce(item.id, {
        value: item.priceInWei
      });
      
      await tx.wait();
      utils.showAlert(`${item.name} purchased successfully!`, 'success');
    }

    // Clear cart after successful purchase
    cart = [];
    saveCart();
    closeCart();
    
    // Reload products
    await loadProducts();
    
    utils.showAlert('All items purchased successfully!', 'success');
  } catch (error) {
    console.error('Checkout error:', error);
    utils.showAlert(error.message || 'Purchase failed. Please try again.', 'error');
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Checkout';
  }
}

// Load all products from blockchain
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">Loading products...</p>';

  try {
    if (!contract) {
      const initialized = await initWeb3();
      if (!initialized) {
        grid.innerHTML = '<p style="color: var(--error); grid-column: 1/-1; text-align: center;">Please connect your wallet to view products</p>';
        return;
      }
    }

    // Get the next produce ID to know how many items exist
    const nextId = await contract.nextProduceId();
    const totalItems = Number(nextId) - 1;

    if (totalItems === 0) {
      grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">No products available yet.</p>';
      return;
    }

    allProducts = [];

    // Fetch all products
    for (let i = 1; i <= totalItems; i++) {
      try {
        const details = await contract.getProduceDetails(i);
        allProducts.push({
          id: details[0].toString(),
          name: details[1],
          originalFarmer: details[2],
          currentSeller: details[3],
          currentStatus: details[4],
          priceInWei: details[5],
          originFarm: details[6],
          qrCode: details[7],
          registrationTimestamp: details[8]
        });
      } catch (error) {
        console.error(`Error loading product ${i}:`, error);
      }
    }

    displayProducts(allProducts);
  } catch (error) {
    console.error('Error loading products:', error);
    grid.innerHTML = '<p style="color: var(--error); grid-column: 1/-1; text-align: center;">Failed to load products. Please refresh the page.</p>';
  }
}

// Get reviews for specific produce
function getProduceReviews(produceId) {
  const saved = localStorage.getItem('produce_reviews');
  const allReviews = saved ? JSON.parse(saved) : [];
  return allReviews.filter(review => review.produceId === produceId);
}

// Display products in grid
function displayProducts(products) {
  const grid = document.getElementById('products-grid');

  if (products.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">No products found.</p>';
    return;
  }

  const productsHTML = products.map(product => {
    const priceInEth = ethers.formatEther(product.priceInWei);
    const isAvailable = product.currentStatus !== 'Sold';
    const statusClass = isAvailable ? 'status-available' : 'status-sold';
    const date = new Date(Number(product.registrationTimestamp) * 1000);

    // Get reviews for this product
    const reviews = getProduceReviews(product.id);
    const averageRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    return `
      <div class="product-card">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
          <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0;">${product.name}</h3>
          <span class="product-status ${statusClass}">${product.currentStatus}</span>
        </div>

        ${reviews.length > 0 ? `
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <span style="color: #ffd700; font-size: 1rem;">⭐ ${averageRating}</span>
            <span style="color: var(--text-secondary); font-size: 0.875rem;">
              (${reviews.length})
            </span>
          </div>
        ` : ''}

        <div style="display: grid; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem;">
          <div><strong>Origin:</strong> ${product.originFarm}</div>
          <div><strong>Farmer:</strong>
            <code style="font-size: 0.7rem; background-color: rgba(0,0,0,0.3); padding: 0.125rem 0.25rem; border-radius: 0.25rem;">
              ${product.originalFarmer.slice(0, 6)}...${product.originalFarmer.slice(-4)}
            </code>
          </div>
          <div><strong>Registered:</strong> ${date.toLocaleDateString()}</div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--border-color);">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Price</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary-color);">
              ${priceInEth} ETH
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button 
              onclick="viewProductDetails('${product.id}')" 
              class="btn btn-outline"
              style="padding: 0.5rem 0.75rem;"
            >
              View
            </button>
            ${isAvailable ? `
              <button 
                onclick='addToCart(${JSON.stringify(product).replace(/'/g, "&apos;")})' 
                class="btn btn-primary"
                style="padding: 0.5rem 0.75rem;"
              >
                🛒 Add
              </button>
            ` : `
              <button 
                class="btn btn-ghost" 
                disabled
                style="padding: 0.5rem 0.75rem; opacity: 0.5; cursor: not-allowed;"
              >
                Sold Out
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.innerHTML = productsHTML;
}

// View product details
function viewProductDetails(productId) {
  utils.redirect(`customer.html?id=${productId}`);
}

// Filter and search products
function filterProducts() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const statusFilter = document.getElementById('status-filter').value;

  let filtered = allProducts;

  // Filter by search term
  if (searchTerm) {
    filtered = filtered.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.id.includes(searchTerm) ||
      product.originFarm.toLowerCase().includes(searchTerm)
    );
  }

  // Filter by status
  if (statusFilter === 'available') {
    filtered = filtered.filter(product => product.currentStatus !== 'Sold');
  } else if (statusFilter === 'sold') {
    filtered = filtered.filter(product => product.currentStatus === 'Sold');
  }

  displayProducts(filtered);
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication via cookies
  if (!(await utils.checkAuth())) {
    utils.redirect('login.html');
    return;
  }

  // Load cart from storage
  loadCart();

  // Load products
  await loadProducts();

  // Setup event listeners
  document.getElementById('search-input').addEventListener('input', filterProducts);
  document.getElementById('status-filter').addEventListener('change', filterProducts);
  document.getElementById('refresh-btn').addEventListener('click', loadProducts);

  // Close modal when clicking outside
  document.getElementById('cart-modal').addEventListener('click', (e) => {
    if (e.target.id === 'cart-modal') {
      closeCart();
    }
  });
});

// Make functions globally available
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.openCart = openCart;
window.closeCart = closeCart;
window.checkout = checkout;
window.viewProductDetails = viewProductDetails;
