import path from 'node:path';

import { translateMathApiReference } from './math.en';
import { createApiReferenceMdx, writeApiReferenceMdx } from './tex';

const docsRoot = path.resolve(import.meta.dirname, '../..');
const repositoryRoot = path.resolve(docsRoot, '../..');
const packageRoot = path.resolve(repositoryRoot, 'packages/kernel/math');

const config = {
  packageName: '@retikz/math',
  packageDirectory: 'packages/kernel/math',
  tsconfigPath: path.resolve(packageRoot, 'tsconfig.json'),
  entries: [
    {
      title: { zh: '`@retikz/math`', en: '`@retikz/math`' },
      source: path.resolve(packageRoot, 'src/index.ts'),
    },
  ],
  translate: translateMathApiReference,
} as const;

/** 生成 @retikz/math 的 API Reference MDX */
export const createMathApiReferenceMdx = async (lang: 'zh' | 'en'): Promise<string> =>
  createApiReferenceMdx(config, lang);

/** 写出 @retikz/math 的双语 API Reference MDX include */
export const writeMathApiReferenceMdx = async (outputDirectory: string): Promise<void> =>
  writeApiReferenceMdx(config, outputDirectory);
