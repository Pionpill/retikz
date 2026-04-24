import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import pkg from './package.json' with { type: 'json' };

const externalIds = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

const isExternal = (id: string) =>
  externalIds.some(dep => id === dep || id.startsWith(`${dep}/`));

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist',
    minify: false,
    lib: {
      entry: 'src/index.ts',
      fileName: '[name]',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: isExternal,
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
  plugins: [
    react(),
    dts({
      tsconfigPath: './tsconfig.json',
      outDir: ['dist/lib', 'dist/es'],
      entryRoot: 'src',
    }),
  ],
});
