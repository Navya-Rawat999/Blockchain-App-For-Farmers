import { ProduceItem } from "../models/produceItem.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
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

  // Validate produce image
  const produceImageLocalPath = req.file?.path;
  if (!produceImageLocalPath) {
    throw new ApiError(400, "Produce image is required");
  }

  // Validate blockchain ID is a positive integer
  const parsedBlockchainId = parseInt(blockchainId);
  if (isNaN(parsedBlockchainId) || parsedBlockchainId <= 0) {
    throw new ApiError(400, "Invalid blockchain ID");
  }

  // Validate price is a valid Wei amount
  if (!priceInWei || priceInWei === '0') {
    throw new ApiError(400, "Invalid price amount");
  }

  // Check if blockchain ID already exists
  const existingProduce = await ProduceItem.findOne({ blockchainId: parsedBlockchainId });
  if (existingProduce) {
    throw new ApiError(409, "Produce with this blockchain ID already exists");
  }

  // Upload produce image to Cloudinary
  const produceImage = await uploadOnCloudinary(produceImageLocalPath);
  if (!produceImage) {
    throw new ApiError(400, "Failed to upload produce image");
  }

  // Create produce item in database
  const produceItem = await ProduceItem.create({
    id: parsedBlockchainId,
    name: name.trim(),
    originalFarmer: req.user.username, // Store farmer username
    farmerAddress: req.user._id, // Store farmer's DB ID
    currentSeller: req.user.username,
    priceInWei: priceInWei.toString(), // Store as string for large numbers
    originFarm: originFarm.trim(),
    qrCode: qrCode.trim(),
    produceImage: produceImage.url, // Store Cloudinary URL
    blockchainId: parsedBlockchainId,
    transactionHash: transactionHash,
    currentStatus: "Harvested",
    isAvailable: true
  });

  return res.status(201).json(
    new ApiResponse(201, produceItem, "Produce registered successfully")
  );
});

