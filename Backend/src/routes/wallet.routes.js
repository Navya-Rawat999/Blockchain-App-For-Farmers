import { Router } from 'express'
import { 
  connectWallet,
  disconnectWallet,
  getWalletInfo,
  updateBalance,
  getAllWallets,
  getWalletStats
} from '../controllers/wallet.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'

const router = Router()

// All wallet routes require authentication
router.use(verifyJWT);

// Wallet operations
router.route("/connect").post(connectWallet) // Connect/update wallet
router.route("/disconnect").post(disconnectWallet) // Disconnect wallet
router.route("/info").get(getWalletInfo) // Get wallet info
router.route("/balance").patch(updateBalance) // Update balance

// Admin routes (can add admin middleware later)
router.route("/all").get(getAllWallets) // Get all wallets
router.route("/stats").get(getWalletStats) // Get wallet statistics

export default router
