import path from 'path';
import { defineConfig } from 'vite';
import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), mdx()],
  base: '/retikz.doc/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
