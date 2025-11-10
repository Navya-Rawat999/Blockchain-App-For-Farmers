import { Router } from 'express'
import { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserprofilePic,
  updateUserValidIDProof,
  getUserProfile
} from '../controllers/user.controller.js'
import { upload } from '../middleware/multer.middleware.js'
import { verifyJWT } from'../middleware/auth.middleware.js'



const router = Router()

// Public routes
router.route("/register").post(
  upload.fields([ 
    {
      name: "profilePic",
      maxCount: 1
    },
    {
      name: "valid_id_proof",
      maxCount: 1,
    }
  ]),   
  registerUser
)

router.route("/login").post(loginUser)

router.route("/refresh-token").post(refreshAccessToken)

// Protected routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/profile").get(verifyJWT, getUserProfile)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/update-profile-pic").patch(verifyJWT, upload.single("profilePic"), updateUserprofilePic)
router.route("/update-id-proof").patch(verifyJWT, upload.single("valid_id_proof"), updateUserValidIDProof)


export default router