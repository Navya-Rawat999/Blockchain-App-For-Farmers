import utils from './utils.js';
import { ethers } from 'ethers';

// Get Contract ABI from environment variables
let CONTRACT_ABI;
try {
  CONTRACT_ABI = import.meta.env.CONTRACT_ABI;
} catch (error) {
  console.error('Error parsing CONTRACT_ABI from environment:', error);
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
    
    
    this.contractAddresses = import.meta.env.CONTRACT_ADDRESS;

    // Get Infura URL from environment variables
    this.infuraUrl = import.meta.env.INFURA_URL;

    this.initialize();
  }

  async initialize() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
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
      
      this.isConnected = true;

      this.updateWalletUI();

      console.log('Wallet connected successfully:', this.userAddress);

      return {
        address: this.userAddress,
        network: this.networkName
      };
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }

  async disconnectWallet() {
    try {
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

  // Helper method to record transactions
  async recordTransaction(transactionData) {
    try {
      await utils.apiCall('/api/v1/transactions/record', {
        method: 'POST',
        body: JSON.stringify(transactionData)
      });
    } catch (error) {
      console.error('Error recording transaction:', error);
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

  // Add method to update balance
  async updateBalance() {
    if (!this.isConnected || !this.provider) return null;
    
    try {
      const balance = await this.provider.getBalance(this.userAddress);
      const balanceInEth = ethers.formatEther(balance);
      return balanceInEth;
    } catch (error) {
      console.error('Error updating balance:', error);
      return null;
    }
  }

  // Add method to save wallet info to backend
  async saveWalletToBackend(balance) {
    try {
      await utils.apiCall('/api/v1/users/wallet', {
        method: 'PUT',
        body: JSON.stringify({
          walletAddress: this.userAddress,
          balance: balance,
          networkId: this.networkId
        })
      });
    } catch (error) {
      console.error('Error saving wallet to backend:', error);
    }
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

// Export the ABI for use in other modules
export { CONTRACT_ABI };
export { CentralizedWallet };

// Export default instance for easier use
export default centralizedWallet;
