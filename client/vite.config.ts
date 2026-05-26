import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'https://film-rating-guessr-production.up.railway.app',
      '/socket.io': {
        target: 'https://film-rating-guessr-production.up.railway.app',
        ws: true,
      },
    },
    host: true
  },
})
