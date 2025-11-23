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
  initQRUpload();

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

// Initialize QR Code Upload
function initQRUpload() {
  const uploadBtn = document.getElementById('upload-qr-btn');
  const fileInput = document.getElementById('qr-file-input');
  const uploadPreview = document.getElementById('upload-preview');
  const previewImg = document.getElementById('uploaded-qr-preview');

  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      utils.showAlert('Please select a valid image file', 'error');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      utils.showAlert('Image size should be less than 10MB', 'error');
      return;
    }

    try {
      // Show preview
      const reader = new FileReader();
      reader.onload = async (event) => {
        previewImg.src = event.target.result;
        uploadPreview.style.display = 'block';

        // Decode QR code from uploaded image
        await decodeQRFromImage(event.target.result);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing uploaded image:', error);
      utils.showAlert('Failed to process image. Please try again.', 'error');
      uploadPreview.style.display = 'none';
    }
  });
}

// Decode QR code from image
async function decodeQRFromImage(imageDataUrl) {
  try {
    // Use Html5Qrcode to scan the uploaded image
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    // Stop any ongoing scan first
    if (html5QrcodeScanner) {
      try {
        await html5QrcodeScanner.clear();
      } catch (e) {
        console.log('No active scanner to clear');
      }
    }

    // Scan the uploaded file
    const decodedText = await html5QrCode.scanFile(
      document.getElementById('qr-file-input').files[0],
      true
    );

    utils.showAlert('QR Code decoded successfully!', 'success');
    
    // Hide upload preview
    document.getElementById('upload-preview').style.display = 'none';
    
    // Process the decoded QR data
    await handleScanResult(decodedText);

    // Clean up
    html5QrCode.clear();

  } catch (error) {
    console.error('QR decode error:', error);
    utils.showAlert('Could not decode QR code from image. Please try a clearer image.', 'error');
    document.getElementById('upload-preview').style.display = 'none';
  }
}

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

    // Parse QR data using backend API
    let parsedData;
    let produceId;
    
    try {
      const parseResponse = await utils.apiCall('/api/v1/produce/qr/parse', {
        method: 'POST',
        body: JSON.stringify({ qrData })
      });

      if (parseResponse.success) {
        parsedData = parseResponse.data.parsedData;
        produceId = parsedData.id;

        // If backend found produce item, use it
        if (parseResponse.data.produceItem) {
          displayProduceFromParsedData(parseResponse.data.produceItem, parsedData);
          return;
        }
      }
    } catch (parseError) {
      console.log('Backend parsing failed, using fallback:', parseError);
      // Fallback to simple ID extraction
      produceId = extractProduceId(qrData);
      if (!produceId) {
        throw new Error('Invalid QR code format');
      }
    }

    // Get contract using centralized wallet for blockchain verification
    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to smart contract');
    }

    // Fetch produce details from blockchain
    const details = await contract.getProduceDetails(produceId);
    
    // Display produce details with QR information
    displayProduceDetails(details, parsedData);

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

// Display produce details from parsed backend data
function displayProduceFromParsedData(produceItem, parsedData) {
  const resultsContainer = document.getElementById('scan-results');
  const priceInEth = (parseFloat(produceItem.priceInWei) / Math.pow(10, 18)).toFixed(6);

  resultsContainer.innerHTML = `
    <div class="card verified-card">
      <div class="verified-header">
        <span class="verified-icon">✓</span>
        <h3 class="verified-title">Verified Produce</h3>
      </div>
      
      ${!parsedData.legacy ? `
        <div class="qr-info-section" style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
          <h4 style="color: var(--success); margin: 0 0 0.5rem 0;">📱 QR Code Information</h4>
          <div style="display: grid; gap: 0.25rem; font-size: 0.875rem;">
            <div><strong>Product:</strong> ${parsedData.name || 'N/A'}</div>
            <div><strong>Quantity:</strong> ${parsedData.quantity || 'N/A'}</div>
            <div><strong>Farmer:</strong> ${parsedData.farmer || 'N/A'}</div>
            <div><strong>Farm:</strong> ${parsedData.farm || 'N/A'}</div>
            ${parsedData.timestamp ? `<div><strong>QR Generated:</strong> ${new Date(parsedData.timestamp).toLocaleString()}</div>` : ''}
          </div>
        </div>
      ` : ''}
      
      <div class="produce-details">
        <div><strong>Name:</strong> ${produceItem.name}</div>
        <div><strong>Produce ID:</strong> ${produceItem.blockchainId || produceItem.id}</div>
        <div><strong>Origin Farm:</strong> ${produceItem.originFarm}</div>
        <div><strong>Quantity:</strong> ${produceItem.quantity || 'N/A'}</div>
        <div>
          <strong>Status:</strong> 
          <span class="status-badge ${produceItem.currentStatus === 'Sold' ? 'sold' : 'available'}">
            ${produceItem.currentStatus}
          </span>
        </div>
        <div><strong>Price:</strong> ${priceInEth} ETH</div>
        <div>
          <strong>Original Farmer:</strong> 
          <code class="address-code">${produceItem.originalFarmer}</code>
        </div>
      </div>

      <div class="results-actions">
        <a href="customer.html?produce=${produceItem.blockchainId || produceItem.id}" class="btn btn-primary full-width-btn">
          View Full Details & Purchase
        </a>
      </div>
      
      ${produceItem.qrInfo && produceItem.qrInfo.displayUrl ? `
        <div style="margin-top: 1rem; text-align: center;">
          <a href="${produceItem.qrInfo.displayUrl}" class="btn btn-outline full-width-btn" target="_blank">
            🔗 Open Direct Link
          </a>
        </div>
      ` : ''}
    </div>

    <button class="btn btn-outline mt-2 full-width-btn" id="scan-again-btn">
      Scan Another QR Code
    </button>
  `;

  // Add event listener for scan again button
  document.getElementById('scan-again-btn').addEventListener('click', () => {
    location.reload();
  });
}

