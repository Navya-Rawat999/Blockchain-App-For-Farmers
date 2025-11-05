import utils from '../js/utils.js';

// Profile page functionality
let provider = null;
let signer = null;
let userAddress = null;

// Contract ABI for transaction history
const CONTRACT_ABI = [
  "function getProduceDetails(uint256 _id) public view returns (uint256 id, string memory name, address originalFarmer, address currentSeller, string memory currentStatus, uint256 priceInWei, string memory originFarm, string memory qrCode, uint256 registrationTimestamp)",
  "function getSaleHistory(uint256 _id) public view returns (tuple(uint256 ProduceId, address buyer, address seller, uint256 pricePaidInWei, uint256 SaleTimeStamp)[] memory)",
  "function nextProduceId() public view returns (uint256)",
  "event ProduceRegistered(uint256 indexed id, string name, address indexed farmer, string originFarm)",
  "event ProduceSold(uint256 indexed id, address indexed buyer, address indexed seller, uint256 pricePaidInWei)"
];

const CONTRACT_ADDRESS = '0x742d35Cc6135C4Ad4C006C8C704aC8DC7CE18F72';

// Connect wallet directly without wallet service
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    utils.showAlert('MetaMask is not installed. Please install it from metamask.io', 'error');
    return;
  }

  // Wait for ethers to be available
  if (typeof window.ethers === 'undefined') {
    utils.showAlert('Loading wallet service...', 'warning');
    let attempts = 0;
    while (typeof window.ethers === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof window.ethers === 'undefined') {
      utils.showAlert('Failed to load wallet service. Please refresh the page.', 'error');
      return;
    }
  }

  try {
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Set up provider and signer
    provider = new window.ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    // Update UI elements
    document.getElementById('wallet-address').textContent = userAddress;
    document.getElementById('connect-wallet-btn').textContent = 'Wallet Connected';
    document.getElementById('connect-wallet-btn').disabled = true;
    document.getElementById('disconnect-wallet-btn').style.display = 'inline-block';
    document.getElementById('metamask-info').style.display = 'block';
    
    // Save to localStorage for persistence
    localStorage.setItem('saved_wallet_address', userAddress);
    
    await loadWalletInfo();
    utils.showAlert('Wallet connected successfully!', 'success');
    
    // Load stats and transactions
    await loadUserStats();
    await loadTransactions();
  } catch (error) {
    console.error('Wallet connection error:', error);
    utils.showAlert('Failed to connect wallet: ' + error.message, 'error');
  }
}

// Disconnect wallet
async function disconnectWallet() {
  try {
    // Call backend API to disconnect wallet
    await utils.apiCall('/wallet/disconnect', {
      method: 'POST'
    });

    // Reset local state
    provider = null;
    signer = null;
    userAddress = null;
    
    // Update UI
    document.getElementById('connect-wallet-btn').textContent = 'Connect MetaMask';
    document.getElementById('connect-wallet-btn').disabled = false;
    document.getElementById('disconnect-wallet-btn').style.display = 'none';
    document.getElementById('metamask-info').style.display = 'none';
    
    // Keep saved address from manual input or clear it
    const savedAddress = localStorage.getItem('saved_wallet_address');
    if (!savedAddress) {
      document.getElementById('wallet-address').textContent = 'Not set';
    }
    
    utils.showAlert('Wallet disconnected successfully!', 'success');
  } catch (error) {
    console.error('Wallet disconnection error:', error);
    // Still update UI even if API call fails
    provider = null;
    signer = null;
    userAddress = null;
    utils.showAlert('Wallet disconnected', 'success');
  }
}

// Load wallet information
async function loadWalletInfo() {
  if (!provider || !userAddress) {
    return;
  }

  try {
    // Get network
    const network = await provider.getNetwork();
    document.getElementById('network-name').textContent = network.name || `Chain ID: ${network.chainId}`;

    // Get balance
    const balance = await provider.getBalance(userAddress);
    const balanceInEth = window.ethers.formatEther(balance);
    document.getElementById('wallet-balance').textContent = `${parseFloat(balanceInEth).toFixed(4)} ETH`;
    
    // Update stats
    document.getElementById('stat-balance').textContent = `${parseFloat(balanceInEth).toFixed(4)} ETH`;

    // Save wallet info to backend
    try {
      await utils.apiCall('/wallet/connect', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: userAddress,
          networkId: Number(network.chainId),
          networkName: network.name || `Chain ID: ${network.chainId}`,
          balance: balanceInEth
        })
      });
    } catch (backendError) {
      console.log('Backend wallet save failed:', backendError);
      // Continue - UI should still work
    }
  } catch (error) {
    console.error('Error loading wallet info:', error);
  }
}

