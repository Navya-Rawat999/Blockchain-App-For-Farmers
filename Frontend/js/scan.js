import utils from '../js/utils.js';
import centralizedWallet, { CONTRACT_ABI } from '../js/wallet.js';
import { ethers } from 'ethers';

// Contract address - should be the same as in wallet.js
const CONTRACT_ADDRESS = '0x742d35Cc6135C4Ad4C006C8C704aC8DC7CE18F72'; // Update with actual address

// QR Code Scanner
let html5QrcodeScanner = null;
let provider = null;

// Initialize Web3 connection
async function initWeb3() {
  try {
    await centralizedWallet.waitForReady();
    
    if (!centralizedWallet.isWalletConnected()) {
      await centralizedWallet.connectWallet();
    }
    
    return centralizedWallet.isWalletConnected();
  } catch (error) {
    console.error('Web3 initialization error:', error);
    utils.showAlert('Please install MetaMask to use blockchain features', 'warning');
    return false;
  }
}

// Check authentication and initialize when the script loads
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication first
  const isAuthenticated = await utils.checkAuth();
  if (!isAuthenticated) {
    utils.redirect('login.html');
    return;
  }

  // Initialize Web3 and QR scanner
  await initWeb3();
  initQRScanner();

  // Manual entry handler
  const manualSubmitBtn = document.getElementById('manual-submit-btn');
  const manualInput = document.getElementById('manual-produce-id');

  manualSubmitBtn.addEventListener('click', async () => {
    const qrData = manualInput.value.trim();
    if (qrData) {
      await handleScanResult(qrData);
    } else {
      utils.showAlert('Please enter produce ID or QR data', 'warning');
    }
  });

  manualInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      manualSubmitBtn.click();
    }
  });
});

// Initialize QR Code Scanner
function initQRScanner() {
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 }
  };

  // Html5QrcodeScanner will be available globally from CDN
  html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader",
    config,
    false
  );

  html5QrcodeScanner.render(onScanSuccess, onScanError);
}

// QR Scan success handler
async function onScanSuccess(decodedText, decodedResult) {
  console.log(`QR Code detected: ${decodedText}`);
  
  // Stop scanning
  html5QrcodeScanner.clear();
  
  utils.showAlert('QR Code scanned successfully!', 'success');
  await handleScanResult(decodedText);
}

// QR Scan error handler
function onScanError(error) {
  // Silent - too noisy otherwise
}

// Handle scan result and display produce details
async function handleScanResult(qrData) {
  const resultsContainer = document.getElementById('scan-results');
  resultsContainer.innerHTML = '<p class="loading-text">Loading produce details...</p>';

  try {
    // Initialize Web3 if needed
    const initialized = await initWeb3();
    if (!initialized) {
      throw new Error('Please connect your wallet first');
    }

    // Extract produce ID from QR data
    const produceId = extractProduceId(qrData);
    
    if (!produceId) {
      throw new Error('Invalid QR code format');
    }

    // Get contract using centralized wallet
    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to smart contract');
    }

    // Fetch produce details from blockchain
    const details = await contract.getProduceDetails(produceId);
    
    // Display produce details
    resultsContainer.innerHTML = `
      <div class="card verified-card">
        <div class="verified-header">
          <span class="verified-icon">✓</span>
          <h3 class="verified-title">Verified Produce</h3>
        </div>
        
        <div class="produce-details">
          <div>
            <strong>Name:</strong> ${details.name}
          </div>
          <div>
            <strong>Produce ID:</strong> ${details.id.toString()}
          </div>
          <div>
            <strong>Origin Farm:</strong> ${details.originFarm}
          </div>
          <div>
            <strong>Status:</strong> 
            <span class="status-badge ${details.currentStatus === 'Sold' ? 'sold' : 'available'}">
              ${details.currentStatus}
            </span>
          </div>
          <div>
            <strong>Price:</strong> ${ethers.formatEther(details.priceInWei)} ETH
          </div>
          <div>
            <strong>Original Farmer:</strong> 
            <code class="address-code">
              ${details.originalFarmer}
            </code>
          </div>
        </div>

        <div class="results-actions">
          <a href="customer.html" class="btn btn-primary full-width-btn">
            View Full Details & Purchase
          </a>
        </div>
      </div>

      <button class="btn btn-outline mt-2 full-width-btn" id="scan-again-btn">
        Scan Another QR Code
      </button>
    `;

    // Add event listener for scan again button
    document.getElementById('scan-again-btn').addEventListener('click', () => {
      location.reload();
    });
  } catch (error) {
    console.error('Error fetching produce details:', error);
    resultsContainer.innerHTML = `
      <div class="alert alert-error">
        Failed to verify produce. ${error.message || 'Please try again or check your connection.'}
      </div>
      <button class="btn btn-outline mt-2 full-width-btn" id="try-again-btn">
        Try Again
      </button>
    `;
    
    // Add event listener for try again button
    document.getElementById('try-again-btn').addEventListener('click', () => {
      location.reload();
    });
  }
}

// Extract produce ID from QR data
function extractProduceId(qrData) {
  // If QR data is just a number, return it
  if (/^\d+$/.test(qrData)) {
    return qrData;
  }
  
  // If it's a URL, try to extract ID from query params or path
  try {
    const url = new URL(qrData);
    const id = url.searchParams.get('id') || url.pathname.split('/').pop();
    return id;
  } catch (e) {
    // Not a URL, return as-is
    return qrData;
  }
}
