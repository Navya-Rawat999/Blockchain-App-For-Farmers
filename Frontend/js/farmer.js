// Farmer Dashboard - Web3 interactions
let contract = null;
let provider = null;
let signer = null;

// Contract ABI - simplified for demo (use your full ABI)
const CONTRACT_ABI = [
  "function registerProduce(string memory _name, string memory _originFarm, uint256 _initialPriceinINR, string memory _QRCodeData) public returns(uint256)",
  "function getProduceDetails(uint256 _id) public view returns (uint256 id, string memory name, address originalFarmer, address currentSeller, string memory currentStatus, uint256 priceInWei, string memory originFarm, string memory qrCode)",
  "function updateProducePrice(uint256 _id, uint256 _newPriceInINR) public",
  "function updateProduceStatus(uint256 _id, string memory _newStatus) public"
];

const CONTRACT_ADDRESS = '0x...'; // Replace with your deployed contract address

// Initialize Web3 connection
async function initWeb3() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
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
    utils.redirect('/farmer-login.html');
    return;
  }

  const user = utils.getUser();
  if (user && user.role !== 'farmer') {
    utils.showAlert('Access denied. Farmer account required.', 'error');
    utils.redirect('/index.html');
    return;
  }

  const form = document.getElementById('register-produce-form');
  const registerBtn = document.getElementById('register-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('produce-name').value;
    const originFarm = document.getElementById('origin-farm').value;
    const price = document.getElementById('price').value;
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

      // Call smart contract
      const tx = await contract.registerProduce(name, originFarm, price, qrCode);
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
  
  try {
    // For demo purposes, show a placeholder
    // In production, you'd fetch from blockchain or backend
    produceListContainer.innerHTML = `
      <p style="color: var(--text-secondary);">
        Your registered produce will appear here after blockchain confirmation.
      </p>
      <p style="color: var(--text-secondary); margin-top: 0.5rem;">
        <strong>Note:</strong> Connect your wallet and ensure you're on the correct network to view blockchain data.
      </p>
    `;
  } catch (error) {
    console.error('Error loading produce:', error);
    produceListContainer.innerHTML = `
      <p style="color: var(--error);">Failed to load produce list.</p>
    `;
  }
}
