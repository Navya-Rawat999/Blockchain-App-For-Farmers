import utils from '../js/utils.js';

// Wallet Connection Handler
let provider = null;
let signer = null;
let userAddress = null;

// Try to load ethers from multiple sources
async function loadEthersFromCDN() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js';
    script.type = 'application/javascript';
    
    script.onload = () => {
      console.log('Ethers loaded from CDN');
      resolve(true);
    };
    
    script.onerror = () => {
      console.error('Failed to load ethers from CDN');
      reject(new Error('CDN failed'));
    };
    
    // Set timeout for CDN loading
    setTimeout(() => {
      if (typeof window.ethers === 'undefined') {
        script.remove();
        reject(new Error('CDN timeout'));
      }
    }, 5000);
    
    document.head.appendChild(script);
  });
}

// Wait for ethers with multiple fallback strategies
async function waitForEthers() {
  console.log('Checking for ethers.js...');
  
  // Strategy 1: Check if already loaded
  if (typeof window.ethers !== 'undefined' && window.ethers.BrowserProvider) {
    console.log('Ethers.js already available');
    return true;
  }
  
  // Strategy 2: Wait for existing script to load
  console.log('Waiting for existing ethers script to load...');
  let attempts = 0;
  const maxWaitAttempts = 50; // 5 seconds
  
  while (attempts < maxWaitAttempts) {
    if (typeof window.ethers !== 'undefined' && window.ethers.BrowserProvider) {
      console.log('Ethers.js loaded successfully');
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
    
    if (attempts % 10 === 0) {
      console.log(`Still waiting for ethers... attempt ${attempts}/${maxWaitAttempts}`);
    }
  }
  
  // Strategy 3: Try to load from CDN dynamically
  console.log('Attempting to load ethers from CDN...');
  try {
    await loadEthersFromCDN();
    
    // Wait a bit more for it to initialize
    let cdnAttempts = 0;
    while (cdnAttempts < 20 && (typeof window.ethers === 'undefined' || !window.ethers.BrowserProvider)) {
      await new Promise(resolve => setTimeout(resolve, 100));
      cdnAttempts++;
    }
    
    if (typeof window.ethers !== 'undefined' && window.ethers.BrowserProvider) {
      console.log('Ethers loaded successfully from CDN');
      return true;
    }
  } catch (error) {
    console.error('Failed to load from CDN:', error.message);
  }
  
  // Strategy 4: Show helpful error message
  throw new Error('Unable to load ethers.js. Please check your internet connection and try refreshing the page.');
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Wallet page loading...');
  
  // Check authentication first
  const isAuthenticated = await utils.checkAuth();
  if (!isAuthenticated) {
    utils.redirect('login.html');
    return;
  }

  // Show loading message
  showLoadingMessage('Loading wallet service...');

  // Try to load ethers with fallbacks
  try {
    await waitForEthers();
    hideLoadingMessage();
    
    // Now check if already connected
    await checkWalletConnection();

    // Listen for account changes
    setupEventListeners();
    
  } catch (error) {
    console.error('Failed to initialize wallet service:', error);
    
    hideLoadingMessage();
    showErrorUI(error.message);
  }
});

// Show loading message in UI
function showLoadingMessage(message) {
  const container = document.querySelector('.container');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
        <h2>Loading Wallet Service</h2>
        <p style="color: var(--text-secondary);">${message}</p>
        <div class="spinner" style="margin: 1rem auto;"></div>
      </div>
    `;
  }
}

// Hide loading message
function hideLoadingMessage() {
  // The original content will be restored by checking wallet connection
}

// Show error UI with helpful instructions
function showErrorUI(errorMessage) {
  const container = document.querySelector('.container');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem; color: var(--error);">⚠️</div>
        <h2 style="color: var(--error);">Wallet Service Error</h2>
        <p style="margin-bottom: 1rem;">${errorMessage}</p>
        
        <div style="background: var(--bg-dark); padding: 1.5rem; border-radius: 0.5rem; text-align: left; margin: 1rem 0;">
          <h3 style="margin-bottom: 1rem;">Troubleshooting Steps:</h3>
          <ol style="color: var(--text-secondary); line-height: 1.6;">
            <li>Check your internet connection</li>
            <li>Refresh the page (Ctrl+F5 or Cmd+Shift+R)</li>
            <li>Try in incognito/private browsing mode</li>
            <li>Disable ad blockers temporarily</li>
            <li>Clear browser cache and cookies</li>
          </ol>
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <button onclick="window.location.reload()" class="btn btn-primary">
            🔄 Refresh Page
          </button>
          <button onclick="testEthersConnection()" class="btn btn-outline">
            🔍 Test Connection
          </button>
          <a href="profile.html" class="btn btn-ghost">
            ← Back to Profile
          </a>
        </div>
      </div>
    `;
  }
}

