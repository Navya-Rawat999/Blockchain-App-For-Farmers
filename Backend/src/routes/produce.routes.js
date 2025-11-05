import { Router } from 'express'
import { 
  registerProduce,
  getAllProduce,
  getFarmerProduce,
  getProduceById,
  updateProduceStatus,
  updateProducePrice,
  getMarketplaceStats
} from '../controllers/produce.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'

const router = Router()

// Public routes (no authentication required)
router.route("/marketplace").get(getAllProduce) // Get all produce for marketplace
router.route("/stats").get(getMarketplaceStats) // Get marketplace statistics
router.route("/:id").get(getProduceById) // Get single produce item

// Protected routes (authentication required)
router.route("/register").post(verifyJWT, registerProduce) // Register new produce
router.route("/my-produce").get(verifyJWT, getFarmerProduce) // Get farmer's produce
router.route("/:id/status").patch(verifyJWT, updateProduceStatus) // Update produce status
router.route("/:id/price").patch(verifyJWT, updateProducePrice) // Update produce price

export default router
