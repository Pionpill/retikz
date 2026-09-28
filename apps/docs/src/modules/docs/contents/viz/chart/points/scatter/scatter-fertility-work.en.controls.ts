import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
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
            { key: 'country' },
            { key: 'fertilityRate' },
            { key: 'femaleLaborParticipation' },
            { key: 'incomeGroup' },
          ],
        },
      ],
    },

    createPointCoordinateSection(SCATTER_FERTILITY_WORK_CONTROL_IDS.coordinateSystem, 'en'),
    {
      label: 'Encodings',
      controls: [
        {
          kind: 'switch',
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.colorByCategory,
          label: 'Differentiate by color',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.shapeByCategory,
          label: 'Differentiate by shape',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 分类编码 Scatter 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scatterFertilityWorkControls,
  canonicalValues: {
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.colorByCategory]: true,
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.shapeByCategory]: true,
  },
  relatedApis: ['ScatterChart.coordinate', 'ScatterEncodings.color', 'ScatterEncodings.shape'],
} satisfies PreviewControlContract;
