import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { fertilityWorkData, WORLD_BANK_FERTILITY_WORK_YEAR } from './scatter-fertility-work.data';

/** 分类编码 Scatter 的稳定控件 id */
export const SCATTER_FERTILITY_WORK_CONTROL_IDS = {
  colorByCategory: 'scatter-fertility-work-color-by-category',
  shapeByCategory: 'scatter-fertility-work-shape-by-category',
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
            { key: 'country' },
            { key: 'fertilityRate' },
            { key: 'femaleLaborParticipation' },
            { key: 'incomeGroup' },
          ],
        },
      ],
    },
    {
      label: '编码',
      controls: [
        {
          kind: 'switch',
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.colorByCategory,
          label: '按分类区分颜色',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.shapeByCategory,
          label: '按分类区分形状',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 分类编码 Scatter 的稳定文档契约 */
export const previewControlContract = {
  controls: scatterFertilityWorkControls,
  canonicalValues: {
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.colorByCategory]: true,
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.shapeByCategory]: true,
  },
  relatedApis: ['ScatterEncodings.color', 'ScatterEncodings.shape'],
} satisfies PreviewControlContract;
