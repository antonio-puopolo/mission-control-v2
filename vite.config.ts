import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        // Proxy to backend service (running on localhost:3001)
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
