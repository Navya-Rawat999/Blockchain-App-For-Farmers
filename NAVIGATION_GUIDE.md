# 📱 Page Navigation Guide

## 🏠 Homepage (`index.html`)
- Landing page
- Links to all other sections

---

## 🧑‍🌾 Farmer Dashboard (`farmer.html`)
**Purpose:** Register and manage your produce

**Features:**
- ✍️ Register new produce items
- 📋 View all your registered products
- 💰 Update product prices
- 📊 Update product status
- 🔗 Each product shows: ID, name, farm, price, status, QR code

**Who can access:** Farmers only

**Workflow:**
1. Connect wallet
2. Fill registration form (name, farm, price in ETH, QR code)
3. Submit & confirm MetaMask transaction
4. View your products listed below
5. Click "Update Price" or "Update Status" to modify

---

## 👥 Customer Dashboard (`customer.html`)
**Purpose:** View and purchase specific products by ID

**Features:**
- 🔍 Search by produce ID
- 📖 View complete product details
- 📜 View sale history
- 💳 Purchase individual items
- 🔗 See farmer address and origin

**Who can access:** Customers only

**Workflow:**
1. Connect wallet
2. Enter product ID in search box
3. View all details
4. Click "Purchase" button
5. Confirm MetaMask transaction

---

## 🛒 Marketplace (`marketplace.html`) ⭐ NEW
**Purpose:** Browse ALL products and shop with cart

**Features:**
- 🗂️ Grid view of all products
- 🔍 Search by name, ID, or farm
- 🎯 Filter by status (Available/Sold)
- 🛒 Add multiple items to cart
- 💾 Cart persists in localStorage
- 🔄 Refresh button
- 💸 Bulk checkout

**Who can access:** Everyone (customers & farmers)

**Workflow:**
1. Browse products in grid
2. Use search/filter to find items
3. Click "🛒 Add" to add to cart
4. Cart badge shows item count
5. Click cart badge to view cart
6. Click "Checkout" to buy all items
7. Confirm each transaction in MetaMask

**Cart Features:**
- View all items in cart
- See total price in ETH
- Remove individual items
- Clear entire cart
- Cart saved even if you close browser

---

## ⚙️ Profile (`profile.html`) ⭐ NEW
**Purpose:** View your account info and blockchain statistics

**Features:**

### 👤 Account Information
- Name, email, role
- Member since date
- Role-specific avatar

### 💳 Wallet Information
- Connect/disconnect wallet
- View wallet address (copy button)
- See network name
- Check ETH balance
- Connection status

### 📊 Statistics (Farmer)
- Products registered
- Products sold
- Total revenue (ETH)
- Available products

### 📊 Statistics (Customer)
- Total purchases
- Total spent (ETH)
- Available products in marketplace

### 📜 Transaction History
- All your blockchain transactions
- Color-coded by type:
  - 📝 Registration (blue)
  - 💰 Sale (green)
  - 🛒 Purchase (green)
- Shows: product name, price, date, addresses
- Newest transactions first
- Refresh button

**Who can access:** Everyone (farmers & customers)

**Workflow:**
1. Click "Connect Wallet" if not connected
2. View your statistics
3. Scroll down to see transaction history
4. Click "🔄 Refresh" to update data
5. Click 📋 to copy wallet address

---

## 📱 Scan (`scan.html`)
**Purpose:** Scan QR codes on products

**Features:**
- Camera-based QR scanner
- Auto-redirect to product details

**Who can access:** Everyone

---

## 🔐 Login/Register (`login.html`, `register.html`)
**Purpose:** User authentication

**Features:**
- Email & password login
- New user registration
- Role selection (farmer/customer)

---

## 💼 Wallet (`wallet.html`)
**Purpose:** Connect MetaMask wallet

**Features:**
- MetaMask connection
- Network selection
- Account switching

---

## 🎯 Quick Access Guide

### I want to...

**Register my produce**
→ Go to Farmer Dashboard

**Buy a specific product (I have the ID)**
→ Go to Customer Dashboard

**Browse all products and shop**
→ Go to Marketplace 🆕

**Add multiple items before buying**
→ Go to Marketplace → Use cart 🆕

**View my stats and transaction history**
→ Go to Profile 🆕

**Scan a QR code**
→ Go to Scan

**Check my wallet balance**
→ Go to Profile → Wallet Information 🆕

**Update my product price**
→ Go to Farmer Dashboard → Find product → Click "Update Price"

**See who bought my products**
→ Go to Profile → Transaction History 🆕

---

## 📊 Navigation Menu

```
┌─────────────────────────────────────────────────┐
│ 🌾 Kissan Sathi                                 │
├─────────────────────────────────────────────────┤
│ 🛒 Marketplace | 📱 Scan | 🧑‍🌾 Farmer | 👤 Customer │
│ ⚙️ Profile | Login | Register | Connect Wallet  │
└─────────────────────────────────────────────────┘
```

All pages have the same navigation bar for easy access!

---

## 💡 Pro Tips

1. **Start with Profile**: Connect your wallet there first
2. **Use Marketplace for browsing**: Better than searching by ID
3. **Check Profile regularly**: See your stats and history
4. **Use Cart for multiple items**: Saves time and gas fees
5. **Bookmark your favorites**: Add frequently used pages to browser

---

## 🎨 Visual Differences

### Farmer Dashboard
- Green theme
- Form at top
- List of your products below

### Customer Dashboard  
- Blue theme
- Search box at top
- Single product detail view

### Marketplace
- Purple/primary theme
- Grid of ALL products
- Cart badge floating bottom-right
- Search & filter at top

### Profile
- Gradient header with avatar
- Stats cards in grid
- Wallet info section
- Transaction list at bottom

---

## 🔄 Typical User Journeys

### Farmer Journey
1. Login → Profile (connect wallet)
2. Farmer Dashboard (register products)
3. Profile (check stats & sales)

### Customer Journey
1. Login → Profile (connect wallet)  
2. Marketplace (browse & add to cart)
3. Cart (checkout all items)
4. Profile (view purchase history)

### Mixed Journey
1. Login
2. Marketplace (see what's available)
3. Customer Dashboard (check specific item details)
4. Profile (manage account)

---

Happy farming! 🌾✨
