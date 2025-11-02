import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { join } from 'path';
import connectDB from './database/index.js';
import app from './app.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
  path: join(__dirname, '../.env')
});


connectDB()
.then((res) => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is running at port: ${process.env.PORT}`)
  })
})
.catch((err) => {
  console.log("Mongo db connection failed !!!", err)
}) 