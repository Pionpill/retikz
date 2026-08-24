import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData, WORLD_BANK_FERTILITY_WORK_YEAR } from './scatter-fertility-work.data';

/** 分类编码 Scatter 的英文控制面板 */
export const scatterFertilityWorkControls = definePreviewControls({
  presentation: 'panel',
  title: 'Categorical encoding',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${WORLD_BANK_FERTILITY_WORK_YEAR} economy samples`,
          rows: fertilityWorkData,
          columns: [
            { key: 'country', label: 'Economy' },
            { key: 'fertilityRate', label: 'Fertility rate' },
            { key: 'femaleLaborParticipation', label: 'Female labor participation' },
            { key: 'incomeGroup', label: 'Income group' },
          ],
        },
      ],
    },
    {
      label: 'Categorical channel',
      controls: [
        {
          kind: 'select',
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.channel,
          label: 'Map to',
          defaultValue: 'color',
          options: [
            { value: 'shape', label: 'Shape' },
            { value: 'color', label: 'Color' },
          ],
        },
      ],
    },
  ],
});

/** 分类编码 Scatter 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scatterFertilityWorkControls,
  canonicalValues: {
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.channel]: 'color',
  },
  relatedApis: ['ScatterChart.encodings', 'ScatterMark.override', 'ScatterMark.properties'],
} satisfies PreviewControlContract;
