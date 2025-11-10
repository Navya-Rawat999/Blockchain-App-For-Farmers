import utils from '../js/utils.js';
import centralizedWallet from '../js/wallet.js';

// Customer Dashboard - View and purchase produce using centralized wallet
const CONTRACT_ABI = [
  "function getProduceDetails(uint256 _id) public view returns (uint256 id, string memory name, address originalFarmer, address currentSeller, string memory currentStatus, uint256 priceInWei, string memory originFarm, string memory qrCode, uint256 registrationTimestamp)",
  "function buyProduce(uint256 _id) public payable",
  "function getSaleHistory(uint256 _id) public view returns (tuple(uint256 ProduceId, address buyer, address seller, uint256 pricePaidInWei, uint256 SaleTimeStamp)[] memory)"
];

// Setup event listeners for dynamically created buttons
function setupDynamicEventListeners() {
  document.addEventListener('click', (e) => {
    // Handle buy produce buttons
    if (e.target.classList.contains('buy-produce-btn')) {
      const produceId = e.target.dataset.produceId;
      const priceInWei = e.target.dataset.priceInWei;
      buyProduce(produceId, priceInWei);
    }
    
    // Handle rating stars
    if (e.target.classList.contains('star')) {
      const rating = parseInt(e.target.dataset.rating);
      setRating(rating);
    }
    
    // Handle submit review
    if (e.target.id === 'submit-review-btn') {
      const produceId = e.target.dataset.produceId;
      submitReview(produceId);
    }
    
    // Handle close modal
    if (e.target.classList.contains('close-rating-modal')) {
      closeRatingModal();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await utils.checkAuth())) {
    utils.redirect('login.html');
    return;
  }

  const user = utils.getUser();
  if (user && user.role !== 'customer') {
    utils.showAlert('Access denied. Customer account required.', 'error');
    utils.redirect('index.html');
    return;
  }

  // Setup dynamic event listeners
  setupDynamicEventListeners();

  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-produce');

  searchBtn.addEventListener('click', async () => {
    const produceId = searchInput.value;
    if (!produceId) {
      utils.showAlert('Please enter a produce ID', 'warning');
      return;
    }

    await viewProduceDetails(produceId);
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });
});

// View produce details from blockchain
async function viewProduceDetails(produceId) {
  const detailsContainer = document.getElementById('produce-details');
  detailsContainer.innerHTML = '<p style="color: var(--text-secondary);">Loading produce details...</p>';

  try {
    await centralizedWallet.waitForReady();
    
    if (!centralizedWallet.isWalletConnected()) {
      utils.showAlert('Please connect your wallet to view details', 'error');
      detailsContainer.innerHTML = '<p style="color: var(--error);">Please connect your wallet to view produce details.</p>';
      return;
    }

    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to smart contract');
    }

    const details = await contract.getProduceDetails(produceId);
    
    const priceInEth = window.ethers.formatEther(details[5]);
    const date = new Date(Number(details[8]) * 1000);
    
    const reviews = getProduceReviews(produceId);
    const averageRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    detailsContainer.innerHTML = `
      <div class="card" style="background-color: var(--bg-dark); border: 2px solid var(--border-color);">
        <h3 style="font-size: 1.25rem; margin-bottom: 1rem; color: var(--primary-color);">${details[1]}</h3>
        
        ${reviews.length > 0 ? `
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <span style="color: #ffd700; font-size: 1.2rem;">⭐ ${averageRating}</span>
            <span style="color: var(--text-secondary);">(${reviews.length} review${reviews.length !== 1 ? 's' : ''})</span>
          </div>
        ` : ''}
        
        <div style="display: grid; gap: 0.75rem;">
          <div><strong>Produce ID:</strong> ${details[0].toString()}</div>
          <div><strong>Origin Farm:</strong> ${details[6]}</div>
          <div><strong>Status:</strong> 
            <span style="padding: 0.25rem 0.5rem; background-color: var(--success); border-radius: 0.25rem; font-size: 0.875rem;">
              ${details[4]}
            </span>
          </div>
          <div><strong>Price:</strong> ${priceInEth} ETH</div>
          <div><strong>Original Farmer:</strong> 
            <code style="font-size: 0.75rem; background-color: rgba(0,0,0,0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">
              ${details[2]}
            </code>
          </div>
          <div><strong>Current Seller:</strong> 
            <code style="font-size: 0.75rem; background-color: rgba(0,0,0,0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">
              ${details[3]}
            </code>
          </div>
          <div><strong>QR Code Data:</strong> ${details[7]}</div>
          <div><strong>Registered:</strong> ${date.toLocaleString()}</div>
        </div>

        ${details[4] !== 'Sold' ? `
          <button 
            class="btn btn-primary mt-3 buy-produce-btn" 
            style="width: 100%;"
            data-produce-id="${produceId}"
            data-price-in-wei="${details[5].toString()}"
          >
            Purchase for ${priceInEth} ETH
          </button>
        ` : `
          <div class="alert alert-warning mt-3">
            This produce has already been sold.
          </div>
        `}
      </div>
      
      ${displayReviews(reviews)}
    `;

    await loadSaleHistory(produceId);
  } catch (error) {
    console.error('Error fetching produce details:', error);
    detailsContainer.innerHTML = `
      <div class="alert alert-error">
        Failed to load produce details. Make sure the ID is valid and you're connected to the correct network.
      </div>
    `;
  }
}

