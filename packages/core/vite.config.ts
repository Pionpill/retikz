import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

import pkg from './package.json' with { type: 'json' };

/**
 * 把 dependencies / peerDependencies 都视为 external，避免把第三方运行时
 * 打包进库产物（同时支持 'foo' 和 'foo/sub' 子路径）。
 */
const runtimeDeps = [
  ...Object.keys(pkg.dependencies ?? {}),
];
const external = (id: string) =>
  runtimeDeps.some(p => id === p || id.startsWith(`${p}/`));

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
      outDir: ['dist/lib', 'dist/es'],
    }),
    tsconfigPaths(),
  ],
  build: {
    outDir: 'dist',
    minify: false,
    lib: {
      entry: 'src/index.ts',
      name: 'retikz-core',
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