// Display produce details from blockchain data
function displayProduceDetails(details, parsedData) {
  const resultsContainer = document.getElementById('scan-results');

  resultsContainer.innerHTML = `
    <div class="card verified-card">
      <div class="verified-header">
        <span class="verified-icon">✓</span>
        <h3 class="verified-title">Verified Produce</h3>
      </div>
      
      ${parsedData && !parsedData.legacy ? `
        <div class="qr-info-section" style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
          <h4 style="color: var(--success); margin: 0 0 0.5rem 0;">📱 QR Code Information</h4>
          <div style="display: grid; gap: 0.25rem; font-size: 0.875rem;">
            ${parsedData.name ? `<div><strong>Product:</strong> ${parsedData.name}</div>` : ''}
            ${parsedData.quantity ? `<div><strong>Quantity:</strong> ${parsedData.quantity}</div>` : ''}
            ${parsedData.farmer ? `<div><strong>Farmer:</strong> ${parsedData.farmer}</div>` : ''}
            ${parsedData.farm ? `<div><strong>Farm:</strong> ${parsedData.farm}</div>` : ''}
            ${parsedData.timestamp ? `<div><strong>QR Generated:</strong> ${new Date(parsedData.timestamp).toLocaleString()}</div>` : ''}
          </div>
        </div>
      ` : ''}
      
      <div class="produce-details">
        <div><strong>Name:</strong> ${details.name}</div>
        <div><strong>Produce ID:</strong> ${details.id.toString()}</div>
        <div><strong>Origin Farm:</strong> ${details.originFarm}</div>
        ${details.quantity ? `<div><strong>Quantity:</strong> ${details.quantity}</div>` : ''}
        <div>
          <strong>Status:</strong> 
          <span class="status-badge ${details.currentStatus === 'Sold' ? 'sold' : 'available'}">
            ${details.currentStatus}
          </span>
        </div>
        <div><strong>Price:</strong> ${ethers.formatEther(details.priceInWei)} ETH</div>
        <div>
          <strong>Original Farmer:</strong> 
          <code class="address-code">${details.originalFarmer}</code>
        </div>
      </div>

      <div class="results-actions">
        <a href="customer.html?produce=${details.id.toString()}" class="btn btn-primary full-width-btn">
          View Full Details & Purchase
        </a>
      </div>
      
      ${parsedData && parsedData.url ? `
        <div style="margin-top: 1rem; text-align: center;">
          <a href="${parsedData.url}" class="btn btn-outline full-width-btn" target="_blank">
            🔗 Open Direct Link
          </a>
        </div>
      ` : ''}
    </div>

    <button class="btn btn-outline mt-2 full-width-btn" id="scan-again-btn">
      Scan Another QR Code
    </button>
  `;

  // Add event listener for scan again button
  document.getElementById('scan-again-btn').addEventListener('click', () => {
    location.reload();
  });
}

// Extract produce ID from QR data (fallback function)
function extractProduceId(qrData) {
  // If QR data is just a number, return it
  if (/^\d+$/.test(qrData)) {
    return qrData;
  }
  
  // If it's a URL, try to extract ID from query params or path
  try {
    const url = new URL(qrData);
    const id = url.searchParams.get('produce') || url.searchParams.get('id') || url.pathname.split('/').pop();
    return id;
  } catch (e) {
    // Not a URL, return as-is
    return qrData;
  }
}
