import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'
import dotenv from 'dotenv'
dotenv.config()

const connectDB = async () => {
  try{
    const connectionInstance =  await mongoose.connect(`${process.env.MONGO_DB_URI}/${DB_NAME}`)
    console.log(`\n Mongo DB connected. DB host: ${connectionInstance.connection.host}`)
  } catch (error) {
    console.error("MONGODB connection FAILED: ", error);
    process.exit(1);
  }
}

export default connectDB;