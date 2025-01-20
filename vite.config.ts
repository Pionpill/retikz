import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist',
    minify: false,
    lib: {
      entry: 'src/index.ts',
      name: 'tikz',
      fileName: '[name]',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: [
        {
          format: 'es',
          dir: './dist/es',
          exports: 'named',
          preserveModules: true,
          preserveModulesRoot: 'src',
        },
        {
          format: 'cjs',
          dir: './dist/lib',
          exports: 'named',
          preserveModules: true,
          preserveModulesRoot: 'src',
        },
      ],
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  plugins: [
    react(),
    dts({
      tsconfigPath: './tsconfig.json',
      outDir: ['dist/lib', 'dist/es'],
    }),
  ],
});
