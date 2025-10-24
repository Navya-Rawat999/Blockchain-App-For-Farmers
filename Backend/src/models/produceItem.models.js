import mongoose, { Schema } from 'mongoose'

const produceItem_Schema = new Schema({
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true
  },
  originalFarmer: {
    type: String,
    required:true,
  },
  currentSeller: {
    type: String,
    required: true,
  },
  registrationTimeStamp: {
    type: Date,
    required: true,
  },
  priceInRupees: {
    type: Number,
    required: true,
  },
  originFarm: {
    type: String,
    required: true
  }

}, {timestamps: true})


export const ProduceItem = mongoose.model("ProduceItem", produceItem_Schema)