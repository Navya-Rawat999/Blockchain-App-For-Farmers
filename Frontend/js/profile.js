import utils from '../js/utils.js';
import centralizedWallet, { CONTRACT_ABI } from '../js/wallet.js';
import { ethers } from 'ethers';

// Profile page functionality using centralized wallet
// CONTRACT_ABI is now imported from wallet.js which gets it from environment

// Connect wallet using centralized wallet
async function connectWallet() {
  try {
    await centralizedWallet.waitForReady();
    const result = await centralizedWallet.connectWallet();
    
    // Update UI elements specific to profile page
    document.getElementById('wallet-address').textContent = result.address;
    document.getElementById('connect-wallet-btn').textContent = 'Wallet Connected';
    document.getElementById('connect-wallet-btn').disabled = true;
    document.getElementById('disconnect-wallet-btn').style.display = 'inline-block';
    document.getElementById('metamask-info').style.display = 'block';
    
    localStorage.setItem('saved_wallet_address', result.address);
    
    await loadWalletInfo();
    utils.showAlert('Wallet connected successfully!', 'success');
    
    await loadUserStats();
    await loadTransactions();
  } catch (error) {
    console.error('Wallet connection error:', error);
    utils.showAlert('Failed to connect wallet: ' + error.message, 'error');
  }
}

// Disconnect wallet using centralized wallet
async function disconnectWallet() {
  try {
    await centralizedWallet.disconnectWallet();
    
    document.getElementById('connect-wallet-btn').textContent = 'Connect MetaMask';
    document.getElementById('connect-wallet-btn').disabled = false;
    document.getElementById('disconnect-wallet-btn').style.display = 'none';
    document.getElementById('metamask-info').style.display = 'none';
    
    const savedAddress = localStorage.getItem('saved_wallet_address');
    if (!savedAddress) {
      document.getElementById('wallet-address').textContent = 'Not set';
    }
    
    utils.showAlert('Wallet disconnected successfully!', 'success');
  } catch (error) {
    console.error('Wallet disconnection error:', error);
    utils.showAlert('Wallet disconnected', 'success');
  }
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

// Refresh transactions
async function refreshTransactions() {
  utils.showAlert('Refreshing transactions...', 'warning');
  await loadTransactions();
  await loadUserStats();
  utils.showAlert('Transactions refreshed!', 'success');
}

// Test logout function
async function testLogout() {
  try {
    console.log('Testing logout...');
    
    // Try navbar logout first
    if (window.handleLogout) {
      await window.handleLogout();
    } else {
      // Fallback to utils logout
      await utils.logout();
    }
  } catch (error) {
    console.error('Logout test error:', error);
    alert('Logout error: ' + error.message);
  }
}

// Load wallet information using centralized wallet
async function loadWalletInfo() {
  if (!centralizedWallet.isWalletConnected()) {
    return;
  }

  try {
    const provider = centralizedWallet.getProvider();
    const userAddress = centralizedWallet.getAddress();
    
    const network = await provider.getNetwork();
    document.getElementById('network-name').textContent = network.name || `Chain ID: ${network.chainId}`;

    const balance = await provider.getBalance(userAddress);
    const balanceInEth = ethers.formatEther(balance);
    document.getElementById('wallet-balance').textContent = `${parseFloat(balanceInEth).toFixed(4)} ETH`;
    
    document.getElementById('stat-balance').textContent = `${parseFloat(balanceInEth).toFixed(4)} ETH`;

    await centralizedWallet.saveWalletToBackend(balanceInEth);
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

// Load saved wallet address
function loadSavedWalletAddress() {
  const savedAddress = localStorage.getItem('saved_wallet_address');
  if (savedAddress) {
    document.getElementById('wallet-address').textContent = savedAddress;
  }
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
  if (!centralizedWallet.isWalletConnected()) return {};

  try {
    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) return {};

    const userAddress = centralizedWallet.getAddress();
    
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

    const revenueInEth = totalRevenue > 0 ? window.ethers.formatEther(totalRevenue) : '0';

    return {
      registered: { value: registered, label: 'Products Registered' },
      sold: { value: sold, label: 'Products Sold' },
      revenue: { value: `${revenueInEth} ETH`, label: 'Total Revenue' },
      available: { value: registered - sold, label: 'Available' }
    };
  } catch (error) {
    console.error('Error loading farmer stats:', error);
    return {};
  }
}

// Load customer-specific statistics
async function loadCustomerStats() {
  if (!centralizedWallet.isWalletConnected()) return {};

  try {
    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) return {};

    const userAddress = centralizedWallet.getAddress();
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

  if (!centralizedWallet.isWalletConnected()) {
    transactionsList.innerHTML = '<p class="text-secondary text-center">Connect your wallet to view transaction history</p>';
    return;
  }

  transactionsList.innerHTML = '<p class="text-secondary text-center">Loading transactions...</p>';

  try {
    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to contract');
    }

    const userAddress = centralizedWallet.getAddress();
    const nextId = await contract.nextProduceId();
    const totalItems = Number(nextId) - 1;
    
    const transactions = [];

    for (let i = 1; i <= totalItems; i++) {
      try {
        const details = await contract.getProduceDetails(i);
        
        if (user.role === 'farmer' && details[2].toLowerCase() === userAddress.toLowerCase()) {
          transactions.push({
            type: 'registration',
            productName: details[1],
            productId: details[0].toString(),
            timestamp: details[8],
            price: details[5]
          });
        }

        const history = await contract.getSaleHistory(i);
        for (const sale of history) {
          if (sale[1].toLowerCase() === userAddress.toLowerCase()) {
            transactions.push({
              type: 'purchase',
              productName: details[1],
              productId: details[0].toString(),
              timestamp: sale[4],
              price: sale[3],
              seller: sale[2]
            });
          } else if (sale[2].toLowerCase() === userAddress.toLowerCase()) {
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

    transactions.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    document.getElementById('stat-transactions').textContent = transactions.length;

    if (transactions.length === 0) {
      transactionsList.innerHTML = '<p class="text-secondary text-center">No transactions found</p>';
      return;
    }

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

// Setup event listeners
function setupEventListeners() {
  // Connect wallet button
  const connectBtn = document.getElementById('connect-wallet-btn');
  if (connectBtn) {
    connectBtn.addEventListener('click', connectWallet);
  }

  // Disconnect wallet button
  const disconnectBtn = document.getElementById('disconnect-wallet-btn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', disconnectWallet);
  }

  // Save wallet address button
  const saveWalletBtn = document.getElementById('save-wallet-btn');
  if (saveWalletBtn) {
    saveWalletBtn.addEventListener('click', saveWalletAddress);
  }

  // Copy wallet address button
  const copyBtn = document.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyWalletAddress);
  }

  // Refresh transactions button
  const refreshBtn = document.getElementById('refresh-transactions-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshTransactions);
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-profile-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', testLogout);
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication via refresh token and cookies
  if (!(await utils.checkAuth())) {
    utils.redirect('login.html');
    return;
  }

  // Setup event listeners
  setupEventListeners();

  // Load profile data
  loadProfileData();

  try {
    await centralizedWallet.waitForReady();
    
    if (centralizedWallet.isWalletConnected()) {
      await loadWalletInfo();
      await loadUserStats();
      await loadTransactions();
    } else {
      document.getElementById('stat-balance').textContent = 'Connect Wallet';
    }
  } catch (error) {
    console.error('Wallet initialization error:', error);
    document.getElementById('stat-balance').textContent = 'Wallet Error';
  }
});

// Don't make functions globally available - use event listeners instead
