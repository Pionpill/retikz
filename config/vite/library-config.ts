import type { LibraryOptions, PluginOption, UserConfig } from 'vite';

import path from 'node:path';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vitest/config';

/** 可发布包中用于 external 判定的 manifest 字段。 */
export type PublishablePackageManifest = {
  name: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

/** retikz library preset 的包级差异输入。 */
export type RetikzLibraryConfigOptions = {
  /** package.json 所在目录。 */
  packageRoot: string;
  /** 用于派生 runtime externals 的 package manifest。 */
  manifest: PublishablePackageManifest;
  /** Vite library 的公开源码入口。 */
  entry: LibraryOptions['entry'];
  /** React 等仅部分包需要的额外插件。 */
  plugins?: Array<PluginOption>;
  /** 原包保留的 Vitest 配置。 */
  test: NonNullable<UserConfig['test']>;
};

/**
 * 创建统一的 ESM-only library build 配置。
 *
 * @description runtime 直接输出到 dist，声明只输出到 dist/types；依赖包及其 subpath 全部 external。
 */
export const defineRetikzLibraryConfig = ({
  packageRoot,
  manifest,
  entry,
  plugins = [],
  test,
}: RetikzLibraryConfigOptions) => {
  const runtimeDependencies = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ]);
  const external = (id: string) =>
    Array.from(runtimeDependencies).some(dependency => id === dependency || id.startsWith(`${dependency}/`));

  return defineConfig({
    plugins: [
      ...plugins,
      dts({
        compilerOptions: {
          rootDir: path.resolve(packageRoot, 'src'),
          types: ['node'],
        },
        entryRoot: path.resolve(packageRoot, 'src'),
        include: ['src'],
        tsconfigPath: path.resolve(packageRoot, 'tsconfig.json'),
        outDir: 'dist/types',
      }),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      minify: false,
      lib: {
        entry,
        fileName: '[name]',
        formats: ['es'],
      },
      rollupOptions: {
        external,
        output: {
          format: 'es',
          dir: 'dist',
          exports: 'named',
          preserveModules: true,
          preserveModulesRoot: 'src',
        },
      },
    },
    test,
  });
};
