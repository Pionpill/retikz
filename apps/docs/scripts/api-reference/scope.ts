import path from 'node:path';

import { translateScopeApiReference } from './scope.en';
import type { ApiReferenceLanguage, ApiReferencePackageConfig } from './tex';
import { createApiReferenceMdx, writeApiReferenceMdx } from './tex';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');

/** Scope 组件参考只收录公开入口中的组件与直接执行配置 */
const scopeConfig: ApiReferencePackageConfig = {
  packageName: '@retikz/react',
  packageDirectory: 'packages/kernel/react',
  tsconfigPath: path.resolve(repositoryRoot, 'packages/kernel/react/tsconfig.json'),
  entries: [
    {
      source: path.resolve(repositoryRoot, 'packages/kernel/react/src/index.ts'),
      title: { zh: '`@retikz/react`', en: '`@retikz/react`' },
      symbols: ['Scope', 'ScopeProps', 'ScopeStyleProps'],
    },
  ],
  translate: translateScopeApiReference,
};

/** 从公开入口生成 Scope 的双语 API include */
export const writeScopeApiReferenceMdx = (outputDirectory: string): Promise<void> =>
  writeApiReferenceMdx(scopeConfig, outputDirectory);

/** 生成单个语言的 Scope API，用于验证公开范围与文档契约 */
export const createScopeApiReferenceMdx = (lang: ApiReferenceLanguage): Promise<string> =>
  createApiReferenceMdx(scopeConfig, lang);
