import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'RETIKZ_');
  const port = Number(env.RETIKZ_BENCH_PORT ?? 5175);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('RETIKZ_BENCH_PORT must be an integer between 1 and 65535');
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/lab'),
      },
    },
    server: {
      host: '127.0.0.1',
      open: false,
      port,
      strictPort: true,
    },
  };
});
