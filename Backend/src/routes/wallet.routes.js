import { Router } from 'express'
import { 
  connectWallet,
  disconnectWallet,
  getUserWallet,
  updateWalletBalance
} from '../controllers/wallet.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(verifyJWT)

// Wallet management
router.route("/connect").post(connectWallet) // Connect wallet
router.route("/disconnect").post(disconnectWallet) // Disconnect wallet
router.route("/info").get(getUserWallet) // Get wallet info
router.route("/balance").patch(updateWalletBalance) // Update balance

export default router
