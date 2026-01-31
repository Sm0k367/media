import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',  // Explicit base for consistent deployment on Vercel
  css: {
    preprocessorOptions: {
      css: {
        charset: false  // Avoid charset issues on some devices
      }
    }
  },
  build: {
    cssCodeSplit: false,  // Single CSS file for faster load/no flash
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    target: 'es2020'  // Modern target for better device compatibility
  },
  server: {
    host: true,  // Allow access on network for mobile testing
    port: 3000
  },
  resolve: {
    alias: {
      '@': '/src'  // Easy imports, not layout-related but good practice
    }
  }
})
