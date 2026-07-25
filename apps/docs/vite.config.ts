import type { Plugin } from 'vitest/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

import { writeLlmsTxt } from './scripts/gen-llms-txt';

/** 读取并校验当前工作区的 docs 开发服务端口 */
const resolveDocsPort = (mode: string): number => {
  const rawPort = loadEnv(mode, __dirname, '').RETIKZ_DOCS_PORT || '5173';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`RETIKZ_DOCS_PORT must be an integer between 1 and 65535, received "${rawPort}"`);
  }

  return port;
};

/** 在 dev 启动 / build 开始时写出 llms.txt、manifest 与原始 MDX，让 dev 直接服务、build 自动 copy 到 dist/ */
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
 * - llmsTxtPlugin: 由导航树 + frontmatter 派生 public/llms.txt、manifest 与原始 MDX
 */
export default defineConfig(({ command, mode }) => ({
  base: command === 'build' ? '/retikz/' : '/',
  plugins: [react(), tailwindcss(), ...(mode === 'test' ? [] : [llmsTxtPlugin()])],
  build: {
    rollupOptions: {
      output: {
        // mathjax-full 仅经 @retikz/tex 引擎的动态 import() 触达——单独成块，让它按需懒加载（只在数学公式 demo 挂载时下载），
        // 不被打进每页都加载的主 chunk
        manualChunks: (id: string) => (id.includes('mathjax-full') ? 'mathjax' : undefined),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@retikz/core',
      '@retikz/react',
      '@retikz/vanilla',
      '@retikz/tex',
      '@retikz/plot',
      '@retikz/plot-react',
      '@retikz/plot-vanilla',
      '@retikz/standard-vanilla',
    ],
    // mathjax-full 是 CJS（tex 引擎运行时动态 import 其 SVG 输出栈）——预打包成 ESM，让浏览器侧动态 import 可解析
    include: [
      'mathjax-full/js/mathjax.js',
      'mathjax-full/js/input/tex.js',
      'mathjax-full/js/output/svg.js',
      'mathjax-full/js/adaptors/liteAdaptor.js',
      'mathjax-full/js/handlers/html.js',
    ],
  },
  server: {
    port: resolveDocsPort(mode),
    strictPort: true,
    open: false,
  },
  test: {
    environment: 'node',
    experimental: {
      fsModuleCache: true,
    },
    include: ['tests/**/*.test.{ts,tsx}'],
    pool: 'threads',
  },
}));
