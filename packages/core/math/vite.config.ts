import path from 'path';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

const runtimeDeps = [...Object.keys((pkg as { dependencies?: Record<string, string> }).dependencies ?? {})];
const external = (id: string) => runtimeDeps.some(p => id === p || id.startsWith(`${p}/`));

export default defineConfig({
  plugins: [dts({ entryRoot: 'src', tsconfigPath: path.resolve(__dirname, 'tsconfig.json'), outDir: ['dist/lib', 'dist/es'], exclude: ['tests/**'] })],
  resolve: { tsconfigPaths: true },
  build: {
    outDir: 'dist', minify: false,
    lib: { entry: 'src/index.ts', name: 'retikz-math', fileName: '[name]', formats: ['es', 'cjs'] },
    rollupOptions: {
      external,
      output: [
        { format: 'es', dir: 'dist/es', exports: 'named', preserveModules: true, preserveModulesRoot: 'src' },
        { format: 'cjs', dir: 'dist/lib', exports: 'named', preserveModules: true, preserveModulesRoot: 'src', entryFileNames: '[name].cjs' },
      ],
    },
  },
  test: { environment: 'node', include: ['tests/**/*.test.{ts,tsx}'] },
});
