import utils from './utils.js';
import { CentralizedWallet, CONTRACT_ABI } from './wallet.js';
import { ethers } from 'ethers';

// Create wallet instance
const centralizedWallet = new CentralizedWallet();

// Product page state
let currentProduct = null;
let transactionInProgress = false;

// Initialize product page
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await utils.checkAuth())) {
    utils.redirect('login.html');
    return;
  }

  // Get product ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showErrorState('No product ID specified');
    return;
  }

  await loadProductDetails(productId);
});

// Load product details from blockchain and database
async function loadProductDetails(productId) {
  try {
    // Wait for wallet to be ready
    await centralizedWallet.waitForReady();

    // Connect wallet if not connected
    if (!centralizedWallet.isWalletConnected()) {
      await centralizedWallet.connectWallet();
    }

    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to smart contract');
    }

    // Get product details from blockchain
    const details = await contract.getProduceDetails(productId);
    
    // Store current product
    currentProduct = {
      id: details[0].toString(),
      name: details[1],
      originalFarmer: details[2],
      currentSeller: details[3],
      currentStatus: details[4],
      priceInWei: details[5],
      originFarm: details[6],
      qrCode: details[7],
      registrationTimestamp: details[8]
    };

    // Load additional data from database (optional)
    try {
      const dbResponse = await utils.apiCall(`/api/v1/produce/${productId}`, {
        method: 'GET'
      });
      
      if (dbResponse.success && dbResponse.data) {
        // Merge database data with blockchain data
        currentProduct = { ...currentProduct, ...dbResponse.data };
      }
    } catch (dbError) {
      console.log('Database fetch failed, using blockchain data only:', dbError);
    }

    displayProductDetails();
    hideLoadingState();

  } catch (error) {
    console.error('Error loading product details:', error);
    showErrorState('Failed to load product details. Please check the product ID and try again.');
  }
}

// Display product details in the UI
function displayProductDetails() {
  const priceInEth = ethers.formatEther(currentProduct.priceInWei);
  const date = new Date(Number(currentProduct.registrationTimestamp) * 1000);
  const isAvailable = currentProduct.currentStatus !== 'Sold';

  // Update product name
  document.getElementById('product-name').textContent = currentProduct.name;

  // Update status badge
  const statusBadge = document.getElementById('product-status');
  statusBadge.innerHTML = `
    <span class="status-badge ${isAvailable ? 'status-available' : 'status-sold'}">
      ${currentProduct.currentStatus}
    </span>
  `;

  // Update price
  document.getElementById('product-price').textContent = `${priceInEth} ETH`;
  
  // Estimate USD price (rough estimate, you could use a real API)
  const estimatedUSD = (parseFloat(priceInEth) * 2500).toFixed(2); // Rough ETH to USD
  document.getElementById('price-usd').textContent = `~$${estimatedUSD}`;

  // Update QR code display - show image if available from backend
  const qrContainer = document.getElementById('qr-code-display');
  if (currentProduct.qrCodeImage) {
    qrContainer.innerHTML = `
      <div style="text-align: center;">
        <img src="${currentProduct.qrCodeImage}" alt="QR Code for ${currentProduct.name}" 
             style="max-width: 200px; height: auto; border-radius: 0.5rem; border: 1px solid var(--border-color);">
        <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
          Scan to verify authenticity
        </div>
      </div>
    `;
  } else {
    qrContainer.innerHTML = `
      <div style="padding: 1rem; background: rgba(0,0,0,0.1); border-radius: 0.5rem; text-align: center;">
        <p style="color: var(--text-secondary); margin: 0;">QR Code not yet generated</p>
        <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0.5rem 0 0 0;">Contact farmer to generate QR code</p>
      </div>
    `;
  }

  // Update product details
  const detailsHTML = `
    <div><span class="detail-label">Product ID:</span><span class="detail-value">${currentProduct.id}</span></div>
    <div><span class="detail-label">Origin Farm:</span><span class="detail-value">${currentProduct.originFarm}</span></div>
    ${currentProduct.quantity ? `<div><span class="detail-label">Quantity:</span><span class="detail-value">${currentProduct.quantity}</span></div>` : ''}
    <div><span class="detail-label">Registration Date:</span><span class="detail-value">${date.toLocaleDateString()}</span></div>
    <div><span class="detail-label">Current Status:</span><span class="detail-value">${currentProduct.currentStatus}</span></div>
    ${currentProduct.description ? `<div><span class="detail-label">Description:</span><span class="detail-value">${currentProduct.description}</span></div>` : ''}
  `;
  document.getElementById('product-details').innerHTML = detailsHTML;

  // Update farmer information
  document.getElementById('farmer-info').innerHTML = `
    <div>
      <span class="detail-label">Original Farmer:</span>
      <span class="detail-value">
        <code style="font-size: 0.75rem; background-color: rgba(0,0,0,0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">
          ${currentProduct.originalFarmer}
        </code>
      </span>
    </div>
    <div>
      <span class="detail-label">Current Seller:</span>
      <span class="detail-value">
        <code style="font-size: 0.75rem; background-color: rgba(0,0,0,0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">
          ${currentProduct.currentSeller}
        </code>
      </span>
    </div>
    <div><span class="detail-label">Farm Location:</span><span class="detail-value">${currentProduct.originFarm}</span></div>
  `;

  // Update buy button
  const buyButton = document.getElementById('buy-button');
  if (isAvailable) {
    buyButton.textContent = `🛒 Buy for ${priceInEth} ETH`;
    buyButton.disabled = false;
    buyButton.onclick = initiateTransaction;
  } else {
    buyButton.textContent = '❌ Sold Out';
    buyButton.disabled = true;
    buyButton.onclick = null;
  }

  // Load and display reviews
  displayReviews();

  // Update page title
  document.title = `${currentProduct.name} - Kissan Sathi`;
}

