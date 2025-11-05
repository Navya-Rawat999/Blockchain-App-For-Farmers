import mongoose, { Schema } from 'mongoose'

const walletSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum wallet address format'
    }
  },
  networkId: {
    type: Number,
    required: true
  },
  networkName: {
    type: String,
    required: true
  },
  balance: {
    type: String,
    default: '0'
  },
  isConnected: {
    type: Boolean,
    default: true
  },
  lastConnected: {
    type: Date,
    default: Date.now
  },
  connectionCount: {
    type: Number,
    default: 1
  }
}, { timestamps: true })

// Create indexes for better performance
walletSchema.index({ userId: 1 });
walletSchema.index({ walletAddress: 1 });
walletSchema.index({ isConnected: 1 });

export const Wallet = mongoose.model("Wallet", walletSchema)