// Test ethers connection
async function testEthersConnection() {
  const testBtn = event.target;
  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';
  
  try {
    // Test CDN accessibility
    const response = await fetch('https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js', { method: 'HEAD' });
    if (response.ok) {
      alert('CDN is accessible. Attempting to reload ethers...');
      window.location.reload();
    } else {
      alert('CDN is not accessible. Please check your internet connection or try again later.');
    }
  } catch (error) {
    alert('Network error: ' + error.message + '. Please check your internet connection.');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '🔍 Test Connection';
  }
}

// Setup event listeners
function setupEventListeners() {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      console.log('Account changed:', accounts);
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        checkWalletConnection();
      }
    });

    window.ethereum.on('chainChanged', (chainId) => {
      console.log('Chain changed:', chainId);
      window.location.reload();
    });
  }
}

// Check if wallet is already connected
async function checkWalletConnection() {
  if (typeof window.ethereum === 'undefined') {
    console.log('MetaMask not installed');
    showMetaMaskNotInstalled();
    return;
  }

  if (typeof window.ethers === 'undefined' || !window.ethers.BrowserProvider) {
    console.error('Ethers not properly loaded during wallet check');
    showErrorUI('Wallet service not ready. Please refresh the page.');
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    console.log('Existing accounts:', accounts);
    
    if (accounts.length > 0) {
      provider = new window.ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();
      console.log('Auto-connected to:', userAddress);
      await updateWalletUI(true);
    } else {
      console.log('No accounts connected');
      await updateWalletUI(false);
    }
  } catch (error) {
    console.error('Error checking wallet connection:', error);
    utils.showAlert('Error checking wallet connection: ' + error.message, 'error');
  }
}

