import mongoose, {Schema} from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  profilePic: {
    type: String, // cloudinary url
    required: true
  },
  password: {
    type: String,
    required: [true, "password is required"]
  },
  role: {
    type: String,
    enum: ['farmer', 'consumer'],
    required: [true, "type is required"]
 },
  refreshToken: {
    type: String
  }
}, {timestamps: true})


userSchema.pre("save", async function(next){ 
  if(!this.isModified("password")) return next()

  this.password = await bcrypt.hash(this.password, 10)
  next() 
} ) 


userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    {
      _id: this._id, 
      email: this.email,
      username: this.username,
      fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}
userSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {
      _id: this._id, 
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}

export const User = mongoose.model("User", userSchema)

export const Farmer = User.discriminator(
  'farmer',
  new Schema({
    KisanID: {
      type: String, // cloudinary url
      required: true
    }
  })
)

export const Consumer = User.discriminator(
  'customer',
  new Schema({
    License: {
      type: String, // cloudinary url
      required: true
    }
  })
)