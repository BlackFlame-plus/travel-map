import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  build: {
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 10000,
  },
  server: {
    host: '127.0.0.1',
    port: 43146,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 43147,
    strictPort: true,
  },
})
