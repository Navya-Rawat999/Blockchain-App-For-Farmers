import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
dotenv.config()


const app = express()

// configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 200
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static('public'))
app.use(cookieParser())


// routes import
import userRouter from './routes/user.routes.js'
import produceRouter from './routes/produce.routes.js'



// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/produce", produceRouter)


export default app