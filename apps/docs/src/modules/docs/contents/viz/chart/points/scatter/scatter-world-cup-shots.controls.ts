import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { messiWorldCupShots } from './scatter-world-cup-shots.data';

/** 空间散点图的稳定控件 id */
export const SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS = {
  pointSize: 'pointSize',
  pointOpacity: 'pointOpacity',
} as const;

/** 世界杯射门空间散点图的中文控制面板 */
export const previewControls = definePreviewControls({
  presentation: 'panel',
  title: '世界杯射门空间分布',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Lionel Messi 的 32 次非点球大战射门',
          rows: messiWorldCupShots,
          columns: [
            { key: 'opponent', label: '对手' },
            { key: 'minute', label: '分钟' },
            { key: 'outcome', label: '结果' },
            { key: 'xg', label: 'xG' },
          ],
        },
      ],
    },
    {
      label: '图元',
      controls: [
        {
          kind: 'range',
          id: SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize,
          label: '射门点大小',
          defaultValue: 8,
          min: 4,
          max: 14,
          step: 1,
        },
        {
          kind: 'range',
          id: SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity,
          label: '射门点不透明度',
          defaultValue: 0.9,
          min: 0.4,
          max: 1,
          step: 0.02,
        },
      ],
    },
  ],
});

/** 世界杯射门空间散点图的稳定文档契约 */
export const previewControlContract = {
  controls: previewControls,
  canonicalValues: {
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize]: 8,
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity]: 0.9,
  },
  relatedApis: ['ScatterChart.encodings', 'ScatterMark.properties'],
} satisfies PreviewControlContract;
