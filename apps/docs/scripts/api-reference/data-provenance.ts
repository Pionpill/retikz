import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { assertDataProvenanceTranslated, translateDataProvenance } from './data-provenance.en';
import { writeReferenceFile } from './merged-reference';
import { referenceGroups } from './reference-groups';
import { createApiReferenceMdx } from './tex';
import type { ApiReferencePackageConfig } from './tex';

const root = path.resolve(import.meta.dirname, '../../../..');
const source = path.join(root, 'packages/viz/data/src/index.ts');

/** 溯源专题的公开成员，按读写、配置和消费顺序排列 */
const config: ApiReferencePackageConfig = {
  packageName: '@retikz/data',
  packageDirectory: 'packages/viz/data',
  tsconfigPath: path.join(root, 'packages/viz/data/tsconfig.json'),
  translate: translateDataProvenance,
  entries: [
    {
      source,
      title: { zh: '数据溯源', en: 'Data provenance' },
      symbols: referenceGroups['viz/data/provenance']!.flatMap(group => group.members),
    },
  ],
};

/** 生成双语页内溯源参考 */
export const writeDataProvenanceApiReferenceMdx = async (): Promise<void> => {
  const directory = path.join(root, 'apps/docs/src/modules/docs/contents/viz/data/provenance/_includes');
  mkdirSync(directory, { recursive: true });
  for (const language of ['zh', 'en'] as const) {
    const content = await createApiReferenceMdx(config, language);
    if (language === 'en') assertDataProvenanceTranslated();
    writeReferenceFile(path.join(directory, `generated.${language}.mdx`), content, 'utf8');
  }
};
