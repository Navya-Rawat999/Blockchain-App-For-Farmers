import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        farmer: './HTML/farmer.html',
        customer: './HTML/customer.html',
        marketplace: './HTML/marketplace.html',
        scan: './HTML/scan.html',
        index: './HTML/index.html',
        profile: './HTML/profile.html',
        wallet: './HTML/wallet.html',
        product: './HTML/product.html',
        transaction: './HTML/transaction.html'
      }
    }
  },
  server: {
    open: '/HTML/index.html',
    port: 3000,
    host: true
  },
  define: {
    global: 'globalThis',
  },
});