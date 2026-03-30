import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        hamm: resolve(__dirname, 'hamm.html'),
      },
      output: {
        manualChunks: (id) => {
          // Split vendor chunks for better caching
          if (id.includes('node_modules')) {
            if (id.includes('@11labs') || id.includes('elevenlabs')) {
              return 'elevenlabs'
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three'
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react'
            }
            if (id.includes('@supabase')) {
              return 'supabase'
            }
            if (id.includes('pixi')) {
              return 'pixi'
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 600, // Increase warning limit slightly
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
