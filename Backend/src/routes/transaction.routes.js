import { Router } from 'express'
import { 
  recordTransaction,
  getUserTransactions,
  getUserTransactionStats,
  getTransactionByHash,
  updateTransactionStatus,
  getProductTransactions
} from '../controllers/transaction.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(verifyJWT)

// Transaction management
router.route("/record").post(recordTransaction) // Record new transaction
router.route("/my-transactions").get(getUserTransactions) // Get user transactions
router.route("/my-stats").get(getUserTransactionStats) // Get user transaction stats
router.route("/hash/:hash").get(getTransactionByHash) // Get transaction by hash
router.route("/hash/:hash/status").patch(updateTransactionStatus) // Update transaction status
router.route("/product/:productId").get(getProductTransactions) // Get product transaction history

export default router
