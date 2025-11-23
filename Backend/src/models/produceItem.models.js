import mongoose, { Schema } from 'mongoose'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

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
  quantity: {
    type: String,
    required: true,
    trim: true
  },
  qrCode: {
    type: String,
    required: true,
    trim: true
  },
  qrCodeImage: {
    type: String, // Cloudinary URL for QR code image
    required: false
  },
  qrCodePublicId: {
    type: String, // Cloudinary public ID for QR code image
    required: false
  },
  produceImage: {
    type: String, // Cloudinary URL for produce image
    required: false // Changed from true to false
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

produceItem_Schema.plugin(mongooseAggregatePaginate);

export const ProduceItem = mongoose.model("ProduceItem", produceItem_Schema)