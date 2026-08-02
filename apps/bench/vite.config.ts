import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

import { resolveBenchPort } from '../dev-port';
import { createBenchReportPlugin } from './report-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');

  return {
    plugins: [react(), tailwindcss(), createBenchReportPlugin(path.resolve(__dirname, 'results'))],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/playground'),
      },
    },
    server: {
      host: '127.0.0.1',
      open: false,
      port: resolveBenchPort(
        process.env.RETIKZ_BENCH_PORT ?? env.RETIKZ_BENCH_PORT,
        process.env.RETIKZ_DEV_SLOT ?? env.RETIKZ_DEV_SLOT,
      ),
      strictPort: true,
    },
  };
});
