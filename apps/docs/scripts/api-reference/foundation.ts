import path from 'node:path';

import { translateFoundationApiReference } from './foundation.en';
import { createApiReferenceMdx, writeApiReferenceMdx } from './tex';

const docsRoot = path.resolve(import.meta.dirname, '../..');
const repositoryRoot = path.resolve(docsRoot, '../..');
const packageRoot = path.resolve(repositoryRoot, 'packages/kernel/foundation');

const config = {
  packageName: '@retikz/foundation',
  packageDirectory: 'packages/kernel/foundation',
  tsconfigPath: path.resolve(packageRoot, 'tsconfig.json'),
  entries: [
    {
      title: { zh: '`@retikz/foundation`', en: '`@retikz/foundation`' },
      source: path.resolve(packageRoot, 'src/index.ts'),
      symbols: [
        'RetikzError',
        'RetikzFoundationError',
        'AssertEqual',
        'JsonObject',
        'JsonValue',
        'MergePropertiesOptions',
        'NonEmptyReadonlyArray',
        'OpenString',
        'ParsedCssColor',
        'RetikzErrorOptions',
        'RetikzFoundationErrorCodeValue',
        'ValueOf',
        'WithOptionalProperties',
        'WithRequiredProperties',
        'RetikzFoundationErrorCode',
        'StaticCssNamedColorHexByName',
        'assertNonEmptyString',
        'assertPlainDataContainers',
        'assertPositiveNumber',
        'cloneAndFreezeJson',
        'compositeOpaqueColor',
        'createOpenStringSchema',
        'createReadonlyMap',
        'isRetikzError',
        'mergeProperties',
        'parseStaticCssColor',
      ],
    },
  ],
  translate: translateFoundationApiReference,
} as const;

/** 生成 @retikz/foundation 的 API Reference MDX */
export const createFoundationApiReferenceMdx = async (lang: 'zh' | 'en'): Promise<string> =>
  createApiReferenceMdx(config, lang);

/** 写出 @retikz/foundation 的双语 API Reference MDX include */
export const writeFoundationApiReferenceMdx = async (outputDirectory: string): Promise<void> =>
  writeApiReferenceMdx(config, outputDirectory);
