import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { countryScatterData, WORLD_BANK_SCATTER_YEAR } from './scatter-basic.data';
import { createScatterPointControls } from './scatter-point-controls';

/** 基础 Scatter playground 的稳定控件 id */
export const SCATTER_BASIC_CONTROL_IDS = {
  pointSize: 'scatter-basic-point-size',
  pointFillEnabled: 'scatter-basic-point-fill-enabled',
  pointFill: 'scatter-basic-point-fill',
  pointStrokeEnabled: 'scatter-basic-point-stroke-enabled',
  pointStroke: 'scatter-basic-point-stroke',
  pointShape: 'scatter-basic-point-shape',
  pointOpacity: 'scatter-basic-point-opacity',
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
      controls: createScatterPointControls({
        ids: SCATTER_BASIC_CONTROL_IDS,
        size: { label: '大小', defaultValue: 5, min: 3, max: 18, step: 1 },
        fill: { toggleLabel: '填充', label: '填充色', defaultValue: 'currentColor' },
        stroke: { toggleLabel: '描边', label: '描边色', defaultValue: 'currentColor' },
        shape: {
          label: '形状',
          defaultValue: 'circle',
          labels: { circle: '圆形', rectangle: '矩形', ellipse: '椭圆形', diamond: '菱形' },
        },
        opacity: { label: '不透明度', defaultValue: 0.82, min: 0.4, max: 1, step: 0.02 },
      }),
    },
  ],
});

/** 基础 Scatter 的稳定文档契约 */
export const previewControlContract = {
  controls: scatterBasicControls,
  canonicalValues: {
    [SCATTER_BASIC_CONTROL_IDS.pointSize]: 5,
    [SCATTER_BASIC_CONTROL_IDS.pointFillEnabled]: false,
    [SCATTER_BASIC_CONTROL_IDS.pointFill]: 'currentColor',
    [SCATTER_BASIC_CONTROL_IDS.pointStrokeEnabled]: false,
    [SCATTER_BASIC_CONTROL_IDS.pointStroke]: 'currentColor',
    [SCATTER_BASIC_CONTROL_IDS.pointShape]: 'circle',
    [SCATTER_BASIC_CONTROL_IDS.pointOpacity]: 0.82,
  },
  relatedApis: [
    'ScatterEncodings.x',
    'ScatterEncodings.y',
    'ScatterProperties.size',
    'ScatterProperties.fill',
    'ScatterProperties.stroke',
    'ScatterProperties.shape',
    'ScatterProperties.opacity',
  ],
} satisfies PreviewControlContract;
