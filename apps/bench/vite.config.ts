import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

import { resolveBenchPort } from './bench-port';
import { createBenchReportPlugin } from './report-plugin';

export default defineConfig(({ mode }) => {
  const rawPort = process.env.RETIKZ_BENCH_PORT ?? loadEnv(mode, __dirname, '').RETIKZ_BENCH_PORT;

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
      port: resolveBenchPort(rawPort),
      strictPort: true,
    },
  };
});
