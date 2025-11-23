import { TransactionHistory } from "../models/transactionHistory.models.js"
import { ProduceItem } from "../models/produceItem.models.js"
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'

// Helper function to mark produce as sold
const markProduceAsSold = async (produceId, buyerAddress, saleTransactionHash) => {
  const produceItem = await ProduceItem.findOne({ 
    $or: [
      { blockchainId: produceId },
      { id: parseInt(produceId) || 0 }
    ]
  });

  if (!produceItem) {
    throw new Error("Produce item not found");
  }

  // Update the produce status to sold
  produceItem.currentStatus = 'Sold';
  produceItem.isAvailable = false;
  produceItem.soldAt = new Date();
  produceItem.lastBuyer = buyerAddress;
  produceItem.saleTransactionHash = saleTransactionHash;

  await produceItem.save();
  return produceItem;
};

// Record a new transaction
const recordTransaction = asyncHandler(async (req, res) => {
  const {
    produceId,
    blockchainTransactionHash,
    transactionType,
    buyerAddress,
    sellerAddress,
    amountInWei,
    gasFeeInWei,
    productName,
    productStatus,
    blockNumber,
    networkId
  } = req.body;

  console.log('Recording transaction:', { produceId, blockchainTransactionHash, transactionType });

  const userId = req.user._id;

  // Validation
  if (!produceId || !blockchainTransactionHash || !transactionType) {
    throw new ApiError(400, "Required transaction details missing");
  }

  // Check if transaction already exists
  const existingTransaction = await TransactionHistory.findOne({
    blockchainTransactionHash
  });

  if (existingTransaction) {
    console.log('Transaction already recorded:', blockchainTransactionHash);
    return res.status(200).json(
      new ApiResponse(200, existingTransaction, "Transaction already recorded")
    );
  }

  // Verify produce exists (optional - don't fail if not found)
  let produceItem = null;
  try {
    produceItem = await ProduceItem.findOne({
      $or: [
        { blockchainId: produceId },
        { id: parseInt(produceId) || 0 }
      ]
    });
    
    if (!produceItem) {
      console.warn(`Produce item ${produceId} not found in database`);
    }
  } catch (error) {
    console.error('Error finding produce item:', error);
  }

  // Create transaction record
  const transaction = await TransactionHistory.create({
    produceId: parseInt(produceId),
    blockchainTransactionHash,
    transactionType,
    userId,
    buyerAddress,
    sellerAddress,
    amountInWei: amountInWei || '0',
    gasFeeInWei: gasFeeInWei || '0',
    productName: productName || (produceItem?.name) || 'Unknown Product',
    productStatus: productStatus || (produceItem?.currentStatus) || 'Unknown',
    blockNumber: blockNumber || 0,
    networkId: networkId || 11155111,
    status: 'confirmed'
  });

  console.log('Transaction recorded successfully:', transaction._id);

  // Handle sold produce - mark as sold when it's a sale transaction
  if (transactionType === 'sale' && buyerAddress && produceItem) {
    try {
      await markProduceAsSold(produceId, buyerAddress, blockchainTransactionHash);
      console.log(`Produce ${produceId} marked as sold to ${buyerAddress}`);
    } catch (error) {
      console.error('Error updating produce status:', error);
      // Don't fail the transaction recording if produce update fails
    }
  }

  return res.status(201).json(
    new ApiResponse(201, transaction, "Transaction recorded successfully")
  );
});