// Show MetaMask not installed message
function showMetaMaskNotInstalled() {
  const container = document.querySelector('.container');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🦊</div>
        <h2>MetaMask Required</h2>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">
          MetaMask is required to use wallet features. Please install it to continue.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="https://metamask.io/download/" target="_blank" class="btn btn-primary">
            📥 Install MetaMask
          </a>
          <button onclick="window.location.reload()" class="btn btn-outline">
            🔄 I've Installed It
          </button>
        </div>
      </div>
    `;
  }
}

// Connect to MetaMask wallet
async function connectWallet() {
  console.log('Attempting to connect wallet...');
  
  if (typeof window.ethereum === 'undefined') {
    utils.showAlert('MetaMask is not installed. Please install it from metamask.io', 'error');
    return;
  }

  if (typeof window.ethers === 'undefined' || !window.ethers.BrowserProvider) {
    utils.showAlert('Wallet service not ready. Please refresh the page and try again.', 'error');
    return;
  }

  try {
    console.log('Requesting account access...');
    
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('Accounts granted:', accounts);
    
    if (accounts.length === 0) {
      throw new Error('No accounts available. Please unlock MetaMask.');
    }
    
    console.log('Creating provider and signer...');
    provider = new window.ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    
    console.log('Connected to address:', userAddress);
    
    utils.showAlert('Wallet connected successfully!', 'success');
    await updateWalletUI(true);
    
  } catch (error) {
    console.error('Error connecting wallet:', error);
    
    let errorMessage = 'Failed to connect wallet';
    if (error.code === 4001) {
      errorMessage = 'Connection was rejected. Please try again.';
    } else if (error.message.includes('User rejected')) {
      errorMessage = 'Connection was rejected by user.';
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    utils.showAlert(errorMessage, 'error');
  }
}

// Disconnect wallet
async function disconnectWallet() {
  console.log('Disconnecting wallet...');
  
  try {
    // Call backend to save disconnection state
    await utils.apiCall('/wallet/disconnect', {
      method: 'POST'
    });
    console.log('Backend disconnection successful');
  } catch (error) {
    console.log('Backend disconnect error:', error);
    // Continue with local disconnection even if backend fails
  }

  // Reset local state
  provider = null;
  signer = null;
  userAddress = null;
  
  await updateWalletUI(false);
  utils.showAlert('Wallet disconnected', 'success');
}

// Update UI based on wallet connection status
async function updateWalletUI(connected) {
  console.log('Updating wallet UI, connected:', connected);
  
  const disconnectedDiv = document.querySelector('.wallet-disconnected');
  const connectedDiv = document.querySelector('.wallet-connected');

  if (!disconnectedDiv || !connectedDiv) {
    console.error('Wallet UI elements not found');
    return;
  }

  if (connected && userAddress) {
    disconnectedDiv.style.display = 'none';
    connectedDiv.style.display = 'block';

    // Update address
    const addressElement = document.querySelector('.wallet-address');
    if (addressElement) {
      addressElement.textContent = userAddress;
    }

    // Get and display network
    try {
      const network = await provider.getNetwork();
      const networkName = getNetworkName(Number(network.chainId));
      const networkElement = document.querySelector('.wallet-network');
      if (networkElement) {
        networkElement.textContent = networkName;
      }
      console.log('Connected to network:', networkName);
    } catch (error) {
      console.error('Error getting network:', error);
      const networkElement = document.querySelector('.wallet-network');
      if (networkElement) {
        networkElement.textContent = 'Unknown Network';
      }
    }

    // Get and display balance
    try {
      const balance = await provider.getBalance(userAddress);
      const balanceInEth = window.ethers.formatEther(balance);
      const balanceElement = document.getElementById('wallet-balance-display');
      if (balanceElement) {
        balanceElement.textContent = parseFloat(balanceInEth).toFixed(4);
      }
      console.log('Balance:', balanceInEth, 'ETH');
      
      // Save wallet info to backend
      try {
        const network = await provider.getNetwork();
        await utils.apiCall('/wallet/connect', {
          method: 'POST',
          body: JSON.stringify({
            walletAddress: userAddress,
            networkId: Number(network.chainId),
            networkName: getNetworkName(Number(network.chainId)),
            balance: balanceInEth
          })
        });
        console.log('Wallet info saved to backend');
      } catch (backendError) {
        console.log('Backend wallet save failed:', backendError);
        // Continue - UI should still work
      }
    } catch (error) {
      console.error('Error getting balance:', error);
      const balanceElement = document.getElementById('wallet-balance-display');
      if (balanceElement) {
        balanceElement.textContent = '0.0000';
      }
    }
  } else {
    disconnectedDiv.style.display = 'block';
    connectedDiv.style.display = 'none';
    console.log('UI set to disconnected state');
  }
}

// Get human-readable network name
function getNetworkName(chainId) {
  const networks = {
    1: 'Ethereum Mainnet',
    3: 'Ropsten Testnet',
    4: 'Rinkeby Testnet',
    5: 'Goerli Testnet',
    42: 'Kovan Testnet',
    11155111: 'Sepolia Testnet',
    137: 'Polygon Mainnet',
    80001: 'Mumbai Testnet',
    56: 'BSC Mainnet',
    97: 'BSC Testnet',
  };

  return networks[chainId] || `Chain ID: ${chainId}`;
}

// Update balance
async function updateBalance() {
  if (!provider || !userAddress) {
    utils.showAlert('Wallet not connected', 'warning');
    return;
  }

  try {
    const balance = await provider.getBalance(userAddress);
    const balanceInEth = window.ethers.formatEther(balance);
    document.getElementById('wallet-balance-display').textContent = parseFloat(balanceInEth).toFixed(4);
    
    // Update backend
    await utils.apiCall('/wallet/balance', {
      method: 'PATCH',
      body: JSON.stringify({ balance: balanceInEth })
    });
    
    utils.showAlert('Balance updated!', 'success');
  } catch (error) {
    console.error('Balance update error:', error);
    utils.showAlert('Failed to update balance', 'error');
  }
}

// Copy address to clipboard
function copyAddress() {
  if (!userAddress) {
    utils.showAlert('No wallet address to copy', 'warning');
    return;
  }

  navigator.clipboard.writeText(userAddress).then(() => {
    utils.showAlert('Address copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy address:', err);
    utils.showAlert('Failed to copy address', 'error');
  });
}

// Make test function available globally
window.testEthersConnection = testEthersConnection;

// Make functions globally available
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.updateBalance = updateBalance;
window.copyAddress = copyAddress;
