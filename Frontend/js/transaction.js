import utils from './utils.js';
import { CentralizedWallet, CONTRACT_ABI } from './wallet.js';
import { ethers } from 'ethers';

// Create wallet instance
const centralizedWallet = new CentralizedWallet();

let currentProduct = null;

// Transaction page state
let transactionData = null;

// Initialize transaction page
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await utils.checkAuth())) {
    utils.redirect('login.html');
    return;
  }

  // Get transaction data from URL parameters or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('productId') || sessionStorage.getItem('transactionProductId');
  
  if (!productId) {
    showError('No product specified for transaction');
    return;
  }

  await initializeTransaction(productId);
});

// Initialize transaction with product data
async function initializeTransaction(productId) {
  try {
    await centralizedWallet.waitForReady();

    // Connect wallet if not connected
    if (!centralizedWallet.isWalletConnected()) {
      await centralizedWallet.connectWallet();
    }

    // Ensure we're on Sepolia testnet
    const network = await centralizedWallet.getProvider().getNetwork();
    if (Number(network.chainId) !== 11155111) {
      utils.showAlert('Please switch to Sepolia testnet', 'error');
      await centralizedWallet.switchToSepolia();
      return;
    }

    // Validate user role and purchase eligibility
    try {
      await utils.apiCall(`/api/v1/produce/${productId}/validate-purchase`);
    } catch (validationError) {
      showError(validationError.message || 'You are not eligible to purchase this produce');
      return;
    }

    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    if (!contract) {
      throw new Error('Unable to connect to smart contract');
    }

    // Get product details from blockchain
    const details = await contract.getProduceDetails(productId);
    
    currentProduct = {
      id: details[0].toString(),
      name: details[1],
      originalFarmer: details[2],
      currentSeller: details[3],
      currentStatus: details[4],
      priceInWei: details[5],
      originFarm: details[6],
      qrCode: details[7],
      registrationTimestamp: details[8]
    };

    // Check if product is still available
    if (currentProduct.currentStatus === 'Sold') {
      showError('This product has already been sold');
      return;
    }

    // Display transaction details
    await displayTransactionDetails();
    
    // Check wallet balance
    await checkWalletBalance();

    // Show transaction content
    hideLoadingState();

  } catch (error) {
    console.error('Error initializing transaction:', error);
    showError('Failed to load transaction details: ' + error.message);
  }
}

// Display transaction details in the UI
async function displayTransactionDetails() {
  const priceInEth = ethers.formatEther(currentProduct.priceInWei);
  const date = new Date(Number(currentProduct.registrationTimestamp) * 1000);

  // Product details
  document.getElementById('product-name').textContent = currentProduct.name;
  document.getElementById('product-id').textContent = currentProduct.id;
  document.getElementById('origin-farm').textContent = currentProduct.originFarm;
  document.getElementById('product-status').textContent = currentProduct.currentStatus;
  document.getElementById('qr-code').textContent = currentProduct.qrCode;

  // Seller information
  document.getElementById('original-farmer').textContent = formatAddress(currentProduct.originalFarmer);
  document.getElementById('current-seller').textContent = formatAddress(currentProduct.currentSeller);
  document.getElementById('registration-date').textContent = date.toLocaleDateString();

  // Payment information
  document.getElementById('product-price').textContent = `${priceInEth} ETH`;
  document.getElementById('price-amount').textContent = `${priceInEth} ETH`;
  document.getElementById('total-amount').textContent = `${priceInEth} ETH`;

  // Wallet information
  const userAddress = centralizedWallet.getAddress();
  document.getElementById('buyer-address').textContent = formatAddress(userAddress);

  // Get and display wallet balance
  const provider = centralizedWallet.getProvider();
  const balance = await provider.getBalance(userAddress);
  const balanceEth = ethers.formatEther(balance);
  document.getElementById('wallet-balance').textContent = `${parseFloat(balanceEth).toFixed(4)} ETH`;

  // Blockchain information
  const network = await provider.getNetwork();
  document.getElementById('network-name').textContent = centralizedWallet.getNetworkName(Number(network.chainId));
}