// Display customer reviews
function displayReviews() {
  const reviews = getProduceReviews(currentProduct.id);
  const reviewsContent = document.getElementById('reviews-content');

  if (reviews.length === 0) {
    reviewsContent.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No reviews yet</p>';
    return;
  }

  const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  const reviewsHTML = `
    <div class="average-rating">
      <div class="average-rating-score">⭐ ${averageRating}</div>
      <div class="average-rating-label">Average Rating</div>
      <div class="average-rating-count">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div>
    </div>
    
    ${reviews.map(review => {
      const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      const date = new Date(review.timestamp).toLocaleDateString();
      
      return `
        <div class="review-item">
          <div class="review-header">
            <div>
              <div class="review-rating">${stars}</div>
              <div class="review-author">${review.customerName}</div>
            </div>
            <div class="review-date">${date}</div>
          </div>
          ${review.review ? `
            <p class="review-text">"${review.review}"</p>
          ` : ''}
          <div class="verified-purchase">
            <span>✓</span> Verified Purchase
          </div>
        </div>
      `;
    }).join('')}
  `;

  reviewsContent.innerHTML = reviewsHTML;
}

// Transaction flow functions
window.initiateTransaction = function() {
  if (transactionInProgress) return;
  
  if (!centralizedWallet.isWalletConnected()) {
    utils.showAlert('Please connect your wallet first', 'error');
    return;
  }

  if (!currentProduct || currentProduct.currentStatus === 'Sold') {
    utils.showAlert('This product is no longer available', 'error');
    return;
  }

  // Store product ID for transaction page
  sessionStorage.setItem('transactionProductId', currentProduct.id);
  
  // Redirect to transaction confirmation page
  utils.redirect(`transaction.html?productId=${currentProduct.id}`);
};

window.cancelTransaction = function() {
  closeTransactionModal();
};

