import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { writeReferenceFile } from './merged-reference';
import { assertPlotSpatialTranslated, translatePlotSpatial } from './plot-spatial.en';
import { referenceGroups } from './reference-groups';
import { createApiReferenceMdx } from './tex';
import type { ApiReferenceLanguage, ApiReferencePackageConfig } from './tex';

const root = path.resolve(import.meta.dirname, '../../../..');
/** 从各自公开入口生成声明输入与 Plot 契约，Schema 说明复用唯一 include */
const createReference = async (owner: 'scale' | 'coordinate', lang: ApiReferenceLanguage): Promise<string> => {
  const members = referenceGroups[`viz/plot/${owner}`]!.flatMap(group => group.members);
  const adapterMembers =
    owner === 'scale'
      ? ['InputPlotScale', 'InputPlotScaleDimension', 'InputPlotPositionScaleType']
      : ['InputPlotCoordinate'];
  const configs: Array<ApiReferencePackageConfig> = [];
  for (const packageName of ['plot-react', 'plot-vanilla', 'plot']) {
    const symbols =
      packageName === 'plot-react'
        ? owner === 'scale'
          ? ['PlotScale', 'PlotScaleProps']
          : []
        : packageName === 'plot-vanilla'
          ? adapterMembers
          : members.filter(name => !adapterMembers.includes(name) && !name.includes(' / '));
    if (!symbols.length) continue;
    configs.push({
      packageName: `@retikz/${packageName}`,
      packageDirectory: `packages/viz/${packageName}`,
      tsconfigPath: path.join(root, `packages/viz/${packageName}/tsconfig.json`),
      translate: translatePlotSpatial,
      entries: [
        {
          source: path.join(root, `packages/viz/${packageName}/src/index.ts`),
          title: { zh: '公开契约', en: 'Public contracts' },
          symbols,
          symbolPairs: packageName === 'plot-react' ? [['PlotScale', 'PlotScaleProps']] : undefined,
          omitPairedCallDetails: true,
          declarationOnlySymbols: symbols.filter(name => name.startsWith('IRPlot')),
        },
      ],
    });
  }
  const sections: Array<string> = [];
  for (const config of configs) sections.push(await createApiReferenceMdx(config, lang));
  return sections.join('\n\n');
};
/** 生成比例尺与坐标系 API 参考，缺译时拒绝英文产物 */
export const writePlotSpatialApiReferenceMdx = async (): Promise<void> => {
  for (const owner of ['scale', 'coordinate'] as const) {
    const directory = path.join(root, `apps/docs/src/modules/docs/contents/viz/plot/${owner}/reference/_includes`);
    mkdirSync(directory, { recursive: true });
    for (const lang of ['zh', 'en'] as const) {
      const source = await createReference(owner, lang);
      if (lang === 'en') assertPlotSpatialTranslated();
      writeReferenceFile(path.join(directory, `generated.${lang}.mdx`), source, 'utf8');
    }
  }
};
