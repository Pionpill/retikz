import path from 'path';
import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';

import pkg from './package.json' with { type: 'json' };

/**
 * 把 dependencies / peerDependencies 都视为 external，避免把第三方运行时
 * 打包进库产物（mathjax-full 是 optional peer，只在运行时动态 import）。
 */
const runtimeDeps = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)];
const external = (id: string) =>
  runtimeDeps.some(p => id === p || id.startsWith(`${p}/`));

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
      outDir: ['dist/lib', 'dist/es'],
      exclude: ['tests/**'],
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: 'dist',
    minify: false,
    lib: {
      // 两个入口：主引擎（无 React）+ ./react 子入口（useLowerMath，React optional peer）
      entry: ['src/index.ts', 'src/react/index.ts'],
      name: 'retikz-tex',
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
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
