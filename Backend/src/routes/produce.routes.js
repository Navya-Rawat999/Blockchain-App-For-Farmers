import { Router } from 'express'
import { 
  registerProduce,
  getAllProduce,
  getFarmerProduce,
  getProduceById,
  updateProduceStatus,
  updateProducePrice,
  getMarketplaceStats,
  getFeaturedProduce,
  incrementProductView,
  getSearchSuggestions
} from '../controllers/produce.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'

const router = Router()

// Public routes (no authentication required)
router.route("/marketplace").get(getAllProduce)
router.route("/featured").get(getFeaturedProduce)
router.route("/search-suggestions").get(getSearchSuggestions)
router.route("/stats").get(getMarketplaceStats)
router.route("/:id").get(getProduceById)
router.route("/:id/view").post(incrementProductView)

// Protected routes (authentication required)
router.route("/register").post(verifyJWT, registerProduce)
router.route("/my-produce").get(verifyJWT, getFarmerProduce)
router.route("/:id/status").patch(verifyJWT, updateProduceStatus)
router.route("/:id/price").patch(verifyJWT, updateProducePrice)

// Review routes (future API integration)
router.route("/:id/review").post(verifyJWT, (req, res) => {
  // Placeholder for review handling logic
  res.send("Review endpoint")
})

export default router
