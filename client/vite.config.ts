import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['sonner'],
          'vendor-icons': ['lucide-react'],
          'vendor-state': ['zustand'],
          'vendor-http': ['axios'],
          'vendor-recharts': ['recharts'],
          'vendor-gsap': ['gsap', 'gsap/ScrollTrigger'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
