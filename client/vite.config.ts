import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://film-rating-guessr-production.up.railway.app:3000',
      '/socket.io': {
        target: 'http://film-rating-guessr-production.up.railway.app:3000',
        ws: true,
      },
    },
    host: true
  },
})
