import path from 'node:path';

import { translateInspectApiReference } from './inspect.en';
import { createApiReferenceMdx, writeApiReferenceMdx } from './tex';

const packageRoot = path.resolve(import.meta.dirname, '../../../../packages/kernel/inspect');

/** Inspect 的公开入口与受审阅的双语投影配置 */
export const inspectApiReferenceConfig = {
  packageName: '@retikz/inspect',
  packageDirectory: 'packages/kernel/inspect',
  tsconfigPath: path.resolve(packageRoot, 'tsconfig.json'),
  entries: ['', '/react', '/vanilla'].map(subpath => ({
    title: { zh: `\`@retikz/inspect${subpath}\``, en: `\`@retikz/inspect${subpath}\`` },
    source: path.resolve(packageRoot, `src${subpath}/index.ts`),
    declarationOnlySymbols: subpath === '' ? ['InspectorRegistry'] : [],
    symbolPairs: subpath === '/react' ? ['InspectionOverlay'].map(name => [name, `${name}Props`] as const) : [],
    omitPairedCallDetails: true,
  })),
  translate: translateInspectApiReference,
  schemaReferences: {
    PathInspectOptionsSchema: '/kernel/packages/inspect/reference#pathinspectoptionsschema',
    GroupInspectOptionsSchema: '/kernel/packages/inspect/reference#groupinspectoptionsschema',
    ClipInspectOptionsSchema: '/kernel/packages/inspect/reference#clipinspectoptionsschema',
  },
};

/** 生成 Inspect 公开 API 的单语言参考内容 */
export const createInspectApiReferenceMdx = async (lang: 'zh' | 'en'): Promise<string> =>
  createApiReferenceMdx(inspectApiReferenceConfig, lang);

/** 写出 Inspect 双语 API Reference include */
export const writeInspectApiReferenceMdx = async (outputDirectory: string): Promise<void> =>
  writeApiReferenceMdx(inspectApiReferenceConfig, outputDirectory, 'kernel/packages/inspect');
