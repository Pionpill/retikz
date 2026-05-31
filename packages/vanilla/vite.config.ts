import path from 'path';
import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

import pkg from './package.json' with { type: 'json' };

/**
 * 把 dependencies 都视为 external，避免把 @retikz/* 打进库产物
 * （同时支持 'foo' 和 'foo/sub' 子路径）。
 */
const runtimeDeps = [...Object.keys(pkg.dependencies)];
const external = (id: string) => runtimeDeps.some(p => id === p || id.startsWith(`${p}/`));

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
      outDir: ['dist/lib', 'dist/es'],
      exclude: ['tests/**'],
    }),
    tsconfigPaths(),
  ],
  build: {
    outDir: 'dist',
    minify: false,
    lib: {
      entry: 'src/index.ts',
      name: 'retikz-vanilla',
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
  // 默认 node 环境（纯 SSR / 无 DOM，天然验证导入安全）；mountSvg 行为测试在文件头用
  // `// @vitest-environment jsdom` 局部切到 DOM。
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
