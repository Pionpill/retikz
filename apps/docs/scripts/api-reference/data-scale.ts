import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { assertDataScaleTranslated, translateDataScale } from './data-scale.en';
import { writeReferenceFile } from './merged-reference';
import { createApiReferenceMdx } from './tex';
import type { ApiReferencePackageConfig } from './tex';

const root = path.resolve(import.meta.dirname, '../../../..');
const config: ApiReferencePackageConfig = {
  packageName: '@retikz/data',
  packageDirectory: 'packages/viz/data',
  tsconfigPath: path.join(root, 'packages/viz/data/tsconfig.json'),
  translate: translateDataScale,
  entries: [
    {
      source: path.join(root, 'packages/viz/data/src/index.ts'),
      title: { zh: '映射定义与求值', en: 'Mapping definitions and evaluation' },
      symbols: [
        'BuiltinDataScale',
        'BUILTIN_SCALES',
        'ScaleValue',
        'ScaleRebuildOptions',
        'ScaleResolution',
        'ScaleResolveContext',
        'InputScaleDefinition',
        'ScaleDefinition',
        'defineScale',
        'resolveScaleRegistry',
        'parseScaleOperation',
        'resolveScale',
      ],
    },
  ],
};

/** 从 Data 公开入口生成比例尺参考 */
export const writeDataScaleApiReferenceMdx = async (): Promise<void> => {
  const directory = path.join(root, 'apps/docs/src/modules/docs/contents/viz/data/scale/reference/_includes');
  mkdirSync(directory, { recursive: true });
  for (const language of ['zh', 'en'] as const) {
    const content = await createApiReferenceMdx(config, language);
    if (language === 'en') assertDataScaleTranslated();
    writeReferenceFile(path.join(directory, `generated.${language}.mdx`), content, 'utf8');
  }
};
