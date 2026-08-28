import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createScatterPointControls } from './scatter-point-controls';
import { messiWorldCupShots } from './scatter-world-cup-shots.data';

/** 空间散点图的稳定控件 id */
export const SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS = {
  pointSize: 'scatter-world-cup-shots-point-size',
  pointFillEnabled: 'scatter-world-cup-shots-point-fill-enabled',
  pointFill: 'scatter-world-cup-shots-point-fill',
  pointStrokeEnabled: 'scatter-world-cup-shots-point-stroke-enabled',
  pointStroke: 'scatter-world-cup-shots-point-stroke',
  pointShape: 'scatter-world-cup-shots-point-shape',
  pointOpacity: 'scatter-world-cup-shots-point-opacity',
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
      controls: createScatterPointControls({
        ids: SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS,
        size: { label: '射门点大小', defaultValue: 5, min: 4, max: 14, step: 1 },
        stroke: { toggleLabel: '描边', label: '描边色', defaultValue: '#f8fafc' },
        shape: {
          label: '形状',
          defaultValue: 'circle',
          labels: { circle: '圆形', rectangle: '矩形', ellipse: '椭圆形', diamond: '菱形' },
        },
        opacity: { label: '射门点不透明度', defaultValue: 0.9, min: 0.4, max: 1, step: 0.02 },
      }),
    },
  ],
});

/** 世界杯射门空间散点图的稳定文档契约 */
export const previewControlContract = {
  controls: previewControls,
  canonicalValues: {
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize]: 5,
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStrokeEnabled]: false,
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStroke]: '#f8fafc',
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointShape]: 'circle',
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity]: 0.9,
  },
  relatedApis: [
    'ScatterEncodings',
    'ScatterProperties.size',
    'ScatterProperties.stroke',
    'ScatterProperties.shape',
    'ScatterProperties.opacity',
  ],
} satisfies PreviewControlContract;
