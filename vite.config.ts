import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true
      },
      '/static': {
        target: 'http://localhost:9000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../frontend/dist',
    emptyOutDir: true
  }
})