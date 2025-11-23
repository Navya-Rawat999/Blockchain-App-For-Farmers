import { User, Farmer, Customer } from "../models/user.models.js"
import { TransactionHistory } from "../models/transactionHistory.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { cookie_options } from "../constants.js"
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
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
  const {fullName, email, username, password, role} = req.body 
  if(
    [fullName, email, username, password, role].some((field) => field?.trim() === "")
  ){
    throw new ApiError(400, "All fields are required")
  }

  const userExisted = await User.findOne({
    $or: [{email}, {username}]
  })

  if(userExisted) throw new ApiError(409, "User with username or email already exists")

  if(role !== 'farmer' && role !== 'customer') throw new ApiError(400, "Role was not correctly filled")
  
  const profilePic_LocalPath = req.files?.profilePic[0]?.path
 if(!profilePic_LocalPath) throw new ApiError(400, "profilePic file is required")

  const id_proof_LocalPath = req.files?.valid_id_proof[0]?.path
  if(!id_proof_LocalPath) throw new ApiError(400, "ID_proof not uploaded")

  const profilePic = await uploadOnCloudinary(profilePic_LocalPath)  
  if(!profilePic) throw new ApiError(400, "profilePic file was not uploaded on cloudinary")
  
  const id_proof = await uploadOnCloudinary(id_proof_LocalPath)
  if(!id_proof) throw new ApiError(400, "id_proof file was not uploaded on cloudinary")

  let user_id;

  if(role === 'farmer') {
    const farmer = await Farmer.create({
    fullName,
    profilePic: profilePic?.url,
    KisanID: id_proof?.url,
    email,
    password,
    username: username.toLowerCase(),
    role,
    })

    user_id = farmer._id
  }
  else if (role === 'customer'){
    const customer = await Customer.create({
    fullName,
    profilePic: profilePic?.url,
    License: id_proof?.url,
    email,
    password,
    username: username.toLowerCase(),
    role,
    })

    user_id = customer._id
  }
  

  const createdUser = await User.findById(user_id).select(
    "-password -refreshToken"   
  )

  if(!createdUser) throw new ApiError(500, "Something went wrong while registering a user")
  
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully.")
  )
})


const loginUser = asyncHandler(async (req, res) => {

  const{username, email, password, role} = req.body
  
  if(!(username || email)) throw new ApiError(400, "username or email is required")
  if(!password) throw new ApiError(400, "password is required")

  let user
  if(role === 'farmer') {
    user = await Farmer.findOne({
    $or: [{username}, {email}]
    })  
  }
  else {
    user = await Customer.findOne({
    $or: [{username}, {email}]
    })  
  }
  

  if(!user) throw new ApiError(400, "User does not exist. Please register first.")

  const isPasswordValid = await user.isPasswordCorrect(password)
  if(!isPasswordValid) throw new ApiError(401, "password is incorrect")

  const {AccessToken, RefreshToken} = await generateRefreshAndAccessTokens(user._id)

  let loggedInUser;
  if (role === 'farmer'){
    loggedInUser = await Farmer.findById(user._id).select(
      "-password -refreshToken"
    )
  }
  else if (role === 'customer'){
    loggedInUser = await Customer.findById(user._id).select(
      "-password -refreshToken"
    )
  }
  
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

// Enhanced getCurrentUser with transaction info only (no wallet tracking)
const getCurrentUser = asyncHandler(async(req, res) => {
  const userId = req.user._id;

  // Get user info with all fields including profilePic
  const user = await User.findById(userId).select('-password -refreshToken');

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get basic transaction stats
  let transactionStats = [];
  let totalTransactions = 0;

  try {
    transactionStats = await TransactionHistory.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 }
        }
      }
    ]);

    totalTransactions = await TransactionHistory.countDocuments({ userId });
  } catch (error) {
    console.log('Transaction stats not available:', error.message);
  }

  const enhancedUser = {
    ...user.toObject(),
    transactionStats: {
      total: totalTransactions,
      byType: transactionStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    }
  };

  return res
  .status(200)
  .json(new ApiResponse(200, enhancedUser, "current user fetched successfully"))
})

// Get user profile with detailed transaction stats
const getUserProfile = asyncHandler(async(req, res) => {
  const userId = req.user._id;

  // Get user info with all fields including profilePic
  const user = await User.findById(userId).select('-password -refreshToken');

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let transactionStats = [];
  let recentTransactions = [];

  try {
    // Get detailed transaction stats
    [transactionStats, recentTransactions] = await Promise.all([
      TransactionHistory.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$transactionType',
            count: { $sum: 1 },
            totalAmount: {
              $sum: {
                $cond: [
                  { $in: ['$transactionType', ['sale', 'registration']] },
                  { $toDouble: '$amountInWei' },
                  0
                ]
              }
            }
          }
        }
      ]),
      TransactionHistory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('transactionType productName amountInWei createdAt blockchainTransactionHash')
    ]);
  } catch (error) {
    console.log('Transaction data not available:', error.message);
  }

  const profile = {
    user: user.toObject(),
    stats: {
      transactions: {
        total: recentTransactions.length,
        byType: transactionStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount.toString()
          };
          return acc;
        }, {}),
        recent: recentTransactions
      }
    }
  };

  return res
  .status(200)
  .json(new ApiResponse(200, profile, "User profile retrieved successfully"))
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

const updateUserprofilePic = asyncHandler(async(req, res) => {
  const profilePic_LocalPath = req.file?.path

  if(!profilePic_LocalPath) throw new ApiError(400, "profilePic file is missing")
  
  const profilePic = await uploadOnCloudinary(profilePic_LocalPath)

  if(!profilePic.url) throw new ApiError(500, "Something went wrong while uploading profilePic")
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        profilePic: profilePic.url
      }
    },
    {new: true}
  ).select("-password -refreshToken")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "profilePic was uploaded successfully"))
})


const updateUserValidIDProof = asyncHandler(async(req, res) => {
  const {role} = req.body
  if(role !== 'farmer' && role !== 'customer') throw new ApiError(400, "role is missing")
    
  const id_proof_LocalPath = req.file?.path
  if(!id_proof_LocalPath) throw new ApiError(400, "coverImage file is missing")
  
  const id_proof = await uploadOnCloudinary(id_proof_LocalPath)
  if(!id_proof.url) throw new ApiError(500, "Something went wrong while uploading id_proof")
  
  let user
  if(role === 'farmer') {
    user = await Farmer.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          KisanID: id_proof.url
        }
      },
      {new: true}
    ).select("-password -refreshToken")
  }
  else {
    user = await Customer.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          License: id_proof.url
        }
      },
      {new: true}
    ).select("-password -refreshToken")
  }


  return res
  .status(200)
  .json(new ApiResponse(200, user, "id_proof was uploaded successfully"))
})




export {
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
};