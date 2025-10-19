import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { cookie_options } from "../constants.js"
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/user.models.js"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"


const generateRefreshAndAccessTokens = async(userId) => {
  try{
    const user = await User.findById(userId)
    const AccessToken = user.generateAccessToken()
    const RefreshToken = user.generateRefreshToken()
    user.refreshToken = RefreshToken
    await user.save({validateBeforeSave: false}) 

    return {AccessToken, RefreshToken}
  } catch (error){
    throw new ApiError(500, "Something went wrong while generating refresh and access token")
  }
}



const registerUser = asyncHandler(async(req, res) => {
  const {fullName, email, username, password} = req.body 
  if(
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ){
    throw new ApiError(400, "All fields are required")
  }

  const userExisted = await User.findOne({
    $or: [{email}, {username}]
  })

  if(userExisted) throw new ApiError(409, "User with username or email already exists")

  const avatarLocalPath = req.files?.avatar[0]?.path
  
  let coverImageLocalPath
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if(!avatarLocalPath) throw new ApiError(400, "Avatar file is required")

  const avatar = await uploadOnCloudinary(avatarLocalPath)  
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  console.log(avatar)
  if(!avatar) throw new ApiError(400, "Avatar file was not uploaded on cloudinary")

  const user = await User.create({
    fullName,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"   
  )

  if(!createdUser) throw new ApiError(500, "Something went wrong while registering a user")
  
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully.")
  )
})


const loginUser = asyncHandler(async (req, res) => {

  const{username, email, password} = req.body
  
  if(!(username || email)) throw new ApiError(400, "username or email is required")
  if(!password) throw new ApiError(400, "password is required")

  const user = await User.findOne({
    $or: [{username}, {email}]
  })  

  if(!user) throw new ApiError(400, "User does not exist. Please register first.")

  const isPasswordValid = await user.isPasswordCorrect(password)
  if(!isPasswordValid) throw new ApiError(401, "password is incorrect")

  const {AccessToken, RefreshToken} = await generateRefreshAndAccessTokens(user._id)

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  // now to send cookies
  return res
  .status(200)
  .cookie("accessToken", AccessToken, cookie_options)
  .cookie("refreshToken", RefreshToken, cookie_options)
  .json(
    new ApiResponse(200,
      {
        user: loggedInUser,
        AccessToken,
        RefreshToken
      },
      "user logged in successfully"
    )
  )

})



const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {refreshToken: 1}
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(
    new ApiResponse(200, {}, "user logged out")
  )

})


const refreshAccessToken = asyncHandler(async(req, res)=>{

  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  if(!incomingRefreshToken) throw new ApiError(401, "Unauthorized request")
  
  try {
 
    const decodedToPayload = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    )
  
    
    const user = await User.findById(decodedToPayload?._id)
    if(!user) throw new ApiError(401, "Unauthorized request")

    if(incomingRefreshToken !== user.refreshToken) throw new ApiError(401, "Refresh token is expired or used")

    const {AccessToken, RefreshToken} = await generateRefreshAndAccessTokens(user._id)
  
    // return res
    return res
    .status(200)
    .cookie("refreshToken", RefreshToken, cookie_options)
    .cookie("accessToken", AccessToken, cookie_options)
    .json(
      new ApiResponse(
        200,
        {AccessToken, RefreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh token")
  }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const {oldPassword, newPassword} = req.body
  
  const user = await User.findById(req.user._id)

  if(!await user.isPasswordCorrect(oldPassword)) throw new ApiError(400, "Old password is incorrect")
  
  user.password = newPassword

  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req, res) => {
  const {fullName, email} = req.body

  if(!fullName || !email) throw new ApiError(400, "All fields are required")

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email
      }
    },
    {new: true}
  ).select("-password -refreshToken")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath) throw new ApiError(400, "Avatar file is missing")
  
  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url) throw new ApiError(500, "Something went wrong while uploading avatar")
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {new: true}
  ).select("-password -refreshToken")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Avatar was uploaded successfully"))
})


const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath) throw new ApiError(400, "coverImage file is missing")
  
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url) throw new ApiError(500, "Something went wrong while uploading coverImage")
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    {new: true}
  ).select("-password -refreshToken")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "coverImage was uploaded successfully"))
})




export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
}