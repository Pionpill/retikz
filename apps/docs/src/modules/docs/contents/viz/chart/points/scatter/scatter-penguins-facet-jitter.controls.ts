import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { penguinScatterData } from './scatter-penguins-facet-jitter.data';
import { createScatterPointControls } from './scatter-point-controls';

/** 分面抖动散点图的稳定控件 id */
export const SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS = {
  pointSize: 'scatter-penguins-facet-jitter-point-size',
  pointFillEnabled: 'scatter-penguins-facet-jitter-point-fill-enabled',
  pointFill: 'scatter-penguins-facet-jitter-point-fill',
  pointStrokeEnabled: 'scatter-penguins-facet-jitter-point-stroke-enabled',
  pointStroke: 'scatter-penguins-facet-jitter-point-stroke',
  pointShape: 'scatter-penguins-facet-jitter-point-shape',
  pointOpacity: 'scatter-penguins-facet-jitter-point-opacity',
} as const;

/** 分面抖动散点图的中文控制面板 */
export const previewControls = definePreviewControls({
  presentation: 'panel',
  title: '企鹅分面散点',
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
      controls: createScatterPointControls({
        ids: SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS,
        size: { label: '点大小', defaultValue: 5, min: 3, max: 12, step: 1 },
        fill: { toggleLabel: '填充', label: '填充色', defaultValue: 'currentColor' },
        stroke: { toggleLabel: '描边', label: '描边色', defaultValue: 'currentColor' },
        shape: {
          label: '形状',
          defaultValue: 'circle',
          labels: { circle: '圆形', rectangle: '矩形', ellipse: '椭圆形', diamond: '菱形' },
        },
        opacity: { label: '不透明度', defaultValue: 0.72, min: 0.3, max: 1, step: 0.04 },
      }),
    },
  ],
});

/** 分面抖动散点图的稳定文档契约 */
export const previewControlContract = {
  controls: previewControls,
  canonicalValues: {
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointSize]: 5,
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointFillEnabled]: false,
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointFill]: 'currentColor',
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointStrokeEnabled]: false,
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointStroke]: 'currentColor',
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointShape]: 'circle',
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointOpacity]: 0.72,
  },
  relatedApis: [
    'ScatterProperties.size',
    'ScatterProperties.fill',
    'ScatterProperties.stroke',
    'ScatterProperties.shape',
    'ScatterProperties.opacity',
  ],
} satisfies PreviewControlContract;