// Enhanced get all produce items for marketplace with advanced aggregation and pagination
const getAllProduce = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 12, 
    search = '', 
    status = 'available',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    minPrice = 0,
    maxPrice = 0,
    farmLocation = '',
    farmer = ''
  } = req.query;

  // Build aggregation pipeline for complex filtering and sorting
  const pipeline = [];

  // Match stage - build complex query
  const matchConditions = {};

  // Search functionality
  if (search) {
    matchConditions.$or = [
      { name: { $regex: search, $options: 'i' } },
      { originFarm: { $regex: search, $options: 'i' } },
      { originalFarmer: { $regex: search, $options: 'i' } }
    ];
  }

  // Status filtering
  if (status === 'available') {
    matchConditions.isAvailable = true;
    matchConditions.currentStatus = { $ne: 'Sold' };
  } else if (status === 'sold') {
    matchConditions.currentStatus = 'Sold';
  }

  // Price range filtering
  if (minPrice || maxPrice) {
    const priceConditions = {};
    if (minPrice) priceConditions.$gte = parseFloat(minPrice);
    if (maxPrice) priceConditions.$lte = parseFloat(maxPrice);
    
    matchConditions.$expr = {
      $and: [
        { $gte: [{ $toDouble: "$priceInWei" }, (priceConditions.$gte || 0) * Math.pow(10, 18)] },
        { $lte: [{ $toDouble: "$priceInWei" }, (priceConditions.$lte || Number.MAX_SAFE_INTEGER) * Math.pow(10, 18)] }
      ]
    };
  }

  // Farm location filtering
  if (farmLocation) {
    matchConditions.originFarm = { $regex: farmLocation, $options: 'i' };
  }

  // Farmer filtering
  if (farmer) {
    matchConditions.originalFarmer = { $regex: farmer, $options: 'i' };
  }

  pipeline.push({ $match: matchConditions });

  // Add farmer details lookup
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'farmerAddress',
      foreignField: '_id',
      as: 'farmerDetails',
      pipeline: [{ $project: { username: 1, fullName: 1, profilePic: 1 } }]
    }
  });

  // Add calculated fields
  pipeline.push({
    $addFields: {
      priceInEth: { $divide: [{ $toDouble: "$priceInWei" }, Math.pow(10, 18)] },
      farmerInfo: { $arrayElemAt: ["$farmerDetails", 0] },
      daysSinceRegistration: {
        $floor: {
          $divide: [
            { $subtract: [new Date(), "$createdAt"] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    }
  });

  // Sorting
  const sortStage = {};
  if (sortBy === 'price') {
    sortStage.priceInEth = sortOrder === 'desc' ? -1 : 1;
  } else if (sortBy === 'popularity') {
    sortStage.views = sortOrder === 'desc' ? -1 : 1;
  } else {
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
  }
  pipeline.push({ $sort: sortStage });

  // Project final fields
  pipeline.push({
    $project: {
      farmerDetails: 0,
      __v: 0
    }
  });

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    customLabels: {
      docs: 'items',
      totalDocs: 'totalItems',
      limit: 'itemsPerPage',
      page: 'currentPage',
      totalPages: 'totalPages',
      pagingCounter: 'serialNumberStartFrom',
      hasPrevPage: 'hasPrev',
      hasNextPage: 'hasNext',
      prevPage: 'prev',
      nextPage: 'next'
    }
  };

  const result = await ProduceItem.aggregatePaginate(
    ProduceItem.aggregate(pipeline),
    options
  );

  return res.status(200).json(
    new ApiResponse(200, result, "Produce items retrieved successfully")
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

// Enhanced marketplace stats with aggregation
const getMarketplaceStats = asyncHandler(async (req, res) => {
  const stats = await ProduceItem.aggregate([
    {
      $facet: {
        // Basic counts
        basicStats: [
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
              totalViews: { $sum: "$views" },
              averagePrice: { $avg: { $toDouble: "$priceInWei" } }
            }
          }
        ],
        // Farmer stats
        farmerStats: [
          {
            $group: {
              _id: "$farmerAddress",
              productsCount: { $sum: 1 },
              soldCount: { 
                $sum: { 
                  $cond: [{ $eq: ["$currentStatus", "Sold"] }, 1, 0] 
                }
              }
            }
          },
          {
            $group: {
              _id: null,
              totalFarmers: { $sum: 1 },
              averageProductsPerFarmer: { $avg: "$productsCount" }
            }
          }
        ],
        // Category distribution
        categoryStats: [
          {
            $group: {
              _id: "$name",
              count: { $sum: 1 },
              averagePrice: { $avg: { $toDouble: "$priceInWei" } }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        // Recent activity
        recentActivity: [
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          {
            $project: {
              name: 1,
              originFarm: 1,
              currentStatus: 1,
              createdAt: 1
            }
          }
        ]
      }
    }
  ]);

  const formattedStats = {
    ...stats[0].basicStats[0],
    farmers: stats[0].farmerStats[0] || { totalFarmers: 0, averageProductsPerFarmer: 0 },
    topCategories: stats[0].categoryStats,
    recentActivity: stats[0].recentActivity,
    averagePriceEth: stats[0].basicStats[0]?.averagePrice 
      ? (stats[0].basicStats[0].averagePrice / Math.pow(10, 18)).toFixed(4)
      : '0'
  };

  return res.status(200).json(
    new ApiResponse(200, formattedStats, "Enhanced marketplace statistics retrieved successfully")
  );
});

// Enhanced search suggestions with aggregation
const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json(
      new ApiResponse(200, [], "Search suggestions retrieved")
    );
  }

  const suggestions = await ProduceItem.aggregate([
    {
      $match: {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { originFarm: { $regex: q, $options: 'i' } },
          { originalFarmer: { $regex: q, $options: 'i' } }
        ]
      }
    },
    {
      $facet: {
        productNames: [
          { $group: { _id: "$name", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { $project: { suggestion: "$_id", type: { $literal: "product" }, count: 1 } }
        ],
        farmNames: [
          { $group: { _id: "$originFarm", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { $project: { suggestion: "$_id", type: { $literal: "farm" }, count: 1 } }
        ],
        farmerNames: [
          { $group: { _id: "$originalFarmer", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 3 },
          { $project: { suggestion: "$_id", type: { $literal: "farmer" }, count: 1 } }
        ]
      }
    },
    {
      $project: {
        suggestions: {
          $concatArrays: ["$productNames", "$farmNames", "$farmerNames"]
        }
      }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(200, suggestions[0]?.suggestions || [], "Enhanced search suggestions retrieved")
  );
});

// Validate purchase eligibility
const validatePurchaseEligibility = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Check if user is a customer
  if (userRole !== 'customer') {
    throw new ApiError(403, "Only customers can purchase produce. Farmers cannot buy from other farmers.");
  }

  // Get produce details
  const produceItem = await ProduceItem.findOne({ 
    $or: [
      { blockchainId: id },
      { id: parseInt(id) || 0 }
    ]
  });

  if (!produceItem) {
    throw new ApiError(404, "Produce item not found");
  }

  // Check if produce is available
  if (!produceItem.isAvailable || produceItem.currentStatus === 'Sold') {
    throw new ApiError(400, "This produce is no longer available for purchase");
  }

  // Check if farmer is trying to buy their own produce
  if (produceItem.farmerAddress.toString() === userId.toString()) {
    throw new ApiError(403, "You cannot purchase your own produce");
  }

  return res.status(200).json(
    new ApiResponse(200, {
      eligible: true,
      produceItem
    }, "Purchase eligibility confirmed")
  );
});

// Update the existing markProduceAsSold function to include role validation
const markProduceAsSold = asyncHandler(async (produceId, buyerAddress, saleTransactionHash, buyerUserId) => {
  const produceItem = await ProduceItem.findOne({ 
    $or: [
      { blockchainId: produceId },
      { id: parseInt(produceId) || 0 }
    ]
  });

  if (!produceItem) {
    throw new ApiError(404, "Produce item not found");
  }

  // Additional validation: ensure buyer is not the farmer
  if (buyerUserId && produceItem.farmerAddress.toString() === buyerUserId.toString()) {
    throw new ApiError(403, "Farmer cannot purchase their own produce");
  }

  // Update the produce status to sold
  produceItem.currentStatus = 'Sold';
  produceItem.isAvailable = false;
  produceItem.soldAt = new Date();
  produceItem.lastBuyer = buyerAddress;
  produceItem.saleTransactionHash = saleTransactionHash;

  await produceItem.save();
  return produceItem;
});

// Alternative: Remove sold produce entirely (if you want to delete the document)
const removeSoldProduce = asyncHandler(async (produceId) => {
  const produceItem = await ProduceItem.findOneAndDelete({ 
    $or: [
      { blockchainId: produceId },
      { id: parseInt(produceId) || 0 }
    ]
  });

  if (!produceItem) {
    throw new ApiError(404, "Produce item not found");
  }

  return produceItem;
});

export {
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
  markProduceAsSold,
  removeSoldProduce,
  validatePurchaseEligibility
};
