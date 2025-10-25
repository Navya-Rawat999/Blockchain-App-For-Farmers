# Contract Address Configuration

## ⚠️ IMPORTANT: Update These Files

Before running your application, you **MUST** update the contract address in these files:

### Files to Update:
1. `/Frontend/js/farmer.js` - Line 16
2. `/Frontend/js/customer.js` - Line 8  
3. `/Frontend/js/marketplace.js` - Line 24
4. `/Frontend/js/profile.js` - Line 17

### Find and Replace:
```javascript
const CONTRACT_ADDRESS = '0x...'; // Replace with your deployed contract address
```

Replace `'0x...'` with your actual contract address (should look like: `'0xABCD1234...'`)

---

## Example:
If your contract is deployed at: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

Change from:
```javascript
const CONTRACT_ADDRESS = '0x...';
```

To:
```javascript
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
```

---

## Network Configuration

Make sure MetaMask is connected to the same network where you deployed the contract:

- **Localhost**: If testing locally with Hardhat/Ganache
- **Sepolia**: Ethereum testnet (recommended for testing)
- **Goerli**: Ethereum testnet (alternative)
- **Mainnet**: Only use for production with real ETH

---

## Quick Setup Checklist

- [ ] Deploy smart contract to blockchain
- [ ] Copy contract address
- [ ] Update all 4 JavaScript files listed above
- [ ] Install MetaMask browser extension
- [ ] Connect MetaMask to correct network
- [ ] Import account with ETH for gas fees
- [ ] Test registration on farmer dashboard
- [ ] Test browsing on marketplace
- [ ] Test purchasing on customer dashboard

---

## Testing Tips

1. **Use Testnet First**: Always test on Sepolia or Goerli before mainnet
2. **Get Test ETH**: Use faucets to get free testnet ETH
   - Sepolia: https://sepoliafaucet.com/
   - Goerli: https://goerlifaucet.com/
3. **Small Amounts**: Use small ETH amounts for testing (0.001 ETH)
4. **Check Gas**: Make sure you have enough ETH for gas fees

---

## Troubleshooting

### Error: "cannot estimate gas"
- Contract address is wrong
- You're on the wrong network
- Contract not deployed yet

### Error: "insufficient funds"
- Not enough ETH in wallet for gas + purchase price
- Get more testnet ETH from faucets

### Products not loading
- Contract address not updated
- Wrong network selected in MetaMask
- No products registered yet
