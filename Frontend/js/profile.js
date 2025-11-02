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

const CONTRACT_ADDRESS = '0x...'; // Replace with your deployed contract address

// Connect wallet
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    utils.showAlert('Please install MetaMask to connect your wallet', 'error');
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    await loadWalletInfo();
    utils.showAlert('Wallet connected successfully!', 'success');
  } catch (error) {
    console.error('Wallet connection error:', error);
    utils.showAlert('Failed to connect wallet. Please try again.', 'error');
  }
}

// Load wallet information
async function loadWalletInfo() {
  if (!provider || !signer) {
    return;
  }

  try {
    // Get wallet address
    const address = await signer.getAddress();
    document.getElementById('wallet-address').textContent = address;
    document.getElementById('wallet-status').innerHTML = '<span style="color: var(--success);">✓ Connected</span>';

    // Get network
    const network = await provider.getNetwork();
    document.getElementById('network-name').textContent = network.name || `Chain ID: ${network.chainId}`;

    // Get balance
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);
    document.getElementById('wallet-balance').textContent = `${parseFloat(balanceInEth).toFixed(4)} ETH`;

    // Update button
    const connectBtn = document.getElementById('connect-wallet-btn');
    connectBtn.textContent = 'Wallet Connected';
    connectBtn.disabled = true;
    connectBtn.style.opacity = '0.6';
  } catch (error) {
    console.error('Error loading wallet info:', error);
  }
}

// Copy wallet address to clipboard
function copyWalletAddress() {
  const address = document.getElementById('wallet-address').textContent;
  if (address === 'Not connected') {
    utils.showAlert('Please connect your wallet first', 'warning');
    return;
  }

  navigator.clipboard.writeText(address).then(() => {
    utils.showAlert('Address copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy address:', err);
    utils.showAlert('Failed to copy address', 'error');
  });
}

// Load user profile data
function loadProfileData() {
  const user = utils.getUser();
  
  if (!user) {
    utils.redirect('login.html');
    return;
  }

  // Set profile header
  document.getElementById('profile-name').textContent = user.fullname || user.username || 'User';
  document.getElementById('profile-email').textContent = user.email || 'No email provided';
  document.getElementById('profile-role').textContent = user.role || 'User';

  // Set avatar emoji based on role
  const avatarEmoji = user.role === 'farmer' ? '🧑‍🌾' : user.role === 'customer' ? '🛒' : '👤';
  document.getElementById('profile-avatar').textContent = avatarEmoji;

  // Set account information
  document.getElementById('info-fullname').textContent = user.fullname || user.username || 'N/A';
  document.getElementById('info-email').textContent = user.email || 'N/A';
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
}

// Load user statistics
async function loadUserStats() {
  const user = utils.getUser();
  if (!user) return;

  const statsGrid = document.getElementById('stats-grid');
  
  try {
    if (!provider) {
      // Try to connect automatically if MetaMask is installed
      if (typeof window.ethereum !== 'undefined') {
        provider = new ethers.BrowserProvider(window.ethereum);
      }
    }

    let stats = {};

    if (user.role === 'farmer') {
      stats = await loadFarmerStats();
    } else if (user.role === 'customer') {
      stats = await loadCustomerStats();
    }

    // Display stats
    let statsHTML = '';
    for (const [key, value] of Object.entries(stats)) {
      statsHTML += `
        <div class="stat-card">
          <div class="stat-value">${value.value}</div>
          <div class="stat-label">${value.label}</div>
        </div>
      `;
    }

    statsGrid.innerHTML = statsHTML || '<p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1;">Connect your wallet to view statistics</p>';
  } catch (error) {
    console.error('Error loading stats:', error);
    statsGrid.innerHTML = '<p style="color: var(--error); text-align: center; grid-column: 1/-1;">Failed to load statistics</p>';
  }
}

