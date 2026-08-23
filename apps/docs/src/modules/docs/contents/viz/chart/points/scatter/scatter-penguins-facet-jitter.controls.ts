import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { penguinScatterData } from './scatter-penguins-facet-jitter.data';

/** 抖动散点图的稳定控件 id */
export const SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS = {
  jitter: 'jitter',
  pointSize: 'pointSize',
} as const;

/** 抖动散点图的中文控制面板 */
export const previewControls = definePreviewControls({
  presentation: 'panel',
  title: '企鹅抖动散点',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Palmer Penguins 确定性样本',
          rows: penguinScatterData,
          columns: [
            { key: 'species', label: '物种' },
            { key: 'billLengthMm', label: '喙长（mm）' },
            { key: 'flipperLengthMm', label: '鳍长（mm）' },
          ],
        },
      ],
    },
    {
      label: '图元',
      controls: [
        {
          kind: 'range',
          id: SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.jitter,
          label: '横向抖动',
          defaultValue: 0.35,
          min: 0,
          max: 1.2,
          step: 0.05,
        },
        {
          kind: 'range',
          id: SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointSize,
          label: '点大小',
          defaultValue: 7,
          min: 3,
          max: 12,
          step: 1,
        },
      ],
    },
  ],
});

/** 抖动散点图的稳定文档契约 */
export const previewControlContract = {
  controls: previewControls,
  canonicalValues: {
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.jitter]: 0.35,
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointSize]: 7,
  },
  relatedApis: ['ScatterChart.encodings', 'ScatterMark.override', 'ScatterMark.properties', 'Plot.transform'],
} satisfies PreviewControlContract;
