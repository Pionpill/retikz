import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { writeLlmsTxt } from './scripts/gen-llms-txt';

/** 在 dev 启动 / build 开始时把 llms.txt 写到 public/，让 dev 直接服务、build 自动 copy 到 dist/ */
const llmsTxtPlugin = (): Plugin => ({
  name: 'gen-llms-txt',
  buildStart() {
    writeLlmsTxt(__dirname);
  },
});

/**
 * apps/docs 文档站 / 调试入口（v0.1 重做版）。
 * - tailwindcss(): Tailwind 4 的原生 vite 插件（CSS-only 配置）
 * - optimizeDeps.exclude: 让 workspace 包走 HMR——改 packages/react / core 源码立即热更
 * - resolve.alias: shadcn 标配 @/* 别名
 * - base: 仅 build 模式注入 `/retikz/` 前缀，匹配 GH Pages 项目页 URL；dev 仍走 `/`
 * - llmsTxtPlugin: 由 src/data + frontmatter 派生 public/llms.txt（"通过 MCP 连接" 那条菜单的目标）
 */
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/retikz/' : '/',
  plugins: [react(), tailwindcss(), llmsTxtPlugin()],
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
}));
