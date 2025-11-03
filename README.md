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

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with HTTP-only cookies
- **File Upload**: Multer + Cloudinary
- **Password Hashing**: bcrypt

### Blockchain
- **Smart Contract**: Solidity ^0.8.13
- **Network**: Ethereum (Testnet/Mainnet)
- **Wallet**: MetaMask integration
- **Price Format**: ETH/Wei

## 📁 Project Structure

```
Kissan-Sathi/
├── Frontend/
│   ├── HTML/
│   │   ├── index.html           # Landing page
│   │   ├── login.html           # User authentication
│   │   ├── register.html        # User registration
│   │   ├── farmer.html          # Farmer dashboard
│   │   ├── customer.html        # Customer dashboard
│   │   ├── marketplace.html     # Product marketplace
│   │   ├── profile.html         # User profile & stats
│   │   ├── scan.html           # QR code scanner
│   │   └── wallet.html         # Wallet connection
│   ├── js/
│   │   ├── farmer.js           # Farmer functionality
│   │   ├── customer.js         # Customer functionality
│   │   ├── marketplace.js      # Shopping cart & browsing
│   │   ├── profile.js          # User profile & stats
│   │   ├── scan.js            # QR scanning
│   │   ├── wallet.js          # Wallet management
│   │   ├── login.js           # Authentication
│   │   ├── register.js        # User registration
│   │   ├── navbar.js          # Navigation
│   │   └── utils.js           # Utility functions
│   ├── css/
│   │   ├── main.css           # Global styles
│   │   ├── navbar.css         # Navigation styles
│   │   ├── profile.css        # Profile page styles
│   │   ├── marketplace.css    # Marketplace styles
│   │   └── scan.css          # Scanner styles
│   ├── server.js              # Frontend server
│   └── package.json           # Frontend dependencies
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── user.controller.js
│   │   ├── models/
│   │   │   ├── user.models.js
│   │   │   └── produceItem.models.js
│   │   ├── routes/
│   │   │   └── user.routes.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── multer.middleware.js
│   │   ├── utils/
│   │   │   ├── ApiError.js
│   │   │   ├── ApiResponse.js
│   │   │   ├── asyncHandler.js
│   │   │   └── cloudinary.js
│   │   ├── database/
│   │   │   └── index.js
│   │   ├── constants.js
│   │   └── index.js
│   ├── .env                   # Environment variables
│   └── package.json           # Backend dependencies
├── contracts.sol              # Smart contract
├── ether.js                  # Contract interaction class
├── UPDATE_SUMMARY.md          # Feature documentation
├── NAVIGATION_GUIDE.md        # User guide
├── CONTRACT_SETUP.md          # Setup instructions
└── README.md                  # This file
```

## 📋 Prerequisites

### Required Software
- **Node.js** (v16+ recommended)
- **npm** or **yarn**
- **MongoDB** (local or Atlas)
- **MetaMask** browser extension
- **Git**

### Blockchain Requirements
- **Ethereum wallet** with test ETH
- **Smart contract** deployed on testnet/mainnet
- **Infura** or **Alchemy** RPC endpoint (optional)

### Accounts Needed
- **Cloudinary account** (for image storage)
- **MongoDB Atlas** (for cloud database)
- **Ethereum testnet faucet** access

## 🚀 Installation

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/kissan-sathi.git
cd kissan-sathi
```

### 2. Backend Setup
```bash
cd Backend
npm install

# Create .env file
cp .env.example .env
```

#### Configure .env file:
```env
# Database
MONGO_DB_URI=mongodb://localhost:27017
# or MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net

# JWT Secrets
ACCESS_TOKEN_SECRET=your-super-secret-key-32-characters-long
REFRESH_TOKEN_SECRET=your-refresh-secret-key-32-characters-long
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Server
PORT=8000
CORS_ORIGIN=http://localhost:3001
```

#### Start Backend:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../Frontend
npm install

# Start frontend server
npm run dev
# or
node server.js
```

### 4. Smart Contract Deployment

#### Using Hardhat:
```bash
# Install Hardhat
npm install --save-dev hardhat

# Initialize Hardhat project
npx hardhat

# Deploy contract
npx hardhat run scripts/deploy.js --network sepolia
```

#### Update Contract Address:
After deployment, update the contract address in these files:
- `Frontend/js/farmer.js` (line 16)
- `Frontend/js/customer.js` (line 8)
- `Frontend/js/marketplace.js` (line 24)
- `Frontend/js/profile.js` (line 17)

```javascript
const CONTRACT_ADDRESS = 'YOUR_DEPLOYED_CONTRACT_ADDRESS';
```

## 🔧 Smart Contract Setup

### 1. Deploy Contract
```solidity
// Use the contract in contracts.sol
// Deploy to your preferred network (Sepolia recommended for testing)
```

### 2. Get Test ETH
- **Sepolia**: https://sepoliafaucet.com/
- **Goerli**: https://goerlifaucet.com/

### 3. Configure MetaMask
- Add your chosen network
- Import account with test ETH
- Connect to the application

## 🎯 Usage

### Getting Started

#### 1. Start Servers
```bash
# Terminal 1 - Backend
cd Backend
npm run dev

# Terminal 2 - Frontend  
cd Frontend
node server.js
```

#### 2. Access Application
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8000

#### 3. Create Account
1. Go to http://localhost:3001
2. Click "Create New Account"
3. Choose role (Farmer/Customer)
4. Upload required documents
5. Complete registration