// Load user profile data
function loadProfileData() {
  const user = utils.getUser();
  
  if (!user) {
    utils.redirect('login.html');
    return;
  }

  // Set profile header - use the correct field names from backend
  document.getElementById('profile-name').textContent = user.fullName || user.username || 'User';
  document.getElementById('profile-role').textContent = user.role || 'User';

  // Set avatar emoji based on role
  const avatarEmoji = user.role === 'farmer' ? '🧑‍🌾' : user.role === 'customer' ? '🛒' : '👤';
  document.getElementById('profile-avatar').textContent = avatarEmoji;

  // Set account information - use correct field names
  document.getElementById('info-fullname').textContent = user.fullName || 'N/A';
  document.getElementById('info-email').textContent = user.email || 'N/A';
  document.getElementById('info-username').textContent = user.username || 'N/A';
  document.getElementById('info-role').textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A';
  
  // Set member since (if available)
  if (user.createdAt) {
    const date = new Date(user.createdAt);
    document.getElementById('member-since').textContent = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } else {
    document.getElementById('member-since').textContent = 'N/A';
  }

  // Load saved wallet address if any
  loadSavedWalletAddress();
}

// Save wallet address manually
function saveWalletAddress() {
  const addressInput = document.getElementById('manual-wallet-address');
  const address = addressInput.value.trim();
  
  if (!address) {
    utils.showAlert('Please enter a wallet address', 'warning');
    return;
  }

  // Basic validation for Ethereum address
  if (!address.startsWith('0x') || address.length !== 42) {
    utils.showAlert('Please enter a valid Ethereum address (starts with 0x and 42 characters long)', 'error');
    return;
  }

  // Save to localStorage
  localStorage.setItem('saved_wallet_address', address);
  
  // Update display
  document.getElementById('wallet-address').textContent = address;
  
  // Clear input
  addressInput.value = '';
  
  utils.showAlert('Wallet address saved successfully!', 'success');
}

// Load saved wallet address
function loadSavedWalletAddress() {
  const savedAddress = localStorage.getItem('saved_wallet_address');
  if (savedAddress) {
    document.getElementById('wallet-address').textContent = savedAddress;
    userAddress = savedAddress; // Set for blockchain operations
  }
}

// Copy wallet address to clipboard
function copyWalletAddress() {
  const address = document.getElementById('wallet-address').textContent;
  if (address === 'Not set' || address === 'Not connected') {
    utils.showAlert('No wallet address to copy', 'warning');
    return;
  }

  navigator.clipboard.writeText(address).then(() => {
    utils.showAlert('Address copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy address:', err);
    utils.showAlert('Failed to copy address', 'error');
  });
}

