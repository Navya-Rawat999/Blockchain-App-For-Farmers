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
  getSearchSuggestions,
  validatePurchaseEligibility,
  generateQRCode,
  parseQRCode
} from '../controllers/produce.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'
import { upload } from '../middleware/multer.middleware.js'

const router = Router()

// Public routes (no authentication required)
router.route("/marketplace").get(getAllProduce)
router.route("/featured").get(getFeaturedProduce)
router.route("/search-suggestions").get(getSearchSuggestions)
router.route("/stats").get(getMarketplaceStats)
router.route("/:id").get(getProduceById)
router.route("/:id/view").post(incrementProductView)

// QR code parsing route (public)
router.route("/qr/parse").post(parseQRCode)

// Protected routes (authentication required)
router.route("/register").post(
  verifyJWT, 
  upload.single("produceImage"), 
  registerProduce
)
router.route("/my-produce").get(verifyJWT, getFarmerProduce)
router.route("/:id/status").patch(verifyJWT, updateProduceStatus)
router.route("/:id/price").patch(verifyJWT, updateProducePrice)

// QR code generation route (protected)
router.route("/:id/qr-code").post(verifyJWT, generateQRCode)

// Purchase validation route
router.route("/:id/validate-purchase").get(verifyJWT, validatePurchaseEligibility)

// Review routes (future API integration)
router.route("/:id/review").post(verifyJWT, (req, res) => {
  // Placeholder for review handling logic
  res.send("Review endpoint")
})

export default router