#### 4. Connect Wallet
1. Install MetaMask
2. Go to Profile page
3. Click "Connect Wallet"
4. Approve connection

### For Farmers

#### Register Products:
1. Go to **Farmer Dashboard**
2. Fill product details:
   - Name (e.g., "Organic Tomatoes")
   - Origin Farm (e.g., "Green Valley Farm")
   - Price in ETH (e.g., 0.001)
   - QR Code data
3. Click "Register Produce"
4. Confirm MetaMask transaction

#### Manage Products:
- Update prices anytime
- Change product status
- View sales statistics
- Read customer reviews

### For Customers

#### Browse Products:
1. Go to **Marketplace**
2. Browse available products
3. Use search/filter features
4. Add items to cart
5. Checkout all items together

#### Verify Products:
1. Go to **Scan** page
2. Scan QR code on product
3. View complete product history
4. Verify authenticity

#### Track Purchases:
1. Go to **Profile** page
2. View purchase history
3. See spending statistics
4. Rate and review products

## 🌐 API Endpoints

### Authentication
```
POST /api/v1/users/register    # User registration  
POST /api/v1/users/login       # User login
POST /api/v1/users/logout      # User logout
GET  /api/v1/users/current-user # Get current user
POST /api/v1/users/refresh-token # Refresh access token
```

### User Management
```
PATCH /api/v1/users/update-account    # Update account details
PATCH /api/v1/users/avatar           # Update profile picture
PATCH /api/v1/users/id-proof         # Update ID proof
PATCH /api/v1/users/change-password  # Change password
```

## 📱 Frontend Pages

### Public Pages
- **Home** (`/`) - Landing page with features overview
- **Login** (`/login`) - User authentication
- **Register** (`/register`) - New user registration

### Protected Pages
- **Farmer Dashboard** (`/farmer`) - Product registration and management
- **Customer Dashboard** (`/customer`) - Product search and purchase
- **Marketplace** (`/marketplace`) - Browse all products with cart
- **Profile** (`/profile`) - User stats and transaction history
- **Scanner** (`/scan`) - QR code scanning for verification
- **Wallet** (`/wallet`) - MetaMask connection management

## 🔍 Key Features Deep Dive

### Shopping Cart System
- **Persistent Storage**: Cart saved in localStorage
- **Multi-item Checkout**: Purchase multiple items in one transaction
- **Real-time Updates**: Instant price calculations
- **Remove Items**: Individual item removal

### Rating & Review System
- **Post-Purchase Reviews**: Rate products after buying
- **5-Star Rating**: Visual star rating system
- **Written Reviews**: Optional text reviews
- **Farmer Dashboard**: View all reviews for products
- **Verified Purchases**: Only buyers can review

### Blockchain Integration
- **Real-time Data**: Live blockchain data fetching
- **Gas Optimization**: Efficient smart contract calls
- **Error Handling**: Comprehensive transaction error handling
- **Event Listening**: Real-time blockchain event updates

### Statistics Dashboard
- **Farmer Stats**: Revenue, sales count, product metrics
- **Customer Stats**: Purchase history, spending analysis
- **Visual Charts**: Clean data presentation
- **Real-time Updates**: Live blockchain data sync

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards
- **JavaScript**: ES6+ features, async/await
- **CSS**: BEM methodology, responsive design
- **Git**: Conventional commits
- **Testing**: Add tests for new features

### Contribution Areas
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations

## 🐛 Troubleshooting

### Common Issues

#### "MetaMask not found"
```bash
# Solution: Install MetaMask browser extension
# Chrome: https://chrome.google.com/webstore/detail/metamask/
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/
```

#### "Contract address not found"
```bash
# Solution: Update contract addresses in all JS files
# Check CONTRACT_SETUP.md for detailed instructions
```

#### "Insufficient funds for gas"
```bash
# Solution: Get testnet ETH from faucets
# Sepolia: https://sepoliafaucet.com/
# Goerli: https://goerlifaucet.com/
```

#### "CORS errors"
```bash
# Solution: Check backend CORS settings
# Ensure frontend URL is in allowed origins list
```

#### "Authentication failed"
```bash
# Solution: Check if backend is running
# Clear browser cookies and localStorage
# Re-login with correct credentials
```

### Debug Mode
Enable debug logs:
```javascript
// Add to utils.js
localStorage.setItem('debug', 'true');
```

### Network Issues
Check network configuration:
1. Verify contract is deployed on current network
2. Ensure MetaMask is on correct network
3. Confirm sufficient ETH for gas fees

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ethereum Foundation** - For blockchain infrastructure
- **MetaMask** - For wallet integration
- **Cloudinary** - For image storage solutions
- **MongoDB** - For database services
- **Node.js Community** - For excellent tooling

## 📞 Support

For support and questions:

- **Issues**: [GitHub Issues](https://github.com/yourusername/kissan-sathi/issues)
- **Documentation**: Check our [guides](./NAVIGATION_GUIDE.md)
- **Setup Help**: See [setup instructions](./CONTRACT_SETUP.md)

---

**Made with ❤️ for transparent agriculture** 🌾

*Empowering farmers and customers through blockchain technology*

[![Built with](https://img.shields.io/badge/Built%20with-JavaScript-yellow?style=flat-square&logo=javascript)](https://javascript.info/)
[![Powered by](https://img.shields.io/badge/Powered%20by-Ethereum-blue?style=flat-square&logo=ethereum)](https://ethereum.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB-green?style=flat-square&logo=mongodb)](https://mongodb.com/)