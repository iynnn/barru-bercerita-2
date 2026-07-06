import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path relatif agar asset dapat dimuat dengan benar di subfolder MAMP
  base: './',
  server: {
    port: 5173,
    proxy: {
      // Mengarahkan request /api ke MAMP Apache PHP backend
      '/api': {
        target: 'http://localhost:8888/barru_bercerita/barru-bercerita-2',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
