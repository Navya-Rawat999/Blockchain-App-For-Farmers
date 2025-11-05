# 🌾 Kissan Sathi - Blockchain Agriculture Platform

A comprehensive blockchain-based platform for transparent agriculture supply chain management, connecting farmers directly with customers while ensuring product authenticity and traceability.

![Kissan Sathi Banner](https://img.shields.io/badge/Blockchain-Agriculture-green?style=for-the-badge&logo=ethereum)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Smart Contract Setup](#-smart-contract-setup)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Frontend Pages](#-frontend-pages)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## ✨ Features

### For Farmers 🧑‍🌾
- **Product Registration**: Register produce with blockchain verification
- **Price Management**: Update product prices in real-time
- **Status Tracking**: Monitor product lifecycle (Harvested → In Transit → Sold)
- **Revenue Analytics**: Track total earnings and sales statistics
- **QR Code Generation**: Generate unique QR codes for each product
- **Review Management**: View customer reviews and ratings

### For Customers 🛒
- **Product Discovery**: Browse all available products in marketplace
- **QR Code Scanning**: Verify product authenticity by scanning QR codes
- **Shopping Cart**: Add multiple items and checkout together
- **Transaction History**: View all purchase history
- **Product Reviews**: Rate and review purchased products
- **Blockchain Verification**: Complete transparency of product journey

### Blockchain Features 🔗
- **Immutable Records**: All transactions stored on blockchain
- **Smart Contracts**: Automated and secure transactions
- **Transparent Pricing**: Prices stored in ETH/Wei for consistency
- **Ownership Tracking**: Complete chain of custody
- **Decentralized**: No single point of failure

## 🛠 Tech Stack

### Frontend
- **Framework**: Vanilla JavaScript (ES6+)
- **Blockchain**: Ethers.js v5.7.2
- **HTTP Client**: Axios v1.6.5
- **QR Scanner**: Html5-qrcode v2.3.8
- **Styling**: Custom CSS with dark theme
- **Build Tool**: Node.js Express server
- **Wallet Service**: Custom MetaMask integration

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with HTTP-only cookies
- **File Upload**: Multer + Cloudinary
- **Password Hashing**: bcrypt
- **Wallet Management**: Custom wallet controller & model

### Blockchain
- **Smart Contract**: Solidity ^0.8.13
- **Network**: Ethereum (Testnet/Mainnet)
- **Wallet**: MetaMask integration with multi-network support
- **Price Format**: ETH/Wei
- **Contract Address**: 0x742d35Cc6135C4Ad4C006C8C704aC8DC7CE18F72

## 🦊 MetaMask Integration

### Wallet Features
- **Multi-Network Support**: Ethereum, Polygon, BSC, Testnets
- **Direct MetaMask Integration**: No complex wallet service required
- **Balance Tracking**: Real-time balance updates
- **Address Management**: Secure wallet address storage
- **Network Detection**: Automatic network switching alerts
- **Profile Integration**: Wallet info synced with user profile

### Wallet API Endpoints
```
POST /api/v1/wallet/connect      # Connect wallet
POST /api/v1/wallet/disconnect   # Disconnect wallet  
GET  /api/v1/wallet/info         # Get wallet info
PATCH /api/v1/wallet/balance     # Update balance
GET  /api/v1/wallet/all          # Get all wallets (admin)
GET  /api/v1/wallet/stats        # Get wallet statistics
```

### How to Connect Wallet
1. **Install MetaMask**: Download from metamask.io
2. **Create Account**: Set up wallet with seed phrase
3. **Get Test ETH**: Use faucets for testnet
4. **Connect**: Click "Connect Wallet" on any page
5. **Approve**: Approve connection in MetaMask popup
6. **Verify**: Check connection status in profile page

## 🌐 Contract Addresses

### Current Deployment
- **Contract**: 0x742d35Cc6135C4Ad4C006C8C704aC8DC7CE18F72
- **Network**: Sepolia Testnet (Replace with your deployment)
- **Explorer**: [View on Etherscan](https://sepolia.etherscan.io/address/0x742d35Cc6135C4Ad4C006C8C704aC8DC7CE18F72)

### Network Support
- ✅ Ethereum Mainnet (1)
- ✅ Sepolia Testnet (11155111) 
- ✅ Goerli Testnet (5)
- ✅ Polygon Mainnet (137)
- ✅ Mumbai Testnet (80001)
- ✅ BSC Mainnet (56)
- ✅ BSC Testnet (97)

## 💳 Wallet Connection Guide

### For Users
1. **Homepage**: Click "🦊 Connect Wallet" button
2. **Wallet Page**: Dedicated wallet management page
3. **Profile Page**: View wallet info and transaction history
4. **Any Page**: Wallet status shown in navigation

### For Developers
```javascript
// Use global wallet service
const walletInfo = await window.walletService.connectWallet();
console.log(walletInfo.address, walletInfo.network, walletInfo.balance);

// Get contract instance
const contract = window.walletService.getContract(CONTRACT_ABI);
const tx = await contract.registerProduce(...args);
```

## 🔧 Wallet Troubleshooting

### Common Issues

#### "Cannot read properties of undefined (reading 'BrowserProvider')"
```bash
# Solution: Wait for ethers.js to load completely
# 1. Refresh the page
# 2. Wait a few seconds before clicking connect
# 3. Check browser console for loading errors
# 4. Ensure stable internet connection
```

#### "Ethers library failed to load"
```bash
# Solution: Check network connection and CDN access
# 1. Refresh the page
# 2. Check if https://cdn.ethers.io is accessible
# 3. Try in incognito/private browsing mode
# 4. Clear browser cache
```

#### "MetaMask not detected"
```bash
# Solution: Install MetaMask browser extension
# Chrome: https://chrome.google.com/webstore/detail/metamask/
# Firefox: https://addons.mozilla.org/firefox/addon/ether-metamask/
```

#### "Wrong network"
```bash
# Solution: Switch to correct network in MetaMask
# Settings → Networks → Add Network
# Or click network name in MetaMask to switch
```

#### "Insufficient funds"
```bash
# Solution: Get testnet ETH from faucets
# Sepolia: https://sepoliafaucet.com/
# Mumbai: https://faucet.polygon.technology/
```

#### "Connection rejected"
```bash
# Solution: 
# 1. Check MetaMask is unlocked
# 2. Refresh page and try again
# 3. Reset MetaMask connection in settings
```

## 📊 Wallet Statistics Dashboard

Access wallet analytics at `/api/v1/wallet/stats`:
- Total connected wallets
- Active vs inactive wallets  
- Network distribution
- Connection history
- Balance analytics

---

**Wallet integration complete!** 🦊✨

*Now users can connect MetaMask on any page and interact with the blockchain seamlessly.*
