import { ProduceItem } from "../models/produceItem.models.js"
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'

// Register new produce (called when farmer registers produce)
const registerProduce = asyncHandler(async (req, res) => {
  const { name, originFarm, priceInWei, qrCode, blockchainId, transactionHash } = req.body;
  const farmerId = req.user._id; // Get farmer ID from authenticated user

  // Validation
  if (!name || !originFarm || !priceInWei || !qrCode) {
    throw new ApiError(400, "All fields are required");
  }

  if (!blockchainId || !transactionHash) {
    throw new ApiError(400, "Blockchain transaction details required");
  }

  // Check if blockchain ID already exists
  const existingProduce = await ProduceItem.findOne({ blockchainId });
  if (existingProduce) {
    throw new ApiError(409, "Produce with this blockchain ID already exists");
  }

  // Create produce item in database
  const produceItem = await ProduceItem.create({
    id: blockchainId,
    name: name.trim(),
    originalFarmer: req.user.username, // Store farmer username
    farmerAddress: req.user._id, // Store farmer's DB ID
    currentSeller: req.user.username,
    priceInWei: priceInWei,
    originFarm: originFarm.trim(),
    qrCode: qrCode.trim(),
    blockchainId: blockchainId,
    transactionHash: transactionHash,
    currentStatus: "Harvested",
    isAvailable: true
  });

  return res.status(201).json(
    new ApiResponse(201, produceItem, "Produce registered successfully")
  );
});

// Get all produce items for marketplace
const getAllProduce = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 12, 
    search = '', 
    status = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build search query
  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { originFarm: { $regex: search, $options: 'i' } },
      { originalFarmer: { $regex: search, $options: 'i' } }
    ];
  }

  if (status === 'available') {
    query.isAvailable = true;
    query.currentStatus = { $ne: 'Sold' };
  } else if (status === 'sold') {
    query.currentStatus = 'Sold';
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const skip = (page - 1) * limit;
  
  const [produceItems, totalCount] = await Promise.all([
    ProduceItem.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v'),
    ProduceItem.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return res.status(200).json(
    new ApiResponse(200, {
      items: produceItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, "Produce items retrieved successfully")
  );
});

// Get produce items by farmer
const getFarmerProduce = asyncHandler(async (req, res) => {
  const farmerId = req.user._id;

  const produceItems = await ProduceItem.find({ farmerAddress: farmerId })
    .sort({ createdAt: -1 })
    .select('-__v');

  return res.status(200).json(
    new ApiResponse(200, produceItems, "Farmer produce retrieved successfully")
  );
});

// Get single produce item by ID
const getProduceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const produceItem = await ProduceItem.findOne({ 
    $or: [
      { _id: id },
      { blockchainId: id },
      { id: parseInt(id) || 0 }
    ]
  });

  if (!produceItem) {
    throw new ApiError(404, "Produce item not found");
  }

  return res.status(200).json(
    new ApiResponse(200, produceItem, "Produce item retrieved successfully")
  );
});

// Update produce status (when sold on blockchain)
const updateProduceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, buyerAddress, saleTransactionHash } = req.body;

  const produceItem = await ProduceItem.findOne({ 
    $or: [
      { blockchainId: id },
      { id: parseInt(id) || 0 }
    ]
  });

  if (!produceItem) {
    throw new ApiError(404, "Produce item not found");
  }

  // Update status
  produceItem.currentStatus = status;
  if (status === 'Sold') {
    produceItem.isAvailable = false;
    produceItem.soldAt = new Date();
    if (buyerAddress) {
      produceItem.lastBuyer = buyerAddress;
    }
    if (saleTransactionHash) {
      produceItem.saleTransactionHash = saleTransactionHash;
    }
  }

  await produceItem.save();

  return res.status(200).json(
    new ApiResponse(200, produceItem, "Produce status updated successfully")
  );
});

// Update produce price
const updateProducePrice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { priceInWei } = req.body;
  const farmerId = req.user._id;

  if (!priceInWei || priceInWei <= 0) {
    throw new ApiError(400, "Valid price is required");
  }

  const produceItem = await ProduceItem.findOne({ 
    $or: [
      { blockchainId: id },
      { id: parseInt(id) || 0 }
    ],
    farmerAddress: farmerId // Ensure only owner can update
  });

  if (!produceItem) {
    throw new ApiError(404, "Produce item not found or you don't have permission");
  }

  if (produceItem.currentStatus === 'Sold') {
    throw new ApiError(400, "Cannot update price of sold item");
  }

  produceItem.priceInWei = priceInWei;
  produceItem.priceUpdatedAt = new Date();
  await produceItem.save();

  return res.status(200).json(
    new ApiResponse(200, produceItem, "Produce price updated successfully")
  );
});

// Get marketplace statistics
const getMarketplaceStats = asyncHandler(async (req, res) => {
  const stats = await ProduceItem.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        availableProducts: { 
          $sum: { 
            $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] 
          }
        },
        soldProducts: { 
          $sum: { 
            $cond: [{ $eq: ["$currentStatus", "Sold"] }, 1, 0] 
          }
        },
        totalFarmers: { $addToSet: "$farmerAddress" },
        averagePrice: { $avg: "$priceInWei" }
      }
    },
    {
      $project: {
        _id: 0,
        totalProducts: 1,
        availableProducts: 1,
        soldProducts: 1,
        totalFarmers: { $size: "$totalFarmers" },
        averagePrice: { $round: ["$averagePrice", 0] }
      }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(200, stats[0] || {
      totalProducts: 0,
      availableProducts: 0,
      soldProducts: 0,
      totalFarmers: 0,
      averagePrice: 0
    }, "Marketplace statistics retrieved successfully")
  );
});

export {
  registerProduce,
  getAllProduce,
  getFarmerProduce,
  getProduceById,
  updateProduceStatus,
  updateProducePrice,
  getMarketplaceStats
};
