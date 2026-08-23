import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { countryScatterData, WORLD_BANK_SCATTER_YEAR } from './scatter-basic.data';

/** 基础 Scatter playground 的稳定控件 id */
export const SCATTER_BASIC_CONTROL_IDS = {
  pointSize: 'pointSize',
  pointOpacity: 'pointOpacity',
} as const;

/** 基础 Scatter 的中文控制面板 */
export const scatterBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '基础散点',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${WORLD_BANK_SCATTER_YEAR} 年国家样本`,
          rows: countryScatterData,
          columns: [
            { key: 'country', label: '国家或地区' },
            { key: 'urbanPopulationShare', label: '城镇人口占比' },
            { key: 'internetUseShare', label: '互联网使用人口占比' },
          ],
        },
      ],
    },
    {
      label: '散点',
      controls: [
        {
          kind: 'range',
          id: SCATTER_BASIC_CONTROL_IDS.pointSize,
          label: '大小',
          defaultValue: 10,
          min: 6,
          max: 18,
          step: 1,
        },
        {
          kind: 'range',
          id: SCATTER_BASIC_CONTROL_IDS.pointOpacity,
          label: '不透明度',
          defaultValue: 0.82,
          min: 0.4,
          max: 1,
          step: 0.02,
        },
      ],
    },
  ],
});

/** 基础 Scatter 的稳定文档契约 */
export const previewControlContract = {
  controls: scatterBasicControls,
  canonicalValues: {
    [SCATTER_BASIC_CONTROL_IDS.pointSize]: 10,
    [SCATTER_BASIC_CONTROL_IDS.pointOpacity]: 0.82,
  },
  relatedApis: ['ScatterChart.encodings', 'ScatterMark.override', 'ScatterMark.properties'],
} satisfies PreviewControlContract;
