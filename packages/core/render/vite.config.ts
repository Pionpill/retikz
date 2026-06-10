import path from 'path';
import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';

import pkg from './package.json' with { type: 'json' };

/**
 * dependencies 全视为 external，避免把 @retikz/core / csstype 打进库产物
 * （同时支持 'foo' 和 'foo/sub' 子路径）。
 */
const runtimeDeps = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)];
const external = (id: string) => runtimeDeps.some(p => id === p || id.startsWith(`${p}/`));

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
      // 每个子路径一个入口（@retikz/render/svg、@retikz/render/canvas、@retikz/render/hydration、@retikz/render/animation）
      entry: ['src/svg/index.ts', 'src/canvas/index.ts', 'src/canvas-node/index.ts', 'src/hydration/index.ts', 'src/animation/index.ts'],
      name: 'retikz-render',
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
