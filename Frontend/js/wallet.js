import utils from '../js/utils.js';

// Wallet Connection Handler
let provider = null;
let signer = null;
let userAddress = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication first
  const isAuthenticated = await utils.checkAuth();
  if (!isAuthenticated) {
    window.location.href = '/HTML/login.html';
    return;
  }

  const connectBtn = document.getElementById('connect-wallet-btn');
  const disconnectBtn = document.getElementById('disconnect-wallet-btn');

  // Check if already connected
  await checkWalletConnection();

  // Connect wallet button
  connectBtn.addEventListener('click', async () => {
    await connectWallet();
  });

  // Disconnect wallet button
  disconnectBtn.addEventListener('click', () => {
    disconnectWallet();
  });

  // Listen for account changes
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        checkWalletConnection();
      }
    });

    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
  }
});

// Check if wallet is already connected
async function checkWalletConnection() {
  if (typeof window.ethereum === 'undefined') {
    utils.showAlert('MetaMask is not installed. Please install it to use this feature.', 'warning');
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    
    if (accounts.length > 0) {
      userAddress = accounts[0].address;
      await updateWalletUI(true);
    }
  } catch (error) {
    console.error('Error checking wallet connection:', error);
  }
}

// Connect to MetaMask wallet
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    utils.showAlert('MetaMask is not installed. Please install it from metamask.io', 'error');
    return;
  }

  try {
    // Request account access
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    
    utils.showAlert('Wallet connected successfully!', 'success');
    await updateWalletUI(true);
  } catch (error) {
    console.error('Error connecting wallet:', error);
    utils.showAlert(error.message || 'Failed to connect wallet', 'error');
  }
}

// Disconnect wallet
function disconnectWallet() {
  provider = null;
  signer = null;
  userAddress = null;
  
  updateWalletUI(false);
  utils.showAlert('Wallet disconnected', 'success');
}

// Update UI based on wallet connection status
async function updateWalletUI(connected) {
  const disconnectedDiv = document.getElementById('wallet-disconnected');
  const connectedDiv = document.getElementById('wallet-connected');

  if (connected && userAddress) {
    disconnectedDiv.classList.add('hidden');
    connectedDiv.classList.remove('hidden');

    // Update address
    document.getElementById('wallet-address').textContent = userAddress;

    // Get and display network
    try {
      const network = await provider.getNetwork();
      const networkName = getNetworkName(Number(network.chainId));
      document.getElementById('wallet-network').textContent = networkName;
    } catch (error) {
      document.getElementById('wallet-network').textContent = 'Unknown';
    }

    // Get and display balance
    try {
      const balance = await provider.getBalance(userAddress);
      const balanceInEth = ethers.formatEther(balance);
      document.getElementById('wallet-balance').textContent = parseFloat(balanceInEth).toFixed(4);
    } catch (error) {
      document.getElementById('wallet-balance').textContent = '0.0000';
    }
  } else {
    disconnectedDiv.classList.remove('hidden');
    connectedDiv.classList.add('hidden');
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
