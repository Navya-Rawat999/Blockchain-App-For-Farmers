import mongoose, { Schema } from 'mongoose'

const transactionHistory_Schema = new Schema({
  // Basic transaction info
  produceId: {
    type: Number,
    required: true,
    index: true
  },
  blockchainTransactionHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  transactionType: {
    type: String,
    enum: ['registration', 'sale', 'price_update', 'status_update'],
    required: true,
    index: true
  },
  
  // User who initiated the transaction
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Transaction participants (wallet addresses)
  buyerAddress: {
    type: String,
    index: true
  },
  sellerAddress: {
    type: String,
    index: true
  },
  
  // Financial details (amounts in Wei as strings)
  amountInWei: {
    type: String,
    required: function() {
      return this.transactionType === 'sale' || this.transactionType === 'registration';
    }
  },
  gasFeeInWei: {
    type: String
  },
  
  // Product details at time of transaction
  productName: {
    type: String,
    required: true
  },
  productStatus: {
    type: String,
    required: true
  },
  
  // Blockchain details
  blockNumber: {
    type: Number
  },
  networkId: {
    type: Number,
    default: 1
  },
  
  // Transaction status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'confirmed',
    index: true
  }
}, {timestamps: true})

// Indexes for better query performance
transactionHistory_Schema.index({ userId: 1, createdAt: -1 });
transactionHistory_Schema.index({ transactionType: 1, status: 1 });
transactionHistory_Schema.index({ produceId: 1, transactionType: 1 });
transactionHistory_Schema.index({ buyerAddress: 1 });
transactionHistory_Schema.index({ sellerAddress: 1 });

export const TransactionHistory = mongoose.model("TransactionHistory", transactionHistory_Schema)