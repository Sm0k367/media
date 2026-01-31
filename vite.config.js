import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',  // Explicit base for Vercel
  build: {
    cssCodeSplit: false,  // Single CSS file to prevent load flashes
    sourcemap: false,
    target: ['es2020', 'safari14'],  // Compatibility for mobile browsers
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
