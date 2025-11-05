import mongoose, { Schema } from 'mongoose'

const produceItem_Schema = new Schema({
  id: {
    type: Number,
    required: true,
    unique: true // Blockchain ID
  },
  blockchainId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  originalFarmer: {
    type: String,
    required: true,
    index: true
  },
  farmerAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  currentSeller: {
    type: String,
    required: true,
  },
  registrationTimeStamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  priceInWei: {
    type: String, // Store as string to handle large numbers
    required: true,
  },
  originFarm: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  qrCode: {
    type: String,
    required: true,
    trim: true
  },
  currentStatus: {
    type: String,
    enum: ['Harvested', 'In Transit', 'Ready for Sale', 'Sold'],
    default: 'Harvested',
    index: true
  },
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  },
  transactionHash: {
    type: String,
    required: true // Blockchain registration transaction
  },
  saleTransactionHash: {
    type: String // Blockchain sale transaction
  },
  lastBuyer: {
    type: String // Buyer's wallet address
  },
  soldAt: {
    type: Date
  },
  priceUpdatedAt: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  }
}, {timestamps: true})

// Create indexes for better query performance
produceItem_Schema.index({ name: 'text', originFarm: 'text', originalFarmer: 'text' });
produceItem_Schema.index({ isAvailable: 1, currentStatus: 1 });
produceItem_Schema.index({ farmerAddress: 1, createdAt: -1 });

export const ProduceItem = mongoose.model("ProduceItem", produceItem_Schema)