// Load user statistics
async function loadUserStats() {
  const user = utils.getUser();
  if (!user) return;

  try {
    let stats = {};

    if (user.role === 'farmer') {
      stats = await loadFarmerStats();
    } else if (user.role === 'customer') {
      stats = await loadCustomerStats();
    }

    // Update stats in UI
    if (stats.registered) {
      document.getElementById('stat-products').textContent = stats.registered.value;
    }
    if (stats.purchases) {
      document.getElementById('stat-products').textContent = stats.purchases.value;
    }

    // Transaction count will be updated when transactions load
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load farmer-specific statistics
async function loadFarmerStats() {
  if (!provider || !userAddress) return {};

  try {
    const contract = new window.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const nextId = await contract.nextProduceId();
    const totalItems = Number(nextId) - 1;
    
    let registered = 0;
    let sold = 0;
    let totalRevenue = BigInt(0);

    for (let i = 1; i <= totalItems; i++) {
      try {
        const details = await contract.getProduceDetails(i);
        const originalFarmer = details[2];
        
        if (originalFarmer.toLowerCase() === userAddress.toLowerCase()) {
          registered++;
          if (details[4] === 'Sold') {
            sold++;
            const history = await contract.getSaleHistory(i);
            if (history.length > 0) {
              totalRevenue += BigInt(history[0][3]);
            }
          }
        }
      } catch (err) {
        console.error(`Error loading produce ${i}:`, err);
      }
    }

    return {
      registered: { value: registered, label: 'Products Registered' },
      sold: { value: sold, label: 'Products Sold' },
      revenue: { value: `${window.ethers.formatEther(totalRevenue)} ETH`, label: 'Total Revenue' },
      available: { value: registered - sold, label: 'Available' }
    };
  } catch (error) {
    console.error('Error loading farmer stats:', error);
    return {};
  }
}

// Load customer-specific statistics
async function loadCustomerStats() {
  if (!provider || !userAddress) return {};

  try {
    const contract = new window.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const nextId = await contract.nextProduceId();
    const totalItems = Number(nextId) - 1;
    
    let purchases = 0;
    let totalSpent = BigInt(0);

    for (let i = 1; i <= totalItems; i++) {
      try {
        const history = await contract.getSaleHistory(i);
        for (const sale of history) {
          if (sale[1].toLowerCase() === userAddress.toLowerCase()) {
            purchases++;
            totalSpent += BigInt(sale[3]);
          }
        }
      } catch (err) {
        console.error(`Error loading sale history ${i}:`, err);
      }
    }

    return {
      purchases: { value: purchases, label: 'Total Purchases' },
      spent: { value: `${window.ethers.formatEther(totalSpent)} ETH`, label: 'Total Spent' },
      available: { value: totalItems, label: 'Products Available' }
    };
  } catch (error) {
    console.error('Error loading customer stats:', error);
    return {};
  }
}

// Load transaction history
async function loadTransactions() {
  const transactionsList = document.getElementById('transactions-list');
  const user = utils.getUser();

  if (!provider || !userAddress) {
    transactionsList.innerHTML = '<p class="text-secondary text-center">Connect your wallet to view transaction history</p>';
    return;
  }

  transactionsList.innerHTML = '<p class="text-secondary text-center">Loading transactions...</p>';

  try {
    const contract = new window.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const nextId = await contract.nextProduceId();
    const totalItems = Number(nextId) - 1;
    
    const transactions = [];

    // Gather transactions
    for (let i = 1; i <= totalItems; i++) {
      try {
        const details = await contract.getProduceDetails(i);
        
        // Check if user is the farmer
        if (user.role === 'farmer' && details[2].toLowerCase() === userAddress.toLowerCase()) {
          transactions.push({
            type: 'registration',
            productName: details[1],
            productId: details[0].toString(),
            timestamp: details[8],
            price: details[5]
          });
        }

        // Check sale history
        const history = await contract.getSaleHistory(i);
        for (const sale of history) {
          if (sale[1].toLowerCase() === userAddress.toLowerCase()) { // buyer
            transactions.push({
              type: 'purchase',
              productName: details[1],
              productId: details[0].toString(),
              timestamp: sale[4],
              price: sale[3],
              seller: sale[2]
            });
          } else if (sale[2].toLowerCase() === userAddress.toLowerCase()) { // seller
            transactions.push({
              type: 'sale',
              productName: details[1],
              productId: details[0].toString(),
              timestamp: sale[4],
              price: sale[3],
              buyer: sale[1]
            });
          }
        }
      } catch (err) {
        console.error(`Error loading transaction ${i}:`, err);
      }
    }

    // Sort by timestamp (newest first)
    transactions.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

    // Update transaction count in stats
    document.getElementById('stat-transactions').textContent = transactions.length;

    if (transactions.length === 0) {
      transactionsList.innerHTML = '<p class="text-secondary text-center">No transactions found</p>';
      return;
    }

    // Display transactions
    const transactionsHTML = transactions.map(tx => {
      const date = new Date(Number(tx.timestamp) * 1000);
      const priceInEth = window.ethers.formatEther(tx.price);
      
      let typeClass = 'tx-registration';
      let typeLabel = '📝 Registration';
      let details = '';

      if (tx.type === 'purchase') {
        typeClass = 'tx-purchase';
        typeLabel = '🛒 Purchase';
        details = `Bought from: ${tx.seller.slice(0, 6)}...${tx.seller.slice(-4)}`;
      } else if (tx.type === 'sale') {
        typeClass = 'tx-sale';
        typeLabel = '💰 Sale';
        details = `Sold to: ${tx.buyer.slice(0, 6)}...${tx.buyer.slice(-4)}`;
      }

      return `
        <div class="transaction-item" style="padding: 1rem; margin-bottom: 1rem; background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: 0.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
            <div>
              <span class="tx-type ${typeClass}" style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;">${typeLabel}</span>
              <h4 style="font-size: 1rem; font-weight: 600; margin: 0.5rem 0 0.25rem 0;">${tx.productName}</h4>
              <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">
                ID: ${tx.productId} ${details ? '• ' + details : ''}
              </p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.125rem; font-weight: 700; color: var(--primary-color);">
                ${priceInEth} ETH
              </div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                ${date.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    transactionsList.innerHTML = transactionsHTML;
  } catch (error) {
    console.error('Error loading transactions:', error);
    transactionsList.innerHTML = '<p style="color: var(--error); text-align: center;">Failed to load transactions</p>';
  }
}

// Refresh transactions
async function refreshTransactions() {
  utils.showAlert('Refreshing transactions...', 'warning');
  await loadTransactions();
  await loadUserStats();
  utils.showAlert('Transactions refreshed!', 'success');
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication via refresh token and cookies
  if (!(await utils.checkAuth())) {
    utils.redirect('login.html');
    return;
  }

  // Load profile data
  loadProfileData();

  // Wait for ethers to load before trying to connect wallet
  let ethersReady = false;
  try {
    let attempts = 0;
    while (typeof window.ethers === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    ethersReady = typeof window.ethers !== 'undefined';
  } catch (error) {
    console.error('Error waiting for ethers:', error);
  }

  if (ethersReady) {
    // Try to auto-connect wallet if already connected
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet();
        } else {
          // Show message to connect wallet
          document.getElementById('stat-balance').textContent = 'Connect Wallet';
        }
      } catch (error) {
        console.error('Auto-connect error:', error);
      }
    }

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
          await disconnectWallet();
          utils.showAlert('Wallet disconnected', 'warning');
        } else {
          await connectWallet();
          utils.showAlert('Wallet account changed', 'success');
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  } else {
    document.getElementById('stat-balance').textContent = 'Ethers not loaded';
  }
});

// Make functions globally available
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.copyWalletAddress = copyWalletAddress;
window.saveWalletAddress = saveWalletAddress;
window.refreshTransactions = refreshTransactions;
