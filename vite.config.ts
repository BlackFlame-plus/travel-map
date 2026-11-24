/**
 * Vite 构建配置。
 *
 * - @vitejs/plugin-vue：编译 .vue 单文件组件
 * - vite-plugin-singlefile：把 JS/CSS/图片内联进一个 dist/index.html
 *   （方便下载单文件离线打开；线上 Vercel 部署也用这份产物）
 *
 * 开发：npm run dev  → http://127.0.0.1:43146
 * 预览：npm run preview → http://127.0.0.1:43147
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  build: {
    // 单文件模式：尽量内联资源，避免再请求额外 chunk
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
