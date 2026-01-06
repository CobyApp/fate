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
    alias: {
      'aws-amplify/auth': '@aws-amplify/auth'
    }
  },
  optimizeDeps: {
    include: ['aws-amplify', '@aws-amplify/auth', '@aws-amplify/core'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  }
})