window.confirmTransaction = async function() {
  if (transactionInProgress) return;
  
  transactionInProgress = true;
  showTransactionStep(2);

  try {
    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to smart contract');
    }

    // Update status
    document.getElementById('transaction-status').textContent = 'Preparing transaction...';

    // Initiate blockchain transaction
    const tx = await contract.buyProduce(currentProduct.id, {
      value: currentProduct.priceInWei
    });

    document.getElementById('transaction-status').textContent = 'Transaction submitted. Waiting for confirmation...';

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    // Show success step
    showTransactionStep(3);
    document.getElementById('transaction-hash').innerHTML = `
      <strong>Transaction Hash:</strong><br>
      <a href="https://etherscan.io/tx/${receipt.hash}" target="_blank">
        ${receipt.hash}
      </a>
    `;

    // Update product status locally
    currentProduct.currentStatus = 'Sold';
    displayProductDetails();

    // Try to update database
    try {
      await utils.apiCall(`/api/v1/produce/${currentProduct.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Sold',
          buyerAddress: centralizedWallet.getAddress(),
          saleTransactionHash: receipt.hash
        }),
      });
    } catch (dbError) {
      console.log('Failed to update database, but blockchain transaction succeeded:', dbError);
    }

    utils.showAlert('Purchase successful!', 'success');

  } catch (error) {
    console.error('Transaction error:', error);
    showTransactionError(error.message || 'Transaction failed. Please try again.');
  } finally {
    transactionInProgress = false;
  }
};

window.retryTransaction = function() {
  showTransactionStep(1);
  transactionInProgress = false;
};

window.closeTransactionModal = function() {
  document.getElementById('transaction-modal').style.display = 'none';
  transactionInProgress = false;
};

window.rateProduct = function() {
  closeTransactionModal();
  showRatingModal(currentProduct.id);
};

// Helper functions
function showTransactionStep(step) {
  // Hide all steps
  document.querySelectorAll('.transaction-step').forEach(el => {
    el.style.display = 'none';
  });

  // Show specific step
  if (step === 1) {
    document.getElementById('transaction-step-1').style.display = 'block';
  } else if (step === 2) {
    document.getElementById('transaction-step-2').style.display = 'block';
  } else if (step === 3) {
    document.getElementById('transaction-step-3').style.display = 'block';
  }
}

function showTransactionError(message) {
  document.querySelectorAll('.transaction-step').forEach(el => {
    el.style.display = 'none';
  });
  
  document.getElementById('transaction-error').style.display = 'block';
  document.getElementById('error-message').textContent = message;
}

function hideLoadingState() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('product-content').style.display = 'block';
}

function showErrorState(message) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'block';
  document.getElementById('error-state').querySelector('p').textContent = message;
}

// Reviews functions (centralized implementation)
function getProduceReviews(produceId) {
  const saved = localStorage.getItem('produce_reviews');
  const allReviews = saved ? JSON.parse(saved) : [];
  return allReviews.filter(review => review.produceId === produceId);
}

function showRatingModal(produceId) {
  const modalHTML = `
    <div id="rating-modal" class="transaction-modal" style="display: flex;">
      <div class="transaction-content">
        <h2 style="margin-bottom: 1rem;">⭐ Rate Your Purchase</h2>
        <p style="margin-bottom: 1rem; color: var(--text-secondary);">
          How was your experience with this produce?
        </p>
        
        <div style="margin-bottom: 1.5rem;">
          <div class="star-rating" style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem;">
            ${[1,2,3,4,5].map(i => `
              <span class="star" data-rating="${i}" onclick="setRating(${i})"
                    style="font-size: 2rem; cursor: pointer; color: #ddd;">⭐</span>
            `).join('')}
          </div>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <textarea 
            id="review-text" 
            placeholder="Share your experience (optional)..."
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; background: var(--bg-dark); color: var(--text-primary); resize: vertical;"
            rows="3"
          ></textarea>
        </div>
        
        <div style="display: flex; gap: 1rem;">
          <button onclick="closeRatingModal()" class="btn btn-outline" style="flex: 1;">
            Skip
          </button>
          <button onclick="submitReview('${produceId}')" class="btn btn-primary" style="flex: 1;">
            Submit Review
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Rating functions
window.setRating = function(rating) {
  const stars = document.querySelectorAll('.star');
  stars.forEach((star, index) => {
    if (index < rating) {
      star.style.color = '#ffd700';
    } else {
      star.style.color = '#ddd';
    }
  });
  
  document.getElementById('rating-modal').dataset.rating = rating;
};

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
  
  // Save review
  const existingReviews = getProduceReviews('all');
  existingReviews.push(review);
  localStorage.setItem('produce_reviews', JSON.stringify(existingReviews));
  
  utils.showAlert('Thank you for your review!', 'success');
  closeRatingModal();
  
  // Refresh reviews display
  displayReviews();
};

window.closeRatingModal = function() {
  const modal = document.getElementById('rating-modal');
  if (modal) {
    modal.remove();
  }
};
