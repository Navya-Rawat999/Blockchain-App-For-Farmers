// QR Code Scanner
let html5QrcodeScanner = null;
let contract = null;
let provider = null;

// Contract ABI - simplified
const CONTRACT_ABI = [
  "function getProduceDetails(uint256 _id) public view returns (uint256 id, string memory name, address originalFarmer, address currentSeller, string memory currentStatus, uint256 priceInWei, string memory originFarm, string memory qrCode)"
];

const CONTRACT_ADDRESS = '0x...'; // Replace with your deployed contract address

// Initialize Web3 connection
async function initWeb3() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
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

document.addEventListener('DOMContentLoaded', () => {
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
  resultsContainer.innerHTML = '<p style="color: var(--text-secondary);">Loading produce details...</p>';

  try {
    // Initialize Web3 if needed
    if (!contract) {
      const initialized = await initWeb3();
      if (!initialized) {
        throw new Error('Please connect your wallet first');
      }
    }

    // Extract produce ID from QR data (assuming QR contains just the ID or parse it)
    const produceId = extractProduceId(qrData);
    
    if (!produceId) {
      throw new Error('Invalid QR code format');
    }

    // Fetch produce details from blockchain
    const details = await contract.getProduceDetails(produceId);
    
    // Display produce details
    resultsContainer.innerHTML = `
      <div class="card" style="background-color: var(--bg-card); border: 2px solid var(--primary-color);">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
          <span style="font-size: 1.5rem;">✓</span>
          <h3 style="font-size: 1.25rem; color: var(--success); margin: 0;">Verified Produce</h3>
        </div>
        
        <div style="display: grid; gap: 0.75rem;">
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
            <span style="padding: 0.25rem 0.5rem; background-color: ${details.currentStatus === 'Sold' ? 'var(--warning)' : 'var(--success)'}; border-radius: 0.25rem; font-size: 0.875rem;">
              ${details.currentStatus}
            </span>
          </div>
          <div>
            <strong>Price:</strong> ${details.priceInWei.toString()} INR
          </div>
          <div>
            <strong>Original Farmer:</strong> 
            <code style="font-size: 0.75rem; background-color: rgba(0,0,0,0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem; display: block; margin-top: 0.25rem;">
              ${details.originalFarmer}
            </code>
          </div>
        </div>

        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
          <a href="/customer.html" class="btn btn-primary" style="width: 100%;">
            View Full Details & Purchase
          </a>
        </div>
      </div>

      <button class="btn btn-outline mt-2" style="width: 100%;" onclick="location.reload()">
        Scan Another QR Code
      </button>
    `;
  } catch (error) {
    console.error('Error fetching produce details:', error);
    resultsContainer.innerHTML = `
      <div class="alert alert-error">
        Failed to verify produce. ${error.message || 'Please try again or check your connection.'}
      </div>
      <button class="btn btn-outline mt-2" style="width: 100%;" onclick="location.reload()">
        Try Again
      </button>
    `;
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