// Check if wallet has sufficient balance
async function checkWalletBalance() {
  try {
    const provider = centralizedWallet.getProvider();
    const balance = await provider.getBalance(centralizedWallet.getAddress());
    
    const totalRequired = BigInt(currentProduct.priceInWei);
    
    if (balance < totalRequired) {
      // Show balance warning
      document.getElementById('balance-warning').style.display = 'flex';
      document.getElementById('required-amount').textContent = ethers.formatEther(totalRequired);
      document.getElementById('confirm-button').disabled = true;
      document.getElementById('confirm-button').textContent = '❌ Insufficient Balance';
    } else {
      document.getElementById('balance-warning').style.display = 'none';
    }
  } catch (error) {
    console.error('Error checking balance:', error);
  }
}

// Confirm and execute transaction
window.confirmTransaction = async function() {
  const confirmButton = document.getElementById('confirm-button');
  
  if (confirmButton.disabled) return;
  
  try {
    // Show processing overlay
    document.getElementById('processing-overlay').style.display = 'flex';
    document.getElementById('processing-message').textContent = 'Waiting for wallet approval...';
    
    const contract = centralizedWallet.getContract(CONTRACT_ABI);
    
    // Execute the buyProduce transaction
    const tx = await contract.buyProduce(currentProduct.id, {
      value: currentProduct.priceInWei
    });

    document.getElementById('processing-message').textContent = 'Transaction submitted to blockchain...';

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    // Transaction successful
    document.getElementById('processing-message').textContent = 'Transaction confirmed!';

    // Try to update database
    try {
      await utils.apiCall(`/api/v1/produce/${currentProduct.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Sold',
          buyerAddress: centralizedWallet.getAddress(),
          saleTransactionHash: receipt.hash
        }),
      });
    } catch (dbError) {
      console.log('Failed to update database, but blockchain transaction succeeded:', dbError);
    }

    // Record transaction in backend
    try {
      const recordResponse = await utils.apiCall('/api/v1/transactions/record', {
        method: 'POST',
        body: JSON.stringify({
          produceId: currentProduct.id,
          blockchainTransactionHash: receipt.hash,
          transactionType: 'sale',
          buyerAddress: centralizedWallet.getAddress(),
          sellerAddress: currentProduct.currentSeller,
          amountInWei: currentProduct.priceInWei.toString(),
          gasFeeInWei: (BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice || receipt.effectiveGasPrice || 0)).toString(),
          productName: currentProduct.name,
          productStatus: 'Sold',
          blockNumber: receipt.blockNumber,
          networkId: centralizedWallet.networkId
        })
      });
      
      console.log('Transaction recorded in backend:', recordResponse);
    } catch (dbError) {
      console.error('Failed to record transaction in backend:', dbError);
      utils.showAlert('Transaction successful but failed to record in database', 'warning');
    }

    // Store transaction data for success page
    sessionStorage.setItem('transactionResult', JSON.stringify({
      success: true,
      transactionHash: receipt.hash,
      productName: currentProduct.name,
      productId: currentProduct.id,
      amount: ethers.formatEther(currentProduct.priceInWei),
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber
    }));

    // Redirect to success page or show success message
    setTimeout(() => {
      utils.showAlert('Purchase successful!', 'success');
      utils.redirect(`product.html?id=${currentProduct.id}`);
    }, 2000);

  } catch (error) {
    console.error('Transaction error:', error);
    
    // Hide processing overlay
    document.getElementById('processing-overlay').style.display = 'none';
    
    let errorMessage = 'Transaction failed';
    
    if (error.code === 4001) {
      errorMessage = 'Transaction rejected by user';
    } else if (error.message.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for transaction';
    }
    
    showError(errorMessage + ': ' + (error.reason || error.message));
  }
};

// Cancel transaction
window.cancelTransaction = function() {
  if (confirm('Are you sure you want to cancel this transaction?')) {
    // Go back to product page
    utils.redirect(`product.html?id=${currentProduct.id}`);
  }
};

// Retry transaction
window.retryTransaction = function() {
  window.location.reload();
};

// Helper functions
function formatAddress(address) {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function hideLoadingState() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('transaction-content').style.display = 'block';
}

function showError(message) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('transaction-content').style.display = 'none';
  document.getElementById('error-state').style.display = 'block';
  document.getElementById('error-message').textContent = message;
}

// Real-time balance updates
setInterval(async () => {
  if (centralizedWallet.isWalletConnected() && currentProduct) {
    await checkWalletBalance();
  }
}, 10000); // Check every 10 seconds
