import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundle to avoid dynamic import fetch issues and outdated optimize cache errors
    include: ['jspdf', 'dompurify']
  },
  server: {
    port: 5173,
    strictPort: false
  }
})


