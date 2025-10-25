import utils from '../js/utils.js';

// Customer Dashboard - View and purchase produce
let contract = null;
let provider = null;
let signer = null;

// Contract ABI - Updated to match new contract
const CONTRACT_ABI = [
  "function getProduceDetails(uint256 _id) public view returns (uint256 id, string memory name, address originalFarmer, address currentSeller, string memory currentStatus, uint256 priceInWei, string memory originFarm, string memory qrCode, uint256 registrationTimestamp)",
  "function buyProduce(uint256 _id) public payable",
  "function getSaleHistory(uint256 _id) public view returns (tuple(uint256 ProduceId, address buyer, address seller, uint256 pricePaidInWei, uint256 SaleTimeStamp)[] memory)"
];

const CONTRACT_ADDRESS = '0x...'; // Replace with your deployed contract address

// Initialize Web3 connection
async function initWeb3() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = await provider.getSigner();
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
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

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!utils.isAuthenticated()) {
    utils.redirect('login.html');
    return;
  }

  const user = utils.getUser();
  if (user && user.role !== 'customer') {
    utils.showAlert('Access denied. Customer account required.', 'error');
    utils.redirect('index.html');
    return;
  }

  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-produce');

  // Search produce by ID
  searchBtn.addEventListener('click', async () => {
    const produceId = searchInput.value;
    if (!produceId) {
      utils.showAlert('Please enter a produce ID', 'warning');
      return;
    }

    await viewProduceDetails(produceId);
  });

  // Allow search on Enter key
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });
});

// View produce details from blockchain
async function viewProduceDetails(produceId) {
  const detailsContainer = document.getElementById('produce-details');
  detailsContainer.innerHTML = '<p style="color: var(--text-secondary);">Loading produce details...</p>';

  try {
    // Initialize Web3 if needed
    if (!contract) {
      const initialized = await initWeb3();
      if (!initialized) {
        throw new Error('Please connect your wallet first');
      }
    }

    // Fetch produce details from blockchain
    const details = await contract.getProduceDetails(produceId);
    
    const priceInEth = ethers.formatEther(details[5]);
    const date = new Date(Number(details[8]) * 1000);
    
    // Display produce details
    detailsContainer.innerHTML = `
      <div class="card" style="background-color: var(--bg-dark); border: 2px solid var(--border-color);">
        <h3 style="font-size: 1.25rem; margin-bottom: 1rem; color: var(--primary-color);">${details[1]}</h3>
        
        <div style="display: grid; gap: 0.75rem;">
          <div>
            <strong>Produce ID:</strong> ${details[0].toString()}
          </div>
          <div>
            <strong>Origin Farm:</strong> ${details[6]}
          </div>
          <div>
            <strong>Status:</strong> 
            <span style="padding: 0.25rem 0.5rem; background-color: var(--success); border-radius: 0.25rem; font-size: 0.875rem;">
              ${details[4]}
            </span>
          </div>
          <div>
            <strong>Price:</strong> ${priceInEth} ETH
          </div>
          <div>
            <strong>Original Farmer:</strong> 
            <code style="font-size: 0.75rem; background-color: rgba(0,0,0,0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">
              ${details[2]}
            </code>
          </div>
          <div>
            <strong>Current Seller:</strong> 
            <code style="font-size: 0.75rem; background-color: rgba(0,0,0,0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">
              ${details[3]}
            </code>
          </div>
          <div>
            <strong>QR Code Data:</strong> ${details[7]}
          </div>
          <div>
            <strong>Registered:</strong> ${date.toLocaleString()}
          </div>
        </div>

        ${details[4] !== 'Sold' ? `
          <button 
            class="btn btn-primary mt-3" 
            style="width: 100%;"
            onclick="buyProduce('${produceId}', '${details[5].toString()}')"
          >
            Purchase for ${priceInEth} ETH
          </button>
        ` : `
          <div class="alert alert-warning mt-3">
            This produce has already been sold.
          </div>
        `}
      </div>
    `;

    // Load sale history
    await loadSaleHistory(produceId);
  } catch (error) {
    console.error('Error fetching produce details:', error);
    detailsContainer.innerHTML = `
      <div class="alert alert-error">
        Failed to load produce details. Make sure the ID is valid and you're connected to the correct network.
      </div>
    `;
  }
}

// Purchase produce
async function buyProduce(produceId, priceInWei) {
  try {
    const tx = await contract.buyProduce(produceId, {
      value: priceInWei
    });
    
    utils.showAlert('Purchase transaction submitted. Waiting for confirmation...', 'warning');
    
    await tx.wait();
    utils.showAlert('Purchase successful!', 'success');
    
    // Refresh details
    await viewProduceDetails(produceId);
  } catch (error) {
    console.error('Purchase error:', error);
    utils.showAlert(error.message || 'Purchase failed. Please try again.', 'error');
  }
}

// Load sale history for a produce
async function loadSaleHistory(produceId) {
  try {
    const history = await contract.getSaleHistory(produceId);
    
    if (history.length === 0) {
      document.getElementById('produce-details').innerHTML += `
        <div class="mt-3">
          <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Sale History</h4>
          <p style="color: var(--text-secondary);">No sales recorded yet.</p>
        </div>
      `;
      return;
    }

    const historyHTML = history.map(sale => {
      const priceInEth = ethers.formatEther(sale[3]);
      const date = new Date(Number(sale[4]) * 1000);
      return `
        <div style="padding: 0.75rem; background-color: rgba(0,0,0,0.2); border-radius: 0.375rem; margin-bottom: 0.5rem;">
          <div><strong>Buyer:</strong> <code style="font-size: 0.75rem;">${sale[1]}</code></div>
          <div><strong>Seller:</strong> <code style="font-size: 0.75rem;">${sale[2]}</code></div>
          <div><strong>Price Paid:</strong> ${priceInEth} ETH</div>
          <div><strong>Date:</strong> ${date.toLocaleString()}</div>
        </div>
      `;
    }).join('');

    document.getElementById('produce-details').innerHTML += `
      <div class="mt-3">
        <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Sale History</h4>
        ${historyHTML}
      </div>
    `;
  } catch (error) {
    console.error('Error loading sale history:', error);
  }
}

// Make buyProduce available globally
window.buyProduce = buyProduce;
