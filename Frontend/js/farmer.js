import utils from '../js/utils.js';

// Farmer Dashboard - Web3 interactions
let contract = null;
let provider = null;
let signer = null;

// Contract ABI - Updated to match new contract
const CONTRACT_ABI = [
  "function registerProduce(string memory _name, string memory _originFarm, uint256 _initialPriceInWei, string memory _QRCodeData) public returns(uint256)",
  "function getProduceDetails(uint256 _id) public view returns (uint256 id, string memory name, address originalFarmer, address currentSeller, string memory currentStatus, uint256 priceInWei, string memory originFarm, string memory qrCode, uint256 registrationTimestamp)",
  "function updateProducePrice(uint256 _id, uint256 _newPriceInWei) public",
  "function updateProduceStatus(uint256 _id, string memory _newStatus) public",
  "function nextProduceId() public view returns (uint256)",
  "event ProduceRegistered(uint256 indexed id, string name, address indexed farmer, string originFarm)"
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

// Register produce form handler
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!utils.isAuthenticated()) {
    utils.redirect('login.html');
    return;
  }

  const user = utils.getUser();
  if (user && user.role !== 'farmer') {
    utils.showAlert('Access denied. Farmer account required.', 'error');
    utils.redirect('index.html');
    return;
  }

  const form = document.getElementById('register-produce-form');
  const registerBtn = document.getElementById('register-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('produce-name').value;
    const originFarm = document.getElementById('origin-farm').value;
    const priceInEth = document.getElementById('price').value;
    const qrCode = document.getElementById('qr-code').value;

    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="spinner"></span> Registering...';

    try {
      // Initialize Web3 if not already done
      if (!contract) {
        const initialized = await initWeb3();
        if (!initialized) {
          throw new Error('Please connect your wallet first');
        }
      }

      // Convert ETH to Wei for the smart contract
      const priceInWei = ethers.parseEther(priceInEth);

      // Call smart contract with Wei price
      const tx = await contract.registerProduce(name, originFarm, priceInWei, qrCode);
      utils.showAlert('Transaction submitted. Waiting for confirmation...', 'warning');
      
      const receipt = await tx.wait();
      utils.showAlert('Produce registered successfully!', 'success');
      
      // Reset form
      form.reset();
      
      // Reload produce list
      loadProduceList();
    } catch (error) {
      console.error('Registration error:', error);
      utils.showAlert(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = 'Register Produce';
    }
  });

  // Load produce list on page load
  loadProduceList();
});

// Load and display farmer's produce
async function loadProduceList() {
  const produceListContainer = document.getElementById('produce-list');
  produceListContainer.innerHTML = '<p style="color: var(--text-secondary);">Loading your produce...</p>';
  
  try {
    // Initialize Web3 if not already done
    if (!contract) {
      const initialized = await initWeb3();
      if (!initialized) {
        produceListContainer.innerHTML = '<p style="color: var(--warning);">Please connect your wallet to view your produce.</p>';
        return;
      }
    }

    // Get current user's address
    const userAddress = await signer.getAddress();

    // Get total number of produce items
    const nextId = await contract.nextProduceId();
    const totalItems = Number(nextId) - 1;

    if (totalItems === 0) {
      produceListContainer.innerHTML = '<p style="color: var(--text-secondary);">No produce registered yet. Register your first item above!</p>';
      return;
    }

    // Fetch farmer's produce
    const myProduce = [];
    for (let i = 1; i <= totalItems; i++) {
      try {
        const details = await contract.getProduceDetails(i);
        // Check if this farmer registered this produce
        if (details[2].toLowerCase() === userAddress.toLowerCase()) {
          myProduce.push({
            id: details[0].toString(),
            name: details[1],
            originalFarmer: details[2],
            currentSeller: details[3],
            currentStatus: details[4],
            priceInWei: details[5],
            originFarm: details[6],
            qrCode: details[7],
            registrationTimestamp: details[8]
          });
        }
      } catch (err) {
        console.error(`Error loading produce ${i}:`, err);
      }
    }

    if (myProduce.length === 0) {
      produceListContainer.innerHTML = '<p style="color: var(--text-secondary);">You haven\'t registered any produce yet.</p>';
      return;
    }

    // Display produce items
    const produceHTML = myProduce.map(item => {
      const priceInEth = ethers.formatEther(item.priceInWei);
      const date = new Date(Number(item.registrationTimestamp) * 1000);
      const statusColor = item.currentStatus === 'Sold' ? 'var(--error)' : 'var(--success)';
      
      return `
        <div style="background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
            <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0;">${item.name}</h3>
            <span style="padding: 0.25rem 0.75rem; background-color: ${statusColor}20; color: ${statusColor}; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;">
              ${item.currentStatus}
            </span>
          </div>
          <div style="display: grid; gap: 0.5rem; font-size: 0.875rem; margin-bottom: 1rem;">
            <div><strong>ID:</strong> ${item.id}</div>
            <div><strong>Origin:</strong> ${item.originFarm}</div>
            <div><strong>Price:</strong> ${priceInEth} ETH</div>
            <div><strong>QR Code:</strong> ${item.qrCode}</div>
            <div><strong>Registered:</strong> ${date.toLocaleString()}</div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button 
              onclick="updatePrice('${item.id}', '${item.name}')" 
              class="btn btn-outline"
              style="flex: 1;"
              ${item.currentStatus === 'Sold' ? 'disabled' : ''}
            >
              Update Price
            </button>
            <button 
              onclick="updateStatus('${item.id}', '${item.name}')" 
              class="btn btn-outline"
              style="flex: 1;"
            >
              Update Status
            </button>
          </div>
        </div>
      `;
    }).join('');

    produceListContainer.innerHTML = produceHTML;
  } catch (error) {
    console.error('Error loading produce:', error);
    produceListContainer.innerHTML = '<p style="color: var(--error);">Failed to load produce list. Please refresh the page.</p>';
  }
}

// Update produce price
async function updatePrice(produceId, produceName) {
  const newPriceEth = prompt(`Enter new price for "${produceName}" (in ETH):`);
  if (!newPriceEth || isNaN(newPriceEth) || parseFloat(newPriceEth) <= 0) {
    utils.showAlert('Invalid price entered', 'error');
    return;
  }

  try {
    const newPriceWei = ethers.parseEther(newPriceEth);
    const tx = await contract.updateProducePrice(produceId, newPriceWei);
    utils.showAlert('Updating price...', 'warning');
    await tx.wait();
    utils.showAlert('Price updated successfully!', 'success');
    loadProduceList();
  } catch (error) {
    console.error('Price update error:', error);
    utils.showAlert(error.message || 'Failed to update price', 'error');
  }
}

// Update produce status
async function updateStatus(produceId, produceName) {
  const newStatus = prompt(`Enter new status for "${produceName}":\n(e.g., Harvested, In Transit, Ready for Sale, etc.)`);
  if (!newStatus || newStatus.trim() === '') {
    utils.showAlert('Invalid status entered', 'error');
    return;
  }

  try {
    const tx = await contract.updateProduceStatus(produceId, newStatus.trim());
    utils.showAlert('Updating status...', 'warning');
    await tx.wait();
    utils.showAlert('Status updated successfully!', 'success');
    loadProduceList();
  } catch (error) {
    console.error('Status update error:', error);
    utils.showAlert(error.message || 'Failed to update status', 'error');
  }
}

// Make functions globally available
window.updatePrice = updatePrice;
window.updateStatus = updateStatus;
