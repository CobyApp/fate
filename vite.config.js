import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist'
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {}
  },
  optimizeDeps: {
    include: ['aws-amplify'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  }
})
