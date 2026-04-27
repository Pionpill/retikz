import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

import pkg from './package.json' with { type: 'json' };

const runtimeDeps = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
];
const external = (id: string) =>
  runtimeDeps.some(p => id === p || id.startsWith(`${p}/`));

export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
      outDir: ['dist/lib', 'dist/es'],
    }),
    tsconfigPaths(),
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    outDir: 'dist',
    minify: false,
    lib: {
      entry: 'src/index.ts',
      fileName: '[name]',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external,
      output: [
        {
          format: 'es',
          dir: 'dist/es',
          exports: 'named',
          preserveModules: true,
          preserveModulesRoot: 'src',
        },
        {
          format: 'cjs',
          dir: 'dist/lib',
          exports: 'named',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].cjs',
        },
      ],
    },
  },
});