// Purchase produce
async function buyProduce(produceId, priceInWei) {
  try {
    if (!centralizedWallet.isWalletConnected()) {
      utils.showAlert('Please connect your wallet first', 'error');
      return;
    }

    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to smart contract');
    }

    const tx = await contract.buyProduce(produceId, {
      value: priceInWei
    });
    
    utils.showAlert('Purchase transaction submitted. Waiting for confirmation...', 'warning');
    
    await tx.wait();
    utils.showAlert('Purchase successful!', 'success');
    
    showRatingModal(produceId);
    await viewProduceDetails(produceId);
  } catch (error) {
    console.error('Purchase error:', error);
    utils.showAlert(error.message || 'Purchase failed. Please try again.', 'error');
  }
}

// Set rating stars
window.setRating = function(rating) {
  const stars = document.querySelectorAll('.star');
  stars.forEach((star, index) => {
    if (index < rating) {
      star.style.color = '#ffd700';
      star.dataset.selected = 'true';
    } else {
      star.style.color = '#ddd';
      star.dataset.selected = 'false';
    }
  });
  
  document.getElementById('rating-modal').dataset.rating = rating;
}

// Submit review
window.submitReview = function(produceId) {
  const modal = document.getElementById('rating-modal');
  const rating = parseInt(modal.dataset.rating || '0');
  const reviewText = document.getElementById('review-text').value.trim();
  
  if (rating === 0) {
    utils.showAlert('Please select a rating', 'warning');
    return;
  }
  
  const user = utils.getUser();
  if (!user) {
    utils.showAlert('Please login to submit review', 'error');
    return;
  }
  
  const review = {
    id: Date.now().toString(),
    produceId: produceId,
    customerName: user.fullName || user.username,
    customerAddress: centralizedWallet.getAddress() || 'Anonymous',
    rating: rating,
    review: reviewText,
    timestamp: new Date().toISOString(),
    verified: true
  };
  
  saveReview(review);
  utils.showAlert('Thank you for your review!', 'success');
  closeRatingModal();
}

window.closeRatingModal = function() {
  const modal = document.getElementById('rating-modal');
  if (modal) {
    modal.remove();
  }
}

function saveReview(review) {
  const existingReviews = getReviews();
  existingReviews.push(review);
  localStorage.setItem('produce_reviews', JSON.stringify(existingReviews));
}

function getReviews() {
  const saved = localStorage.getItem('produce_reviews');
  return saved ? JSON.parse(saved) : [];
}

function getProduceReviews(produceId) {
  const allReviews = getReviews();
  return allReviews.filter(review => review.produceId === produceId);
}

