import utils from '../js/utils.js';
import centralizedWallet, { CONTRACT_ABI } from '../js/wallet.js';
import { ethers } from 'ethers';

// Create wallet instance
// const centralizedWallet = new CentralizedWallet();

// Farmer Dashboard - Web3 interactions using centralized wallet

// Get reviews for specific produce
function getProduceReviews(produceId) {
  const saved = localStorage.getItem('produce_reviews');
  const allReviews = saved ? JSON.parse(saved) : [];
  return allReviews.filter(review => review.produceId === produceId);
}

// Update produce price
async function updatePrice(produceId, produceName) {
  const newPriceEth = prompt(`Enter new price for "${produceName}" (in ETH):`);
  if (!newPriceEth || isNaN(newPriceEth) || parseFloat(newPriceEth) <= 0) {
    utils.showAlert('Invalid price entered', 'error');
    return;
  }

  try {
    if (!centralizedWallet.isWalletConnected()) {
      utils.showAlert('Please connect your wallet first', 'error');
      return;
    }

    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to smart contract');
    }

    const newPriceWei = ethers.parseEther(newPriceEth);
    const tx = await contract.updateProducePrice(produceId, newPriceWei);
    utils.showAlert('Updating price...', 'warning');
    await tx.wait();
    utils.showAlert('Price updated successfully!', 'success');
    await loadProduceList();
  } catch (error) {
    console.error('Price update error:', error);
    utils.showAlert(error.message || 'Failed to update price', 'error');
  }
}

// Update produce status
async function updateStatus(produceId, produceName) {
  const newStatus = prompt(`Enter new status for "${produceName}":\n(e.g., Harvested, In Transit, Ready for Sale, etc.)`);
  if (!newStatus || newStatus.trim() === '') {
    utils.showAlert('Invalid status entered', 'error');
    return;
  }

  try {
    if (!centralizedWallet.isWalletConnected()) {
      utils.showAlert('Please connect your wallet first', 'error');
      return;
    }

    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to smart contract');
    }

    const tx = await contract.updateProduceStatus(produceId, newStatus.trim());
    utils.showAlert('Updating status...', 'warning');
    await tx.wait();
    utils.showAlert('Status updated successfully!', 'success');
    await loadProduceList();
  } catch (error) {
    console.error('Status update error:', error);
    utils.showAlert(error.message || 'Failed to update status', 'error');
  }
}

