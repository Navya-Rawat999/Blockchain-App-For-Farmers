import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({
  path : "./.env"
})

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT;

// Serve static files from various directories
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/HTML', express.static(path.join(__dirname, 'HTML')));

// Serve HTML files from root for easier navigation
app.use(express.static(path.join(__dirname, 'HTML')));

// Route for root - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'HTML', 'index.html'));
});

// Handle all other routes - serve from HTML directory
app.get('/:page', (req, res) => {
  const page = req.params.page;
  if (page.endsWith('.html')) {
    res.sendFile(path.join(__dirname, 'HTML', page));
  } else {
    res.sendFile(path.join(__dirname, 'HTML', `${page}.html`));
  }
});

// Handle product page with query parameters
app.get('/product/:id?', (req, res) => {
  res.sendFile(path.join(__dirname, 'HTML', 'product.html'));
});

app.listen(PORT, () => {
  console.log(`🌾 Frontend server running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
});