// Show rating and review modal
function showRatingModal(produceId) {
  const modalHTML = `
    <div id="rating-modal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2 class="modal-title">Rate Your Purchase</h2>
          <button class="close-btn close-rating-modal">×</button>
        </div>
        
        <div style="padding: 1.5rem;">
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">
            How was your experience with this produce?
          </p>
          
          <div style="margin-bottom: 1.5rem;">
            <label class="form-label">Rating (1-5 stars)</label>
            <div class="star-rating" style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              ${[1,2,3,4,5].map(i => `
                <span class="star" data-rating="${i}" 
                      style="font-size: 2rem; cursor: pointer; color: #ddd;">⭐</span>
              `).join('')}
            </div>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <label class="form-label" for="review-text">Review (Optional)</label>
            <textarea 
              id="review-text" 
              class="form-input" 
              rows="4" 
              placeholder="Share your experience with this produce..."
              style="resize: vertical; margin-top: 0.5rem;"
            ></textarea>
          </div>
          
          <div style="display: flex; gap: 1rem;">
            <button id="submit-review-btn" class="btn btn-primary" style="flex: 1;" data-produce-id="${produceId}">
              Submit Review
            </button>
            <button class="btn btn-outline close-rating-modal" style="flex: 1;">
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Load sale history for a produce
async function loadSaleHistory(produceId) {
  try {
    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) return;

    const history = await contract.getSaleHistory(produceId);
    
    if (history.length === 0) {
      document.getElementById('produce-details').innerHTML += `
        <div class="mt-3">
          <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Sale History</h4>
          <p style="color: var(--text-secondary);">No sales recorded yet.</p>
        </div>
      `;
      return;
    }

    const historyHTML = history.map(sale => {
      const priceInEth = window.ethers.formatEther(sale[3]);
      const date = new Date(Number(sale[4]) * 1000);
      return `
        <div style="padding: 0.75rem; background-color: rgba(0,0,0,0.2); border-radius: 0.375rem; margin-bottom: 0.5rem;">
          <div><strong>Buyer:</strong> <code style="font-size: 0.75rem;">${sale[1]}</code></div>
          <div><strong>Seller:</strong> <code style="font-size: 0.75rem;">${sale[2]}</code></div>
          <div><strong>Price Paid:</strong> ${priceInEth} ETH</div>
          <div><strong>Date:</strong> ${date.toLocaleString()}</div>
        </div>
      `;
    }).join('');

    document.getElementById('produce-details').innerHTML += `
      <div class="mt-3">
        <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Sale History</h4>
        ${historyHTML}
      </div>
    `;
  } catch (error) {
    console.error('Error loading sale history:', error);
  }
}

// Display reviews section
function displayReviews(reviews) {
  if (reviews.length === 0) {
    return `
      <div class="mt-3">
        <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Customer Reviews</h4>
        <p style="color: var(--text-secondary);">No reviews yet.</p>
      </div>
    `;
  }

  const reviewsHTML = reviews.map(review => {
    const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const date = new Date(review.timestamp).toLocaleDateString();
    
    return `
      <div style="padding: 1rem; background-color: rgba(0,0,0,0.2); border-radius: 0.375rem; margin-bottom: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <div>
            <div style="color: #ffd700; font-size: 1.1rem;">${stars}</div>
            <div style="font-weight: 600; color: var(--text-primary);">${review.customerName}</div>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${date}</div>
        </div>
        ${review.review ? `
          <p style="color: var(--text-secondary); margin-top: 0.5rem; font-style: italic;">
            "${review.review}"
          </p>
        ` : ''}
        <div style="font-size: 0.75rem; color: var(--success); margin-top: 0.5rem;">
          ✓ Verified Purchase
        </div>
      </div>
    `;
  }).join('');

  const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  return `
    <div class="mt-3">
      <h4 style="font-size: 1rem; margin-bottom: 1rem;">
        Customer Reviews (${reviews.length}) - Average: ⭐ ${averageRating}
      </h4>
      ${reviewsHTML}
    </div>
  `;
}

window.buyProduce = buyProduce;