// Show product reviews in modal
function showProductReviews(produceId, productName) {
  const reviews = getProduceReviews(produceId);
  
  if (reviews.length === 0) {
    utils.showAlert('No reviews yet for this product', 'info');
    return;
  }

  const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  
  const reviewsHTML = reviews.map(review => {
    const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const date = new Date(review.timestamp).toLocaleDateString();
    
    return `
      <div style="padding: 1rem; background-color: rgba(0,0,0,0.3); border-radius: 0.5rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <div>
            <div style="color: #ffd700; font-size: 1.2rem; margin-bottom: 0.25rem;">${stars}</div>
            <div style="font-weight: 600; color: var(--text-primary);">${review.customerName}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">
              ${review.customerAddress.slice(0, 6)}...${review.customerAddress.slice(-4)}
            </div>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${date}</div>
        </div>
        ${review.review ? `
          <p style="color: var(--text-secondary); margin-top: 0.75rem; font-style: italic; line-height: 1.5;">
            "${review.review}"
          </p>
        ` : ''}
        <div style="font-size: 0.75rem; color: var(--success); margin-top: 0.5rem;">
          ✓ Verified Purchase
        </div>
      </div>
    `;
  }).join('');

  const modalHTML = `
    <div id="reviews-modal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
        <div class="modal-header">
          <h2 class="modal-title">Reviews for "${productName}"</h2>
          <button onclick="closeReviewsModal()" class="close-btn">×</button>
        </div>
        
        <div style="padding: 1.5rem;">
          <div style="text-align: center; margin-bottom: 1.5rem; padding: 1rem; background-color: rgba(16, 185, 129, 0.1); border-radius: 0.5rem;">
            <div style="color: #ffd700; font-size: 2rem; margin-bottom: 0.5rem;">⭐ ${averageRating}</div>
            <div style="color: var(--text-primary); font-size: 1.1rem;">Average Rating</div>
            <div style="color: var(--text-secondary); font-size: 0.9rem;">${reviews.length} total review${reviews.length !== 1 ? 's' : ''}</div>
          </div>
          
          <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Customer Feedback:</h3>
          ${reviewsHTML}
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeReviewsModal() {
  const modal = document.getElementById('reviews-modal');
  if (modal) {
    modal.remove();
  }
}

// Setup event listeners for dynamically created buttons
function setupDynamicEventListeners() {
  document.addEventListener('click', (e) => {
    // Handle update price buttons
    if (e.target.classList.contains('update-price-btn')) {
      const produceId = e.target.dataset.produceId;
      const produceName = e.target.dataset.produceName;
      updatePrice(produceId, produceName);
    }
    
    // Handle update status buttons
    if (e.target.classList.contains('update-status-btn')) {
      const produceId = e.target.dataset.produceId;
      const produceName = e.target.dataset.produceName;
      updateStatus(produceId, produceName);
    }
    
    // Handle show reviews buttons
    if (e.target.classList.contains('show-reviews-btn')) {
      const produceId = e.target.dataset.produceId;
      const produceName = e.target.dataset.produceName;
      showProductReviews(produceId, produceName);
    }
    
    // Handle close reviews modal
    if (e.target.classList.contains('close-reviews-btn')) {
      closeReviewsModal();
    }
  });
}

// Load and display farmer's produce
async function loadProduceList() {
  const produceListContainer = document.getElementById('produce-list');
  produceListContainer.innerHTML = '<p style="color: var(--text-secondary);">Loading your produce...</p>';
  
  try {
    await centralizedWallet.waitForReady();
    
    if (!centralizedWallet.isWalletConnected()) {
      produceListContainer.innerHTML = '<p style="color: var(--text-secondary);">Please connect your wallet to view your produce.</p>';
      return;
    }

    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to smart contract');
    }

    const userAddress = centralizedWallet.getAddress();
    const nextId = await contract.nextProduceId();
    const totalItems = Number(nextId) - 1;

    if (totalItems === 0) {
      produceListContainer.innerHTML = '<p style="color: var(--text-secondary);">No produce registered yet. Register your first item above!</p>';
      return;
    }

    const myProduce = [];
    for (let i = 1; i <= totalItems; i++) {
      try {
        const details = await contract.getProduceDetails(i);
        if (details[2].toLowerCase() === userAddress.toLowerCase()) {
          myProduce.push({
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
        }
      } catch (err) {
        console.error(`Error loading produce ${i}:`, err);
      }
    }

    if (myProduce.length === 0) {
      produceListContainer.innerHTML = '<p style="color: var(--text-secondary);">You haven\'t registered any produce yet.</p>';
      return;
    }

    const produceHTML = myProduce.map(item => {
      const priceInEth = ethers.formatEther(item.priceInWei);
      const date = new Date(Number(item.registrationTimestamp) * 1000);
      const statusColor = item.currentStatus === 'Sold' ? 'var(--error)' : 'var(--success)';
      
      const reviews = getProduceReviews(item.id);
      const averageRating = reviews.length > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0;
      
      return `
        <div style="background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
            <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0;">${item.name}</h3>
            <span style="padding: 0.25rem 0.75rem; background-color: ${statusColor}20; color: ${statusColor}; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;">
              ${item.currentStatus}
            </span>
          </div>
          
          ${reviews.length > 0 ? `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <span style="color: #ffd700; font-size: 1.1rem;">⭐ ${averageRating}</span>
              <span style="color: var(--text-secondary); font-size: 0.875rem;">
                (${reviews.length} review${reviews.length !== 1 ? 's' : ''})
              </span>
              <button onclick="showProductReviews('${item.id}', '${item.name}')" class="btn-link">
                View Reviews
              </button>
            </div>
          ` : `
            <div style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem;">
              No reviews yet
            </div>
          `}
          
          <div style="display: grid; gap: 0.5rem; font-size: 0.875rem; margin-bottom: 1rem;">
            <div><strong>ID:</strong> ${item.id}</div>
            <div><strong>Origin:</strong> ${item.originFarm}</div>
            <div><strong>Price:</strong> ${priceInEth} ETH</div>
            <div><strong>QR Code:</strong> ${item.qrCode}</div>
            <div><strong>Registered:</strong> ${date.toLocaleString()}</div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button 
              class="btn btn-outline update-price-btn"
              data-produce-id="${item.id}"
              data-produce-name="${item.name}"
              style="flex: 1;"
              ${item.currentStatus === 'Sold' ? 'disabled' : ''}
            >
              Update Price
            </button>
            <button 
              class="btn btn-outline update-status-btn"
              data-produce-id="${item.id}"
              data-produce-name="${item.name}"
              style="flex: 1;"
            >
              Update Status
            </button>
          </div>
        </div>
      `;
    }).join('');

    produceListContainer.innerHTML = produceHTML;
  } catch (error) {
    console.error('Error loading produce:', error);
    
    let errorMessage = 'Failed to load produce list. ';
    if (error.message.includes('MetaMask')) {
      errorMessage += 'Please connect your MetaMask wallet.';
    } else if (error.message.includes('network')) {
      errorMessage += 'Please check your network connection and contract address.';
    } else {
      errorMessage += 'Please refresh the page and try again.';
    }
    
    produceListContainer.innerHTML = `<p style="color: var(--error);">${errorMessage}</p>`;
  }
}

// Register produce form handler
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await utils.checkAuth())) {
    utils.redirect('login.html');
    return;
  }

  const user = utils.getUser();
  if (user && user.role !== 'farmer') {
    utils.showAlert('Access denied. Farmer account required.', 'error');
    utils.redirect('index.html');
    return;
  }

  // Setup dynamic event listeners
  setupDynamicEventListeners();

  const form = document.getElementById('register-produce-form');
  const registerBtn = document.getElementById('register-btn');
  const imageInput = document.getElementById('produce-image');
  const imagePreview = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');

  // Handle image preview
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        utils.showAlert('Please select an image file', 'error');
        imageInput.value = '';
        imagePreview.style.display = 'none';
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        utils.showAlert('Image size should be less than 5MB', 'error');
        imageInput.value = '';
        imagePreview.style.display = 'none';
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      imagePreview.style.display = 'none';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('produce-name').value;
    const originFarm = document.getElementById('origin-farm').value;
    const priceInEth = document.getElementById('price').value;
    const qrCode = document.getElementById('qr-code').value;
    const imageFile = document.getElementById('produce-image').files[0];

    // Validate image
    if (!imageFile) {
      utils.showAlert('Please upload a produce image', 'error');
      return;
    }

    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="spinner"></span> Registering...';

    try {
      await centralizedWallet.waitForReady();
      
      if (!centralizedWallet.isWalletConnected()) {
        utils.showAlert('Please connect your wallet first', 'error');
        return;
      }

      // Ensure we're on Sepolia testnet
      const network = await centralizedWallet.getProvider().getNetwork();
      if (Number(network.chainId) !== 11155111) {
        utils.showAlert('Please switch to Sepolia testnet to register produce', 'error');
        await centralizedWallet.switchToSepolia();
        return;
      }

      const contract = centralizedWallet.getContract(CONTRACT_ABI);
      if (!contract) {
        throw new Error('Unable to connect to smart contract');
      }

      const priceInWei = ethers.parseEther(priceInEth);

      utils.showAlert('Registering on Sepolia blockchain...', 'warning');
      
      // Call the contract's registerProduce function
      const tx = await contract.registerProduce(name, originFarm, priceInWei, qrCode);
      
      utils.showAlert('Transaction submitted to Sepolia. Waiting for confirmation...', 'warning');
      const receipt = await tx.wait();

      // Parse the ProduceRegistered event to get the blockchain ID
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'ProduceRegistered';
        } catch (e) {
          return false;
        }
      });

      const blockchainId = event ? event.args.id.toString() : null;
      
      if (!blockchainId) {
        throw new Error('Failed to get produce ID from blockchain');
      }

      try {
        utils.showAlert('Saving to database with image...', 'warning');
        
        // Prepare form data for API call including image
        const formData = new FormData();
        formData.append('name', name);
        formData.append('originFarm', originFarm);
        formData.append('priceInWei', priceInWei.toString());
        formData.append('qrCode', qrCode);
        formData.append('blockchainId', parseInt(blockchainId));
        formData.append('transactionHash', receipt.hash);
        formData.append('produceImage', imageFile);

        await utils.apiCall('/api/v1/produce/register', {
          method: 'POST',
          body: formData, // Send as FormData for file upload
        });
      } catch (dbError) {
        console.log('Database save failed, but blockchain registration succeeded:', dbError);
        utils.showAlert('Blockchain registration successful, but database save failed. Your produce is registered on blockchain.', 'warning');
      }

      utils.showAlert('Produce registered successfully with image!', 'success');
      form.reset();
      imagePreview.style.display = 'none';
      await loadProduceList();
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = error.message || 'Registration failed. Please try again.';
      if (error.message.includes('wrong network')) {
        errorMessage = 'Please switch to Sepolia testnet in MetaMask.';
      } else if (error.message.includes('MetaMask')) {
        errorMessage = 'Please install MetaMask and connect your wallet.';
      } else if (error.message.includes('rejected')) {
        errorMessage = 'Transaction was rejected. Please try again.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction. Please add ETH to your wallet.';
      }
      
      utils.showAlert(errorMessage, 'error');
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = 'Register Produce on Blockchain';
    }
  });

  await loadProduceList();
});

// Don't export global functions
