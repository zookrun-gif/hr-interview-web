import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['zook.run', 'zookk.run', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'https://zook.kaixinzou.cn',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:8080',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
