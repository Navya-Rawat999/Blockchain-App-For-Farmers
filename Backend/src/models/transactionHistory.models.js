import mongoose, { Schema } from 'mongoose'

const transactionHistory_Schema = new Schema({
  Produce_Id: {
    type: Number,
    required: true,
  },
  buyer: {
    type: String,
    required: true,
  },
  seller: {
    type: String,
    required: true,
  },
  pricePaid: {
    type: Number,
    required: true
  },
}, {timestamps: true})



export const TransactionHistory = new mongoose.model("TransactionHistory", transactionHistory_Schema)