import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // 👈 hier definierst du das Alias "@"
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5001', // falls du den Proxy nutzt
    },
  },
});

