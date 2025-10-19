import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { User } from '../models/user.models.js'
import jwt from 'jsonwebtoken'

export const verifyJWT = asyncHandler(async(req, _, next) => { // since response was not used in here we replaced it by _ so to mark it unused
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","") // spelling should have z not s
    
    if(!token) throw new ApiError(401, "Unauthorized request")
  
    const decodedToPayload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) // jwt.verify() returns the payload by decoding the token

    const user = await User.findById(decodedToPayload?._id).select( // this is how you will get the user id
    "-password -refreshToken"
    )

    if(!user) throw new ApiError(401, "Invalid Access Token")

    req.user = user
    next()
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access token(end)")
  }
  
})