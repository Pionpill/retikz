import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * apps/docs 文档站 / 调试入口（v0.1 重做版）。
 * - tailwindcss(): Tailwind 4 的原生 vite 插件（CSS-only 配置）
 * - optimizeDeps.exclude: 让 workspace 包走 HMR——改 packages/react / core 源码立即热更
 * - resolve.alias: shadcn 标配 @/* 别名
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@retikz/core', '@retikz/react'],
  },
  server: {
    port: 5173,
    open: true,
  },
});