// Load farmer-specific statistics
async function loadFarmerStats() {
  if (!provider) return {};

  try {
    // Connect to contract
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // Get all produce items and filter by farmer
    const nextId = await contract.nextProduceId();
    const totalItems = Number(nextId) - 1;
    
    let registered = 0;
    let sold = 0;
    let totalRevenue = BigInt(0);

    if (signer && userAddress) {
      for (let i = 1; i <= totalItems; i++) {
        try {
          const details = await contract.getProduceDetails(i);
          const originalFarmer = details[2];
          
          if (originalFarmer.toLowerCase() === userAddress.toLowerCase()) {
            registered++;
            if (details[4] === 'Sold') {
              sold++;
              // Get sale history for this item
              const history = await contract.getSaleHistory(i);
              if (history.length > 0) {
                totalRevenue += BigInt(history[0][3]); // pricePaidInWei
              }
            }
          }
        } catch (err) {
          console.error(`Error loading produce ${i}:`, err);
        }
      }
    }

    return {
      registered: { value: registered, label: 'Products Registered' },
      sold: { value: sold, label: 'Products Sold' },
      revenue: { value: `${ethers.formatEther(totalRevenue)} ETH`, label: 'Total Revenue' },
      available: { value: registered - sold, label: 'Available' }
    };
  } catch (error) {
    console.error('Error loading farmer stats:', error);
    return {};
  }
}

// Load customer-specific statistics
async function loadCustomerStats() {
  if (!provider) return {};

  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const nextId = await contract.nextProduceId();
    const totalItems = Number(nextId) - 1;
    
    let purchases = 0;
    let totalSpent = BigInt(0);

    if (signer && userAddress) {
      for (let i = 1; i <= totalItems; i++) {
        try {
          const history = await contract.getSaleHistory(i);
          for (const sale of history) {
            if (sale[1].toLowerCase() === userAddress.toLowerCase()) { // buyer address
              purchases++;
              totalSpent += BigInt(sale[3]); // pricePaidInWei
            }
          }
        } catch (err) {
          console.error(`Error loading sale history ${i}:`, err);
        }
      }
    }

    return {
      purchases: { value: purchases, label: 'Total Purchases' },
      spent: { value: `${ethers.formatEther(totalSpent)} ETH`, label: 'Total Spent' },
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
    transactionsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Connect your wallet to view transaction history</p>';
    return;
  }

  transactionsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Loading transactions...</p>';

  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
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

    if (transactions.length === 0) {
      transactionsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No transactions found</p>';
      return;
    }

    // Display transactions
    const transactionsHTML = transactions.map(tx => {
      const date = new Date(Number(tx.timestamp) * 1000);
      const priceInEth = ethers.formatEther(tx.price);
      
      let typeClass = 'tx-registration';
      let typeLabel = '📝 Registration';
      let details = '';

      if (tx.type === 'purchase') {
        typeClass = 'tx-sale';
        typeLabel = '🛒 Purchase';
        details = `Bought from: ${tx.seller.slice(0, 6)}...${tx.seller.slice(-4)}`;
      } else if (tx.type === 'sale') {
        typeClass = 'tx-sale';
        typeLabel = '💰 Sale';
        details = `Sold to: ${tx.buyer.slice(0, 6)}...${tx.buyer.slice(-4)}`;
      }

      return `
        <div class="transaction-item">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
            <div>
              <span class="tx-type ${typeClass}">${typeLabel}</span>
              <h4 style="font-size: 1rem; font-weight: 600; margin-top: 0.5rem;">${tx.productName}</h4>
              <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
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

  // Try to auto-connect wallet if already connected
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await connectWallet();
        await loadUserStats();
        await loadTransactions();
      } else {
        // Show message to connect wallet
        document.getElementById('stats-grid').innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1;">Connect your wallet to view blockchain statistics</p>';
      }
    } catch (error) {
      console.error('Auto-connect error:', error);
    }
  }

  // Listen for account changes
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', async (accounts) => {
      if (accounts.length === 0) {
        utils.showAlert('Wallet disconnected', 'warning');
        location.reload();
      } else {
        await connectWallet();
        await loadUserStats();
        await loadTransactions();
      }
    });

    window.ethereum.on('chainChanged', () => {
      location.reload();
    });
  }
});

// Make functions globally available
window.connectWallet = connectWallet;
window.copyWalletAddress = copyWalletAddress;
window.refreshTransactions = refreshTransactions;
