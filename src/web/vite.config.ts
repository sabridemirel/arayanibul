import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // CloudFront root'ta host ediliyor
  build: {
    outDir: 'dist',
    sourcemap: false, // Production için sourcemap kapalı
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks için optimizasyon
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
})
