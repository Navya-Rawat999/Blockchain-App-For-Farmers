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
} from '../controllers/user.controller.js'
import { upload } from '../middleware/multer.middleware.js'
import { verifyJWT } from'../middleware/auth.middleware.js'



const router = Router()

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


//login route and logout route
router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserprofilePic)

// upload or update ID proof after login
router.route("/id-proof").patch(verifyJWT, upload.single("id_proof"), updateUserValidIDProof)


export default router