import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@physics': resolve(__dirname, 'src/physics'),
      '@terrain': resolve(__dirname, 'src/terrain'),
      '@player': resolve(__dirname, 'src/player'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@systems': resolve(__dirname, 'src/systems'),
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
  },
  server: {
    open: true,
    port: 3003,
    allowedHosts: ['.tunnelmole.net'],
  }
})
