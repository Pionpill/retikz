import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 调试 / playground 环境。
 * optimizeDeps.exclude 把 workspace 包从预打包里排除，
 * 这样改 packages/react 或 packages/core 的源码 Vite 会立刻 HMR。
 */
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@retikz/core', '@retikz/react'],
  },
  server: {
    port: 5174,
    open: true,
  },
});
