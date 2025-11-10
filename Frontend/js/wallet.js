import utils from './utils.js';
import { ethers } from 'ethers';

// Get Contract ABI from environment variables
let CONTRACT_ABI;
try {
  const abiString = import.meta.env.VITE_CONTRACT_ABI;
  if (abiString) {
    CONTRACT_ABI = JSON.parse(abiString);
  } else {
    // Fallback ABI if environment variable is not set
    CONTRACT_ABI = [
      "function getProduceDetails(uint256 _id) public view returns (uint256 id, string memory name, address originalFarmer, address currentSeller, string memory currentStatus, uint256 priceInWei, string memory originFarm, string memory qrCode, uint256 registrationTimestamp)",
      "function registerProduce(string memory _name, string memory _originFarm, uint256 _initialPriceInWei, string memory _QRCodeData) public returns(uint256)",
      "function buyProduce(uint256 _id) public payable"
    ];
  }
} catch (error) {
  console.error('Error parsing CONTRACT_ABI from environment:', error);
  // Fallback ABI
  CONTRACT_ABI = [
    "function getProduceDetails(uint256 _id) public view returns (uint256 id, string memory name, address originalFarmer, address currentSeller, string memory currentStatus, uint256 priceInWei, string memory originFarm, string memory qrCode, uint256 registrationTimestamp)",
    "function registerProduce(string memory _name, string memory _originFarm, uint256 _initialPriceInWei, string memory _QRCodeData) public returns(uint256)",
    "function buyProduce(uint256 _id) public payable"
  ];
}

class CentralizedWallet {
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

    // Get Infura URL from environment variables
    this.infuraUrl = import.meta.env.VITE_INFURA_URL;

    this.initialize();
  }

  async initialize() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Ethers is now imported, so it's available
      this.ethers = ethers;
      await this.checkExistingConnection();
      this.setupEventListeners();
      
      this.isReady = true;
      console.log('Centralized wallet initialized successfully');
      
      window.dispatchEvent(new CustomEvent('walletReady', { 
        detail: { wallet: this }
      }));
      
    } catch (error) {
      console.error('Wallet initialization error:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  async checkExistingConnection() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          console.log('Existing wallet connection found, reconnecting...');
          await this.connectWallet();
        }
      } catch (error) {
        console.error('Error checking existing connection:', error);
      }
    }
  }

  setupEventListeners() {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', this.handleAccountChange.bind(this));
      window.ethereum.on('chainChanged', this.handleChainChange.bind(this));
    }
  }

  async connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed. Please install it from metamask.io');
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.userAddress = await this.signer.getAddress();
      
      const network = await this.provider.getNetwork();
      this.networkId = Number(network.chainId);
      this.networkName = this.getNetworkName(this.networkId);
      
      const balance = await this.provider.getBalance(this.userAddress);
      const balanceInEth = ethers.formatEther(balance);
      
      this.isConnected = true;

      await this.saveWalletToBackend(balanceInEth);
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
      await utils.apiCall('/wallet/disconnect', {
        method: 'POST'
      });

      this.provider = null;
      this.signer = null;
      this.userAddress = null;
      this.networkId = null;
      this.networkName = null;
      this.isConnected = false;

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
    }
  }

  async updateBalance() {
    if (!this.provider || !this.userAddress) return null;

    try {
      const balance = await this.provider.getBalance(this.userAddress);
      const balanceInEth = ethers.formatEther(balance);

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
    return this.contractAddresses[this.networkId] || this.contractAddresses[11155111];
  }

  getContract(abi = CONTRACT_ABI) {
    const contractAddress = this.getContractAddress();
    if (!contractAddress || !this.signer) return null;
    
    return new ethers.Contract(contractAddress, abi, this.signer);
  }

  getNetworkName(chainId) {
    const networks = {
      1: 'Ethereum Mainnet',
      5: 'Goerli Testnet',
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
      await this.disconnectWallet();
      if (typeof utils !== 'undefined' && utils.showAlert) {
        utils.showAlert('Wallet disconnected', 'warning');
      }
    } else {
      await this.connectWallet();
      if (typeof utils !== 'undefined' && utils.showAlert) {
        utils.showAlert('Wallet account changed', 'success');
      }
    }
  }

  handleChainChange(chainId) {
    window.location.reload();
  }

  updateWalletUI() {
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

    const addressElements = document.querySelectorAll('.wallet-address');
    const networkElements = document.querySelectorAll('.wallet-network');
    
    addressElements.forEach(el => {
      el.textContent = this.userAddress || 'Not connected';
    });

    networkElements.forEach(el => {
      el.textContent = this.networkName || 'Not connected';
    });

    const connectedSections = document.querySelectorAll('.wallet-connected');
    const disconnectedSections = document.querySelectorAll('.wallet-disconnected');
    
    connectedSections.forEach(section => {
      section.style.display = this.isConnected ? 'block' : 'none';
    });

    disconnectedSections.forEach(section => {
      section.style.display = this.isConnected ? 'none' : 'block';
    });
  }

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

  // Utility methods for easier access
  isWalletConnected() {
    return this.isConnected;
  }

  getAddress() {
    return this.userAddress;
  }

  getProvider() {
    return this.provider;
  }

  getSigner() {
    return this.signer;
  }

  async waitForReady() {
    if (this.isReady) return true;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Wallet failed to initialize within 15 seconds'));
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
}

// Create global instance
const centralizedWallet = new CentralizedWallet();

// Global functions for backward compatibility
window.connectWallet = async () => {
  try {
    await centralizedWallet.waitForReady();
    return await centralizedWallet.connectWallet();
  } catch (error) {
    if (typeof utils !== 'undefined' && utils.showAlert) {
      utils.showAlert('Failed to connect wallet: ' + error.message, 'error');
    }
    throw error;
  }
};

window.disconnectWallet = async () => {
  try {
    return await centralizedWallet.disconnectWallet();
  } catch (error) {
    if (typeof utils !== 'undefined' && utils.showAlert) {
      utils.showAlert('Failed to disconnect wallet: ' + error.message, 'error');
    }
    throw error;
  }
};

window.copyAddress = () => {
  centralizedWallet.copyAddress();
};

window.updateBalance = async () => {
  try {
    const balance = await centralizedWallet.updateBalance();
    if (balance !== null && typeof utils !== 'undefined' && utils.showAlert) {
      utils.showAlert('Balance updated!', 'success');
    }
    return balance;
  } catch (error) {
    if (typeof utils !== 'undefined' && utils.showAlert) {
      utils.showAlert('Failed to update balance', 'error');
    }
    throw error;
  }
};

// Export the ABI for use in other modules
export { CONTRACT_ABI };

export default centralizedWallet;
export { CentralizedWallet };
