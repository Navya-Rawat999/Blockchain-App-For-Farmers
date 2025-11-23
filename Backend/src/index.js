import connectDB from './database/index.js'
import app from './app.js'
import dotenv from 'dotenv'
dotenv.config({
  path : "./.env"
})


connectDB()
.then((res) => {
  app.on('error', (error) => {
    console.log("Express app error:", error);
  });
  
  app.listen(process.env.PORT, () => {
    console.log(`Server is running at port: ${process.env.PORT}`)
  })
})
.catch((err) => {
  console.log("Mongo db connection failed !!!", err)
  process.exit(1);
})