import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { SCATTER_BASIC_CONTROL_IDS } from './scatter-basic.controls';
import { countryScatterData, WORLD_BANK_SCATTER_YEAR } from './scatter-basic.data';

/** 基础 Scatter 的英文控制面板 */
export const scatterBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Basic scatter',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${WORLD_BANK_SCATTER_YEAR} country samples`,
          rows: countryScatterData,
          columns: [
            { key: 'country', label: 'Country or economy' },
            { key: 'urbanPopulationShare', label: 'Urban population' },
            { key: 'internetUseShare', label: 'Internet use' },
          ],
        },
      ],
    },
    {
      label: 'Points',
      controls: [
        {
          kind: 'range',
          id: SCATTER_BASIC_CONTROL_IDS.pointSize,
          label: 'Size',
          defaultValue: 10,
          min: 6,
          max: 18,
          step: 1,
        },
        {
          kind: 'range',
          id: SCATTER_BASIC_CONTROL_IDS.pointOpacity,
          label: 'Opacity',
          defaultValue: 0.82,
          min: 0.4,
          max: 1,
          step: 0.02,
        },
      ],
    },
  ],
});

/** 基础 Scatter 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scatterBasicControls,
  canonicalValues: {
    [SCATTER_BASIC_CONTROL_IDS.pointSize]: 10,
    [SCATTER_BASIC_CONTROL_IDS.pointOpacity]: 0.82,
  },
  relatedApis: ['ScatterChart.encodings', 'ScatterMark.properties'],
} satisfies PreviewControlContract;