// Enhanced get user transaction history with complex aggregation and pagination
const getUserTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    status = 'all'
  } = req.query;

  const userId = req.user._id;

  // Build aggregation pipeline
  const pipeline = [];

  // Match stage - build complex query
  const matchConditions = { userId };

  // Transaction type filtering
  if (type !== 'all') {
    matchConditions.transactionType = type;
  }

  // Status filtering
  if (status !== 'all') {
    matchConditions.status = status;
  }

  // Date range filtering
  if (dateFrom || dateTo) {
    matchConditions.createdAt = {};
    if (dateFrom) matchConditions.createdAt.$gte = new Date(dateFrom);
    if (dateTo) matchConditions.createdAt.$lte = new Date(dateTo);
  }

  // Amount range filtering (for sale and registration transactions)
  if (minAmount || maxAmount) {
    const amountConditions = {};
    if (minAmount) amountConditions.$gte = parseFloat(minAmount) * Math.pow(10, 18);
    if (maxAmount) amountConditions.$lte = parseFloat(maxAmount) * Math.pow(10, 18);
    
    matchConditions.$expr = {
      $and: [
        { $ne: ["$amountInWei", null] },
        { $gte: [{ $toDouble: "$amountInWei" }, amountConditions.$gte || 0] },
        { $lte: [{ $toDouble: "$amountInWei" }, amountConditions.$lte || Number.MAX_SAFE_INTEGER] }
      ]
    };
  }

  pipeline.push({ $match: matchConditions });

  // Add user details lookup
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'userDetails',
      pipeline: [{ $project: { username: 1, fullName: 1, role: 1 } }]
    }
  });

  // Add produce details lookup
  pipeline.push({
    $lookup: {
      from: 'produceitems',
      localField: 'produceId',
      foreignField: 'blockchainId',
      as: 'produceDetails',
      pipeline: [{ $project: { name: 1, originFarm: 1, produceImage: 1 } }]
    }
  });

  // Add calculated fields
  pipeline.push({
    $addFields: {
      amountInEth: { 
        $cond: [
          { $ne: ["$amountInWei", null] },
          { $divide: [{ $toDouble: "$amountInWei" }, Math.pow(10, 18)] },
          null
        ]
      },
      gasFeeInEth: { 
        $cond: [
          { $ne: ["$gasFeeInWei", null] },
          { $divide: [{ $toDouble: "$gasFeeInWei" }, Math.pow(10, 18)] },
          null
        ]
      },
      user: { $arrayElemAt: ["$userDetails", 0] },
      produce: { $arrayElemAt: ["$produceDetails", 0] },
      daysSinceTransaction: {
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
  if (sortBy === 'amount') {
    sortStage.amountInEth = sortOrder === 'desc' ? -1 : 1;
  } else {
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
  }
  pipeline.push({ $sort: sortStage });

  // Project final fields
  pipeline.push({
    $project: {
      userDetails: 0,
      produceDetails: 0,
      __v: 0
    }
  });

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    customLabels: {
      docs: 'transactions',
      totalDocs: 'totalTransactions',
      limit: 'transactionsPerPage',
      page: 'currentPage',
      totalPages: 'totalPages',
      pagingCounter: 'serialNumberStartFrom',
      hasPrevPage: 'hasPrev',
      hasNextPage: 'hasNext',
      prevPage: 'prev',
      nextPage: 'next'
    }
  };

  const result = await TransactionHistory.aggregatePaginate(
    TransactionHistory.aggregate(pipeline),
    options
  );

  return res.status(200).json(
    new ApiResponse(200, result, "Enhanced user transactions retrieved successfully")
  );
});

// Enhanced transaction statistics with detailed aggregation
const getUserTransactionStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = await TransactionHistory.aggregate([
    { $match: { userId } },
    {
      $facet: {
        // Basic stats by type
        byType: [
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
              },
              avgAmount: {
                $avg: {
                  $cond: [
                    { $in: ['$transactionType', ['sale', 'registration']] },
                    { $toDouble: '$amountInWei' },
                    null
                  ]
                }
              }
            }
          }
        ],
        // Monthly activity
        monthlyActivity: [
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              count: { $sum: 1 },
              totalAmount: {
                $sum: {
                  $cond: [
                    { $ne: ['$amountInWei', null] },
                    { $toDouble: '$amountInWei' },
                    0
                  ]
                }
              }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 12 }
        ],
        // Overall stats
        overall: [
          {
            $group: {
              _id: null,
              totalTransactions: { $sum: 1 },
              totalAmountWei: {
                $sum: {
                  $cond: [
                    { $ne: ['$amountInWei', null] },
                    { $toDouble: '$amountInWei' },
                    0
                  ]
                }
              },
              avgGasFee: {
                $avg: {
                  $cond: [
                    { $ne: ['$gasFeeInWei', null] },
                    { $toDouble: '$gasFeeInWei' },
                    null
                  ]
                }
              },
              recentTransactions: { 
                $sum: { 
                  $cond: [
                    { $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]
      }
    }
  ]);

  const result = stats[0];
  const formattedStats = {
    overall: {
      ...result.overall[0],
      totalAmountEth: result.overall[0]?.totalAmountWei 
        ? (result.overall[0].totalAmountWei / Math.pow(10, 18)).toFixed(6)
        : '0',
      avgGasFeeEth: result.overall[0]?.avgGasFee 
        ? (result.overall[0].avgGasFee / Math.pow(10, 18)).toFixed(6)
        : '0'
    },
    byType: result.byType.map(type => ({
      ...type,
      totalAmountEth: (type.totalAmount / Math.pow(10, 18)).toFixed(6),
      avgAmountEth: type.avgAmount ? (type.avgAmount / Math.pow(10, 18)).toFixed(6) : '0'
    })),
    monthlyActivity: result.monthlyActivity.map(month => ({
      ...month,
      totalAmountEth: (month.totalAmount / Math.pow(10, 18)).toFixed(6)
    }))
  };

  return res.status(200).json(
    new ApiResponse(200, formattedStats, "Enhanced transaction statistics retrieved successfully")
  );
});

// Get transaction by hash
const getTransactionByHash = asyncHandler(async (req, res) => {
  const { hash } = req.params;

  const transaction = await TransactionHistory.findOne({
    blockchainTransactionHash: hash
  }).populate('userId', 'username fullName');

  if (!transaction) {
    throw new ApiError(404, "Transaction not found");
  }

  return res.status(200).json(
    new ApiResponse(200, transaction, "Transaction retrieved successfully")
  );
});

// Update transaction status
const updateTransactionStatus = asyncHandler(async (req, res) => {
  const { hash } = req.params;
  const { status, blockNumber } = req.body;

  if (!['pending', 'confirmed', 'failed'].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const transaction = await TransactionHistory.findOneAndUpdate(
    { blockchainTransactionHash: hash },
    { 
      status,
      ...(blockNumber && { blockNumber })
    },
    { new: true }
  );

  if (!transaction) {
    throw new ApiError(404, "Transaction not found");
  }

  return res.status(200).json(
    new ApiResponse(200, transaction, "Transaction status updated successfully")
  );
});

// Get product transaction history
const getProductTransactions = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const transactions = await TransactionHistory.find({
    produceId: parseInt(productId)
  })
  .populate('userId', 'username fullName')
  .sort({ createdAt: 1 })
  .select('-__v');

  return res.status(200).json(
    new ApiResponse(200, transactions, "Product transaction history retrieved successfully")
  );
});

export {
  recordTransaction,
  getUserTransactions,
  getUserTransactionStats,
  getTransactionByHash,
  updateTransactionStatus,
  getProductTransactions
};
