import utils from '../js/utils.js';

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!(await utils.checkAuth())) {
    utils.redirect('login.html');
    return;
  }

  // Setup event listeners
  setupEventListeners();

  // Load profile data
  await loadProfileData();
});

async function loadProfileData() {
  try {
    // Fetch fresh profile data from backend
    const response = await utils.apiCall('/api/v1/users/profile');
    
    if (response.success && response.data) {
      const { user, stats } = response.data;
      displayUserProfile(user);
      displayUserStats(user.role, stats);
      displayTransactions(stats.transactions ? stats.transactions.recent : []);
    } else {
      throw new Error(response.message || 'Failed to fetch profile');
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    utils.showAlert('Failed to load profile data. Please try again.', 'error');
  }
}

function displayUserProfile(user) {
  // Header
  const nameElement = document.getElementById('profile-name');
  const roleElement = document.getElementById('profile-role');
  const avatarElement = document.getElementById('profile-avatar');
  
  if (nameElement) nameElement.textContent = user.fullName || user.username || 'User';
  if (roleElement) roleElement.textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
  
  if (avatarElement) {
    const avatarEmoji = user.role === 'farmer' ? '🧑‍🌾' : user.role === 'customer' ? '🛒' : '👤';
    avatarElement.textContent = avatarEmoji;
  }

  // Account Info
  setTextContent('info-fullname', user.fullName);
  setTextContent('info-email', user.email);
  setTextContent('info-username', user.username);
  setTextContent('info-role', user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '-');
  
  if (user.createdAt) {
    const date = new Date(user.createdAt);
    setTextContent('member-since', date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
  }
}

function displayUserStats(role, stats) {
  // Calculate total transactions
  let totalTx = 0;
  if (stats && stats.transactions && stats.transactions.byType) {
    Object.values(stats.transactions.byType).forEach(typeStat => {
      totalTx += typeStat.count || 0;
    });
  }
  setTextContent('stat-transactions', totalTx);
  
  // Placeholder for products count as it requires specific backend support or blockchain query
  setTextContent('stat-products', '-'); 
}

function displayTransactions(transactions) {
  const listElement = document.getElementById('transactions-list');
  if (!listElement) return;

  if (!transactions || transactions.length === 0) {
    listElement.innerHTML = '<p class="text-secondary text-center">No recent transactions found</p>';
    return;
  }

  const html = transactions.map(tx => {
    const date = new Date(tx.createdAt).toLocaleDateString();
    // Approximate ETH conversion (1e18)
    const ethAmount = (Number(tx.amountInWei) / 1e18).toFixed(4);
    
    return `
      <div class="transaction-item">
        <div class="transaction-header">
          <div>
            <span class="tx-type ${tx.transactionType === 'sale' ? 'tx-sale' : 'tx-registration'}">
              ${tx.transactionType.toUpperCase()}
            </span>
            <h4 style="margin: 0.5rem 0; font-size: 1rem;">${tx.productName || 'Product'}</h4>
          </div>
          <div style="text-align: right;">
            <div class="transaction-amount">${ethAmount} ETH</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">${date}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  listElement.innerHTML = html;
}

function setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '-';
}

function setupEventListeners() {
  const logoutBtn = document.getElementById('logout-profile-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await utils.logout();
    });
  }

  const refreshBtn = document.getElementById('refresh-transactions-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadProfileData);
  }
}
