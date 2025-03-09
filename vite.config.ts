import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/retikz.doc/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
