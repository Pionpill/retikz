import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import type { Plugin } from 'vitest/config';
import { defineConfig } from 'vitest/config';

import { createRetikzDevPlugin } from '../../config/vite/dev-plugin';
import { resolveDocsPort } from '../dev-port';
import { writeLlmsTxt } from './scripts/gen-llms-txt';

const repoRoot = path.resolve(__dirname, '../..');

/** 开发时按仓库相对路径提供源码文本，限制在包与应用的 src 目录 */
const localSourcePlugin = (): Plugin => ({
  name: 'docs-local-source',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__docs-source', (request, response) => {
      const serveSource = async (): Promise<void> => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        if (request.method !== 'GET') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }

        const sourcePath = new URL(request.url ?? '/', 'http://localhost').searchParams.get('path') ?? '';
        const isSourcePath = (value: string): boolean =>
          /^(?:packages\/[^/]+\/[^/]+|apps\/[^/]+)\/src\/.+\.(?:ts|tsx|js|jsx|mjs|css|json|mdx?)$/.test(value) &&
          value.split('/').every(part => !part.startsWith('.') && part !== 'node_modules') &&
          !value.includes('\\');

        if (!isSourcePath(sourcePath)) {
          response.statusCode = 403;
          response.end('Source path not allowed');
          return;
        }

        try {
          const root = await realpath(repoRoot);
          const file = await realpath(path.resolve(root, sourcePath));
          if (!isSourcePath(path.relative(root, file).split(path.sep).join('/'))) {
            response.statusCode = 403;
            response.end('Source path not allowed');
            return;
          }
          response.end(await readFile(file, 'utf8'));
        } catch {
          response.statusCode = 404;
          response.end('Source file unavailable');
        }
      };
      void serveSource();
    });
  },
});

/** 读取当前工作区的 Docs 开发服务端口 */
const readDocsPort = (mode: string): number => {
  const env = loadEnv(mode, repoRoot, '');

  return resolveDocsPort(
    process.env.RETIKZ_DOCS_PORT ?? env.RETIKZ_DOCS_PORT,
    process.env.RETIKZ_DEV_SLOT ?? env.RETIKZ_DEV_SLOT,
  );
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
  plugins: [
    createRetikzDevPlugin(),
    localSourcePlugin(),
    react(),
    tailwindcss(),
    ...(mode === 'test' ? [] : [llmsTxtPlugin()]),
  ],
  build: {
    rollupOptions: {
      output: {
        // mathjax-full 仅经 @retikz/tex 与含公式页面的 MDX 动态 import() 触达——单独成块，让它按需懒加载，
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
      '@retikz/reconciler',
      '@retikz/react',
      '@retikz/vanilla',
      '@retikz/tex',
      '@retikz/plot',
      '@retikz/plot-react',
      '@retikz/plot-vanilla',
      '@retikz/standard',
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
    port: readDocsPort(mode),
    strictPort: true,
    open: false,
  },
  test: {
    environment: 'node',
    // API 文档生成与 MathJax 编译较重，限制并发以避免冷启动资源争用导致超时
    maxWorkers: 4,
    fsModuleCache: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    pool: 'threads',
  },
}));
