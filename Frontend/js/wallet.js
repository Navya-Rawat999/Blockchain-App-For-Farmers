import utils from './utils.js';
import { ethers } from 'ethers';
import { CONTRACT_ABI } from '../constants.js';

const runtimeEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (window.__APP_CONFIG__ || {});


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
    
    
    this.contractAddress = '0x69fa6fbdbfbbceb5a4e2f2668b5e258f9cd41a0c';

    // Sepolia network configuration
    this.sepoliaConfig = {
      chainId: '0xAA36A7', // 11155111 in hex
      chainName: 'Sepolia Test Network',
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrls: [runtimeEnv?.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'],
      blockExplorerUrls: ['https://sepolia.etherscan.io/']
    };

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

      // Check if connected to Sepolia
      if (this.networkId !== 11155111) {
        console.log(`Connected to wrong network: ${this.networkId}, switching to Sepolia...`);
        await this.switchToSepolia();
      }
      
      this.isConnected = true;
      this.updateWalletUI();

      console.log('Wallet connected successfully:', this.userAddress);
      console.log('Network:', this.networkName, 'ID:', this.networkId);

      return {
        address: this.userAddress,
        network: this.networkName
      };
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }

  async switchToSepolia() {
    try {
      // Try to switch to Sepolia
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.sepoliaConfig.chainId }],
      });
    } catch (switchError) {
      // If Sepolia is not added to wallet, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [this.sepoliaConfig],
          });
        } catch (addError) {
          throw new Error('Failed to add Sepolia network to wallet');
        }
      } else {
        throw new Error('Failed to switch to Sepolia network');
      }
    }

    // Update network info after switch
    const network = await this.provider.getNetwork();
    this.networkId = Number(network.chainId);
    this.networkName = this.getNetworkName(this.networkId);
  }

  getContractAddress() {
    return this.contractAddress
  }

  getContract(abi = CONTRACT_ABI) {
    const contractAddress = this.getContractAddress();
    if (!contractAddress || !this.signer) return null;
    
    return new ethers.Contract(contractAddress, abi, this.signer);
  }

  getNetworkName(chainId) {
    const networks = {
      11155111: 'Sepolia Testnet',
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

  async handleChainChange(chainId) {
    const newChainId = parseInt(chainId, 16);
    console.log('Chain changed to:', newChainId);
    
    if (newChainId !== 11155111) {
      if (typeof utils !== 'undefined' && utils.showAlert) {
        utils.showAlert('Please switch to Sepolia testnet for this application', 'warning');
      }
      await this.switchToSepolia();
    }
    
    // Update network info
    this.networkId = newChainId;
    this.networkName = this.getNetworkName(newChainId);
    this.updateWalletUI();
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

  async copyAddress() {
    if (!this.userAddress) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(this.userAddress);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = this.userAddress;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      if (typeof utils !== 'undefined' && utils.showAlert) {
        utils.showAlert('Wallet address copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Failed to copy address:', error);
      if (typeof utils !== 'undefined' && utils.showAlert) {
        utils.showAlert('Unable to copy address', 'error');
      }
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
