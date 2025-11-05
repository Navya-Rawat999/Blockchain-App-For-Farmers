import { Wallet } from "../models/wallet.models.js"
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'

// Connect or update wallet
const connectWallet = asyncHandler(async (req, res) => {
  const { walletAddress, networkId, networkName, balance } = req.body;
  const userId = req.user._id;

  // Validation
  if (!walletAddress || !networkId || !networkName) {
    throw new ApiError(400, "Wallet address, network ID, and network name are required");
  }

  // Validate Ethereum address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new ApiError(400, "Invalid Ethereum wallet address format");
  }

  try {
    // Check if wallet already exists for this user
    let wallet = await Wallet.findOne({ userId });

    if (wallet) {
      // Update existing wallet
      wallet.walletAddress = walletAddress;
      wallet.networkId = networkId;
      wallet.networkName = networkName;
      wallet.balance = balance || wallet.balance;
      wallet.isConnected = true;
      wallet.lastConnected = new Date();
      wallet.connectionCount += 1;
      await wallet.save();
    } else {
      // Check if this wallet address is used by another user
      const existingWallet = await Wallet.findOne({ walletAddress });
      if (existingWallet) {
        throw new ApiError(409, "This wallet address is already connected to another account");
      }

      // Create new wallet connection
      wallet = await Wallet.create({
        userId,
        walletAddress,
        networkId,
        networkName,
        balance: balance || '0',
        isConnected: true,
        lastConnected: new Date(),
        connectionCount: 1
      });
    }

    return res.status(200).json(
      new ApiResponse(200, wallet, "Wallet connected successfully")
    );
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "This wallet address is already connected to another account");
    }
    throw error;
  }
});

// Disconnect wallet
const disconnectWallet = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const wallet = await Wallet.findOne({ userId });
  
  if (!wallet) {
    throw new ApiError(404, "No wallet connection found");
  }

  wallet.isConnected = false;
  await wallet.save();

  return res.status(200).json(
    new ApiResponse(200, wallet, "Wallet disconnected successfully")
  );
});

// Get user's wallet info
const getWalletInfo = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const wallet = await Wallet.findOne({ userId }).populate('userId', 'username fullName role');

  if (!wallet) {
    return res.status(200).json(
      new ApiResponse(200, null, "No wallet connected")
    );
  }

  return res.status(200).json(
    new ApiResponse(200, wallet, "Wallet info retrieved successfully")
  );
});

// Update wallet balance
const updateBalance = asyncHandler(async (req, res) => {
  const { balance } = req.body;
  const userId = req.user._id;

  if (!balance) {
    throw new ApiError(400, "Balance is required");
  }

  const wallet = await Wallet.findOne({ userId });
  
  if (!wallet) {
    throw new ApiError(404, "No wallet connection found");
  }

  wallet.balance = balance;
  await wallet.save();

  return res.status(200).json(
    new ApiResponse(200, wallet, "Wallet balance updated successfully")
  );
});

// Get all connected wallets (Admin only)
const getAllWallets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isConnected } = req.query;

  const query = {};
  if (isConnected !== undefined) {
    query.isConnected = isConnected === 'true';
  }

  const skip = (page - 1) * limit;

  const [wallets, totalCount] = await Promise.all([
    Wallet.find(query)
      .populate('userId', 'username fullName role email')
      .sort({ lastConnected: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Wallet.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return res.status(200).json(
    new ApiResponse(200, {
      wallets,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalWallets: totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, "Wallets retrieved successfully")
  );
});

// Get wallet statistics
const getWalletStats = asyncHandler(async (req, res) => {
  const stats = await Wallet.aggregate([
    {
      $group: {
        _id: null,
        totalWallets: { $sum: 1 },
        connectedWallets: { 
          $sum: { $cond: [{ $eq: ["$isConnected", true] }, 1, 0] }
        },
        disconnectedWallets: { 
          $sum: { $cond: [{ $eq: ["$isConnected", false] }, 1, 0] }
        },
        networks: { $addToSet: "$networkName" },
        totalConnections: { $sum: "$connectionCount" }
      }
    },
    {
      $project: {
        _id: 0,
        totalWallets: 1,
        connectedWallets: 1,
        disconnectedWallets: 1,
        uniqueNetworks: { $size: "$networks" },
        networks: 1,
        totalConnections: 1
      }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(200, stats[0] || {
      totalWallets: 0,
      connectedWallets: 0,
      disconnectedWallets: 0,
      uniqueNetworks: 0,
      networks: [],
      totalConnections: 0
    }, "Wallet statistics retrieved successfully")
  );
});

export {
  connectWallet,
  disconnectWallet,
  getWalletInfo,
  updateBalance,
  getAllWallets,
  getWalletStats
};
