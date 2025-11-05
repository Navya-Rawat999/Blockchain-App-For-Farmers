import utils from './utils.js';

class WalletService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.userAddress = null;
    this.networkId = null;
    this.networkName = null;
    this.isConnected = false;
    this.isInitializing = false;
    this.isReady = false;
    
    // Contract addresses for different networks
    this.contractAddresses = {
      1: '0x742d35Cc6135C4Ad4C006C8C704aC8DC7CE18F72', // Ethereum Mainnet
      5: '0x742d35Cc6135C4Ad4C006C8C704aC8DC7CE18F72', // Goerli Testnet  
      11155111: '0x742d35Cc6135C4Ad4C006C8C704aC8DC7CE18F72', // Sepolia Testnet
      137: '0x742d35Cc6135C4Ad4C006C8C704aC8DC7CE18F72', // Polygon Mainnet
      80001: '0x742d35Cc6135C4Ad4C006C8C704aC8DC7CE18F72' // Mumbai Testnet
    };

    // Start initialization immediately
    this.initialize();
  }

  async initialize() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Wait for ethers to be available
      await this.waitForEthers();
      
      // Initialize wallet connection check
      await this.checkExistingConnection();
      
      this.isReady = true;
      console.log('Wallet service initialized successfully');
      
      // Dispatch ready event
      window.dispatchEvent(new CustomEvent('walletServiceReady', { 
        detail: { walletService: this }
      }));
      
    } catch (error) {
      console.error('Wallet service initialization error:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  async waitForEthers() {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max wait
    
    while (typeof window.ethers === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof window.ethers === 'undefined') {
      throw new Error('Ethers library not found after waiting');
    }
    
    console.log('Ethers library loaded successfully');
  }

  async checkExistingConnection() {
    if (typeof window.ethereum !== 'undefined' && typeof window.ethers !== 'undefined') {
      try {
        // Check if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          console.log('Existing wallet connection found, reconnecting...');
          await this.connectWallet();
        }

        // Listen for account changes
        window.ethereum.on('accountsChanged', this.handleAccountChange.bind(this));
        window.ethereum.on('chainChanged', this.handleChainChange.bind(this));
      } catch (error) {
        console.error('Error checking existing connection:', error);
      }
    }
  }

  async waitForReady() {
    if (this.isReady) return true;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Wallet service failed to initialize within 15 seconds'));
      }, 15000);

      const checkReady = () => {
        if (this.isReady) {
          clearTimeout(timeout);
          resolve(true);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
    });
  }

  async connectWallet() {
    try {
      await this.waitForReady();
    } catch (error) {
      throw new Error('Wallet service not ready: ' + error.message);
    }

    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed. Please install it from metamask.io');
    }

    if (typeof window.ethers === 'undefined') {
      throw new Error('Ethers library is not loaded. Please refresh the page.');
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Set up provider and signer using window.ethers
      this.provider = new window.ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.userAddress = await this.signer.getAddress();
      
      // Get network info
      const network = await this.provider.getNetwork();
      this.networkId = Number(network.chainId);
      this.networkName = this.getNetworkName(this.networkId);
      
      // Get balance
      const balance = await this.provider.getBalance(this.userAddress);
      const balanceInEth = window.ethers.formatEther(balance);
      
      this.isConnected = true;

      // Save wallet info to backend
      await this.saveWalletToBackend(balanceInEth);

      // Update UI
      this.updateWalletUI();

      console.log('Wallet connected successfully:', this.userAddress);

      return {
        address: this.userAddress,
        network: this.networkName,
        balance: balanceInEth
      };
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }

  async disconnectWallet() {
    try {
      // Update backend
      await utils.apiCall('/wallet/disconnect', {
        method: 'POST'
      });

      // Reset local state
      this.provider = null;
      this.signer = null;
      this.userAddress = null;
      this.networkId = null;
      this.networkName = null;
      this.isConnected = false;

      // Update UI
      this.updateWalletUI();
      
      return true;
    } catch (error) {
      console.error('Wallet disconnection error:', error);
      throw error;
    }
  }

  async saveWalletToBackend(balance) {
    try {
      await utils.apiCall('/wallet/connect', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: this.userAddress,
          networkId: this.networkId,
          networkName: this.networkName,
          balance: balance
        })
      });
    } catch (error) {
      console.error('Error saving wallet to backend:', error);
      // Don't throw here, wallet connection should still work
    }
  }

  async updateBalance() {
    if (!this.provider || !this.userAddress || typeof window.ethers === 'undefined') return null;

    try {
      const balance = await this.provider.getBalance(this.userAddress);
      const balanceInEth = window.ethers.formatEther(balance);

      // Update backend
      await utils.apiCall('/wallet/balance', {
        method: 'PATCH',
        body: JSON.stringify({ balance: balanceInEth })
      });

      return balanceInEth;
    } catch (error) {
      console.error('Error updating balance:', error);
      return null;
    }
  }

  getContractAddress() {
    if (!this.networkId) return null;
    return this.contractAddresses[this.networkId] || this.contractAddresses[11155111]; // Default to Sepolia
  }

  getContract(abi) {
    const contractAddress = this.getContractAddress();
    if (!contractAddress || !this.signer || typeof window.ethers === 'undefined') return null;
    
    return new window.ethers.Contract(contractAddress, abi, this.signer);
  }

  getNetworkName(chainId) {
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
      97: 'BSC Testnet'
    };
    return networks[chainId] || `Chain ID: ${chainId}`;
  }

  async handleAccountChange(accounts) {
    if (accounts.length === 0) {
      // User disconnected
      await this.disconnectWallet();
      if (typeof utils !== 'undefined' && utils.showAlert) {
        utils.showAlert('Wallet disconnected', 'warning');
      }
    } else {
      // Account changed
      await this.connectWallet();
      if (typeof utils !== 'undefined' && utils.showAlert) {
        utils.showAlert('Wallet account changed', 'success');
      }
    }
  }

  handleChainChange(chainId) {
    // Reload page on chain change for simplicity
    window.location.reload();
  }

  updateWalletUI() {
    // Update connect/disconnect buttons
    const connectButtons = document.querySelectorAll('.connect-wallet-btn');
    const disconnectButtons = document.querySelectorAll('.disconnect-wallet-btn');
    
    connectButtons.forEach(btn => {
      if (this.isConnected) {
        btn.textContent = 'Wallet Connected';
        btn.disabled = true;
        btn.classList.add('connected');
      } else {
        btn.textContent = 'Connect MetaMask';
        btn.disabled = false;
        btn.classList.remove('connected');
      }
    });

    disconnectButtons.forEach(btn => {
      btn.style.display = this.isConnected ? 'inline-block' : 'none';
    });

    // Update wallet info displays
    const addressElements = document.querySelectorAll('.wallet-address');
    const networkElements = document.querySelectorAll('.wallet-network');
    
    addressElements.forEach(el => {
      el.textContent = this.userAddress || 'Not connected';
    });

    networkElements.forEach(el => {
      el.textContent = this.networkName || 'Not connected';
    });

    // Show/hide wallet sections
    const connectedSections = document.querySelectorAll('.wallet-connected');
    const disconnectedSections = document.querySelectorAll('.wallet-disconnected');
    
    connectedSections.forEach(section => {
      section.style.display = this.isConnected ? 'block' : 'none';
    });

    disconnectedSections.forEach(section => {
      section.style.display = this.isConnected ? 'none' : 'block';
    });
  }

  // Copy wallet address to clipboard
  copyAddress() {
    if (!this.userAddress) {
      if (typeof utils !== 'undefined' && utils.showAlert) {
        utils.showAlert('No wallet address to copy', 'warning');
      }
      return;
    }

    navigator.clipboard.writeText(this.userAddress).then(() => {
      if (typeof utils !== 'undefined' && utils.showAlert) {
        utils.showAlert('Address copied to clipboard!', 'success');
      }
    }).catch(err => {
      console.error('Failed to copy address:', err);
      if (typeof utils !== 'undefined' && utils.showAlert) {
        utils.showAlert('Failed to copy address', 'error');
      }
    });
  }
}

// Create and export a promise that resolves when wallet service is ready
const createWalletService = async () => {
  const service = new WalletService();
  await service.waitForReady();
  return service;
};

// Export both the class and create a global instance
export default WalletService;
export { createWalletService };

// Create global instance when module loads
if (typeof window !== 'undefined') {
  window.walletServicePromise = createWalletService();
  
  // Also set up the global instance
  createWalletService().then(service => {
    window.walletService = service;
    console.log('Global wallet service ready');
  }).catch(error => {
    console.error('Failed to create global wallet service:', error);
  });
}
