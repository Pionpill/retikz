import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { writeReferenceFile } from './merged-reference';
import { assertPlotChannelTranslated, translatePlotChannel } from './plot-channel.en';
import { referenceGroups } from './reference-groups';
import { createApiReferenceMdx } from './tex';
import type { ApiReferencePackageConfig } from './tex';

const root = path.resolve(import.meta.dirname, '../../../..');

/** 从 Plot 根入口投影通道公开契约，不收录仅在内部文件导出的成员 */
const config: ApiReferencePackageConfig = {
  packageName: '@retikz/plot',
  packageDirectory: 'packages/viz/plot',
  tsconfigPath: path.join(root, 'packages/viz/plot/tsconfig.json'),
  translate: translatePlotChannel,
  schemaLocalizations: {
    ChannelSchema: {
      descriptions: {
        field: '从外部数据行读取标量值的字段路径，例如 month 或 user.age；与 value 互斥',
        value: '通道的 JSON 常量值；与 field 互斥',
        scale: '驱动通道的比例尺名称；位置通道由坐标系提供比例尺，通常省略',
      },
    },
  },
  entries: [
    {
      source: path.join(root, 'packages/viz/plot/src/index.ts'),
      title: { zh: '通道', en: 'Channels' },
      symbols: referenceGroups['viz/plot/channel']!.flatMap(group => group.members),
    },
  ],
};

/** 生成通道 API 的双语源码投影，缺译时拒绝写入英文产物 */
export const writePlotChannelApiReferenceMdx = async (): Promise<void> => {
  const directory = path.join(root, 'apps/docs/src/modules/docs/contents/viz/plot/channel/reference/_includes');
  mkdirSync(directory, { recursive: true });
  for (const language of ['zh', 'en'] as const) {
    const content = await createApiReferenceMdx(config, language);
    if (language === 'en') assertPlotChannelTranslated();
    writeReferenceFile(path.join(directory, `generated.${language}.mdx`), content, 'utf8');
  }
};
