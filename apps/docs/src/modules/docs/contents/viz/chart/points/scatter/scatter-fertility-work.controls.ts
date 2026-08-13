import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { fertilityWorkData, WORLD_BANK_FERTILITY_WORK_YEAR } from './scatter-fertility-work.data';

/** 分类编码 Scatter playground 的稳定控件 id */
export const SCATTER_FERTILITY_WORK_CONTROL_IDS = {
  encoding: 'encoding',
} as const;

/** 分类编码 Scatter 的中文控制面板 */
export const scatterFertilityWorkControls = definePreviewControls({
  presentation: 'panel',
  title: '分类编码',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${WORLD_BANK_FERTILITY_WORK_YEAR} 年经济体样本`,
          rows: fertilityWorkData,
          columns: [
            { key: 'country', label: '经济体' },
            { key: 'fertilityRate', label: '总和生育率' },
            { key: 'femaleLaborParticipation', label: '女性劳动参与率' },
            { key: 'incomeGroup', label: '收入组' },
          ],
        },
      ],
    },
    {
      label: '分类通道',
      controls: [
        {
          kind: 'select',
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.encoding,
          label: '映射到',
          defaultValue: 'color',
          options: [
            { value: 'shape', label: '形状' },
            { value: 'color', label: '颜色' },
          ],
        },
      ],
    },
  ],
});

/** 分类编码 Scatter 的稳定文档契约 */
export const previewControlContract = {
  controls: scatterFertilityWorkControls,
  canonicalValues: {
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.encoding]: 'color',
  },
  relatedApis: ['PointMark.color', 'PointMark.shape', 'Legend.channel'],
} satisfies PreviewControlContract;
