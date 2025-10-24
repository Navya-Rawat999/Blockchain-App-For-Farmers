# ProduceChain - Plain HTML/CSS/JS Frontend

A simple, no-framework frontend for the ProduceChain blockchain application.

## 📁 File Structure

```
newFrontend/
├── index.html              # Home page
├── farmer-login.html       # Farmer login with Kisan card upload
├── customer-login.html     # Customer login with FSSAI license upload
├── farmer.html             # Farmer dashboard (register produce)
├── customer.html           # Customer dashboard (browse & purchase)
├── scan.html               # QR code scanner
├── wallet.html             # Web3 wallet connection
├── css/
│   ├── main.css           # Global styles
│   └── navbar.css         # Navigation styles
└── js/
    ├── utils.js           # API calls, auth, helpers
    ├── navbar.js          # Navigation component
    ├── farmer-login.js    # Farmer login logic
    ├── customer-login.js  # Customer login logic
    ├── farmer.js          # Farmer dashboard logic
    ├── customer.js        # Customer dashboard logic
    ├── scan.js            # QR scanner logic
    └── wallet.js          # Wallet connection logic
```

## Getting Started

### 1. Configure Backend API

Update the API endpoint in `js/utils.js`:
```javascript
const API_BASE = 'http://localhost:8000'; 
```

### 2. Configure Smart Contract

Update the contract address in these files:
- `js/farmer.js`
- `js/customer.js`
- `js/scan.js`

Replace `const CONTRACT_ADDRESS = '0x...';` with your deployed contract address.

### 3. Serve the Files

You can use any static file server. For example:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js (http-server)
npx http-server -p 8080

# Using PHP
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

## 📋 Features

### Authentication
- **Farmer Login**: Username, password, Kisan card photo upload
- **Customer Login**: Username, password, FSSAI license photo upload
- JWT token storage with cookies
- Role-based access control

### Farmer Dashboard
- Register new produce on blockchain
- Set produce details (name, farm, price, QR data)
- View registered produce
- MetaMask integration for transactions

### Customer Dashboard
- Search produce by ID
- View complete produce details from blockchain
- Purchase produce with cryptocurrency
- View sale history

### QR Code Scanner
- Real-time QR code scanning using camera
- Manual produce ID entry
- Instant produce verification
- Display complete produce history

### Wallet Integration
- Connect MetaMask wallet
- View wallet address and balance
- Network detection
- Auto-reconnect on page load

## 🔧 Dependencies

The following libraries are loaded via CDN:
- **Ethers.js v5**: Web3 blockchain interactions
- **html5-qrcode**: QR code scanning

No build tools or package managers required!

## 🎨 Styling

The frontend uses a custom CSS design system with:
- Dark theme optimized for readability
- Responsive layout (mobile-friendly)
- Custom form components
- Alert/notification system
- Loading states and spinners

## 🔐 Security Notes

1. **API Calls**: All backend calls use `credentials: 'include'` for cookie-based auth
2. **File Uploads**: ID proofs are uploaded after successful login
3. **Smart Contract**: Always verify contract address before deployment
4. **MetaMask**: Users must approve all blockchain transactions

## 📝 Environment Variables

For production, you may want to externalize configuration:

Create a `config.js` file:
```javascript
window.APP_CONFIG = {
  API_BASE: 'https://your-backend.com',
  CONTRACT_ADDRESS: '0x...',
  NETWORK_ID: 1, // Ethereum mainnet
};
```

Then update `utils.js` to use `window.APP_CONFIG.API_BASE` instead of hardcoded URL.

## 🐛 Troubleshooting

### CORS Errors
Make sure your backend has CORS enabled for your frontend origin:
```javascript
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));
```

### MetaMask Not Detected
Users must have MetaMask extension installed. Check `window.ethereum` is available.

### Contract Interaction Fails
- Verify contract address is correct
- Ensure user is on the correct network
- Check user has sufficient gas for transactions

## 📱 Mobile Support

All pages are responsive and work on mobile devices. The QR scanner uses the device camera on mobile.

## 🤝 Backend Integration

This frontend connects to the Express backend at `/Backend`. Required endpoints:
- `POST /api/v1/users/login` - Login
- `POST /api/v1/users/logout` - Logout
- `PATCH /api/v1/users/id-proof` - Upload ID verification
- `POST /api/v1/users/refresh-token` - Token refresh

## 📄 License

MIT License - Built for transparent agriculture
