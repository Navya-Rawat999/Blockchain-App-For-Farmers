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
    return res.status(200).json(
      new ApiResponse(200, existingTransaction, "Transaction already recorded")
    );
  }

  // Verify produce exists
  const produceItem = await ProduceItem.findOne({
    $or: [
      { blockchainId: produceId },
      { id: parseInt(produceId) || 0 }
    ]
  });

  if (!produceItem) {
    throw new ApiError(404, "Produce item not found");
  }

  // Create transaction record
  const transaction = await TransactionHistory.create({
    produceId: parseInt(produceId),
    blockchainTransactionHash,
    transactionType,
    userId,
    buyerAddress,
    sellerAddress,
    amountInWei,
    gasFeeInWei,
    productName: productName || produceItem.name,
    productStatus: productStatus || produceItem.currentStatus,
    blockNumber,
    networkId: networkId || 1,
    status: 'confirmed'
  });

  // Handle sold produce - mark as sold when it's a sale transaction
  if (transactionType === 'sale' && buyerAddress) {
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

// Get user transaction history
const getUserTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const userId = req.user._id;

  // Build query for transactions initiated by this user
  const query = { userId };

  if (type !== 'all') {
    query.transactionType = type;
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const skip = (page - 1) * limit;

  const [transactions, totalCount] = await Promise.all([
    TransactionHistory.find(query)
      .populate('userId', 'username fullName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v'),
    TransactionHistory.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return res.status(200).json(
    new ApiResponse(200, {
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, "User transactions retrieved successfully")
  );
});

// Get transaction statistics for user
const getUserTransactionStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = await TransactionHistory.aggregate([
    { $match: { userId: userId } },
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
  ]);

  // Calculate additional stats
  const totalTransactions = await TransactionHistory.countDocuments({ userId });
  const recentTransactions = await TransactionHistory.countDocuments({
    userId,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });

  const formattedStats = {
    totalTransactions,
    recentTransactions,
    byType: stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount.toString()
      };
      return acc;
    }, {})
  };

  return res.status(200).json(
    new ApiResponse(200, formattedStats, "Transaction statistics retrieved successfully")
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
